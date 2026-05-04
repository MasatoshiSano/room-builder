import type { FloorPlan, Furniture, Vec2 } from './types';
import { innerEdges, outerEdges, pointInPolygon } from './geometry';

export function getFurnitureCorners(f: Furniture): Vec2[] {
  const cos = Math.cos(f.rotationY);
  const sin = Math.sin(f.rotationY);
  const hw = f.width / 2;
  const hd = f.depth / 2;
  const local: Vec2[] = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];
  return local.map((p) => ({
    x: f.x + p.x * cos - p.z * sin,
    z: f.z + p.x * sin + p.z * cos,
  }));
}

function direction(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsIntersect(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  return false;
}

function pointInRect(p: Vec2, corners: Vec2[]): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const d = direction(a, b, p);
    if (d > 0) pos++;
    else if (d < 0) neg++;
  }
  return pos === 0 || neg === 0;
}

export function rectIntersectsSegment(
  corners: Vec2[],
  a: Vec2,
  b: Vec2,
): boolean {
  for (let i = 0; i < 4; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 4];
    if (segmentsIntersect(p1, p2, a, b)) return true;
  }
  if (pointInRect(a, corners) || pointInRect(b, corners)) return true;
  return false;
}

export interface PrecomputedEdges {
  outer: ReturnType<typeof outerEdges>;
  inner: ReturnType<typeof innerEdges>;
}

export function precomputeEdges(floor: FloorPlan): PrecomputedEdges {
  return {
    outer: outerEdges(floor.outline),
    inner: innerEdges(floor.innerWalls),
  };
}

export function isFurniturePlacementValid(
  candidate: Furniture,
  floor: FloorPlan,
  edges?: PrecomputedEdges,
): boolean {
  if (floor.outline.length < 3) return true;
  const corners = getFurnitureCorners(candidate);

  for (const c of corners) {
    if (!pointInPolygon(c, floor.outline)) return false;
  }
  const outer = edges?.outer ?? outerEdges(floor.outline);
  const inner = edges?.inner ?? innerEdges(floor.innerWalls);
  for (const e of outer) {
    if (rectIntersectsSegment(corners, e.start, e.end)) return false;
  }
  for (const e of inner) {
    if (rectIntersectsSegment(corners, e.start, e.end)) return false;
  }
  return true;
}
