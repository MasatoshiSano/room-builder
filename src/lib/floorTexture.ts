import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { FloorPattern } from './types';

/**
 * Procedurally generate a wood-plank texture for a FloorPattern.
 *
 * Strategy:
 * - Tile size in world meters = (plankLength × plankWidth × 2) so we can
 *   bake a 2-row stagger into a single repeating tile (row 0 starts at u=0,
 *   row 1 starts at u=plankLength/2).
 * - The mesh assigns UV = world (x,z), so the texture's `repeat` translates
 *   1 meter to (1/tileLen, 1/tileWid). Direction is applied via texture
 *   `rotation` so the same texture serves any plank angle.
 */
export function buildPlankTexture(
  pattern: FloorPattern,
  density = 256,
): CanvasTexture {
  const tileLen = Math.max(0.2, pattern.plankLength);
  const tileWid = Math.max(0.04, pattern.plankWidth);
  const wPx = Math.max(8, Math.round(tileLen * density));
  const hPx = Math.max(8, Math.round(tileWid * 2 * density));

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  ctx.fillStyle = pattern.color;
  ctx.fillRect(0, 0, wPx, hPx);

  const rowHeight = hPx / 2;
  const seamPx = Math.max(1, Math.round(density * 0.005)); // 5mm seam
  const grain = Math.max(1, Math.round(density * 0.001));

  for (let row = 0; row < 2; row++) {
    const yPx = row * rowHeight;
    const offsetPx = row === 0 ? 0 : Math.round(wPx / 2);

    // Wrap-safe loop: draw one extra plank on each side so the seam appears
    // at the correct position when the texture wraps.
    for (let i = -1; i <= 1; i++) {
      const xPx = offsetPx + i * wPx;
      const variance =
        ((Math.sin(row * 17.31 + i * 23.7) * 0.5) +
          Math.sin(row * 7.13 + i * 3.91) * 0.25) *
        pattern.variation;
      ctx.fillStyle = adjustColor(pattern.color, variance);
      ctx.fillRect(xPx, yPx, wPx, rowHeight);

      // Soft grain streaks
      const grainAlpha = 0.06 + 0.04 * pattern.variation;
      ctx.strokeStyle = `rgba(0,0,0,${grainAlpha})`;
      ctx.lineWidth = grain;
      const grainCount = 6;
      for (let g = 0; g < grainCount; g++) {
        const gy =
          yPx + ((g + 1) / (grainCount + 1)) * rowHeight + (i + row) * 1.2;
        ctx.beginPath();
        ctx.moveTo(xPx, gy);
        // gentle wave
        const segs = 8;
        for (let s = 1; s <= segs; s++) {
          const x = xPx + (wPx * s) / segs;
          const dy =
            Math.sin((s + row * 4 + g) * 0.9) *
              (rowHeight / 36) *
              pattern.variation +
            gy;
          ctx.lineTo(x, dy);
        }
        ctx.stroke();
      }
    }

    // Vertical seams (between planks within this row)
    ctx.fillStyle = pattern.seamColor;
    for (let i = 0; i <= 1; i++) {
      const xPx = offsetPx + i * wPx - Math.floor(seamPx / 2);
      ctx.fillRect(xPx, yPx, seamPx, rowHeight);
    }
  }

  // Horizontal seams (between rows)
  ctx.fillStyle = pattern.seamColor;
  ctx.fillRect(0, rowHeight - Math.floor(seamPx / 2), wPx, seamPx);
  ctx.fillRect(0, hPx - Math.floor(seamPx / 2), wPx, seamPx);

  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Returns world units covered by one tile (x = along plank, y = across × 2). */
export function tileSize(pattern: FloorPattern): { len: number; wid2: number } {
  return {
    len: Math.max(0.2, pattern.plankLength),
    wid2: Math.max(0.04, pattern.plankWidth) * 2,
  };
}

function adjustColor(hex: string, amount: number): string {
  // amount roughly in [-0.4, 0.4]; <0 = darker, >0 = lighter
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const f = 1 + amount;
    r = Math.round(r * f);
    g = Math.round(g * f);
    b = Math.round(b * f);
  }
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
