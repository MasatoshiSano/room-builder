import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureItem } from './FurnitureItem';
import { PersonViewController } from './PersonViewController';
import { bbox } from '../lib/geometry';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/**
 * Resets the camera to a top-down position when the user exits person view,
 * so they don't end up stuck looking at the floor from inside the room.
 */
function CameraTopDownOnExit({
  cx,
  cz,
  topDownY,
}: {
  cx: number;
  cz: number;
  topDownY: number;
}) {
  const { camera } = useThree();
  const personView = useRoomStore((s) => s.personView);
  const prevPersonRef = useRef<boolean>(!!personView);
  useEffect(() => {
    const wasPerson = prevPersonRef.current;
    const isPerson = !!personView;
    if (wasPerson && !isPerson) {
      camera.position.set(cx, topDownY, cz + 0.001);
      camera.up.set(0, 1, 0);
      camera.lookAt(cx, 0, cz);
      camera.updateProjectionMatrix();
    }
    prevPersonRef.current = isPerson;
  }, [personView, cx, cz, topDownY, camera]);
  return null;
}

export function Scene() {
  const floor = useRoomStore((s) => s.floor);
  const showGrid3D = useRoomStore((s) => s.showGrid3D);
  const personView = useRoomStore((s) => s.personView);
  const furniture = useRoomStore((s) => s.furniture);
  const selection = useRoomStore((s) => s.selection);
  const setSelection = useRoomStore((s) => s.setSelection);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [resizingId, setResizingId] = useState<string | null>(null);

  const selectedFurnitureId =
    selection?.kind === 'furniture' ? selection.id : null;

  useEffect(() => {
    setResizingId(null);
  }, [selectedFurnitureId]);

  const b = bbox(floor.outline);
  const sizeX = Math.max(2, b.maxX - b.minX);
  const sizeZ = Math.max(2, b.maxZ - b.minZ);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const dist = Math.max(sizeX, sizeZ) * 1.5;
  const topDownY = Math.max(sizeX, sizeZ) * 1.6;

  return (
    <Canvas
      shadows
      camera={{
        position: [cx, topDownY, cz + 0.001],
        fov: 45,
      }}
      onPointerMissed={() => setSelection(null)}
      aria-label="3D 部屋ビュー"
    >
      <color attach="background" args={['#f7f5f0']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[cx + 5, 8, cz + 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {showGrid3D && (
        <Grid
          position={[cx, 0.001, cz]}
          args={[sizeX * 2, sizeZ * 2]}
          cellSize={0.5}
          cellColor="#c0b6a3"
          sectionSize={1}
          sectionColor="#9b8d70"
          fadeDistance={Math.max(20, dist * 2)}
          infiniteGrid={false}
        />
      )}

      {floor.outline.length >= 3 && (
        <>
          <Floor outline={floor.outline} color={floor.floorColor} />
          <Walls floor={floor} opaque={!!personView} />
        </>
      )}

      {furniture.map((f) => (
        <FurnitureItem
          key={f.id}
          furniture={f}
          isSelected={f.id === selectedFurnitureId}
          resizing={f.id === selectedFurnitureId && resizingId === f.id}
          setResizing={(v) =>
            setResizingId(v ? f.id : null) /* eslint-disable-line */
          }
          onDragStart={() => setOrbitEnabled(false)}
          onDragEnd={() => setOrbitEnabled(true)}
        />
      ))}

      <PersonViewController />
      <CameraTopDownOnExit cx={cx} cz={cz} topDownY={topDownY} />

      {!personView && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={orbitEnabled}
          target={[cx, 0, cz]}
          enableDamping
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      )}
    </Canvas>
  );
}
