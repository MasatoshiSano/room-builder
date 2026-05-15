import { Canvas, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  SoftShadows,
} from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  Plane,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { useRoomStore } from '../store/useRoomStore';
import { Floor } from './Floor';
import { Walls } from './Walls';
import { FurnitureItem } from './FurnitureItem';
import { PersonViewController } from './PersonViewController';
import { bbox } from '../lib/geometry';
import {
  checkPlacement,
  precomputeEdges,
  type PrecomputedEdges,
} from '../lib/collision';
import { getFurnitureMeta } from '../lib/furnitureRegistry';
import { FURNITURE_DRAG_MIME } from '../ui/tabs/FurnitureTab';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { FurnitureType } from '../lib/types';

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

const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0);

/**
 * Listen for HTML5 D&D events on the canvas and call back with the world
 * (x,z) position when a furniture type is dropped.
 */
function CanvasDropTarget({
  onDrop,
}: {
  onDrop: (type: FurnitureType, worldX: number, worldZ: number) => void;
}) {
  const { camera, gl, size } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const handleDragOver = (ev: DragEvent) => {
      if (!ev.dataTransfer) return;
      if (ev.dataTransfer.types.includes(FURNITURE_DRAG_MIME)) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copy';
      }
    };
    const handleNativeDrop = (ev: DragEvent) => {
      const t = ev.dataTransfer?.getData(FURNITURE_DRAG_MIME);
      if (!t) return;
      ev.preventDefault();
      const rect = el.getBoundingClientRect();
      const ndc = new Vector2(
        ((ev.clientX - rect.left) / size.width) * 2 - 1,
        -((ev.clientY - rect.top) / size.height) * 2 + 1,
      );
      const ray = new Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = new Vector3();
      const ok = ray.ray.intersectPlane(FLOOR_PLANE, hit);
      if (!ok) return;
      onDrop(t as FurnitureType, hit.x, hit.z);
    };
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleNativeDrop);
    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleNativeDrop);
    };
  }, [camera, gl, size, onDrop]);
  return null;
}

/** Captures the WebGL renderer + scene root so external code can grab a PNG / GLB. */
function GLCapture({
  onReady,
}: {
  onReady: (gl: WebGLRenderer, scene: import('three').Scene) => void;
}) {
  const { gl, scene } = useThree();
  useEffect(() => {
    onReady(gl, scene);
  }, [gl, scene, onReady]);
  return null;
}

/** Decorative ceiling that fades in when toggled — receives shadows from indoor lights. */
function Ceiling({
  cx,
  cz,
  sizeX,
  sizeZ,
  height,
  color,
}: {
  cx: number;
  cz: number;
  sizeX: number;
  sizeZ: number;
  height: number;
  color: string;
}) {
  return (
    <mesh
      position={[cx, height, cz]}
      rotation={[Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[sizeX * 1.4, sizeZ * 1.4]} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0}
        side={2 /* DoubleSide */}
      />
    </mesh>
  );
}

const LIGHTING_PRESETS: Record<
  'day' | 'evening' | 'night',
  {
    background: string;
    sunColor: string;
    sunIntensity: number;
    ambient: number;
    env: 'apartment' | 'sunset' | 'night' | 'lobby' | 'city';
  }
> = {
  day: {
    background: '#dde6ef',
    sunColor: '#fff5e0',
    sunIntensity: 1.4,
    ambient: 0.45,
    env: 'apartment',
  },
  evening: {
    background: '#e7c8a0',
    sunColor: '#ffb476',
    sunIntensity: 0.9,
    ambient: 0.35,
    env: 'sunset',
  },
  night: {
    background: '#0e1320',
    sunColor: '#a3b6e0',
    sunIntensity: 0.25,
    ambient: 0.18,
    env: 'night',
  },
};

