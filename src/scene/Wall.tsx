import { useMemo } from 'react';
import { BackSide, DoubleSide, FrontSide, type ColorRepresentation } from 'three';
import type { Vec2 } from '../lib/types';
import { computeWallSegments, type OpeningSpec } from '../lib/wallSegments';

interface WallProps {
  start: Vec2;
  end: Vec2;
  height: number;
  thickness: number; // 0 = plane
  openings: OpeningSpec[];
  color: ColorRepresentation;
  /** outer = single-sided BackSide so camera outside sees through */
  variant: 'outer' | 'inner';
  /** When true, walls are fully opaque and intercept pointer events. */
  opaque?: boolean;
  /** Opacity in non-opaque (normal) mode. 0..1. Default 0.6. */
  opacity?: number;
}

export function Wall({
  start,
  end,
  height,
  thickness,
  openings,
  color,
  variant,
  opaque = false,
  opacity = 0.6,
}: WallProps) {
  const length = useMemo(() => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [start, end]);

  const angle = useMemo(() => {
    return Math.atan2(end.x - start.x, end.z - start.z);
  }, [start, end]);

  const segments = useMemo(
    () => computeWallSegments(length, height, openings),
    [length, height, openings],
  );

  if (length <= 0) return null;

  const isOuter = variant === 'outer';
  const side = opaque
    ? isOuter
      ? FrontSide
      : DoubleSide
    : isOuter
      ? BackSide
      : DoubleSide;

  return (
    <group
      position={[start.x, 0, start.z]}
      rotation={[0, angle - Math.PI / 2, 0]}
      onPointerDown={
        opaque
          ? (e) => {
              // Block clicks from passing through walls to furniture behind them.
              e.stopPropagation();
            }
          : undefined
      }
    >
      {segments.map((seg, i) => {
        const w = seg.u1 - seg.u0;
        const h = seg.v1 - seg.v0;
        const cx = (seg.u0 + seg.u1) / 2;
        const cy = (seg.v0 + seg.v1) / 2;

        const t = thickness === 0 ? 0.08 : thickness;
        return (
          <mesh
            key={i}
            position={[cx, cy, 0]}
            castShadow={!isOuter}
            receiveShadow
          >
            <boxGeometry args={[w, h, t]} />
            <meshStandardMaterial
              color={color}
              side={side}
              transparent={!opaque}
              opacity={opaque ? 1 : opacity}
              depthWrite={opaque || opacity >= 0.99}
            />
          </mesh>
        );
      })}
    </group>
  );
}
