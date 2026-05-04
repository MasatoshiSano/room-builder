import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useRoomStore } from '../store/useRoomStore';

const EYE_HEIGHT = 1.6;
const LOOK_SPEED = 0.004;
const PITCH_LIMIT = Math.PI / 2.2;

export function PersonViewController() {
  const personView = useRoomStore((s) => s.personView);
  const setPersonView = useRoomStore((s) => s.setPersonView);
  const { camera, gl } = useThree();

  // Local refs for drag — avoid Zustand per-frame updates
  const rotRef = useRef({ rotationY: 0, pitch: 0 });
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  // Sync store → ref when personView changes from outside (position change)
  useEffect(() => {
    if (personView) {
      rotRef.current = { rotationY: personView.rotationY, pitch: personView.pitch };
    }
  }, [personView?.x, personView?.z, personView?.rotationY, personView?.pitch]);

  // Apply camera every frame
  useFrame(() => {
    if (!personView) return;
    const { rotationY, pitch } = rotRef.current;
    camera.position.set(personView.x, EYE_HEIGHT, personView.z);
    const cos = Math.cos(pitch);
    const target = new Vector3(
      personView.x + Math.sin(rotationY) * cos,
      EYE_HEIGHT + Math.sin(pitch),
      personView.z + Math.cos(rotationY) * cos,
    );
    camera.lookAt(target);
  });

  // Pointer drag handlers on the canvas element
  useEffect(() => {
    if (!personView) return;
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      rotRef.current = {
        rotationY: rotRef.current.rotationY - dx * LOOK_SPEED,
        pitch: Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, rotRef.current.pitch + dy * LOOK_SPEED),
        ),
      };
    };

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      // Sync final rotation back to store
      setPersonView({
        ...personView,
        rotationY: rotRef.current.rotationY,
        pitch: rotRef.current.pitch,
      });
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
  }, [personView, gl.domElement, setPersonView]);

  if (!personView) return null;

  return (
    <Html
      position={[personView.x, EYE_HEIGHT + 0.5, personView.z]}
      center
      zIndexRange={[200, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="person-view-hud" style={{ pointerEvents: 'auto' }}>
        <span className="person-view-hint">ドラッグで視点を回転</span>
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
