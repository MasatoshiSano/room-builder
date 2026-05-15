import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import type { ServerHealth, ServerPlan } from './serverClient';
import { ServerError } from './serverClient';

/**
 * Browser → S3 direct client (no server in the loop).
 *
 * Object layout in the bucket:
 *   <prefix>/state.json
 *   <prefix>/plans/<id>.json
 *   <prefix>/plans/_index.json   (list of plan ids; mirror of plans/<id>.json)
 *   <prefix>/blobs/<key>         (raw bytes; e.g. background images)
 *
 * SECURITY NOTE: This client uses static IAM credentials embedded in the
 * client bundle (via VITE_* env). Anyone who can fetch the bundle can extract
 * the keys. Use ONLY for local/intranet/personal apps; restrict the IAM user
 * to s3:* on a single bucket.
 */

const REGION = import.meta.env.VITE_AWS_REGION ?? '';
const BUCKET = import.meta.env.VITE_AWS_BUCKET ?? '';
const PREFIX = (import.meta.env.VITE_AWS_PREFIX ?? '').replace(/^\/+|\/+$/g, '');
const ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID ?? '';
const SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? '';

const SCHEMA_VERSION = 3;

function ensureConfigured(): void {
  if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new ServerError(
      0,
      'S3 backend is not configured. Set VITE_AWS_REGION, VITE_AWS_BUCKET, VITE_AWS_ACCESS_KEY_ID, VITE_AWS_SECRET_ACCESS_KEY in .env.',
    );
  }
}

const s3 = new S3Client({
  region: REGION || 'us-east-1',
  credentials:
    ACCESS_KEY_ID && SECRET_ACCESS_KEY
      ? { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
      : undefined,
  // Browser-friendly: skip the AWS SDK's default xhr response stream tricks.
});

function key(suffix: string): string {
  return PREFIX ? `${PREFIX}/${suffix}` : suffix;
}

const STATE_KEY = 'state.json';
const PLAN_INDEX_KEY = 'plans/_index.json';
const planKey = (id: string) => `plans/${id}.json`;
const blobKey = (k: string) => `blobs/${k}`;

async function streamToString(body: unknown): Promise<string> {
  if (!body) return '';
  // ReadableStream
  if (typeof (body as ReadableStream).getReader === 'function') {
    return await new Response(body as ReadableStream).text();
  }
  // Blob
  if (typeof (body as Blob).text === 'function') {
    return await (body as Blob).text();
  }
  // Buffer-like
  return String(body);
}

async function streamToBlob(body: unknown, type: string): Promise<Blob> {
  if (!body) return new Blob([], { type });
  if (typeof (body as Blob).arrayBuffer === 'function') {
    const buf = await (body as Blob).arrayBuffer();
    return new Blob([buf], { type });
  }
  if (typeof (body as ReadableStream).getReader === 'function') {
    const buf = await new Response(body as ReadableStream).arrayBuffer();
    return new Blob([buf], { type });
  }
  return new Blob([body as BlobPart], { type });
}

async function safeGetJson<T>(objKey: string): Promise<T | null> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key(objKey) }),
    );
    const text = await streamToString(res.Body);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    if (e instanceof S3ServiceException) {
      if (e.name === 'NoSuchKey' || e.$metadata.httpStatusCode === 404) {
        return null;
      }
      throw new ServerError(e.$metadata.httpStatusCode ?? 0, e.message);
    }
    throw new ServerError(0, e instanceof Error ? e.message : String(e));
  }
}

async function putJson(objKey: string, value: unknown): Promise<void> {
  ensureConfigured();
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key(objKey),
        Body: JSON.stringify(value),
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      }),
    );
  } catch (e) {
    if (e instanceof S3ServiceException) {
      throw new ServerError(e.$metadata.httpStatusCode ?? 0, e.message);
    }
    throw new ServerError(0, e instanceof Error ? e.message : String(e));
  }
}

interface PlanIndexEntry {
  id: string;
  name: string;
  savedAt: number;
}

async function readPlanIndex(): Promise<PlanIndexEntry[]> {
  const idx = await safeGetJson<{ plans: PlanIndexEntry[] }>(PLAN_INDEX_KEY);
  if (idx && Array.isArray(idx.plans)) return idx.plans;
  return [];
}

async function writePlanIndex(plans: PlanIndexEntry[]): Promise<void> {
  await putJson(PLAN_INDEX_KEY, { plans });
}

