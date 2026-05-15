import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { useRoomStore } from '../store/useRoomStore';
import {
  closestOnSegment,
  innerEdges,
  outerEdges,
  pointInPolygon,
} from '../lib/geometry';
import type { FloorPlan, Vec2 } from '../lib/types';

const LOOK_SPEED = 0.004;
const PITCH_LIMIT = Math.PI / 2.2;
/** Person collision radius in meters (≈36cm shoulder, leaves clearance for 70cm doors). */
const PERSON_RADIUS = 0.18;
/** Doors at floor level (sillHeight ≤ this) are passable. */
const DOOR_FLOOR_THRESHOLD = 0.05;

export function PersonViewController() {
  const personView = useRoomStore((s) => s.personView);
  const setPersonView = useRoomStore((s) => s.setPersonView);
  const floor = useRoomStore((s) => s.floor);
  const settings = useRoomStore((s) => s.settings.personView);
  const { camera, gl } = useThree();

  const rotRef = useRef({ rotationY: 0, pitch: 0 });
  const posRef = useRef({ x: 0, z: 0 });
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const dirtyRef = useRef(false);

  /**
   * Pre-compute collidable wall sub-segments with door openings cut out.
   * The person can pass through gaps where doors live at floor level.
   */
  const obstacles = useMemo(() => getWallObstacles(floor), [floor]);

  useEffect(() => {
    if (personView) {
      rotRef.current = { rotationY: personView.rotationY, pitch: personView.pitch };
      posRef.current = { x: personView.x, z: personView.z };
      dirtyRef.current = false;
    }
  }, [personView?.x, personView?.z, personView?.rotationY, personView?.pitch]);

  // Apply FOV changes to the perspective camera in person view.
  useEffect(() => {
    if (!personView) return;
    if ((camera as PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as PerspectiveCamera;
      cam.fov = settings.fov;
      cam.updateProjectionMatrix();
    }
  }, [personView, camera, settings.fov]);

  useFrame((_, delta) => {
    if (!personView) return;
    const { rotationY, pitch } = rotRef.current;

    const keys = keysRef.current;
    let mx = 0;
    let mz = 0;
    if (keys['w'] || keys['arrowup']) mz -= 1;
    if (keys['s'] || keys['arrowdown']) mz += 1;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const sin = Math.sin(rotationY);
      const cos = Math.cos(rotationY);
      const dx =
        (sin * -mz - cos * mx) * settings.moveSpeed * delta;
      const dz =
        (cos * -mz + sin * mx) * settings.moveSpeed * delta;
      const cur = posRef.current;
      const tryX = cur.x + dx;
      const tryZ = cur.z + dz;
      const full = canStand(tryX, tryZ, floor, obstacles);
      if (full) {
        posRef.current = { x: tryX, z: tryZ };
        dirtyRef.current = true;
      } else {
        if (canStand(tryX, cur.z, floor, obstacles)) {
          posRef.current = { x: tryX, z: cur.z };
          dirtyRef.current = true;
        } else if (canStand(cur.x, tryZ, floor, obstacles)) {
          posRef.current = { x: cur.x, z: tryZ };
          dirtyRef.current = true;
        }
      }
    }

    const px = posRef.current.x;
    const pz = posRef.current.z;
    camera.position.set(px, settings.eyeHeight, pz);
    const cosp = Math.cos(pitch);
    const target = new Vector3(
      px + Math.sin(rotationY) * cosp,
      settings.eyeHeight + Math.sin(pitch),
      pz + Math.cos(rotationY) * cosp,
    );
    camera.lookAt(target);
  });

  const flushToStore = () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const v = useRoomStore.getState().personView;
    if (!v) return;
    setPersonView({
      x: posRef.current.x,
      z: posRef.current.z,
      rotationY: rotRef.current.rotationY,
      pitch: rotRef.current.pitch,
    });
  };

  useEffect(() => {
    if (!personView) return;
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      rotRef.current = {
        rotationY: rotRef.current.rotationY + dx * LOOK_SPEED,
        pitch: Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, rotRef.current.pitch + dy * LOOK_SPEED),
        ),
      };
      dirtyRef.current = true;
    };

    const onUp = (_e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      flushToStore();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personView, gl.domElement]);

  useEffect(() => {
    if (!personView) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
      ) {
        keysRef.current[k] = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keysRef.current) {
        keysRef.current[k] = false;
        // After releasing a movement key, flush latest position.
        flushToStore();
      }
    };
    const onBlur = () => {
      keysRef.current = {};
      flushToStore();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      keysRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personView]);

  if (!personView) return null;

  return (
    <Html
      position={[personView.x, settings.eyeHeight + 0.5, personView.z]}
      center
      zIndexRange={[200, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="person-view-hud" style={{ pointerEvents: 'auto' }}>
        <span className="person-view-hint">WASD移動 / ドラッグで視点回転</span>
        <button
          type="button"
          className="person-view-exit"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPersonView(null)}
        >
          × 視点を解除
        </button>
      </div>
    </Html>
  );
}

