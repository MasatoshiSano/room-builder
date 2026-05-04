import { useEffect, useMemo, useRef, useState } from 'react';
import type { Vec2 } from '../lib/types';
import { bbox } from '../lib/geometry';

export interface Transform2D {
  toScreen: (p: Vec2) => { x: number; y: number };
  toWorld: (sx: number, sy: number) => Vec2;
  scale: number;
  cx: number;
  cz: number;
  rotation: number;
}

interface ViewState {
  cx: number;
  cz: number;
  scale: number;
  rotation: number;
}

export interface UseViewBoxResult {
  transform: Transform2D;
  setPan: (cx: number, cz: number) => void;
  panBy: (worldDx: number, worldDz: number) => void;
  zoomBy: (factor: number, anchorScreen?: { x: number; y: number }) => void;
  rotate90: () => void;
  resetView: () => void;
}

export function useViewBox(
  outline: Vec2[],
  width: number,
  height: number,
): UseViewBoxResult {
  const [view, setView] = useState<ViewState>({
    cx: 0,
    cz: 0,
    scale: 80,
    rotation: 0,
  });
  const initRef = useRef(false);

  const computeFit = (): ViewState | null => {
    if (outline.length < 2 || width <= 0 || height <= 0) return null;
    const b = bbox(outline);
    const w = b.maxX - b.minX;
    const h = b.maxZ - b.minZ;
    if (w <= 0 || h <= 0) return null;
    const padding = 60;
    const scaleX = (width - padding * 2) / w;
    const scaleZ = (height - padding * 2) / h;
    const scale = Math.max(20, Math.min(200, Math.min(scaleX, scaleZ)));
    return {
      cx: (b.minX + b.maxX) / 2,
      cz: (b.minZ + b.maxZ) / 2,
      scale,
      rotation: 0,
    };
  };

  // Initial fit only — once we have a valid outline + size, fit it once.
  // Subsequent size changes do NOT auto-reset the view.
  useEffect(() => {
    if (initRef.current) return;
    const fit = computeFit();
    if (fit) {
      setView(fit);
      initRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, width, height]);

  const transform: Transform2D = useMemo(() => {
    const cos = Math.cos(view.rotation);
    const sin = Math.sin(view.rotation);
    return {
      cx: view.cx,
      cz: view.cz,
      scale: view.scale,
      rotation: view.rotation,
      toScreen: (p: Vec2) => {
        const dx = p.x - view.cx;
        const dz = p.z - view.cz;
        const rx = dx * cos - dz * sin;
        const rz = dx * sin + dz * cos;
        return {
          x: width / 2 + rx * view.scale,
          y: height / 2 + rz * view.scale,
        };
      },
      toWorld: (sx: number, sy: number) => {
        const ix = (sx - width / 2) / view.scale;
        const iy = (sy - height / 2) / view.scale;
        const dx = ix * cos + iy * sin;
        const dz = -ix * sin + iy * cos;
        return { x: view.cx + dx, z: view.cz + dz };
      },
    };
  }, [view, width, height]);

  return {
    transform,
    setPan: (cx, cz) => setView((v) => ({ ...v, cx, cz })),
    panBy: (worldDx, worldDz) =>
      setView((v) => ({ ...v, cx: v.cx + worldDx, cz: v.cz + worldDz })),
    zoomBy: (factor, anchorScreen) =>
      setView((v) => {
        const newScale = Math.max(10, Math.min(400, v.scale * factor));
        if (!anchorScreen || newScale === v.scale) {
          return { ...v, scale: newScale };
        }
        const cos = Math.cos(v.rotation);
        const sin = Math.sin(v.rotation);
        const ix1 = (anchorScreen.x - width / 2) / v.scale;
        const iy1 = (anchorScreen.y - height / 2) / v.scale;
        const aw = {
          x: v.cx + ix1 * cos + iy1 * sin,
          z: v.cz + (-ix1 * sin + iy1 * cos),
        };
        const ix2 = (anchorScreen.x - width / 2) / newScale;
        const iy2 = (anchorScreen.y - height / 2) / newScale;
        const cxNew = aw.x - (ix2 * cos + iy2 * sin);
        const czNew = aw.z - (-ix2 * sin + iy2 * cos);
        return { ...v, scale: newScale, cx: cxNew, cz: czNew };
      }),
    rotate90: () =>
      setView((v) => {
        let next = v.rotation + Math.PI / 2;
        const TAU = Math.PI * 2;
        next = ((next % TAU) + TAU) % TAU;
        return { ...v, rotation: next };
      }),
    resetView: () => {
      const fit = computeFit();
      if (fit) setView(fit);
    },
  };
}