export const s3Client = {
  /** Probe: HeadBucket. Throws ServerError on failure. */
  async health(): Promise<ServerHealth> {
    ensureConfigured();
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      return { status: 'ok', schemaVersion: SCHEMA_VERSION, uptime: 0 };
    } catch (e) {
      if (e instanceof S3ServiceException) {
        throw new ServerError(e.$metadata.httpStatusCode ?? 0, e.message);
      }
      throw new ServerError(0, e instanceof Error ? e.message : String(e));
    }
  },

  async getState<T = unknown>(): Promise<T | null> {
    return safeGetJson<T>(STATE_KEY);
  },

  async putState(data: unknown): Promise<void> {
    await putJson(STATE_KEY, data);
  },

  async listPlans(): Promise<ServerPlan[]> {
    const idx = await readPlanIndex();
    if (idx.length === 0) return [];
    // Fetch each plan in parallel (small N expected).
    const plans = await Promise.all(
      idx.map(async (entry): Promise<ServerPlan | null> => {
        const data = await safeGetJson<unknown>(planKey(entry.id));
        if (data === null) return null;
        return {
          id: entry.id,
          name: entry.name,
          savedAt: entry.savedAt,
          data,
        };
      }),
    );
    return plans.filter((p): p is ServerPlan => p !== null);
  },

  async putPlan(plan: ServerPlan): Promise<void> {
    await putJson(planKey(plan.id), plan.data);
    const idx = await readPlanIndex();
    const next = idx.filter((p) => p.id !== plan.id);
    next.unshift({ id: plan.id, name: plan.name, savedAt: plan.savedAt });
    await writePlanIndex(next);
  },

  async replaceAllPlans(plans: ServerPlan[]): Promise<void> {
    ensureConfigured();
    // Find current entries to delete.
    const before = await readPlanIndex();
    const incomingIds = new Set(plans.map((p) => p.id));
    const toDelete = before.filter((b) => !incomingIds.has(b.id));
    // Upload all new plans in parallel.
    await Promise.all(
      plans.map((p) => putJson(planKey(p.id), p.data)),
    );
    // Delete removed plans.
    await Promise.all(
      toDelete.map((p) =>
        s3
          .send(
            new DeleteObjectCommand({
              Bucket: BUCKET,
              Key: key(planKey(p.id)),
            }),
          )
          .catch(() => null),
      ),
    );
    // Update index.
    await writePlanIndex(
      plans.map((p) => ({ id: p.id, name: p.name, savedAt: p.savedAt })),
    );
  },

  async deletePlan(id: string): Promise<void> {
    ensureConfigured();
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key(planKey(id)) }),
      );
    } catch {
      /* tolerate missing */
    }
    const idx = await readPlanIndex();
    await writePlanIndex(idx.filter((p) => p.id !== id));
  },

  /** Synthetic URL is unused; we go through getBlob() to read. */
  blobUrl(_k: string): string {
    void _k;
    return '';
  },

  async getBlob(k: string): Promise<Blob | null> {
    ensureConfigured();
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key(blobKey(k)) }),
      );
      if (!res.Body) return null;
      return await streamToBlob(res.Body, res.ContentType ?? 'application/octet-stream');
    } catch (e) {
      if (e instanceof S3ServiceException) {
        if (e.name === 'NoSuchKey' || e.$metadata.httpStatusCode === 404) {
          return null;
        }
        throw new ServerError(e.$metadata.httpStatusCode ?? 0, e.message);
      }
      throw new ServerError(0, e instanceof Error ? e.message : String(e));
    }
  },

  async putBlob(k: string, blob: Blob): Promise<void> {
    ensureConfigured();
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key(blobKey(k)),
          Body: buf,
          ContentType: blob.type || 'application/octet-stream',
        }),
      );
    } catch (e) {
      if (e instanceof S3ServiceException) {
        throw new ServerError(e.$metadata.httpStatusCode ?? 0, e.message);
      }
      throw new ServerError(0, e instanceof Error ? e.message : String(e));
    }
  },

  async deleteBlob(k: string): Promise<void> {
    if (!REGION || !BUCKET) return;
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key(blobKey(k)) }),
      );
    } catch {
      /* ignore */
    }
  },

  /** True when env is configured for S3 mode. */
  isConfigured(): boolean {
    return !!(REGION && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
  },

  /** For diagnostics. */
  describe(): string {
    return `s3://${BUCKET}/${PREFIX || ''} @ ${REGION}`;
  },

  /** ListObjectsV2 sanity helper. */
  async _listAll(): Promise<string[]> {
    ensureConfigured();
    const out: string[] = [];
    let token: string | undefined;
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: PREFIX ? `${PREFIX}/` : undefined,
          ContinuationToken: token,
        }),
      );
      for (const o of res.Contents ?? []) {
        if (o.Key) out.push(o.Key);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  },
};
