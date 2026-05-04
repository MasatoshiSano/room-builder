import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureItem } from './FurnitureItem';
import { bbox } from '../lib/geometry';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export function Scene() {
  const floor = useRoomStore((s) => s.floor);
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

  return (
    <Canvas
      shadows
      camera={{
        position: [cx + dist, dist * 0.8, cz + dist],
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

      {floor.outline.length >= 3 && (
        <>
          <Floor outline={floor.outline} color={floor.floorColor} />
          <Walls floor={floor} />
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

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled}
        target={[cx, floor.height / 2, cz]}
        enableDamping
      />
    </Canvas>
  );
}
