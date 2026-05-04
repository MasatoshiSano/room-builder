import { Html } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { Group, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useRoomStore } from '../store/useRoomStore';
import type { Furniture } from '../lib/types';
import {
  isFurniturePlacementValid,
  precomputeEdges,
  type PrecomputedEdges,
} from '../lib/collision';
import { BoxShape } from './shapes/Box';
import { SofaShape } from './shapes/Sofa';
import { BedShape } from './shapes/Bed';
import { TableShape } from './shapes/Table';
import { RoundTableShape } from './shapes/RoundTable';
import { DeskShape } from './shapes/Desk';
import { NightstandShape } from './shapes/Nightstand';
import { ChairShape } from './shapes/Chair';
import { ShelfShape } from './shapes/Shelf';
import { CupboardShape } from './shapes/Cupboard';

interface FurnitureItemProps {
  furniture: Furniture;
  isSelected: boolean;
  resizing: boolean;
  setResizing: (v: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function ShapeFor({ furniture }: { furniture: Furniture }) {
  const { type, width, depth, height, color } = furniture;
  switch (type) {
    case 'sofa':
      return <SofaShape width={width} depth={depth} height={height} color={color} />;
    case 'bed':
      return <BedShape width={width} depth={depth} height={height} color={color} />;
    case 'table':
      return <TableShape width={width} depth={depth} height={height} color={color} />;
    case 'roundTable':
      return <RoundTableShape width={width} depth={depth} height={height} color={color} />;
    case 'desk':
      return <DeskShape width={width} depth={depth} height={height} color={color} />;
    case 'nightstand':
      return <NightstandShape width={width} depth={depth} height={height} color={color} />;
    case 'chair':
      return <ChairShape width={width} depth={depth} height={height} color={color} />;
    case 'shelf':
      return <ShelfShape width={width} depth={depth} height={height} color={color} />;
    case 'cupboard':
      return <CupboardShape width={width} depth={depth} height={height} color={color} />;
    case 'box':
    default:
      return <BoxShape width={width} depth={depth} height={height} color={color} />;
  }
}

const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const DRAG_THRESHOLD_PX = 5;

type Corner = 'nw' | 'ne' | 'sw' | 'se';

const CORNER_SIGN: Record<Corner, { x: number; z: number }> = {
  nw: { x: -1, z: -1 },
  ne: { x: 1, z: -1 },
  sw: { x: -1, z: 1 },
  se: { x: 1, z: 1 },
};

export function FurnitureItem({
  furniture,
  isSelected,
  resizing,
  setResizing,
  onDragStart,
  onDragEnd,
}: FurnitureItemProps) {
  const groupRef = useRef<Group>(null);
  const setSelection = useRoomStore((s) => s.setSelection);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const { camera, gl, size } = useThree();

  const [isDragging, setIsDragging] = useState(false);

  // Resize state (for the corner handles in <Html>)
  const resizeRef = useRef<{
    pointerId: number;
    corner: Corner;
    anchorWorld: { x: number; z: number };
    origRotation: number;
  } | null>(null);

  // Sync visual position when furniture data changes and we are NOT dragging
  useEffect(() => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.set(furniture.x, 0, furniture.z);
      groupRef.current.rotation.set(0, furniture.rotationY, 0);
    }
  }, [furniture.x, furniture.z, furniture.rotationY, furniture.id, isDragging]);

