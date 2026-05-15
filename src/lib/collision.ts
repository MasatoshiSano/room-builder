import type { FloorPlan, Furniture, Vec2 } from './types';
import { innerEdges, outerEdges, pointInPolygon } from './geometry';
import { isOnTop, isStackable } from './furnitureRegistry';

function canOverlap(a: Furniture, b: Furniture): boolean {
  // Allow stackable + non-stackable overlap (chair under table, microwave on counter, etc.)
  return isStackable(a.type) !== isStackable(b.type);
}

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

export function furnituresOverlap(a: Furniture, b: Furniture): boolean {
  const ca = getFurnitureCorners(a);
  const cb = getFurnitureCorners(b);
  for (let i = 0; i < 4; i++) {
    if (rectIntersectsSegment(cb, ca[i], ca[(i + 1) % 4])) return true;
    if (rectIntersectsSegment(ca, cb[i], cb[(i + 1) % 4])) return true;
  }
  return false;
}

export interface PlacementCheck {
  valid: boolean;
  /** ids of furniture this candidate collides with (only when invalid) */
  blockers: string[];
  /** ref keys of walls (outer-edgeIndex / inner-wallId) the candidate hits */
  wallHits: string[];
  /** true if any corner is outside the room */
  outsideRoom: boolean;
}

export function checkPlacement(
  candidate: Furniture,
  floor: FloorPlan,
  edges?: PrecomputedEdges,
  others?: Furniture[],
): PlacementCheck {
  const result: PlacementCheck = {
    valid: true,
    blockers: [],
    wallHits: [],
    outsideRoom: false,
  };
  if (floor.outline.length < 3) return result;
  const corners = getFurnitureCorners(candidate);

  for (const c of corners) {
    if (!pointInPolygon(c, floor.outline)) {
      result.outsideRoom = true;
      result.valid = false;
      break;
    }
  }
  const outer = edges?.outer ?? outerEdges(floor.outline);
  const inner = edges?.inner ?? innerEdges(floor.innerWalls);
  for (const e of outer) {
    if (rectIntersectsSegment(corners, e.start, e.end)) {
      const ref = e.ref;
      if (ref.type === 'outer') result.wallHits.push(`outer:${ref.edgeIndex}`);
      result.valid = false;
    }
  }
  for (const e of inner) {
    if (rectIntersectsSegment(corners, e.start, e.end)) {
      const ref = e.ref;
      if (ref.type === 'inner') result.wallHits.push(`inner:${ref.wallId}`);
      result.valid = false;
    }
  }
  if (others) {
    for (const other of others) {
      if (canOverlap(candidate, other)) continue;
      if (furnituresOverlap(candidate, other)) {
        result.blockers.push(other.id);
        result.valid = false;
      }
    }
  }
  return result;
}

export function isFurniturePlacementValid(
  candidate: Furniture,
  floor: FloorPlan,
  edges?: PrecomputedEdges,
  others?: Furniture[],
): boolean {
  return checkPlacement(candidate, floor, edges, others).valid;
}

/** Returns the top Y of the tallest non-stackable furniture this stackable rests on. */
export function computeStackY(target: Furniture, others: Furniture[]): number {
  if (!isOnTop(target.type)) return 0;
  let topY = 0;
  for (const o of others) {
    if (isStackable(o.type)) continue;
    if (furnituresOverlap(target, o)) {
      if (o.height > topY) topY = o.height;
    }
  }
  return topY;
}

/**
 * Returns true if the proposed outline is simple (no edge crosses any
 * non-adjacent edge). Used by the vertex-drag handler to reject moves that
 * would self-intersect the polygon.
 */
export function isOutlineSimple(outline: Vec2[]): boolean {
  const n = outline.length;
  if (n < 4) return true;
  for (let i = 0; i < n; i++) {
    const a1 = outline[i];
    const a2 = outline[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges (sharing a vertex).
      if (j === i || j === (i + 1) % n || (j + 1) % n === i) continue;
      const b1 = outline[j];
      const b2 = outline[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}