export function Scene() {
  const floor = useRoomStore((s) => s.floor);
  const settings = useRoomStore((s) => s.settings);
  const personView = useRoomStore((s) => s.personView);
  const furniture = useRoomStore((s) => s.furniture);
  const selection = useRoomStore((s) => s.selection);
  const selections = useRoomStore((s) => s.selections);
  const setSelection = useRoomStore((s) => s.setSelection);
  const addFurniture = useRoomStore((s) => s.addFurniture);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [resizingId, setResizingId] = useState<string | null>(null);

  const selectedFurnitureId =
    selection?.kind === 'furniture' ? selection.id : null;
  const multiSelectedIds = useMemo(
    () =>
      new Set(
        selections
          .filter((s) => s.kind === 'furniture')
          .map((s) => s.id),
      ),
    [selections],
  );

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

  const preset = LIGHTING_PRESETS[settings.lighting];

  // Sun direction from azimuth (deg, 0=+Z south, 90=+X east) + elevation (deg above horizon).
  const az = (settings.sunAzimuth * Math.PI) / 180;
  const el = (settings.sunElevation * Math.PI) / 180;
  const sunRadius = Math.max(dist * 1.4, 6);
  const sunPos: [number, number, number] = [
    cx + Math.sin(az) * Math.cos(el) * sunRadius,
    Math.sin(el) * sunRadius + 2,
    cz + Math.cos(az) * Math.cos(el) * sunRadius,
  ];

  /** Compute blockers (other furniture id + wall keys) when a single item is selected. */
  const blockers = useMemo<{ ids: Set<string>; walls: Set<string> }>(() => {
    if (!selectedFurnitureId)
      return { ids: new Set<string>(), walls: new Set<string>() };
    const f = furniture.find((x) => x.id === selectedFurnitureId);
    if (!f) return { ids: new Set<string>(), walls: new Set<string>() };
    const others = furniture.filter((x) => x.id !== f.id);
    const edges: PrecomputedEdges = precomputeEdges(floor);
    const c = checkPlacement(f, floor, edges, others);
    return {
      ids: new Set(c.blockers),
      walls: new Set(c.wallHits),
    };
  }, [selectedFurnitureId, furniture, floor]);

  const onGLReady = (gl: WebGLRenderer, scene: import('three').Scene) => {
    glRef.current = gl;
    sceneRef.current = scene;
  };

  const shadowsEnabled = settings.showShadows && !personView;

  return (
    <Canvas
      shadows={shadowsEnabled}
      camera={{
        position: [cx, topDownY, cz + 0.001],
        fov: settings.personView.fov,
      }}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
        preserveDrawingBuffer: true /* for PNG export */,
      }}
      onPointerMissed={() => setSelection(null)}
      aria-label="3D 部屋ビュー"
    >
      <GLCapture onReady={onGLReady} />
      <CanvasDropTarget
        onDrop={(type, x, z) => {
          addFurniture(type, { x, z });
          // Force a re-render so the new piece is positioned.
          setOrbitEnabled((v) => v);
        }}
      />
      <color attach="background" args={[preset.background]} />
      {shadowsEnabled && (
        <SoftShadows size={20} samples={12} focus={0.8} />
      )}
      <ambientLight intensity={preset.ambient} />
      <hemisphereLight intensity={0.25} groundColor="#5b4a36" color="#cfd9e4" />
      <directionalLight
        position={sunPos}
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        castShadow={shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={dist * 4 + 20}
        shadow-camera-left={-(sizeX + 4)}
        shadow-camera-right={sizeX + 4}
        shadow-camera-top={sizeZ + 4}
        shadow-camera-bottom={-(sizeZ + 4)}
        shadow-bias={-0.0005}
      />
      <Environment preset={preset.env} background={false} />

      {settings.showGrid3D && !personView && (
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
          <Floor
            outline={floor.outline}
            color={floor.floorColor}
            pattern={floor.floorPattern}
            regions={floor.floorRegions}
          />
          {shadowsEnabled && (
            <ContactShadows
              position={[cx, 0.005, cz]}
              opacity={0.45}
              scale={Math.max(sizeX, sizeZ) * 1.5}
              blur={2.4}
              far={4}
              resolution={1024}
            />
          )}
          <Walls
            floor={floor}
            opaque={!!personView}
            outerCastShadow={settings.outerWallShadow}
          />
          {settings.showCeiling && (
            <Ceiling
              cx={cx}
              cz={cz}
              sizeX={sizeX}
              sizeZ={sizeZ}
              height={floor.height}
              color={floor.wallColor}
            />
          )}
        </>
      )}

      {furniture.map((f) => {
        const meta = getFurnitureMeta(f.type);
        return (
          <FurnitureItem
            key={f.id}
            furniture={f}
            isSelected={f.id === selectedFurnitureId}
            isMultiSelected={multiSelectedIds.has(f.id) && f.id !== selectedFurnitureId}
            resizing={f.id === selectedFurnitureId && resizingId === f.id}
            setResizing={(v) => setResizingId(v ? f.id : null)}
            onDragStart={() => setOrbitEnabled(false)}
            onDragEnd={() => setOrbitEnabled(true)}
            blockerHighlight={blockers.ids.has(f.id) && meta != null}
          />
        );
      })}

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

// ---------- exposed renderer + scene for PNG / GLB export ----------
const glRef: { current: WebGLRenderer | null } = { current: null };
const sceneRef: { current: import('three').Scene | null } = { current: null };

export function getSceneRenderer(): WebGLRenderer | null {
  return glRef.current;
}

export function getSceneRoot(): import('three').Scene | null {
  return sceneRef.current;
}
