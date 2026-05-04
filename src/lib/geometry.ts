import type { Vec2, InnerWall } from './types';

export function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

export function snapPoint(p: Vec2, grid: number): Vec2 {
  return { x: snap(p.x, grid), z: snap(p.z, grid) };
}

/** signed area; positive = CCW (in x/z with z-flipped-as-y plot) */
export function signedArea(poly: Vec2[]): number {
  let s = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    s += a.x * b.z - b.x * a.z;
  }
  return s / 2;
}

export function ensureCCW(poly: Vec2[]): Vec2[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x;
    const zi = poly[i].z;
    const xj = poly[j].x;
    const zj = poly[j].z;
    const intersect =
      zi > p.z !== zj > p.z &&
      p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Closest point on segment AB to P; returns the t in [0,1] and the point */
export function closestOnSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { t: number; point: Vec2; distance: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    return { t: 0, point: { ...a }, distance: distance(p, a) };
  }
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq),
  );
  const point = { x: a.x + t * dx, z: a.z + t * dz };
  return { t, point, distance: distance(p, point) };
}

export interface WallEdge {
  ref:
    | { type: 'outer'; edgeIndex: number }
    | { type: 'inner'; wallId: string };
  start: Vec2;
  end: Vec2;
  length: number;
}

export function outerEdges(outline: Vec2[]): WallEdge[] {
  const edges: WallEdge[] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const start = outline[i];
    const end = outline[(i + 1) % n];
    edges.push({
      ref: { type: 'outer', edgeIndex: i },
      start,
      end,
      length: distance(start, end),
    });
  }
  return edges;
}

export function innerEdges(innerWalls: InnerWall[]): WallEdge[] {
  return innerWalls.map((w) => ({
    ref: { type: 'inner', wallId: w.id },
    start: w.start,
    end: w.end,
    length: distance(w.start, w.end),
  }));
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

function direction(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

/** Strict segment intersection (excludes shared endpoints / collinear touch). */
export function segmentsIntersect(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * Returns true if appending `p` to `outline` would create an edge
 * (from outline[last] to p) that crosses an existing outline edge.
 */
export function outlineAppendWouldCross(outline: Vec2[], p: Vec2): boolean {
  const n = outline.length;
  if (n < 2) return false;
  const a = outline[n - 1];
  // Existing edges 0..n-2 (between consecutive points). Skip the last edge
  // because it shares vertex outline[n-1] with the new one.
  for (let i = 0; i < n - 2; i++) {
    if (segmentsIntersect(a, p, outline[i], outline[i + 1])) return true;
  }
  return false;
}

/**
 * Returns true if inserting `p` between outline[anchorIdx] and
 * outline[anchorIdx+1] (open polygon) would create a crossing with any
 * non-adjacent existing edge.
 *
 * Skip rules are evaluated independently for each of the two new edges
 * (a→p and p→next): we only skip an existing edge for the new edge that
 * actually shares a vertex with it. This avoids over-skipping that would
 * miss real crossings between e.g. p→next and a non-adjacent edge.
 */
export function outlineInsertWouldCross(
  outline: Vec2[],
  anchorIdx: number,
  p: Vec2,
): boolean {
  const n = outline.length;
  if (n < 2 || anchorIdx < 0 || anchorIdx >= n) return false;
  const a = outline[anchorIdx];
  const next = anchorIdx + 1 < n ? outline[anchorIdx + 1] : null;
  for (let i = 0; i < n - 1; i++) {
    const e1 = outline[i];
    const e2 = outline[i + 1];
    // Skip the edge being split (a→next) entirely; it's removed by insertion.
    if (next && i === anchorIdx) continue;
    // a→p: shares a with edges (anchor-1)→anchor and anchor→(anchor+1=split).
    const skipForA = i === anchorIdx - 1;
    // p→next: shares next with edges anchor→(anchor+1=split) and (anchor+1)→(anchor+2).
    const skipForNext = i === anchorIdx + 1;
    if (!skipForA && segmentsIntersect(a, p, e1, e2)) return true;
    if (next && !skipForNext && segmentsIntersect(p, next, e1, e2)) return true;
  }
  return false;
}

/**
 * Returns true if closing the outline (last → first) would cross any
 * non-adjacent existing edge.
 */
export function outlineCloseWouldCross(outline: Vec2[]): boolean {
  const n = outline.length;
  if (n < 4) return false; // triangle can't self-cross when closing
  const a = outline[n - 1];
  const b = outline[0];
  // Skip first edge (shares b) and last edge (shares a).
  for (let i = 1; i < n - 2; i++) {
    if (segmentsIntersect(a, b, outline[i], outline[i + 1])) return true;
  }
  return false;
}

export function bbox(poly: Vec2[]): {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
} {
  if (poly.length === 0) {
    return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  }
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX, minZ, maxX, maxZ };
}