  const screenToFloor = (clientX: number, clientY: number): Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / size.width) * 2 - 1,
      -((clientY - rect.top) / size.height) * 2 + 1,
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const target = new Vector3();
    const hit = raycaster.ray.intersectPlane(FLOOR_PLANE, target);
    return hit ? target : null;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (resizing) return;
    if (e.nativeEvent.button !== 0) return;
    e.stopPropagation();
    setSelection({ kind: 'furniture', id: furniture.id });
    const hit = screenToFloor(e.nativeEvent.clientX, e.nativeEvent.clientY);
    if (!hit) return;

    const pointerId = e.nativeEvent.pointerId;
    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;
    const offset = {
      dx: furniture.x - hit.x,
      dz: furniture.z - hit.z,
    };
    // Snapshot of current furniture for collision tests + last valid position
    const fSnapshot = { ...furniture };
    const floorSnapshot = useRoomStore.getState().floor;
    const edgesSnapshot: PrecomputedEdges = precomputeEdges(floorSnapshot);
    let lastValid = { x: fSnapshot.x, z: fSnapshot.z };
    let moved = false;

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        moved = true;
        setIsDragging(true);
        onDragStart();
      }
      const h = screenToFloor(ev.clientX, ev.clientY);
      if (!h) return;
      const nx = h.x + offset.dx;
      const nz = h.z + offset.dz;

      // Try full move; if invalid, try axis-decoupled moves to slide along walls.
      const tryFull = isFurniturePlacementValid(
        { ...fSnapshot, x: nx, z: nz },
        floorSnapshot,
        edgesSnapshot,
      );
      let applyX = lastValid.x;
      let applyZ = lastValid.z;
      if (tryFull) {
        applyX = nx;
        applyZ = nz;
      } else {
        const tryX = isFurniturePlacementValid(
          { ...fSnapshot, x: nx, z: lastValid.z },
          floorSnapshot,
          edgesSnapshot,
        );
        const tryZ = isFurniturePlacementValid(
          { ...fSnapshot, x: lastValid.x, z: nz },
          floorSnapshot,
          edgesSnapshot,
        );
        if (tryX) {
          applyX = nx;
        }
        if (tryZ) {
          applyZ = nz;
        }
      }
      lastValid = { x: applyX, z: applyZ };
      if (groupRef.current) {
        groupRef.current.position.set(applyX, 0, applyZ);
      }
    };

    const handleUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      if (moved) {
        setIsDragging(false);
        onDragEnd();
        updateFurniture(furniture.id, { x: lastValid.x, z: lastValid.z });
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  // ---- Height handle ----
  const onHeightHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const origH = furniture.height;
    const pointerId = e.pointerId;
    onDragStart();

    // Convert screen pixels to world Y meters via camera projection.
    // Approximation: use canvas pixel ratio at the furniture's location.
    const project = (worldY: number): number => {
      const v = new Vector3(furniture.x, worldY, furniture.z);
      v.project(camera);
      return ((-v.y + 1) / 2) * size.height;
    };
    const yScreenAt0 = project(0);
    const yScreenAtH = project(origH);
    const dyPxPerMeter = Math.max(20, yScreenAt0 - yScreenAtH);

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dy = ev.clientY - startY;
      const newH = Math.max(0.1, origH - dy / dyPxPerMeter);
      updateFurniture(furniture.id, { height: newH });
    };
    const handleUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      onDragEnd();
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  // ---- Resize handles ----
  const onResizeHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    corner: Corner,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const opp = CORNER_SIGN[corner];
    const anchorLocal = {
      x: (-opp.x * furniture.width) / 2,
      z: (-opp.z * furniture.depth) / 2,
    };
    const cos = Math.cos(furniture.rotationY);
    const sin = Math.sin(furniture.rotationY);
    const anchorWorld = {
      x: furniture.x + anchorLocal.x * cos - anchorLocal.z * sin,
      z: furniture.z + anchorLocal.x * sin + anchorLocal.z * cos,
    };
    resizeRef.current = {
      pointerId: e.pointerId,
      corner,
      anchorWorld,
      origRotation: furniture.rotationY,
    };
    onDragStart();

    const handleMove = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r || ev.pointerId !== r.pointerId) return;
      const hit = screenToFloor(ev.clientX, ev.clientY);
      if (!hit) return;
      const cs = Math.cos(r.origRotation);
      const sn = Math.sin(r.origRotation);
      const rdx = hit.x - r.anchorWorld.x;
      const rdz = hit.z - r.anchorWorld.z;
      const lx = rdx * cs + rdz * sn;
      const lz = -rdx * sn + rdz * cs;
      const newW = Math.max(0.1, Math.abs(lx));
      const newD = Math.max(0.1, Math.abs(lz));
      const cxLocal = lx / 2;
      const czLocal = lz / 2;
      const cxWorld = r.anchorWorld.x + cxLocal * cs - czLocal * sn;
      const czWorld = r.anchorWorld.z + cxLocal * sn + czLocal * cs;
      updateFurniture(furniture.id, {
        width: newW,
        depth: newD,
        x: cxWorld,
        z: czWorld,
      });
    };

    const handleUp = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r || ev.pointerId !== r.pointerId) return;
      resizeRef.current = null;
      onDragEnd();
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
    >
      <ShapeFor furniture={furniture} />

      {isSelected && (
        <mesh position={[0, furniture.height / 2, 0]}>
          <boxGeometry
            args={[
              furniture.width + 0.04,
              furniture.height + 0.04,
              furniture.depth + 0.04,
            ]}
          />
          <meshBasicMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={0.95}
          />
        </mesh>
      )}

      {isSelected && !isDragging && (
        <Html
          position={[0, furniture.height + 0.15, 0]}
          center
          distanceFactor={6}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="fpopover"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="fpopover-label">{furniture.label}</span>
            <button
              type="button"
              className="fpopover-btn"
              onClick={() =>
                updateFurniture(furniture.id, {
                  rotationY: furniture.rotationY - Math.PI / 2,
                })
              }
              title="左90°回転"
            >
              ↺
            </button>
            <button
              type="button"
              className="fpopover-btn"
              onClick={() =>
                updateFurniture(furniture.id, {
                  rotationY: furniture.rotationY + Math.PI / 2,
                })
              }
              title="右90°回転"
            >
              ↻
            </button>
            <button
              type="button"
              className={`fpopover-btn${resizing ? ' is-active' : ''}`}
              onClick={() => setResizing(!resizing)}
              title="サイズ変更（角ドラッグ）"
            >
              ⤢
            </button>
            <button
              type="button"
              className="fpopover-btn"
              onClick={() => duplicateFurniture(furniture.id)}
              title="複製"
            >
              複製
            </button>
            <button
              type="button"
              className="fpopover-btn is-danger"
              onClick={() => removeFurniture(furniture.id)}
              title="削除"
            >
              ✕
            </button>
          </div>
        </Html>
      )}

      {isSelected && resizing && (
        <>
          {(Object.keys(CORNER_SIGN) as Corner[]).map((c) => {
            const s = CORNER_SIGN[c];
            return (
              <Html
                key={c}
                position={[
                  (s.x * furniture.width) / 2,
                  0.02,
                  (s.z * furniture.depth) / 2,
                ]}
                center
                distanceFactor={6}
                zIndexRange={[101, 0]}
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  className="resize-handle-3d"
                  onPointerDown={(e) => onResizeHandlePointerDown(e, c)}
                  aria-label={`${c}コーナー リサイズ`}
                />
              </Html>
            );
          })}
          <Html
            position={[0, furniture.height + 0.02, 0]}
            center
            distanceFactor={6}
            zIndexRange={[101, 0]}
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="resize-handle-3d resize-handle-height"
              onPointerDown={(e) => onHeightHandlePointerDown(e)}
              aria-label="高さリサイズ"
              title="上下にドラッグで高さ変更"
            />
          </Html>
        </>
      )}
    </group>
  );
}
