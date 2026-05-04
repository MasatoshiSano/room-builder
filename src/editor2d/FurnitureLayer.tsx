import { useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import type { Furniture, Vec2 } from '../lib/types';
import type { Transform2D } from './use2DTransform';
import {
  isFurniturePlacementValid,
  precomputeEdges,
  type PrecomputedEdges,
} from '../lib/collision';

interface Props {
  transform: Transform2D;
  toWorldFromScreen: (sx: number, sy: number, snapped: boolean) => Vec2;
  enabled: boolean;
}

type DragState =
  | {
      kind: 'move';
      id: string;
      start: Vec2;
      orig: Furniture;
      edges: PrecomputedEdges;
    }
  | {
      kind: 'resize';
      id: string;
      corner: 'nw' | 'ne' | 'sw' | 'se';
      anchor: Vec2;
      orig: Furniture;
      edges: PrecomputedEdges;
    };

const SCALE_HANDLE = 7;

export function FurnitureLayer({ transform, toWorldFromScreen, enabled }: Props) {
  const furniture = useRoomStore((s) => s.furniture);
  const floor = useRoomStore((s) => s.floor);
  const selection = useRoomStore((s) => s.selection);
  const setSelection = useRoomStore((s) => s.setSelection);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const dragRef = useRef<DragState | null>(null);
  const [dragInvalidId, setDragInvalidId] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, f: Furniture) => {
    if (!enabled) return;
    e.stopPropagation();
    setSelection({ kind: 'furniture', id: f.id });
    const p = toWorldFromScreen(e.clientX, e.clientY, false);
    dragRef.current = {
      kind: 'move',
      id: f.id,
      start: p,
      orig: { ...f },
      edges: precomputeEdges(floor),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleResizeDown = (
    e: React.PointerEvent,
    f: Furniture,
    corner: 'nw' | 'ne' | 'sw' | 'se',
  ) => {
    e.stopPropagation();
    setSelection({ kind: 'furniture', id: f.id });
    const half = { x: f.width / 2, z: f.depth / 2 };
    const sign = {
      nw: { x: 1, z: 1 },
      ne: { x: -1, z: 1 },
      sw: { x: 1, z: -1 },
      se: { x: -1, z: -1 },
    }[corner];
    const anchorLocal = { x: half.x * sign.x, z: half.z * sign.z };
    const anchorWorld = localToWorld(anchorLocal, f);
    dragRef.current = {
      kind: 'resize',
      id: f.id,
      corner,
      anchor: anchorWorld,
      orig: { ...f },
      edges: precomputeEdges(floor),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toWorldFromScreen(e.clientX, e.clientY, true);

    if (d.kind === 'move') {
      const dx = p.x - d.start.x;
      const dz = p.z - d.start.z;
      const newX = d.orig.x + dx;
      const newZ = d.orig.z + dz;
      updateFurniture(d.id, {
        x: newX,
        z: newZ,
      });
      const candidate = { ...d.orig, x: newX, z: newZ };
      const valid = isFurniturePlacementValid(candidate, floor, d.edges);
      setDragInvalidId(valid ? null : d.id);
      return;
    }

    if (d.kind === 'resize') {
      const cos = Math.cos(d.orig.rotationY);
      const sin = Math.sin(d.orig.rotationY);
      const rdx = p.x - d.anchor.x;
      const rdz = p.z - d.anchor.z;
      const lx = rdx * cos + rdz * sin;
      const lz = -rdx * sin + rdz * cos;
      const newW = Math.max(0.1, Math.abs(lx));
      const newD = Math.max(0.1, Math.abs(lz));
      const cxLocal = lx / 2;
      const czLocal = lz / 2;
      const cxWorld = d.anchor.x + cxLocal * cos - czLocal * sin;
      const czWorld = d.anchor.z + cxLocal * sin + czLocal * cos;
      updateFurniture(d.id, {
        width: newW,
        depth: newD,
        x: cxWorld,
        z: czWorld,
      });
      const candidate = {
        ...d.orig,
        width: newW,
        depth: newD,
        x: cxWorld,
        z: czWorld,
      };
      const valid = isFurniturePlacementValid(candidate, floor, d.edges);
      setDragInvalidId(valid ? null : d.id);
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    // On drop: if invalid, revert to original.
    const current = useRoomStore
      .getState()
      .furniture.find((x) => x.id === d.id);
    if (current && !isFurniturePlacementValid(current, floor, d.edges)) {
      if (d.kind === 'move') {
        updateFurniture(d.id, { x: d.orig.x, z: d.orig.z });
      } else {
        updateFurniture(d.id, {
          width: d.orig.width,
          depth: d.orig.depth,
          x: d.orig.x,
          z: d.orig.z,
        });
      }
    }
    dragRef.current = null;
    setDragInvalidId(null);
  };

  return (
    <g
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {furniture.map((f) => {
        const isSel =
          selection?.kind === 'furniture' && selection.id === f.id;
        const center = transform.toScreen({ x: f.x, z: f.z });
        const w = f.width * transform.scale;
        const d = f.depth * transform.scale;
        const angleDeg = (f.rotationY * 180) / Math.PI;
        const isInvalid = dragInvalidId === f.id;

        return (
          <g
            key={f.id}
            transform={`translate(${center.x},${center.y}) rotate(${angleDeg})`}
          >
            {isInvalid && (
              <rect
                x={-w / 2 - 6}
                y={-d / 2 - 6}
                width={w + 12}
                height={d + 12}
                fill="#dc2626"
                opacity={0.25}
                pointerEvents="none"
              />
            )}
            {isSel && !isInvalid && (
              <rect
                x={-w / 2 - 4}
                y={-d / 2 - 4}
                width={w + 8}
                height={d + 8}
                fill="#22d3ee"
                opacity={0.35}
                pointerEvents="none"
              />
            )}
            {f.type === 'roundTable' ? (
              <ellipse
                cx={0}
                cy={0}
                rx={w / 2}
                ry={d / 2}
                fill={f.color}
                stroke={isInvalid ? '#dc2626' : isSel ? '#1f4b8e' : '#2a2a2a'}
                strokeWidth={isInvalid ? 3 : isSel ? 2 : 1}
                fillOpacity={0.85}
                style={{
                  cursor: enabled ? (isSel ? 'move' : 'pointer') : 'default',
                }}
                onPointerDown={(e) => handlePointerDown(e, f)}
              />
            ) : (
              <rect
                x={-w / 2}
                y={-d / 2}
                width={w}
                height={d}
                fill={f.color}
                stroke={isInvalid ? '#dc2626' : isSel ? '#1f4b8e' : '#2a2a2a'}
                strokeWidth={isInvalid ? 3 : isSel ? 2 : 1}
                fillOpacity={0.85}
                style={{
                  cursor: enabled ? (isSel ? 'move' : 'pointer') : 'default',
                }}
                onPointerDown={(e) => handlePointerDown(e, f)}
              />
            )}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-Math.min(d / 2, 18)}
              stroke={isSel ? '#1f4b8e' : '#555'}
              strokeWidth={1.5}
              pointerEvents="none"
            />
            {(w > 40 && d > 24) && (
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize="10"
                fill="#1a1a1a"
                pointerEvents="none"
              >
                {f.label}
              </text>
            )}
            {isSel && enabled && (
              <>
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                  const cx =
                    corner === 'nw' || corner === 'sw' ? -w / 2 : w / 2;
                  const cy =
                    corner === 'nw' || corner === 'ne' ? -d / 2 : d / 2;
                  const cursor =
                    corner === 'nw' || corner === 'se'
                      ? 'nwse-resize'
                      : 'nesw-resize';
                  return (
                    <rect
                      key={corner}
                      x={cx - SCALE_HANDLE}
                      y={cy - SCALE_HANDLE}
                      width={SCALE_HANDLE * 2}
                      height={SCALE_HANDLE * 2}
                      fill="#fff"
                      stroke="#1f4b8e"
                      strokeWidth={2}
                      style={{ cursor }}
                      onPointerDown={(e) => handleResizeDown(e, f, corner)}
                    />
                  );
                })}
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function localToWorld(local: Vec2, f: Furniture): Vec2 {
  const cos = Math.cos(f.rotationY);
  const sin = Math.sin(f.rotationY);
  return {
    x: f.x + local.x * cos - local.z * sin,
    z: f.z + local.x * sin + local.z * cos,
  };
}
