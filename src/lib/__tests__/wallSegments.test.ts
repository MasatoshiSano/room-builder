import { describe, expect, it } from 'vitest';
import { computeWallSegments, type OpeningSpec } from '../wallSegments';

const WALL = { length: 5, height: 3 };

describe('computeWallSegments', () => {
  it('returns one full-wall segment when no openings', () => {
    const segs = computeWallSegments(WALL.length, WALL.height, []);
    expect(segs).toEqual([
      { u0: 0, v0: 0, u1: 5, v1: 3 },
    ]);
  });

  it('handles a single door at the left edge', () => {
    const door: OpeningSpec = { offset: 0, width: 1, height: 2, sillHeight: 0 };
    const segs = computeWallSegments(WALL.length, WALL.height, [door]);
    // top-piece above door + right-piece to end of wall
    expect(segs).toContainEqual({ u0: 0, v0: 2, u1: 1, v1: 3 });
    expect(segs).toContainEqual({ u0: 1, v0: 0, u1: 5, v1: 3 });
  });

  it('handles a window with sill above floor', () => {
    const win: OpeningSpec = { offset: 1, width: 2, height: 1, sillHeight: 1 };
    const segs = computeWallSegments(WALL.length, WALL.height, [win]);
    // left of window (u 0..1)
    expect(segs).toContainEqual({ u0: 0, v0: 0, u1: 1, v1: 3 });
    // sill below window (v 0..1, u 1..3)
    expect(segs).toContainEqual({ u0: 1, v0: 0, u1: 3, v1: 1 });
    // header above window (v 2..3, u 1..3)
    expect(segs).toContainEqual({ u0: 1, v0: 2, u1: 3, v1: 3 });
    // right of window (u 3..5)
    expect(segs).toContainEqual({ u0: 3, v0: 0, u1: 5, v1: 3 });
  });

  it('preserves union top when merging overlapping openings (US-001 regression)', () => {
    // door sill=0 height=2 (top=2) overlapping window sill=1.5 height=0.5 (top=2)
    // top of merged = max(2, 2) = 2; sill = min(0, 1.5) = 0
    const door: OpeningSpec = { offset: 0, width: 1, height: 2, sillHeight: 0 };
    const win: OpeningSpec = {
      offset: 0.5,
      width: 1,
      height: 0.5,
      sillHeight: 1.5,
    };
    const segs = computeWallSegments(5, 3, [door, win]);
    // The merged opening occupies u 0..1.5, sill 0, top 2.
    // Expect a header strip from v=2 to v=3 spanning u 0..1.5
    expect(segs).toContainEqual({ u0: 0, v0: 2, u1: 1.5, v1: 3 });
    // No sill strip (sill=0 means no piece below opening)
    expect(segs.find((s) => s.v0 === 0 && s.v1 < 2 && s.u0 < 1.5)).toBeUndefined();
  });

  it('preserves union top when merging where second opening extends higher', () => {
    // first sill=0 h=1 (top=1), second sill=0 h=2 (top=2) overlapping
    // expected merged: sill=0 top=2 height=2
    const a: OpeningSpec = { offset: 0, width: 1, height: 1, sillHeight: 0 };
    const b: OpeningSpec = { offset: 0.5, width: 1, height: 2, sillHeight: 0 };
    const segs = computeWallSegments(5, 3, [a, b]);
    // header from v=2 to v=3 across u 0..1.5
    expect(segs).toContainEqual({ u0: 0, v0: 2, u1: 1.5, v1: 3 });
  });

  it('does not zero out an opening with sillHeight=2 height=1 in a 3m wall (US-001 regression)', () => {
    const win: OpeningSpec = {
      offset: 1,
      width: 1,
      height: 1,
      sillHeight: 2,
    };
    const segs = computeWallSegments(5, 3, [win]);
    // Sill piece below the opening (v 0..2, u 1..2)
    expect(segs).toContainEqual({ u0: 1, v0: 0, u1: 2, v1: 2 });
    // No header (top reaches ceiling exactly, since 2+1==3)
    // Right wall piece u 2..5
    expect(segs).toContainEqual({ u0: 2, v0: 0, u1: 5, v1: 3 });
  });

  it('clamps an opening that extends past the right edge', () => {
    const door: OpeningSpec = {
      offset: 4.5,
      width: 1,
      height: 2,
      sillHeight: 0,
    };
    const segs = computeWallSegments(5, 3, [door]);
    // wall left of opening u 0..4.5
    expect(segs).toContainEqual({ u0: 0, v0: 0, u1: 4.5, v1: 3 });
    // header above clamped door (width clamped to 0.5)
    expect(segs).toContainEqual({ u0: 4.5, v0: 2, u1: 5, v1: 3 });
  });

  it('returns no segments when length or height is zero', () => {
    expect(computeWallSegments(0, 3, [])).toEqual([]);
    expect(computeWallSegments(5, 0, [])).toEqual([]);
  });
});
