import { useRef } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import type { FloorRegion, Vec2 } from '../lib/types';
import type { Transform2D } from './use2DTransform';

interface Props {
  transform: Transform2D;
  toWorldFromScreen: (sx: number, sy: number, snapped: boolean) => Vec2;
  enabled: boolean;
}

type DragState =
  | { kind: 'move'; id: string; orig: Vec2[]; start: Vec2 }
  | {
      kind: 'vertex';
      id: string;
      vertexIndex: number;
      orig: Vec2[];
    };

const HANDLE = 6;

export function FloorRegionLayer({ transform, toWorldFromScreen, enabled }: Props) {
  const regions = useRoomStore((s) => s.floor.floorRegions);
  const selection = useRoomStore((s) => s.selection);
  const setSelection = useRoomStore((s) => s.setSelection);
  const updateFloorRegion = useRoomStore((s) => s.updateFloorRegion);
  const dragRef = useRef<DragState | null>(null);

  if (!regions || regions.length === 0) return null;

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toWorldFromScreen(e.clientX, e.clientY, true);
    if (d.kind === 'move') {
      const dx = p.x - d.start.x;
      const dz = p.z - d.start.z;
      updateFloorRegion(d.id, {
        polygon: d.orig.map((v) => ({ x: v.x + dx, z: v.z + dz })),
      });
    } else {
      const next = d.orig.slice();
      next[d.vertexIndex] = p;
      updateFloorRegion(d.id, { polygon: next });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const startBodyDrag = (e: React.PointerEvent, region: FloorRegion) => {
    if (!enabled) return;
    e.stopPropagation();
    setSelection({ kind: 'floorRegion', id: region.id });
    const start = toWorldFromScreen(e.clientX, e.clientY, false);
    dragRef.current = {
      kind: 'move',
      id: region.id,
      orig: region.polygon.map((v) => ({ ...v })),
      start,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const startVertexDrag = (
    e: React.PointerEvent,
    region: FloorRegion,
    vertexIndex: number,
  ) => {
    if (!enabled) return;
    e.stopPropagation();
    setSelection({ kind: 'floorRegion', id: region.id });
    dragRef.current = {
      kind: 'vertex',
      id: region.id,
      vertexIndex,
      orig: region.polygon.map((v) => ({ ...v })),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  return (
    <g
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {regions.map((r) => {
        const isSel =
          selection?.kind === 'floorRegion' && selection.id === r.id;
        const pts = r.polygon.map((v) => transform.toScreen(v));
        const path =
          'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ') + ' Z';
        // Centroid for direction arrow
        let cx = 0;
        let cy = 0;
        for (const p of pts) {
          cx += p.x;
          cy += p.y;
        }
        cx /= pts.length;
        cy /= pts.length;
        const dir = r.pattern.direction;
        const armLen = 22;
        // Direction in world: (cos(dir), sin(dir)) along x,z
        // In screen: x maps to +x, z maps to +y (screen y down).
        // After transform.rotation: rotate world (dx, dz) by transform.rotation.
        const wx = Math.cos(dir);
        const wz = Math.sin(dir);
        const cos = Math.cos(transform.rotation);
        const sin = Math.sin(transform.rotation);
        const sxArm = (wx * cos - wz * sin) * armLen;
        const syArm = (wx * sin + wz * cos) * armLen;
        return (
          <g key={r.id} pointerEvents="auto">
            <path
              d={path}
              fill={r.pattern.color}
              fillOpacity={isSel ? 0.42 : 0.22}
              stroke={isSel ? '#22d3ee' : '#5a4a3a'}
              strokeWidth={isSel ? 2 : 1.2}
              strokeDasharray={isSel ? '0' : '5 4'}
              style={{ cursor: enabled ? 'move' : 'default' }}
              onPointerDown={(e) => startBodyDrag(e, r)}
            />
            {/* Direction arrow at centroid */}
            <g pointerEvents="none">
              <line
                x1={cx - sxArm}
                y1={cy - syArm}
                x2={cx + sxArm}
                y2={cy + syArm}
                stroke={isSel ? '#22d3ee' : '#5a4a3a'}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.8}
              />
              <circle
                cx={cx + sxArm}
                cy={cy + syArm}
                r={3}
                fill={isSel ? '#22d3ee' : '#5a4a3a'}
              />
            </g>
            {/* Vertex handles when selected */}
            {isSel &&
              enabled &&
              pts.map((p, i) => (
                <rect
                  key={i}
                  x={p.x - HANDLE}
                  y={p.y - HANDLE}
                  width={HANDLE * 2}
                  height={HANDLE * 2}
                  fill="#fff"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => startVertexDrag(e, r, i)}
                />
              ))}
            {/* Label */}
            <text
              x={cx}
              y={cy + (isSel ? 22 : 18)}
              textAnchor="middle"
              fontSize="11"
              fill="#5a4a3a"
              pointerEvents="none"
              fontWeight={isSel ? 600 : 400}
            >
              {r.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
