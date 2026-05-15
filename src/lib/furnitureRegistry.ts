import type { ComponentType } from 'react';
import type { Furniture, FurnitureType } from './types';

export interface ShapeProps {
  width: number;
  depth: number;
  height: number;
  color: string;
}

export type Shape = ComponentType<ShapeProps>;

export interface MaterialProfile {
  /** Surface roughness (0=mirror, 1=matte). */
  roughness: number;
  /** Metallic factor (0=dielectric, 1=metallic). */
  metalness: number;
}

export interface StackingProfile {
  /** Allowed to overlap a non-stackable supporter (e.g. chair under table). */
  stackable: boolean;
  /** Should be rendered on top of the supporter (e.g. microwave on counter). */
  onTop: boolean;
}

export interface FurnitureMeta {
  type: FurnitureType;
  label: string;
  /** Display category in the sidebar. */
  category:
    | 'living'
    | 'bedroom'
    | 'dining'
    | 'kitchen'
    | 'bath'
    | 'storage'
    | 'misc';
  /** Default size in meters. */
  defaults: { width: number; depth: number; height: number; color: string };
  /** PBR material profile (per type, used as fallback when shape doesn't override). */
  material: MaterialProfile;
  /** Stack/overlap behavior (for collision logic). */
  stacking: StackingProfile;
  /** 3D React component (lazy registered). */
  Shape: Shape;
  /** Optional 2D top-down silhouette: 'rect' | 'ellipse'. */
  silhouette: 'rect' | 'ellipse';
}

const REGISTRY = new Map<FurnitureType, FurnitureMeta>();

export function registerFurniture(meta: FurnitureMeta): void {
  REGISTRY.set(meta.type, meta);
}

export function getFurnitureMeta(type: FurnitureType): FurnitureMeta {
  const m = REGISTRY.get(type);
  if (!m) {
    const fallback = REGISTRY.get('box');
    if (!fallback) {
      throw new Error(`furniture type not registered and no fallback: ${type}`);
    }
    return fallback;
  }
  return m;
}

export function listFurnitureTypes(): FurnitureType[] {
  return [...REGISTRY.keys()];
}

export function listFurnitureMeta(): FurnitureMeta[] {
  return [...REGISTRY.values()];
}

export function isStackable(type: FurnitureType): boolean {
  return REGISTRY.get(type)?.stacking.stackable ?? false;
}

export function isOnTop(type: FurnitureType): boolean {
  return REGISTRY.get(type)?.stacking.onTop ?? false;
}

export function makeFurnitureFromType(
  type: FurnitureType,
  pos: { x: number; z: number } = { x: 0, z: 0 },
): Omit<Furniture, 'id'> {
  const m = getFurnitureMeta(type);
  return {
    type,
    label: m.label,
    width: m.defaults.width,
    depth: m.defaults.depth,
    height: m.defaults.height,
    x: pos.x,
    z: pos.z,
    rotationY: 0,
    color: m.defaults.color,
  };
}
