/**
 * Given a wall length L, height H, and openings on it, compute
 * rectangular segments to render the wall around the openings.
 *
 * Coordinate system: u along wall start->end (0..L), v vertical (0..H).
 * Each segment is { u0, v0, u1, v1 } (a rectangle on the wall plane).
 */

export interface SegmentRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface OpeningSpec {
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

export function computeWallSegments(
  length: number,
  height: number,
  openings: OpeningSpec[],
): SegmentRect[] {
  if (length <= 0 || height <= 0) return [];

  const sorted = [...openings]
    .map((o) => {
      const offset = clamp(o.offset, 0, length);
      const sill = clamp(o.sillHeight, 0, height);
      return {
        offset,
        sillHeight: sill,
        width: Math.max(0, Math.min(o.width, length - offset)),
        height: Math.max(0, Math.min(o.height, height - sill)),
      };
    })
    .filter((o) => o.width > 0 && o.height > 0)
    .sort((a, b) => a.offset - b.offset);

  const merged = mergeOverlaps(sorted);

  const segments: SegmentRect[] = [];
  let u = 0;

  for (const o of merged) {
    if (o.offset > u) {
      segments.push({ u0: u, v0: 0, u1: o.offset, v1: height });
    }
    const top = o.sillHeight + o.height;
    if (o.sillHeight > 0) {
      segments.push({
        u0: o.offset,
        v0: 0,
        u1: o.offset + o.width,
        v1: o.sillHeight,
      });
    }
    if (top < height) {
      segments.push({
        u0: o.offset,
        v0: top,
        u1: o.offset + o.width,
        v1: height,
      });
    }
    u = o.offset + o.width;
  }

  if (u < length) {
    segments.push({ u0: u, v0: 0, u1: length, v1: height });
  }

  return segments;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mergeOverlaps(openings: OpeningSpec[]): OpeningSpec[] {
  if (openings.length === 0) return [];
  const result: OpeningSpec[] = [];
  for (const o of openings) {
    const last = result[result.length - 1];
    if (last && o.offset < last.offset + last.width) {
      const oldTop = last.sillHeight + last.height;
      const newSill = Math.min(last.sillHeight, o.sillHeight);
      const newTop = Math.max(oldTop, o.sillHeight + o.height);
      last.width = Math.max(last.offset + last.width, o.offset + o.width) - last.offset;
      last.sillHeight = newSill;
      last.height = newTop - newSill;
    } else {
      result.push({ ...o });
    }
  }
  return result;
}