interface WallObstacle {
  start: Vec2;
  end: Vec2;
}

function canStand(
  x: number,
  z: number,
  floor: Pick<FloorPlan, 'outline'>,
  obstacles: WallObstacle[],
): boolean {
  if (floor.outline.length < 3) return true;
  if (!pointInPolygon({ x, z }, floor.outline)) return false;
  const p = { x, z };
  for (const e of obstacles) {
    if (closestOnSegment(p, e.start, e.end).distance < PERSON_RADIUS)
      return false;
  }
  return true;
}

/**
 * Build a list of wall sub-segments where the person can collide.
 * Doors at floor level are *cut out* of the wall, so the person can walk
 * through them. Windows (sillHeight > 0.05) and elevated openings remain
 * solid at floor level.
 */
function getWallObstacles(floor: FloorPlan): WallObstacle[] {
  const result: WallObstacle[] = [];

  // Group passable openings (doors at floor level) by wall key.
  const passableByEdge = new Map<string, { offset: number; width: number }[]>();
  for (const op of floor.openings) {
    if (op.kind !== 'door') continue;
    if (op.sillHeight > DOOR_FLOOR_THRESHOLD) continue;
    const key =
      op.wallRef.type === 'outer'
        ? `o:${op.wallRef.edgeIndex}`
        : `i:${op.wallRef.wallId}`;
    const list = passableByEdge.get(key) ?? [];
    list.push({ offset: op.offset, width: op.width });
    passableByEdge.set(key, list);
  }

  const cutEdge = (edge: { start: Vec2; end: Vec2; length: number }, key: string) => {
    if (edge.length <= 0) {
      result.push({ start: edge.start, end: edge.end });
      return;
    }
    const ux = (edge.end.x - edge.start.x) / edge.length;
    const uz = (edge.end.z - edge.start.z) / edge.length;
    const at = (u: number): Vec2 => ({
      x: edge.start.x + ux * u,
      z: edge.start.z + uz * u,
    });
    const doors = (passableByEdge.get(key) ?? [])
      .map((d) => ({
        a: Math.max(0, Math.min(edge.length, d.offset)),
        b: Math.max(0, Math.min(edge.length, d.offset + d.width)),
      }))
      .filter((d) => d.b > d.a)
      .sort((a, b) => a.a - b.a);

    if (doors.length === 0) {
      result.push({ start: edge.start, end: edge.end });
      return;
    }

    // Merge overlapping door intervals first.
    const merged: { a: number; b: number }[] = [];
    for (const d of doors) {
      const last = merged[merged.length - 1];
      if (last && d.a <= last.b) {
        last.b = Math.max(last.b, d.b);
      } else {
        merged.push({ ...d });
      }
    }

    let cursor = 0;
    for (const d of merged) {
      if (d.a > cursor) {
        result.push({ start: at(cursor), end: at(d.a) });
      }
      cursor = d.b;
    }
    if (cursor < edge.length) {
      result.push({ start: at(cursor), end: at(edge.length) });
    }
  };

  for (const e of outerEdges(floor.outline)) {
    if (e.ref.type !== 'outer') continue;
    cutEdge(e, `o:${e.ref.edgeIndex}`);
  }
  for (const e of innerEdges(floor.innerWalls)) {
    if (e.ref.type !== 'inner') continue;
    cutEdge(e, `i:${e.ref.wallId}`);
  }
  return result;
}
