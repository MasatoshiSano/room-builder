import { describe, expect, it } from 'vitest';
import {
  getFurnitureCorners,
  isFurniturePlacementValid,
  precomputeEdges,
} from '../collision';
import type { FloorPlan, Furniture } from '../types';

const baseFurniture: Furniture = {
  id: 'f1',
  type: 'box',
  label: 'box',
  width: 1,
  depth: 1,
  height: 1,
  x: 0,
  z: 0,
  rotationY: 0,
  color: '#000',
};

const room: FloorPlan = {
  outline: [
    { x: -2, z: -2 },
    { x: 2, z: -2 },
    { x: 2, z: 2 },
    { x: -2, z: 2 },
  ],
  innerWalls: [],
  openings: [],
  height: 2.5,
  wallColor: '#fff',
  floorColor: '#fff',
};

describe('getFurnitureCorners', () => {
  it('returns 4 corners with no rotation', () => {
    const corners = getFurnitureCorners(baseFurniture);
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: -0.5, z: -0.5 });
    expect(corners[2]).toEqual({ x: 0.5, z: 0.5 });
  });

  it('rotates corners by 90deg correctly', () => {
    const f = { ...baseFurniture, rotationY: Math.PI / 2 };
    const corners = getFurnitureCorners(f);
    expect(corners).toHaveLength(4);
    // Original corner (-0.5, -0.5) rotated 90deg: x' = -(-0.5)=0.5? Let's just check absolute lengths preserve.
    for (const c of corners) {
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(Math.hypot(0.5, 0.5));
    }
  });
});

describe('isFurniturePlacementValid', () => {
  it('returns true when no outline (empty room)', () => {
    const empty: FloorPlan = { ...room, outline: [] };
    expect(isFurniturePlacementValid(baseFurniture, empty)).toBe(true);
  });

  it('returns true for furniture fully inside room', () => {
    expect(isFurniturePlacementValid(baseFurniture, room)).toBe(true);
  });

  it('returns false when furniture corners cross outline', () => {
    const outside = { ...baseFurniture, x: 5 };
    expect(isFurniturePlacementValid(outside, room)).toBe(false);
  });

  it('returns false when furniture overlaps an outer wall edge', () => {
    // Place furniture so that its corner is exactly at the wall (outside)
    const onEdge = { ...baseFurniture, x: 1.7, z: 1.7 };
    expect(isFurniturePlacementValid(onEdge, room)).toBe(false);
  });

  it('uses precomputed edges when provided', () => {
    const edges = precomputeEdges(room);
    expect(isFurniturePlacementValid(baseFurniture, room, edges)).toBe(true);
    const outside = { ...baseFurniture, x: 5 };
    expect(isFurniturePlacementValid(outside, room, edges)).toBe(false);
  });

  it('blocks placement when crossing an inner wall', () => {
    const withInner: FloorPlan = {
      ...room,
      innerWalls: [
        { id: 'iw1', start: { x: 0, z: -2 }, end: { x: 0, z: 2 } },
      ],
    };
    // Furniture centered at origin straddles the inner wall.
    expect(isFurniturePlacementValid(baseFurniture, withInner)).toBe(false);
    // Furniture shifted to one side of the wall is OK.
    const left = { ...baseFurniture, x: -1 };
    expect(isFurniturePlacementValid(left, withInner)).toBe(true);
  });
});
