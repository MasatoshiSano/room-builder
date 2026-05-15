import { useEffect, useMemo } from 'react';
import {
  BufferAttribute,
  DoubleSide,
  Shape,
  ShapeGeometry,
  type CanvasTexture,
} from 'three';
import {
  DEFAULT_FLOOR_PATTERN,
  type FloorPattern,
  type FloorRegion,
  type Vec2,
} from '../lib/types';
import { buildPlankTexture, tileSize } from '../lib/floorTexture';

interface FloorProps {
  outline: Vec2[];
  /** Legacy single color (kept for back-compat). Used as default pattern color when pattern is missing. */
  color: string;
  /** Default flooring pattern for the whole room. */
  pattern?: FloorPattern;
  /** Per-region overrides (rendered on top of base, slightly elevated). */
  regions?: FloorRegion[];
}

/** Build a polygon mesh + UV from world coords for plank texturing. */
function makePolyGeometry(polygon: Vec2[]): ShapeGeometry | null {
  if (polygon.length < 3) return null;
  const shape = new Shape();
  shape.moveTo(polygon[0].x, polygon[0].z);
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i].x, polygon[i].z);
  }
  shape.closePath();
  const g = new ShapeGeometry(shape);
  g.rotateX(Math.PI / 2);
  // Custom UVs: world (x,z) → uv directly.
  const positions = g.attributes.position.array as Float32Array;
  const count = positions.length / 3;
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    uv[i * 2] = positions[i * 3]; // x
    uv[i * 2 + 1] = positions[i * 3 + 2]; // z
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function configureTexture(tex: CanvasTexture, p: FloorPattern): void {
  const { len, wid2 } = tileSize(p);
  tex.repeat.set(1 / len, 1 / wid2);
  tex.center.set(0, 0);
  tex.rotation = p.direction;
  tex.needsUpdate = true;
}

/** Single textured floor patch (used for both base and per-region). */
function FloorPatch({
  polygon,
  pattern,
  y = 0,
  receiveShadow = true,
}: {
  polygon: Vec2[];
  pattern: FloorPattern;
  y?: number;
  receiveShadow?: boolean;
}) {
  const tex = useMemo(() => buildPlankTexture(pattern), [pattern]);
  const geometry = useMemo(() => makePolyGeometry(polygon), [polygon]);

  useEffect(() => () => tex.dispose(), [tex]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  useEffect(() => {
    configureTexture(tex, pattern);
  }, [tex, pattern]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={[0, y, 0]}
      receiveShadow={receiveShadow}
    >
      <meshStandardMaterial
        map={tex}
        side={DoubleSide}
        roughness={0.7}
        metalness={0.05}
      />
    </mesh>
  );
}

export function Floor({ outline, color, pattern, regions }: FloorProps) {
  const effectivePattern: FloorPattern = useMemo(
    () => pattern ?? { ...DEFAULT_FLOOR_PATTERN, color },
    [pattern, color],
  );

  if (outline.length < 3) return null;

  return (
    <group>
      <FloorPatch polygon={outline} pattern={effectivePattern} y={0} />
      {regions?.map((r) => (
        <FloorPatch
          key={r.id}
          polygon={r.polygon}
          pattern={r.pattern}
          // Slight elevation to win the depth fight against the base floor.
          y={0.0015}
        />
      ))}
    </group>
  );
}
