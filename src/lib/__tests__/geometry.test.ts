import { describe, expect, it } from 'vitest';
import {
  bbox,
  closestOnSegment,
  distance,
  ensureCCW,
  outerEdges,
  outlineAppendWouldCross,
  outlineCloseWouldCross,
  outlineInsertWouldCross,
  pointInPolygon,
  segmentsIntersect,
  signedArea,
  snap,
  snapPoint,
} from '../geometry';
import type { Vec2 } from '../types';

const square: Vec2[] = [
  { x: 0, z: 0 },
  { x: 2, z: 0 },
  { x: 2, z: 2 },
  { x: 0, z: 2 },
];

describe('signedArea', () => {
  it('is positive for CCW (in z-down convention)', () => {
    expect(signedArea(square)).toBeGreaterThan(0);
  });

  it('flips sign for reversed polygon', () => {
    const rev = [...square].reverse();
    expect(signedArea(rev)).toBeLessThan(0);
  });

  it('returns the same polygon when CCW', () => {
    expect(ensureCCW(square)).toBe(square);
  });

  it('reverses CW polygon to CCW', () => {
    const cw = [...square].reverse();
    const result = ensureCCW(cw);
    expect(signedArea(result)).toBeGreaterThan(0);
  });
});

describe('pointInPolygon', () => {
  it('detects center inside square', () => {
    expect(pointInPolygon({ x: 1, z: 1 }, square)).toBe(true);
  });

  it('detects point outside square', () => {
    expect(pointInPolygon({ x: -1, z: 1 }, square)).toBe(false);
  });

  it('handles L-shape concave polygon (point in concave notch is outside)', () => {
    const lShape: Vec2[] = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 4 },
      { x: 0, z: 4 },
    ];
    expect(pointInPolygon({ x: 1, z: 1 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 1 }, lShape)).toBe(true);
    // point in the concave notch is outside
    expect(pointInPolygon({ x: 3, z: 3 }, lShape)).toBe(false);
  });
});

describe('closestOnSegment', () => {
  it('returns t in [0,1] for any point', () => {
    const a: Vec2 = { x: 0, z: 0 };
    const b: Vec2 = { x: 10, z: 0 };
    const r = closestOnSegment({ x: 5, z: 5 }, a, b);
    expect(r.t).toBeCloseTo(0.5);
    expect(r.point).toEqual({ x: 5, z: 0 });
    expect(r.distance).toBeCloseTo(5);
  });

  it('handles degenerate segment without dividing by zero', () => {
    const a: Vec2 = { x: 1, z: 1 };
    const r = closestOnSegment({ x: 5, z: 5 }, a, a);
    expect(r.t).toBe(0);
    expect(r.point).toEqual(a);
    expect(r.distance).toBeCloseTo(distance({ x: 5, z: 5 }, a));
  });
});

describe('outerEdges', () => {
  it('returns N edges for an N-vertex polygon', () => {
    const edges = outerEdges(square);
    expect(edges).toHaveLength(4);
    expect(edges[0].ref).toEqual({ type: 'outer', edgeIndex: 0 });
    expect(edges[3].end).toEqual(square[0]);
  });
});

describe('bbox', () => {
  it('returns zeros for empty polygon', () => {
    expect(bbox([])).toEqual({ minX: 0, minZ: 0, maxX: 0, maxZ: 0 });
  });

  it('computes correct bounds', () => {
    const b = bbox(square);
    expect(b).toEqual({ minX: 0, minZ: 0, maxX: 2, maxZ: 2 });
  });
});

describe('snap', () => {
  it('snaps to nearest grid', () => {
    expect(snap(0.13, 0.1)).toBeCloseTo(0.1);
    expect(snap(0.16, 0.1)).toBeCloseTo(0.2);
  });

  it('snaps Vec2 fields independently', () => {
    const r = snapPoint({ x: 0.13, z: 0.27 }, 0.1);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.z).toBeCloseTo(0.3);
  });
});

describe('segmentsIntersect', () => {
  it('detects clear crossing', () => {
    expect(
      segmentsIntersect(
        { x: 0, z: 0 },
        { x: 2, z: 2 },
        { x: 0, z: 2 },
        { x: 2, z: 0 },
      ),
    ).toBe(true);
  });

  it('returns false when segments share an endpoint', () => {
    expect(
      segmentsIntersect(
        { x: 0, z: 0 },
        { x: 1, z: 1 },
        { x: 1, z: 1 },
        { x: 2, z: 0 },
      ),
    ).toBe(false);
  });

  it('returns false for separated segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: 0, z: 5 },
        { x: 1, z: 5 },
      ),
    ).toBe(false);
  });
});

describe('outlineAppendWouldCross', () => {
  it('false when outline has fewer than 2 vertices', () => {
    expect(outlineAppendWouldCross([], { x: 0, z: 0 })).toBe(false);
    expect(
      outlineAppendWouldCross([{ x: 0, z: 0 }], { x: 1, z: 1 }),
    ).toBe(false);
  });

  it('detects new edge crossing earlier edge', () => {
    // (0,0)→(2,0)→(2,2). Append (1,-2): new edge (2,2)→(1,-2) crosses
    // (0,0)→(2,0) at interior point (1.5, 0).
    const outline: Vec2[] = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 2 },
    ];
    expect(outlineAppendWouldCross(outline, { x: 1, z: -2 })).toBe(true);
  });

  it('does not flag valid extension', () => {
    const outline: Vec2[] = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 2 },
    ];
    expect(outlineAppendWouldCross(outline, { x: 0, z: 2 })).toBe(false);
  });
});

describe('outlineCloseWouldCross', () => {
  it('false for triangle (cannot self-cross)', () => {
    const tri: Vec2[] = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 1, z: 2 },
    ];
    expect(outlineCloseWouldCross(tri)).toBe(false);
  });

  it('detects bowtie close', () => {
    // (0,0)→(2,2)→(2,0)→(0,2): closing (0,2)→(0,0) crosses (2,2)→(2,0)? No.
    // Use clearer bowtie: (0,0)→(2,0)→(0,2)→(2,2). Closing (2,2)→(0,0) crosses (2,0)→(0,2).
    const bowtie: Vec2[] = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 0, z: 2 },
      { x: 2, z: 2 },
    ];
    expect(outlineCloseWouldCross(bowtie)).toBe(true);
  });
});

describe('outlineInsertWouldCross', () => {
  const square: Vec2[] = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ];

  it('false when inserting in a benign location', () => {
    // Insert between idx 0 and idx 1 a point above the (0,0)-(4,0) edge.
    expect(outlineInsertWouldCross(square, 0, { x: 2, z: -1 })).toBe(false);
  });

  it('detects a clearly crossing insertion', () => {
    // Insert P=(2,6) between idx 1=(4,0) and idx 2=(4,4). New edge
    // (4,0)→(2,6) crosses the non-adjacent edge (4,4)→(0,4) at x≈2.67.
    expect(outlineInsertWouldCross(square, 1, { x: 2, z: 6 })).toBe(true);
  });

  it('false at boundary indices', () => {
    expect(outlineInsertWouldCross(square, -1, { x: 1, z: 1 })).toBe(false);
    expect(outlineInsertWouldCross(square, 99, { x: 1, z: 1 })).toBe(false);
  });
});
