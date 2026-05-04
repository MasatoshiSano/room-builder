import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import {
  bbox,
  closestOnSegment,
  distance,
  innerEdges,
  midpoint,
  outerEdges,
  outlineAppendWouldCross,
  outlineCloseWouldCross,
  outlineInsertWouldCross,
  pointInPolygon,
  snapPoint,
} from '../lib/geometry';
import type { Vec2, WallRef } from '../lib/types';
import { useViewBox } from './use2DTransform';
import { FurnitureLayer } from './FurnitureLayer';
import { BackgroundImageLayer } from './BackgroundImageLayer';

const WALL_HIT_RADIUS_PX = 8;

type DragState =
  | { kind: 'vertex'; id: number }
  | { kind: 'innerWallStart'; id: string }
  | { kind: 'innerWallEnd'; id: string }
  | { kind: 'opening'; id: string }
  | {
      kind: 'innerWallBody';
      id: string;
      origStart: Vec2;
      origEnd: Vec2;
      dragStart: Vec2;
    };

const SNAP_PX = 14;
const BODY_DRAG_THRESHOLD_PX = 4;

export function FloorPlanEditor() {
  const floor = useRoomStore((s) => s.floor);
  const tool = useRoomStore((s) => s.tool);
  const selection = useRoomStore((s) => s.selection);
  const gridSize = useRoomStore((s) => s.gridSize);
  const setSelection = useRoomStore((s) => s.setSelection);
  const appendOutlineVertex = useRoomStore((s) => s.appendOutlineVertex);
  const insertOutlineVertex = useRoomStore((s) => s.insertOutlineVertex);
  const closeOutline = useRoomStore((s) => s.closeOutline);
  const popOutlineVertex = useRoomStore((s) => s.popOutlineVertex);
  const updateVertex = useRoomStore((s) => s.updateVertex);
  const addInnerWall = useRoomStore((s) => s.addInnerWall);
  const updateInnerWall = useRoomStore((s) => s.updateInnerWall);
  const addOpening = useRoomStore((s) => s.addOpening);
  const updateOpening = useRoomStore((s) => s.updateOpening);
  const setTool = useRoomStore((s) => s.setTool);
  const personView = useRoomStore((s) => s.personView);
  const setPersonView = useRoomStore((s) => s.setPersonView);
  const setEditorMode = useRoomStore((s) => s.setEditorMode);

  const [personMode, setPersonMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [pendingInnerStart, setPendingInnerStart] = useState<Vec2 | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h },
      );
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      if (tool === 'innerWall' && pendingInnerStart) {
        e.preventDefault();
        setPendingInnerStart(null);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [tool, pendingInnerStart]);

  const outlineForView = useMemo(
    () => (floor.outline.length > 0 ? floor.outline : DEFAULT_BOX),
    [floor.outline],
  );

  const { transform, panBy, zoomBy, rotate90, resetView } = useViewBox(
    outlineForView,
    size.width,
    size.height,
  );

  // Keep refs to the latest callbacks so the non-passive event handlers below
  // don't need to be re-registered on every render.
  const zoomByRef = useRef(zoomBy);
  useEffect(() => { zoomByRef.current = zoomBy; });

  // Attach non-passive wheel/touch listeners so we can call preventDefault()
  // and prevent the browser from zooming the page during pinch gestures.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      zoomByRef.current(e.deltaY < 0 ? 1.1 : 1 / 1.1, anchor);
    };

    let pinchDist: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist !== null) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const rect = el.getBoundingClientRect();
        const anchor = { x: midX - rect.left, y: midY - rect.top };
        zoomByRef.current(dist / pinchDist, anchor);
        pinchDist = dist;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchDist = null;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const panRef = useRef<{
    pointerId: number;
    startSX: number;
    startSY: number;
  } | null>(null);

  const allEdges = useMemo(
    () => [
      ...outerEdges(floor.outline),
      ...innerEdges(floor.innerWalls),
    ],
    [floor.outline, floor.innerWalls],
  );

  const snapTargets = useMemo<Vec2[]>(() => {
    const targets: Vec2[] = [...floor.outline];
    for (const w of floor.innerWalls) {
      targets.push(w.start, w.end);
    }
    return targets;
  }, [floor.outline, floor.innerWalls]);

  const findSnap = (p: Vec2, exclude?: Vec2): Vec2 | null => {
    const radiusWorld = SNAP_PX / transform.scale;
    let best: Vec2 | null = null;
    let bestDist = radiusWorld;
    for (const t of snapTargets) {
      if (exclude && t.x === exclude.x && t.z === exclude.z) continue;
      const d = distance(p, t);
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  };

  const snappedHover =
    tool === 'innerWall' && hoverPoint
      ? findSnap(hoverPoint, pendingInnerStart ?? undefined) ?? hoverPoint
      : hoverPoint;

  const findOpeningAt = (p: Vec2, threshold: number): string | null => {
    for (const op of floor.openings) {
      const edge = allEdges.find((ed) =>
        op.wallRef.type === 'outer'
          ? ed.ref.type === 'outer' &&
            ed.ref.edgeIndex === op.wallRef.edgeIndex
          : ed.ref.type === 'inner' && ed.ref.wallId === op.wallRef.wallId,
      );
      if (!edge || edge.length === 0) continue;
      const tStart = op.offset / edge.length;
      const tEnd = (op.offset + op.width) / edge.length;
      const startWorld: Vec2 = {
        x: edge.start.x + (edge.end.x - edge.start.x) * tStart,
        z: edge.start.z + (edge.end.z - edge.start.z) * tStart,
      };
      const endWorld: Vec2 = {
        x: edge.start.x + (edge.end.x - edge.start.x) * tEnd,
        z: edge.start.z + (edge.end.z - edge.start.z) * tEnd,
      };
      const c = closestOnSegment(p, startWorld, endWorld);
      if (c.distance < threshold) return op.id;
    }
    return null;
  };

  const getSvgPoint = (e: React.PointerEvent | PointerEvent): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = transform.toWorld(sx, sy);
    return snapPoint(w, gridSize);
  };

  const toWorldFromScreen = (cx: number, cy: number, snap: boolean): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const w = transform.toWorld(cx - rect.left, cy - rect.top);
    return snap ? snapPoint(w, gridSize) : w;
  };

  const handleSvgPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || (tool === 'select' && e.shiftKey)) {
      // Middle/right click, or Shift+click in select mode → pan
      e.preventDefault();
      panRef.current = {
        pointerId: e.pointerId,
        startSX: e.clientX,
        startSY: e.clientY,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    const p = getSvgPoint(e);

    if (tool === 'outline') {
      // Click near the first vertex to close (only if it wouldn't cross).
      if (
        floor.outline.length >= 3 &&
        distance(p, floor.outline[0]) < gridSize * 1.5
      ) {
        if (outlineCloseWouldCross(floor.outline)) {
          return;
        }
        closeOutline();
        return;
      }
      // If a vertex is selected, insert the new point AFTER it (branch from
      // selected); otherwise append to the chain end.
      const selectedIdx =
        selection?.kind === 'vertex' ? Number(selection.id) : -1;
      const useInsert =
        selectedIdx >= 0 &&
        selectedIdx < floor.outline.length &&
        selectedIdx !== floor.outline.length - 1;
      if (useInsert) {
        if (outlineInsertWouldCross(floor.outline, selectedIdx, p)) return;
        const newIdx = selectedIdx + 1;
        insertOutlineVertex(newIdx, p);
        setSelection({ kind: 'vertex', id: String(newIdx) });
        return;
      }
      if (outlineAppendWouldCross(floor.outline, p)) {
        return;
      }
      appendOutlineVertex(p);
      // Move selection to the just-added vertex so further clicks chain naturally.
      setSelection({ kind: 'vertex', id: String(floor.outline.length) });
      return;
    }

    if (tool === 'innerWall') {
      const snapped = findSnap(p, pendingInnerStart ?? undefined) ?? p;
      if (!pendingInnerStart) {
        setPendingInnerStart(snapped);
      } else {
        if (distance(pendingInnerStart, snapped) > 0.05) {
          const id = addInnerWall({ start: pendingInnerStart, end: snapped });
          setSelection({ kind: 'innerWall', id });
          setTool('select');
        }
        setPendingInnerStart(null);
      }
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const radius = WALL_HIT_RADIUS_PX / transform.scale;

      const hitOpening = findOpeningAt(p, radius * 1.5);
      if (hitOpening) {
        setSelection({ kind: 'opening', id: hitOpening });
        return;
      }

      let best: { ref: WallRef; offset: number; dist: number } | null = null;
      for (const e2 of allEdges) {
        if (tool === 'window' && e2.ref.type !== 'outer') continue;
        const c = closestOnSegment(p, e2.start, e2.end);
        if (c.distance < (best?.dist ?? Infinity)) {
          best = {
            ref: e2.ref,
            offset: c.t * e2.length,
            dist: c.distance,
          };
        }
      }
      if (best && best.dist < radius * 2) {
        const id = addOpening({
          kind: tool,
          wallRef: best.ref,
          offset: best.offset,
        });
        setSelection({ kind: 'opening', id });
        setTool('select');
      }
      return;
    }

    if (tool === 'select') {
      // 背景パン＋選択解除は、SVG 自身がターゲットの場合のみ
      if (e.target !== e.currentTarget) return;
      panRef.current = {
        pointerId: e.pointerId,
        startSX: e.clientX,
        startSY: e.clientY,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setSelection(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panRef.current && e.pointerId === panRef.current.pointerId) {
      const dxPx = e.clientX - panRef.current.startSX;
      const dyPx = e.clientY - panRef.current.startSY;
      panRef.current.startSX = e.clientX;
      panRef.current.startSY = e.clientY;
      // Convert pixel delta to world delta (account for rotation)
      const ix = -dxPx / transform.scale;
      const iy = -dyPx / transform.scale;
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const wx = ix * cos + iy * sin;
      const wz = -ix * sin + iy * cos;
      panBy(wx, wz);
      return;
    }

    const p = getSvgPoint(e);
    setHoverPoint(p);

    if (!drag) return;

    if (drag.kind === 'vertex') {
      updateVertex(drag.id, p);
    } else if (drag.kind === 'innerWallStart') {
      updateInnerWall(drag.id, { start: p });
    } else if (drag.kind === 'innerWallEnd') {
      updateInnerWall(drag.id, { end: p });
    } else if (drag.kind === 'innerWallBody') {
      const dx = p.x - drag.dragStart.x;
      const dz = p.z - drag.dragStart.z;
      updateInnerWall(drag.id, {
        start: { x: drag.origStart.x + dx, z: drag.origStart.z + dz },
        end: { x: drag.origEnd.x + dx, z: drag.origEnd.z + dz },
      });
    } else if (drag.kind === 'opening') {
      const op = floor.openings.find((o) => o.id === drag.id);
      if (!op) return;
      const ref = op.wallRef;
      const edge = allEdges.find((ed) =>
        ref.type === 'outer'
          ? ed.ref.type === 'outer' && ed.ref.edgeIndex === ref.edgeIndex
          : ed.ref.type === 'inner' && ed.ref.wallId === ref.wallId,
      );
      if (!edge) return;
      const c = closestOnSegment(p, edge.start, edge.end);
      const newOffset = Math.max(
        0,
        Math.min(edge.length - op.width, c.t * edge.length),
      );
      updateOpening(op.id, { offset: newOffset });
    }
  };

  const handlePointerUp = () => {
    panRef.current = null;
    setDrag(null);
  };

  const beginVertexDrag = (
    e: React.PointerEvent,
    vertexIndex: number,
  ) => {
    e.stopPropagation();
    if (tool === 'outline') {
      // Clicking the first vertex while drawing closes the polygon
      // (if not already closed and the close edge wouldn't cross).
      if (
        vertexIndex === 0 &&
        !isOutlineClosed &&
        floor.outline.length >= 3
      ) {
        if (!outlineCloseWouldCross(floor.outline)) closeOutline();
        return;
      }
      // Otherwise: select the vertex so further clicks branch from here.
      setSelection({ kind: 'vertex', id: String(vertexIndex) });
      return;
    }
    if (tool !== 'select') return;
    setSelection({ kind: 'vertex', id: String(vertexIndex) });
    setDrag({ kind: 'vertex', id: vertexIndex });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const beginInnerEndpointDrag = (
    e: React.PointerEvent,
    wallId: string,
    which: 'start' | 'end',
  ) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelection({ kind: 'innerWall', id: wallId });
    setDrag({
      kind: which === 'start' ? 'innerWallStart' : 'innerWallEnd',
      id: wallId,
    });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const beginInnerBodyDrag = (
    e: React.PointerEvent,
    wallId: string,
  ) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelection({ kind: 'innerWall', id: wallId });
    const wall = floor.innerWalls.find((x) => x.id === wallId);
    if (!wall) return;
    const startPt = getSvgPoint(e);
    const startScreenX = e.clientX;
    const startScreenY = e.clientY;
    const id = e.pointerId;
    (e.target as Element).setPointerCapture(id);
    const onMoveCheck = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      const dx = ev.clientX - startScreenX;
      const dy = ev.clientY - startScreenY;
      if (Math.hypot(dx, dy) >= BODY_DRAG_THRESHOLD_PX) {
        setDrag({
          kind: 'innerWallBody',
          id: wallId,
          origStart: wall.start,
          origEnd: wall.end,
          dragStart: startPt,
        });
        window.removeEventListener('pointermove', onMoveCheck);
        window.removeEventListener('pointerup', onUpCancel);
        window.removeEventListener('pointercancel', onUpCancel);
      }
    };
    const onUpCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', onMoveCheck);
      window.removeEventListener('pointerup', onUpCancel);
      window.removeEventListener('pointercancel', onUpCancel);
    };
    window.addEventListener('pointermove', onMoveCheck);
    window.addEventListener('pointerup', onUpCancel);
    window.addEventListener('pointercancel', onUpCancel);
  };

  const beginOpeningDrag = (e: React.PointerEvent, openingId: string) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelection({ kind: 'opening', id: openingId });
    setDrag({ kind: 'opening', id: openingId });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const isOutlineClosed = floor.outline.length >= 3;

  return (
    <div ref={containerRef} className="floor-editor">
      <div className="floor-editor-toolbar">
        <ToolButton
          label="選択"
          active={tool === 'select'}
          onClick={() => setTool('select')}
        />
        <ToolButton
          label="外周描画"
          active={tool === 'outline'}
          onClick={() => setTool('outline')}
        />
        <ToolButton
          label="内壁"
          active={tool === 'innerWall'}
          onClick={() => setTool('innerWall')}
          disabled={!isOutlineClosed}
        />
        <ToolButton
          label="ドア"
          active={tool === 'door'}
          onClick={() => setTool('door')}
          disabled={!isOutlineClosed}
        />
        <ToolButton
          label="窓"
          active={tool === 'window'}
          onClick={() => setTool('window')}
          disabled={!isOutlineClosed}
        />
        {isOutlineClosed && (
          <ToolButton
            label="👤 人視点"
            active={personMode || !!personView}
            onClick={() => {
              if (personView) {
                setPersonView(null);
                setPersonMode(false);
                return;
              }
              // Drop person at the room center (or last vertex if center is outside).
              const b = bbox(floor.outline);
              const cx = (b.minX + b.maxX) / 2;
              const cz = (b.minZ + b.maxZ) / 2;
              const center = { x: cx, z: cz };
              const inside = pointInPolygon(center, floor.outline);
              const start = inside
                ? center
                : floor.outline[0] ?? { x: 0, z: 0 };
              setPersonView({ x: start.x, z: start.z, rotationY: 0, pitch: 0 });
              setEditorMode('arrange');
              setPersonMode(false);
            }}
          />
        )}
        {tool === 'outline' && floor.outline.length > 0 && (
          <button
            type="button"
            className="tool-btn"
            onClick={() => {
              if (selection?.kind === 'vertex') {
                const idx = Number(selection.id);
                if (floor.outline.length > 3) {
                  useRoomStore.getState().removeVertex(idx);
                  setSelection(null);
                  return;
                }
              }
              popOutlineVertex();
            }}
            title="直前/選択中の頂点を取り消し（Backspace）"
          >
            ↶ 1点戻す
          </button>
        )}
        {tool === 'outline' && floor.outline.length >= 3 && (() => {
          const wouldCross = outlineCloseWouldCross(floor.outline);
          return (
            <button
              type="button"
              className="floor-editor-finish"
              onClick={() => {
                if (!wouldCross) closeOutline();
              }}
              disabled={wouldCross}
              title={wouldCross ? '閉じる線が他の辺と交差します' : '外周を閉じる'}
            >
              外周を閉じる
            </button>
          );
        })()}
        <div className="view-controls">
          <button
            type="button"
            className="tool-btn"
            onClick={() => zoomBy(1.25)}
            title="拡大"
            aria-label="拡大"
          >
            ＋
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => zoomBy(0.8)}
            title="縮小"
            aria-label="縮小"
          >
            －
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => rotate90()}
            title="ビューを90°回転"
            aria-label="ビューを90°回転"
          >
            ↻ 90°
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => resetView()}
            title="ビューをリセット（全体表示）"
            aria-label="ビューをリセット"
          >
            ⌖
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="floor-editor-svg"
        width={size.width}
        height={size.height}
        style={{ touchAction: 'none', cursor: personMode ? 'crosshair' : undefined }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        role="img"
        aria-label="2D 間取りエディタ"
      >
        <Grid
          width={size.width}
          height={size.height}
          step={gridSize}
          transform={transform}
        />

        <BackgroundImageLayer
          transform={transform}
          toWorldFromScreen={toWorldFromScreen}
        />

        {floor.outline.length > 0 && (
          <OutlinePath
            outline={floor.outline}
            color={floor.floorColor}
            transform={transform}
            isClosed={tool !== 'outline' || isOutlineClosed}
          />
        )}

        {tool === 'outline' &&
          floor.outline.length > 0 &&
          hoverPoint &&
          (() => {
            const selIdx =
              selection?.kind === 'vertex' ? Number(selection.id) : -1;
            const useInsert =
              selIdx >= 0 &&
              selIdx < floor.outline.length &&
              selIdx !== floor.outline.length - 1;
            const anchorIdx = useInsert ? selIdx : floor.outline.length - 1;
            const anchor = floor.outline[anchorIdx];
            const closing =
              !useInsert &&
              floor.outline.length >= 3 &&
              distance(hoverPoint, floor.outline[0]) < gridSize * 1.5;
            const target = closing ? floor.outline[0] : hoverPoint;
            const crosses = closing
              ? outlineCloseWouldCross(floor.outline)
              : useInsert
                ? outlineInsertWouldCross(floor.outline, anchorIdx, hoverPoint)
                : outlineAppendWouldCross(floor.outline, hoverPoint);
            const followNext =
              useInsert && anchorIdx + 1 < floor.outline.length
                ? floor.outline[anchorIdx + 1]
                : null;
            return (
              <g>
                <line
                  x1={transform.toScreen(anchor).x}
                  y1={transform.toScreen(anchor).y}
                  x2={transform.toScreen(target).x}
                  y2={transform.toScreen(target).y}
                  stroke={crosses ? '#dc2626' : '#1f4b8e'}
                  strokeWidth={crosses ? 2 : 1.5}
                  strokeDasharray={crosses ? '5 4' : '4 3'}
                />
                {followNext && (
                  <line
                    x1={transform.toScreen(target).x}
                    y1={transform.toScreen(target).y}
                    x2={transform.toScreen(followNext).x}
                    y2={transform.toScreen(followNext).y}
                    stroke={crosses ? '#dc2626' : '#1f4b8e'}
                    strokeWidth={crosses ? 2 : 1.5}
                    strokeDasharray={crosses ? '5 4' : '4 3'}
                    opacity={0.6}
                  />
                )}
              </g>
            );
          })()}

        {tool === 'innerWall' &&
          snappedHover &&
          hoverPoint &&
          (snappedHover.x !== hoverPoint.x ||
            snappedHover.z !== hoverPoint.z) && (
            <circle
              cx={transform.toScreen(snappedHover).x}
              cy={transform.toScreen(snappedHover).y}
              r={9}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={2}
              pointerEvents="none"
            />
          )}

        {floor.innerWalls.map((w) => {
          const a = transform.toScreen(w.start);
          const b = transform.toScreen(w.end);
          const isSel =
            selection?.kind === 'innerWall' && selection.id === w.id;
          return (
            <g key={w.id}>
              {isSel && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#22d3ee"
                  strokeWidth={12}
                  strokeLinecap="round"
                  opacity={0.5}
                  pointerEvents="none"
                />
              )}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isSel ? '#1f4b8e' : '#5a4a3a'}
                strokeWidth={isSel ? 5 : 4}
                strokeLinecap="round"
                onPointerDown={(e) => {
                  if (tool === 'select') {
                    beginInnerBodyDrag(e, w.id);
                  }
                }}
                style={{ cursor: tool === 'select' ? 'move' : 'inherit' }}
              />
              {tool === 'select' && (
                <>
                  <circle
                    cx={a.x}
                    cy={a.y}
                    r={6}
                    fill="#fff"
                    stroke="#1f4b8e"
                    strokeWidth="2"
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => beginInnerEndpointDrag(e, w.id, 'start')}
                  />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={6}
                    fill="#fff"
                    stroke="#1f4b8e"
                    strokeWidth="2"
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => beginInnerEndpointDrag(e, w.id, 'end')}
                  />
                </>
              )}
            </g>
          );
        })}

        {pendingInnerStart && snappedHover && (
          <line
            x1={transform.toScreen(pendingInnerStart).x}
            y1={transform.toScreen(pendingInnerStart).y}
            x2={transform.toScreen(snappedHover).x}
            y2={transform.toScreen(snappedHover).y}
            stroke="#5a4a3a"
            strokeWidth="3"
            strokeDasharray="5 4"
          />
        )}

        {floor.openings.map((op) => {
          const edge = allEdges.find((ed) =>
            op.wallRef.type === 'outer'
              ? ed.ref.type === 'outer' &&
                ed.ref.edgeIndex === op.wallRef.edgeIndex
              : ed.ref.type === 'inner' &&
                ed.ref.wallId === op.wallRef.wallId,
          );
          if (!edge) return null;
          const tStart = op.offset / edge.length;
          const tEnd = (op.offset + op.width) / edge.length;
          const startWorld: Vec2 = {
            x: edge.start.x + (edge.end.x - edge.start.x) * tStart,
            z: edge.start.z + (edge.end.z - edge.start.z) * tStart,
          };
          const endWorld: Vec2 = {
            x: edge.start.x + (edge.end.x - edge.start.x) * tEnd,
            z: edge.start.z + (edge.end.z - edge.start.z) * tEnd,
          };
          const a = transform.toScreen(startWorld);
          const b = transform.toScreen(endWorld);
          const isSel =
            selection?.kind === 'opening' && selection.id === op.id;
          const color = op.kind === 'door' ? '#d97706' : '#0ea5e9';
          return (
            <g key={op.id}>
              {isSel && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#22d3ee"
                  strokeWidth={16}
                  strokeLinecap="round"
                  opacity={0.5}
                  pointerEvents="none"
                />
              )}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={isSel ? 9 : 6}
                strokeLinecap="butt"
                opacity={0.95}
                style={{
                  cursor:
                    tool === 'select'
                      ? 'grab'
                      : tool === 'door' || tool === 'window'
                        ? 'pointer'
                        : 'inherit',
                }}
                onPointerDown={(e) => {
                  if (tool === 'select') {
                    beginOpeningDrag(e, op.id);
                  } else if (tool === 'door' || tool === 'window') {
                    // 既存の開口をクリック→新規作成せず選択
                    e.stopPropagation();
                    setSelection({ kind: 'opening', id: op.id });
                  }
                }}
              />
            </g>
          );
        })}

        <FurnitureLayer
          transform={transform}
          toWorldFromScreen={toWorldFromScreen}
          enabled={tool === 'select'}
        />

        {floor.outline.map((v, i) => {
          const s = transform.toScreen(v);
          const isSel =
            selection?.kind === 'vertex' && selection.id === String(i);
          const drawingOutline = tool === 'outline' && !isOutlineClosed;
          const isFirst = i === 0 && drawingOutline;
          const selIdx =
            selection?.kind === 'vertex' ? Number(selection.id) : -1;
          const useInsert =
            drawingOutline &&
            selIdx >= 0 &&
            selIdx < floor.outline.length &&
            selIdx !== floor.outline.length - 1;
          const anchorIdx = useInsert ? selIdx : floor.outline.length - 1;
          const isLast =
            drawingOutline &&
            i === anchorIdx &&
            floor.outline.length > 0 &&
            !isFirst;
          const closeHover =
            isFirst &&
            floor.outline.length >= 3 &&
            hoverPoint != null &&
            distance(hoverPoint, v) < gridSize * 1.5;
          return (
            <g key={i}>
              {isSel && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={14}
                  fill="#22d3ee"
                  opacity={0.45}
                  pointerEvents="none"
                />
              )}
              {closeHover && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={14}
                  fill="#1f4b8e"
                  opacity={0.3}
                  pointerEvents="none"
                />
              )}
              {isLast && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={12}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}
              <circle
                cx={s.x}
                cy={s.y}
                r={isSel ? 8 : isFirst ? (closeHover ? 11 : 8) : isLast ? 7 : 6}
                fill={
                  closeHover
                    ? '#1f4b8e'
                    : isFirst
                      ? '#1f4b8e'
                      : isLast
                        ? '#22c55e'
                        : isSel
                          ? '#dc2626'
                          : '#fff'
                }
                stroke={isSel ? '#dc2626' : isLast ? '#15803d' : '#1f4b8e'}
                strokeWidth="2"
                style={{
                  cursor:
                    tool === 'select'
                      ? 'grab'
                      : tool === 'outline' && isFirst
                        ? 'pointer'
                        : 'inherit',
                }}
                onPointerDown={(e) => beginVertexDrag(e, i)}
              />
            </g>
          );
        })}

        {isOutlineClosed && (
          <DimensionLabels outline={floor.outline} transform={transform} />
        )}

        {floor.innerWalls.map((w) => {
          const m = midpoint(w.start, w.end);
          const s = transform.toScreen(m);
          const len = distance(w.start, w.end);
          return (
            <text
              key={`dim-${w.id}`}
              x={s.x}
              y={s.y - 8}
              textAnchor="middle"
              fontSize="11"
              fill="#5a4a3a"
              pointerEvents="none"
            >
              {len.toFixed(2)}m
            </text>
          );
        })}

        {hoverPoint && (
          <text
            x={size.width - 12}
            y={size.height - 12}
            textAnchor="end"
            fontSize="11"
            fill="#777"
            pointerEvents="none"
          >
            {hoverPoint.x.toFixed(2)}, {hoverPoint.z.toFixed(2)} m
          </text>
        )}

        {/* Capture overlay: intercepts all clicks when personMode is active */}
        {personMode && (
          <rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill="transparent"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              const p = getSvgPoint(e);
              const prev = personView;
              setPersonView({
                x: p.x,
                z: p.z,
                rotationY: prev?.rotationY ?? 0,
                pitch: 0,
              });
              setEditorMode('arrange');
              setPersonMode(false);
            }}
          />
        )}

        {/* Person view marker */}
        {personView && (() => {
          const c = transform.toScreen({ x: personView.x, z: personView.z });
          const angleDeg = (personView.rotationY * 180) / Math.PI;
          const R = 10;
          const arrowLen = 20;
          return (
            <g
              transform={`translate(${c.x},${c.y})`}
              pointerEvents="none"
              aria-label="人視点位置"
            >
              {/* Direction arrow (points toward camera's looking direction) */}
              <g transform={`rotate(${angleDeg})`}>
                <line
                  x1={0} y1={0}
                  x2={0} y2={R + arrowLen}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                />
                <polygon
                  points={`0,${R + arrowLen + 7} -5,${R + arrowLen} 5,${R + arrowLen}`}
                  fill="#f59e0b"
                />
              </g>
              {/* Body circle */}
              <circle cx={0} cy={0} r={R} fill="#f59e0b" stroke="white" strokeWidth={2} />
              {/* Person icon */}
              <text
                x={0} y={4}
                textAnchor="middle"
                fontSize="11"
                fill="white"
                fontWeight="bold"
              >
                人
              </text>
            </g>
          );
        })()}
      </svg>

      <p className="floor-editor-help" aria-live="polite">
        {tool === 'outline' &&
          (floor.outline.length === 0
            ? '部屋の頂点をクリックして配置してください。'
            : floor.outline.length < 3
              ? `頂点 ${floor.outline.length}点（緑＝直近）。あと${3 - floor.outline.length}点以上必要です。`
              : '緑＝直近の頂点。始点(青)クリックまたは「外周を閉じる」で確定。赤い破線=交差するため追加できません。')}
        {tool === 'innerWall' &&
          (pendingInnerStart
            ? '終点をクリックしてください。'
            : '始点をクリックしてください。')}
        {tool === 'door' && '配置したい壁をクリックしてください。'}
        {tool === 'window' && '外壁をクリックしてください。'}
        {tool === 'select' &&
          '頂点・壁・開口・家具をドラッグで編集。背景ドラッグでパン、ホイールでズーム。'}
        {personMode && '床面をクリックして人の視点位置を指定してください。'}
      </p>
    </div>
  );
}

