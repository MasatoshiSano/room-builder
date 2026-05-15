import { describe, expect, it, beforeAll } from 'vitest';
import {
  getFurnitureMeta,
  isOnTop,
  isStackable,
  listFurnitureMeta,
  listFurnitureTypes,
  makeFurnitureFromType,
  registerFurniture,
} from '../furnitureRegistry';
import { registerBuiltInShapes } from '../../scene/shapes/registry';
import type { FurnitureType } from '../types';

beforeAll(() => {
  registerBuiltInShapes();
});

describe('furnitureRegistry', () => {
  it('lists every built-in furniture type', () => {
    const types = listFurnitureTypes();
    expect(types).toContain('sofa');
    expect(types).toContain('bed');
    expect(types).toContain('washBasin');
    // Includes 'box' as the fallback
    expect(types).toContain('box');
    expect(types.length).toBeGreaterThanOrEqual(20);
  });

  it('listFurnitureMeta returns matching count', () => {
    expect(listFurnitureMeta().length).toBe(listFurnitureTypes().length);
  });

  it('getFurnitureMeta returns registered metadata', () => {
    const meta = getFurnitureMeta('sofa');
    expect(meta.type).toBe('sofa');
    expect(meta.label).toBeTruthy();
    expect(meta.defaults.width).toBeGreaterThan(0);
    expect(typeof meta.material.roughness).toBe('number');
  });

  it('falls back to box for unknown types instead of throwing', () => {
    const m = getFurnitureMeta('unicorn' as unknown as FurnitureType);
    expect(m.type).toBe('box');
  });

  it('isStackable / isOnTop reflect built-in metadata', () => {
    expect(isStackable('chair')).toBe(true);
    expect(isStackable('sofa')).toBe(false);
    expect(isOnTop('microwave')).toBe(true);
    expect(isOnTop('chair')).toBe(false);
  });

  it('makeFurnitureFromType honors position arg and defaults otherwise', () => {
    const a = makeFurnitureFromType('chair');
    expect(a.x).toBe(0);
    expect(a.z).toBe(0);
    expect(a.width).toBe(getFurnitureMeta('chair').defaults.width);
    const b = makeFurnitureFromType('chair', { x: 1.5, z: -2 });
    expect(b.x).toBe(1.5);
    expect(b.z).toBe(-2);
  });

  it('registerFurniture overrides existing entries', () => {
    const orig = getFurnitureMeta('sofa');
    registerFurniture({
      ...orig,
      defaults: { ...orig.defaults, color: '#ff0000' },
    });
    expect(getFurnitureMeta('sofa').defaults.color).toBe('#ff0000');
    // Restore for other tests.
    registerFurniture(orig);
  });
});
