import { useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import type { Furniture, Vec2 } from '../lib/types';
import type { Transform2D } from './use2DTransform';
import {
  checkPlacement,
  precomputeEdges,
  type PrecomputedEdges,
} from '../lib/collision';
import { getFurnitureMeta } from '../lib/furnitureRegistry';

interface Props {
  transform: Transform2D;
  toWorldFromScreen: (sx: number, sy: number, snapped: boolean) => Vec2;
  enabled: boolean;
}

type DragState =
  | {
      kind: 'move';
      ids: string[];
      origMap: Map<string, Furniture>;
      start: Vec2;
      edges: PrecomputedEdges;
      others: Furniture[];
      lastDelta: { dx: number; dz: number };
    }
  | {
      kind: 'resize';
      id: string;
      corner: 'nw' | 'ne' | 'sw' | 'se';
      anchor: Vec2;
      orig: Furniture;
      edges: PrecomputedEdges;
      others: Furniture[];
      live: Partial<Furniture>;
    };

const SCALE_HANDLE = 7;

export function FurnitureLayer({
  transform,
  toWorldFromScreen,
  enabled,
}: Props) {
  const furniture = useRoomStore((s) => s.furniture);
  const floor = useRoomStore((s) => s.floor);
  const selection = useRoomStore((s) => s.selection);
  const selections = useRoomStore((s) => s.selections);
  const setSelection = useRoomStore((s) => s.setSelection);
  const toggleInSelection = useRoomStore((s) => s.toggleInSelection);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const translateFurnitures = useRoomStore((s) => s.translateFurnitures);
  const dragRef = useRef<DragState | null>(null);
  const [dragInvalidIds, setDragInvalidIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveOffsets, setLiveOffsets] = useState<Map<string, Vec2>>(
    () => new Map(),
  );
  const [liveResize, setLiveResize] = useState<{
    id: string;
    width: number;
    depth: number;
    x: number;
    z: number;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, f: Furniture) => {
    if (!enabled) return;
    e.stopPropagation();
    const me = { kind: 'furniture' as const, id: f.id };
    if (e.shiftKey) {
      toggleInSelection(me);
    } else {
      const isAlreadyInGroup = selections.some(
        (s) => s.kind === 'furniture' && s.id === f.id,
      );
      if (!isAlreadyInGroup || selections.length <= 1) {
        setSelection(me);
      }
    }
    const groupIds = useRoomStore
      .getState()
      .selections.filter((s) => s.kind === 'furniture')
      .map((s) => s.id);
    const ids = groupIds.includes(f.id) && groupIds.length > 1 ? groupIds : [f.id];
    const p = toWorldFromScreen(e.clientX, e.clientY, false);
    const origMap = new Map<string, Furniture>();
    for (const id of ids) {
      const orig = furniture.find((x) => x.id === id);
      if (orig) origMap.set(id, { ...orig });
    }
    dragRef.current = {
      kind: 'move',
      ids,
      origMap,
      start: p,
      edges: precomputeEdges(floor),
      others: furniture.filter((o) => !ids.includes(o.id)),
      lastDelta: { dx: 0, dz: 0 },
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
      others: furniture.filter((o) => o.id !== f.id),
      live: {},
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
      d.lastDelta = { dx, dz };
      const offsets = new Map<string, Vec2>();
      const invalidIds = new Set<string>();
      for (const id of d.ids) {
        const orig = d.origMap.get(id);
        if (!orig) continue;
        const cand = { ...orig, x: orig.x + dx, z: orig.z + dz };
        offsets.set(id, { x: cand.x, z: cand.z });
        // Validate against floor + the OTHER non-selected items
        // (but allow overlap among selected siblings).
        const v = checkPlacement(cand, floor, d.edges, d.others);
        if (!v.valid) invalidIds.add(id);
      }
      setLiveOffsets(offsets);
      setDragInvalidIds(invalidIds);
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
      d.live = { width: newW, depth: newD, x: cxWorld, z: czWorld };
      setLiveResize({ id: d.id, width: newW, depth: newD, x: cxWorld, z: czWorld });
      const cand = {
        ...d.orig,
        width: newW,
        depth: newD,
        x: cxWorld,
        z: czWorld,
      };
      const v = checkPlacement(cand, floor, d.edges, d.others);
      setDragInvalidIds(v.valid ? new Set() : new Set([d.id]));
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'move') {
      const { dx, dz } = d.lastDelta;
      // Verify all targets ended in valid positions; if any invalid, revert.
      let allValid = true;
      for (const id of d.ids) {
        const orig = d.origMap.get(id);
        if (!orig) continue;
        const cand = { ...orig, x: orig.x + dx, z: orig.z + dz };
        if (!checkPlacement(cand, floor, d.edges, d.others).valid) {
          allValid = false;
          break;
        }
      }
      if (allValid && (dx !== 0 || dz !== 0)) {
        translateFurnitures(d.ids, dx, dz);
      }
    } else {
      // resize: commit if valid, else revert
      const cand = { ...d.orig, ...d.live };
      const v = checkPlacement(cand, floor, d.edges, d.others);
      if (v.valid && d.live.width !== undefined) {
        updateFurniture(d.id, d.live);
      }
    }
    dragRef.current = null;
    setLiveOffsets(new Map());
    setLiveResize(null);
    setDragInvalidIds(new Set());
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
        const isInGroup =
          selections.some((s) => s.kind === 'furniture' && s.id === f.id);
        const liveOff = liveOffsets.get(f.id);
        const liveR = liveResize?.id === f.id ? liveResize : null;
        const x = liveOff ? liveOff.x : liveR ? liveR.x : f.x;
        const z = liveOff ? liveOff.z : liveR ? liveR.z : f.z;
        const w = (liveR ? liveR.width : f.width) * transform.scale;
        const d = (liveR ? liveR.depth : f.depth) * transform.scale;
        const center = transform.toScreen({ x, z });
        const angleDeg = (f.rotationY * 180) / Math.PI;
        const isInvalid = dragInvalidIds.has(f.id);
        const meta = getFurnitureMeta(f.type);

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
            {isInGroup && !isInvalid && (
              <rect
                x={-w / 2 - 4}
                y={-d / 2 - 4}
                width={w + 8}
                height={d + 8}
                fill={isSel ? '#22d3ee' : '#3b82f6'}
                opacity={isSel ? 0.35 : 0.2}
                pointerEvents="none"
              />
            )}
            {meta.silhouette === 'ellipse' ? (
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
            {/* Front indicator: points to +z (local "front") so it stays
                consistent with shape conventions in 3D — sofa seats / TV
                screens / chair fronts all face +z when rotationY = 0. */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={Math.min(d / 2, 18)}
              stroke={isSel ? '#1f4b8e' : '#555'}
              strokeWidth={1.5}
              pointerEvents="none"
            />
            {w > 40 && d > 24 && (
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
            {isSel && enabled && selections.length <= 1 && (
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
