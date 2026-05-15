import { useEffect, useMemo } from 'react';
import { DoubleSide, Shape, ShapeGeometry } from 'three';
import type { Vec2 } from '../lib/types';

interface FloorProps {
  outline: Vec2[];
  color: string;
}

export function Floor({ outline, color }: FloorProps) {
  const geometry = useMemo(() => {
    if (outline.length < 3) return null;
    const shape = new Shape();
    shape.moveTo(outline[0].x, outline[0].z);
    for (let i = 1; i < outline.length; i++) {
      shape.lineTo(outline[i].x, outline[i].z);
    }
    shape.closePath();
    const g = new ShapeGeometry(shape);
    g.rotateX(Math.PI / 2);
    return g;
  }, [outline]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={color}
        side={DoubleSide}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}
