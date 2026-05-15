import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import type { BackgroundImage, Vec2 } from '../lib/types';
import type { Transform2D } from './use2DTransform';
import { getBlobObjectUrl } from '../lib/persistence';

interface Props {
  transform: Transform2D;
  toWorldFromScreen: (sx: number, sy: number, snapped: boolean) => Vec2;
}

type DragState =
  | { kind: 'move'; start: Vec2; orig: BackgroundImage }
  | {
      kind: 'resize';
      corner: 'nw' | 'ne' | 'sw' | 'se';
      anchor: Vec2;
      orig: BackgroundImage;
    };

const HANDLE = 7;

/** Resolve `data:` (legacy) or `blob-key:<key>` to a usable image href. */
function useResolvedSrc(src: string | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setResolved(null);
      return;
    }
    if (src.startsWith('data:')) {
      setResolved(src);
      return;
    }
    if (src.startsWith('blob-key:')) {
      const key = src.slice('blob-key:'.length);
      void getBlobObjectUrl(key).then((url) => {
        if (!cancelled) setResolved(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [src]);
  return resolved;
}

export function BackgroundImageLayer({ transform, toWorldFromScreen }: Props) {
  const img = useRoomStore((s) => s.floor.backgroundImage);
  const update = useRoomStore((s) => s.updateBackgroundImage);
  const selection = useRoomStore((s) => s.selection);
  const setSelection = useRoomStore((s) => s.setSelection);
  const dragRef = useRef<DragState | null>(null);
  const resolvedSrc = useResolvedSrc(img?.src);

  if (!img || !img.visible || !resolvedSrc) return null;

  const isSel = selection?.kind === 'backgroundImage';
  const editable = !img.locked;

  const center = transform.toScreen({ x: img.x, z: img.z });
  const w = img.width * transform.scale;
  const h = img.height * transform.scale;
  const angleDeg = (img.rotation * 180) / Math.PI;

  const onPointerDownImage = (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    setSelection({ kind: 'backgroundImage', id: 'bg' });
    const p = toWorldFromScreen(e.clientX, e.clientY, false);
    dragRef.current = { kind: 'move', start: p, orig: { ...img } };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onResizeDown = (
    e: React.PointerEvent,
    corner: 'nw' | 'ne' | 'sw' | 'se',
  ) => {
    if (!editable) return;
    e.stopPropagation();
    setSelection({ kind: 'backgroundImage', id: 'bg' });
    const sign = {
      nw: { x: 1, z: 1 },
      ne: { x: -1, z: 1 },
      sw: { x: 1, z: -1 },
      se: { x: -1, z: -1 },
    }[corner];
    const half = { x: img.width / 2, z: img.height / 2 };
    const anchorLocal = { x: half.x * sign.x, z: half.z * sign.z };
    const cos = Math.cos(img.rotation);
    const sin = Math.sin(img.rotation);
    const anchor: Vec2 = {
      x: img.x + anchorLocal.x * cos - anchorLocal.z * sin,
      z: img.z + anchorLocal.x * sin + anchorLocal.z * cos,
    };
    dragRef.current = { kind: 'resize', corner, anchor, orig: { ...img } };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toWorldFromScreen(e.clientX, e.clientY, false);
    if (d.kind === 'move') {
      const dx = p.x - d.start.x;
      const dz = p.z - d.start.z;
      update({ x: d.orig.x + dx, z: d.orig.z + dz });
    } else {
      const cos = Math.cos(d.orig.rotation);
      const sin = Math.sin(d.orig.rotation);
      const rdx = p.x - d.anchor.x;
      const rdz = p.z - d.anchor.z;
      const lx = rdx * cos + rdz * sin;
      const lz = -rdx * sin + rdz * cos;
      const newW = Math.max(0.1, Math.abs(lx));
      const newH = Math.max(0.1, Math.abs(lz));
      const cxLocal = lx / 2;
      const czLocal = lz / 2;
      const cxWorld = d.anchor.x + cxLocal * cos - czLocal * sin;
      const czWorld = d.anchor.z + cxLocal * sin + czLocal * cos;
      update({ width: newW, height: newH, x: cxWorld, z: czWorld });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <g
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <g transform={`translate(${center.x},${center.y}) rotate(${angleDeg})`}>
        <image
          href={resolvedSrc}
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          opacity={img.opacity}
          preserveAspectRatio="none"
          style={{
            cursor: editable ? 'move' : 'default',
            pointerEvents: editable ? 'auto' : 'none',
          }}
          onPointerDown={onPointerDownImage}
        />
        {isSel && (
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={2}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}
        {isSel && editable && (
          <>
            {(['nw', 'ne', 'sw', 'se'] as const).map((c) => {
              const cx = c === 'nw' || c === 'sw' ? -w / 2 : w / 2;
              const cy = c === 'nw' || c === 'ne' ? -h / 2 : h / 2;
              const cursor =
                c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize';
              return (
                <rect
                  key={c}
                  x={cx - HANDLE}
                  y={cy - HANDLE}
                  width={HANDLE * 2}
                  height={HANDLE * 2}
                  fill="#fff"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  style={{ cursor }}
                  onPointerDown={(e) => onResizeDown(e, c)}
                />
              );
            })}
          </>
        )}
      </g>
    </g>
  );
}
