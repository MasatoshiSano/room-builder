import { useMemo } from 'react';
import type { FloorPlan, Opening } from '../lib/types';
import { innerEdges, outerEdges } from '../lib/geometry';
import { Wall } from './Wall';

interface WallsProps {
  floor: FloorPlan;
}

export function Walls({ floor }: WallsProps) {
  const outer = useMemo(() => outerEdges(floor.outline), [floor.outline]);
  const inner = useMemo(() => innerEdges(floor.innerWalls), [floor.innerWalls]);

  const groupedOuter = groupOpenings(floor.openings, 'outer');
  const groupedInner = groupOpenings(floor.openings, 'inner');

  return (
    <>
      {outer.map((e) => {
        const key = e.ref.type === 'outer' ? `o-${e.ref.edgeIndex}` : '';
        const ops =
          e.ref.type === 'outer'
            ? groupedOuter.get(e.ref.edgeIndex) ?? []
            : [];
        return (
          <Wall
            key={key}
            start={e.start}
            end={e.end}
            height={floor.height}
            thickness={0}
            openings={ops}
            color={floor.wallColor}
            variant="outer"
          />
        );
      })}
      {inner.map((e) => {
        const key = e.ref.type === 'inner' ? `i-${e.ref.wallId}` : '';
        const ops =
          e.ref.type === 'inner'
            ? groupedInner.get(e.ref.wallId) ?? []
            : [];
        return (
          <Wall
            key={key}
            start={e.start}
            end={e.end}
            height={floor.height}
            thickness={0.1}
            openings={ops}
            color={floor.wallColor}
            variant="inner"
          />
        );
      })}
    </>
  );
}

function groupOpenings(
  openings: Opening[],
  type: 'outer' | 'inner',
): Map<string | number, OpeningSpecLite[]> {
  const map = new Map<string | number, OpeningSpecLite[]>();
  for (const o of openings) {
    if (o.wallRef.type !== type) continue;
    const key =
      o.wallRef.type === 'outer'
        ? o.wallRef.edgeIndex
        : o.wallRef.wallId;
    const list = map.get(key) ?? [];
    list.push({
      offset: o.offset,
      width: o.width,
      height: o.height,
      sillHeight: o.sillHeight,
    });
    map.set(key, list);
  }
  return map;
}

type OpeningSpecLite = {
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
};
