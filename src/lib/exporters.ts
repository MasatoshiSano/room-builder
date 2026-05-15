import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Object3D, WebGLRenderer } from 'three';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Serialize an inline SVG element as a downloadable .svg file. */
export function exportSvgElement(svg: SVGSVGElement, basename = 'plan'): void {
  // Inline width/height (some viewers need them).
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const w = svg.getBoundingClientRect().width;
  const h = svg.getBoundingClientRect().height;
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(w));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(h));
  if (!clone.getAttribute('xmlns'))
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('xmlns:xlink'))
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  // Strip transient class state that confuses external viewers.
  clone.querySelectorAll('[style*="cursor"]').forEach((el) => {
    (el as SVGElement).style.cursor = '';
  });
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], {
    type: 'image/svg+xml',
  });
  downloadBlob(blob, `room-builder-${basename}-${timestamp()}.svg`);
}

/** Capture the current 3D scene as a PNG. */
export function exportRendererPng(
  gl: WebGLRenderer,
  basename = 'view',
): void {
  const canvas = gl.domElement;
  // Force a render to populate the buffer (preserveDrawingBuffer is true).
  // Some browsers need to read on the same animation frame; we just toDataURL.
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `room-builder-${basename}-${timestamp()}.png`);
    }, 'image/png');
  } catch {
    /* ignore */
  }
}

/** Export the given scene root as a binary glTF (.glb) file. */
export function exportSceneGltf(scene: Object3D, basename = 'scene'): void {
  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        downloadBlob(blob, `room-builder-${basename}-${timestamp()}.glb`);
      } else {
        const blob = new Blob([JSON.stringify(result, null, 2)], {
          type: 'model/gltf+json',
        });
        downloadBlob(blob, `room-builder-${basename}-${timestamp()}.gltf`);
      }
    },
    (e) => console.warn('GLTF export failed:', e),
    { binary: true, includeCustomExtensions: false },
  );
}

/** Open the print dialog with print-friendly styles applied. */
export function printCurrentView(): void {
  // Toggle a body class so a small @media print rule kicks in.
  document.body.classList.add('printing');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('printing');
  }, 50);
}