const DEFAULT_BOX: Vec2[] = [
  { x: -2, z: -2 },
  { x: 2, z: -2 },
  { x: 2, z: 2 },
  { x: -2, z: 2 },
];

function ToolButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tool-btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function Grid({
  width,
  height,
  step,
  transform,
}: {
  width: number;
  height: number;
  step: number;
  transform: { toWorld: (sx: number, sy: number) => Vec2; scale: number };
}) {
  const px = step * transform.scale;
  if (px < 8) return null;
  const tlWorld = transform.toWorld(0, 0);
  const startX =
    -((((tlWorld.x % step) + step) % step) * transform.scale) % px;
  const startY =
    -((((tlWorld.z % step) + step) % step) * transform.scale) % px;

  const lines: React.ReactElement[] = [];
  for (let x = startX; x < width; x += px) {
    const isBig = Math.round(x / px) % 5 === 0;
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={isBig ? '#cbd5e1' : '#e5e7eb'}
        strokeWidth={1}
      />,
    );
  }
  for (let y = startY; y < height; y += px) {
    const isBig = Math.round(y / px) % 5 === 0;
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={isBig ? '#cbd5e1' : '#e5e7eb'}
        strokeWidth={1}
      />,
    );
  }
  return <g aria-hidden="true">{lines}</g>;
}

