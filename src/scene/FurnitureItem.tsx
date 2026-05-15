import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useRoomStore } from '../store/useRoomStore';
import type { Furniture, Selection } from '../lib/types';
import {
  checkPlacement,
  computeStackY,
  precomputeEdges,
  type PrecomputedEdges,
} from '../lib/collision';
import { getFurnitureMeta } from '../lib/furnitureRegistry';

interface FurnitureItemProps {
  furniture: Furniture;
  isSelected: boolean;
  isMultiSelected: boolean;
  resizing: boolean;
  setResizing: (v: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  /** ids of furniture currently highlighted as collision blockers */
  blockerHighlight: boolean;
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

function ShapeFor({ furniture }: { furniture: Furniture }) {
  const meta = getFurnitureMeta(furniture.type);
  const Shape = meta.Shape;
  return (
    <Shape
      width={furniture.width}
      depth={furniture.depth}
      height={furniture.height}
      color={furniture.color}
    />
  );
}

export function FurnitureItem({
  furniture,
  isSelected,
  isMultiSelected,
  resizing,
  setResizing,
  onDragStart,
  onDragEnd,
  blockerHighlight,
}: FurnitureItemProps) {
  const groupRef = useRef<Group>(null);
  const setSelection = useRoomStore((s) => s.setSelection);
  const toggleInSelection = useRoomStore((s) => s.toggleInSelection);
  const selections = useRoomStore((s) => s.selections);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const translateFurnitures = useRoomStore((s) => s.translateFurnitures);
  const allFurniture = useRoomStore((s) => s.furniture);
  const personView = useRoomStore((s) => s.personView);
  const { camera, gl, size } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const [liveInvalid, setLiveInvalid] = useState(false);

  const stackY = useMemo(() => {
    if (!getFurnitureMeta(furniture.type).stacking.onTop) return 0;
    const others = allFurniture.filter((x) => x.id !== furniture.id);
    return computeStackY(furniture, others);
  }, [furniture, allFurniture]);

  const resizeRef = useRef<{
    pointerId: number;
    corner: Corner;
    anchorWorld: { x: number; z: number };
    origRotation: number;
  } | null>(null);

  useEffect(() => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.set(furniture.x, stackY, furniture.z);
      groupRef.current.rotation.set(0, furniture.rotationY, 0);
    }
  }, [furniture.x, furniture.z, furniture.rotationY, furniture.id, stackY, isDragging]);

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

    const me: Selection = { kind: 'furniture', id: furniture.id };
    const shift = e.nativeEvent.shiftKey;
    if (shift) {
      toggleInSelection(me);
    } else {
      const isAlreadyInGroup = selections.some(
        (s) => s.kind === 'furniture' && s.id === furniture.id,
      );
      if (!isAlreadyInGroup || selections.length <= 1) {
        setSelection(me);
      }
    }

    const hit = screenToFloor(e.nativeEvent.clientX, e.nativeEvent.clientY);
    if (!hit) return;

    const pointerId = e.nativeEvent.pointerId;
    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;
    const offset = { dx: furniture.x - hit.x, dz: furniture.z - hit.z };
    const fSnapshot = { ...furniture };
    const floorSnapshot = useRoomStore.getState().floor;
    const edgesSnapshot: PrecomputedEdges = precomputeEdges(floorSnapshot);
    const groupIds = useRoomStore
      .getState()
      .selections.filter((s) => s.kind === 'furniture')
      .map((s) => s.id);
    const isGroupDrag = groupIds.length > 1 && groupIds.includes(furniture.id);
    const groupSnapshot = isGroupDrag
      ? useRoomStore.getState().furniture.filter((f) => groupIds.includes(f.id))
      : [fSnapshot];
    const othersSnapshot = useRoomStore
      .getState()
      .furniture.filter((f) => !groupSnapshot.some((g) => g.id === f.id));
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

      const cand = { ...fSnapshot, x: nx, z: nz };
      const tryFull = checkPlacement(
        cand,
        floorSnapshot,
        edgesSnapshot,
        othersSnapshot,
      );
      let applyX = lastValid.x;
      let applyZ = lastValid.z;
      let invalid = false;
      if (tryFull.valid) {
        applyX = nx;
        applyZ = nz;
      } else {
        const tryX = checkPlacement(
          { ...fSnapshot, x: nx, z: lastValid.z },
          floorSnapshot,
          edgesSnapshot,
          othersSnapshot,
        );
        const tryZ = checkPlacement(
          { ...fSnapshot, x: lastValid.x, z: nz },
          floorSnapshot,
          edgesSnapshot,
          othersSnapshot,
        );
        if (tryX.valid) applyX = nx;
        if (tryZ.valid) applyZ = nz;
        invalid = !(tryX.valid || tryZ.valid);
      }
      lastValid = { x: applyX, z: applyZ };
      setLiveInvalid(invalid);
      if (groupRef.current) {
        const liveStackY = computeStackY(
          { ...fSnapshot, x: applyX, z: applyZ },
          othersSnapshot,
        );
        groupRef.current.position.set(applyX, liveStackY, applyZ);
      }
    };

    const handleUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      setLiveInvalid(false);
      if (moved) {
        setIsDragging(false);
        onDragEnd();
        const dxFinal = lastValid.x - fSnapshot.x;
        const dzFinal = lastValid.z - fSnapshot.z;
        if (isGroupDrag) {
          translateFurnitures(groupIds, dxFinal, dzFinal);
        } else {
          updateFurniture(furniture.id, { x: lastValid.x, z: lastValid.z });
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const onHeightHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const origH = furniture.height;
    const pointerId = e.pointerId;
    onDragStart();

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

  const wireColor = liveInvalid
    ? '#dc2626'
    : blockerHighlight
      ? '#f97316'
      : '#22d3ee';

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
    >
      <ShapeFor furniture={furniture} />

      {(isSelected || isMultiSelected || liveInvalid || blockerHighlight) && (
        <mesh position={[0, furniture.height / 2, 0]}>
          <boxGeometry
            args={[
              furniture.width + 0.04,
              furniture.height + 0.04,
              furniture.depth + 0.04,
            ]}
          />
          <meshBasicMaterial
            color={wireColor}
            wireframe
            transparent
            opacity={liveInvalid || blockerHighlight ? 1 : 0.95}
          />
        </mesh>
      )}

      {isSelected && !isDragging && !personView && (
        <Html
          position={[0, furniture.height + 0.15, 0]}
          center
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="fpopover" onPointerDown={(e) => e.stopPropagation()}>
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

      {isSelected && resizing && !personView && (
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
