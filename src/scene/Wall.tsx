import { useMemo } from 'react';
import {
  BackSide,
  DoubleSide,
  FrontSide,
  type ColorRepresentation,
} from 'three';
import type { Vec2 } from '../lib/types';
import { computeWallSegments, type OpeningSpec } from '../lib/wallSegments';

interface WallProps {
  start: Vec2;
  end: Vec2;
  height: number;
  thickness: number; // 0 = plane (outer)
  openings: (OpeningSpec & { kind?: 'door' | 'window' })[];
  color: ColorRepresentation;
  variant: 'outer' | 'inner';
  opaque?: boolean;
  opacity?: number;
  /** When true, outer walls also cast shadows. Inner walls always cast. */
  outerCastShadow?: boolean;
}

const FRAME_THICKNESS = 0.04;
const FRAME_COLOR = '#3b3530';
const GLASS_COLOR = '#a3c8e6';

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
  outerCastShadow = false,
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

  const wallThickness = thickness === 0 ? 0.08 : thickness;
  const glassDepth = wallThickness * 0.4;

  return (
    <group
      position={[start.x, 0, start.z]}
      rotation={[0, angle - Math.PI / 2, 0]}
      onPointerDown={
        opaque
          ? (e) => {
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

        return (
          <mesh
            key={i}
            position={[cx, cy, 0]}
            castShadow={!isOuter || outerCastShadow}
            receiveShadow
          >
            <boxGeometry args={[w, h, wallThickness]} />
            <meshStandardMaterial
              color={color}
              side={side}
              transparent={!opaque}
              opacity={opaque ? 1 : opacity}
              depthWrite={opaque || opacity >= 0.99}
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
        );
      })}

      {/* Per-opening: render frame + (window only) glass */}
      {openings.map((op, i) => {
        const u0 = Math.max(0, op.offset);
        const u1 = Math.min(length, op.offset + op.width);
        const v0 = Math.max(0, op.sillHeight);
        const v1 = Math.min(height, op.sillHeight + op.height);
        const w = u1 - u0;
        const h = v1 - v0;
        if (w <= 0 || h <= 0) return null;
        const cx = (u0 + u1) / 2;
        const cy = (v0 + v1) / 2;
        const isWindow = op.kind === 'window';
        return (
          <group key={`op-${i}`} position={[cx, cy, 0]}>
            {/* top frame */}
            <mesh
              position={[0, h / 2 - FRAME_THICKNESS / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[w, FRAME_THICKNESS, wallThickness]} />
              <meshStandardMaterial
                color={FRAME_COLOR}
                roughness={0.6}
                metalness={0.05}
              />
            </mesh>
            {/* bottom frame (sill) — render only if there is a sill or for doors */}
            {(op.sillHeight > 0 || !isWindow) && (
              <mesh
                position={[0, -h / 2 + FRAME_THICKNESS / 2, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[w, FRAME_THICKNESS, wallThickness]} />
                <meshStandardMaterial
                  color={FRAME_COLOR}
                  roughness={0.6}
                  metalness={0.05}
                />
              </mesh>
            )}
            {/* left & right frames */}
            <mesh
              position={[-w / 2 + FRAME_THICKNESS / 2, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[FRAME_THICKNESS, h, wallThickness]} />
              <meshStandardMaterial
                color={FRAME_COLOR}
                roughness={0.6}
                metalness={0.05}
              />
            </mesh>
            <mesh
              position={[w / 2 - FRAME_THICKNESS / 2, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[FRAME_THICKNESS, h, wallThickness]} />
              <meshStandardMaterial
                color={FRAME_COLOR}
                roughness={0.6}
                metalness={0.05}
              />
            </mesh>
            {/* glass pane (window only) */}
            {isWindow && (
              <mesh receiveShadow>
                <boxGeometry
                  args={[
                    Math.max(0, w - FRAME_THICKNESS * 2),
                    Math.max(0, h - FRAME_THICKNESS * 2),
                    glassDepth,
                  ]}
                />
                <meshPhysicalMaterial
                  color={GLASS_COLOR}
                  transparent
                  opacity={0.35}
                  roughness={0.05}
                  metalness={0}
                  transmission={0.85}
                  thickness={0.02}
                  ior={1.45}
                  side={DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
