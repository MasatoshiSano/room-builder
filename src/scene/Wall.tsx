import { useMemo } from 'react';
import { BackSide, DoubleSide, type ColorRepresentation } from 'three';
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
}

export function Wall({
  start,
  end,
  height,
  thickness,
  openings,
  color,
  variant,
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

  return (
    <group
      position={[start.x, 0, start.z]}
      rotation={[0, angle - Math.PI / 2, 0]}
    >
      {segments.map((seg, i) => {
        const w = seg.u1 - seg.u0;
        const h = seg.v1 - seg.v0;
        const cx = (seg.u0 + seg.u1) / 2;
        const cy = (seg.v0 + seg.v1) / 2;

        const t = thickness === 0 ? 0.08 : thickness;
        const isOuter = variant === 'outer';
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
              side={isOuter ? BackSide : DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
