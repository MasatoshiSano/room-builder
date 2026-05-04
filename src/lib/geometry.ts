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
