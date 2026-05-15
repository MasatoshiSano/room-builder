/**
 * Backend abstraction.
 *
 * Selects between:
 *   - Local Hono+SQLite server (default; talks to /api proxied by Vite)
 *   - Direct S3 (set VITE_BACKEND_MODE=s3 + the AWS env vars)
 *
 * Both implementations expose the same surface (matching `serverClient`).
 */

import { serverClient } from './serverClient';
import { s3Client } from './s3Client';

export type BackendMode = 'server' | 's3';

const MODE: BackendMode =
  (import.meta.env.VITE_BACKEND_MODE as BackendMode) === 's3' ? 's3' : 'server';

const impl = MODE === 's3' ? s3Client : serverClient;

export const remote = impl;
export const backendMode: BackendMode = MODE;

export function describeBackend(): string {
  if (MODE === 's3') {
    return s3Client.describe();
  }
  return 'http://localhost:3001 (local server)';
}