function OutlinePath({
  outline,
  color,
  transform,
  isClosed,
}: {
  outline: Vec2[];
  color: string;
  transform: { toScreen: (p: Vec2) => { x: number; y: number } };
  isClosed: boolean;
}) {
  const d =
    outline
      .map((p, i) => {
        const s = transform.toScreen(p);
        return `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
      })
      .join(' ') + (isClosed ? ' Z' : '');
  return (
    <path
      d={d}
      fill={isClosed ? color : 'none'}
      fillOpacity={0.6}
      stroke="#1f4b8e"
      strokeWidth={3}
    />
  );
}

function DimensionLabels({
  outline,
  transform,
}: {
  outline: Vec2[];
  transform: { toScreen: (p: Vec2) => { x: number; y: number } };
}) {
  return (
    <g aria-hidden="true">
      {outline.map((a, i) => {
        const b = outline[(i + 1) % outline.length];
        const m = midpoint(a, b);
        const s = transform.toScreen(m);
        const len = distance(a, b);
        return (
          <text
            key={i}
            x={s.x}
            y={s.y}
            textAnchor="middle"
            dy="-6"
            fontSize="11"
            fill="#1f4b8e"
            pointerEvents="none"
          >
            {len.toFixed(2)}m
          </text>
        );
      })}
    </g>
  );
}
