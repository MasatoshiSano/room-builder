import { useMemo } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { closestOnSegment } from '../lib/geometry';
import { getFurnitureCorners } from '../lib/collision';
import type { Transform2D } from './use2DTransform';

interface Props {
  transform: Transform2D;
}

interface Hit {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  d: number;
}

/**
 * Highlight gaps between furniture (and between furniture & walls) that are
 * narrower than the configured walkway clearance. Cheap O(N²) sampling — only
 * checks edge midpoints, so it's a heuristic, not a guarantee.
 */
export function ClearanceOverlay({ transform }: Props) {
  const furniture = useRoomStore((s) => s.furniture);
  const innerWalls = useRoomStore((s) => s.floor.innerWalls);
  const outline = useRoomStore((s) => s.floor.outline);
  const min = useRoomStore((s) => s.settings.clearanceMeters);

  const hits = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    const corners = furniture.map((f) => ({ id: f.id, c: getFurnitureCorners(f) }));

    // furniture -> furniture: nearest-corner distance pair
    for (let i = 0; i < corners.length; i++) {
      for (let j = i + 1; j < corners.length; j++) {
        const ca = corners[i].c;
        const cb = corners[j].c;
        let best: Hit | null = null;
        for (const a of ca) {
          for (let k = 0; k < cb.length; k++) {
            const b1 = cb[k];
            const b2 = cb[(k + 1) % cb.length];
            const c = closestOnSegment(a, b1, b2);
            if (c.distance < min && (!best || c.distance < best.d)) {
              best = { ax: a.x, az: a.z, bx: c.point.x, bz: c.point.z, d: c.distance };
            }
          }
        }
        if (best) out.push(best);
      }
    }

    // furniture -> walls (outer + inner): point→segment
    const allWalls: { a: { x: number; z: number }; b: { x: number; z: number } }[] = [];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      allWalls.push({ a, b });
    }
    for (const w of innerWalls) {
      allWalls.push({ a: w.start, b: w.end });
    }
    for (const f of corners) {
      for (const corner of f.c) {
        let best: Hit | null = null;
        for (const w of allWalls) {
          const c = closestOnSegment(corner, w.a, w.b);
          if (c.distance < min && (!best || c.distance < best.d)) {
            best = {
              ax: corner.x,
              az: corner.z,
              bx: c.point.x,
              bz: c.point.z,
              d: c.distance,
            };
          }
        }
        if (best) out.push(best);
      }
    }

    return out;
  }, [furniture, innerWalls, outline, min]);

  if (hits.length === 0) return null;

  return (
    <g aria-hidden="true">
      {hits.map((h, i) => {
        const a = transform.toScreen({ x: h.ax, z: h.az });
        const b = transform.toScreen({ x: h.bx, z: h.bz });
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3 3"
              opacity={0.85}
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2 - 4}
              fontSize="10"
              fill="#dc2626"
              textAnchor="middle"
              fontWeight="bold"
            >
              {(h.d * 100).toFixed(0)}cm
            </text>
          </g>
        );
      })}
    </g>
  );
}
