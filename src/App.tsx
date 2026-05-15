import { useEffect, useRef, useState } from 'react';
import type { Furniture } from './lib/types';
import { Scene } from './scene/Scene';
import { Sidebar } from './ui/Sidebar';
import { TopSelectionBar } from './ui/TopSelectionBar';
import { HeaderControls } from './ui/HeaderControls';
import { FloorPlanEditor } from './editor2d/FloorPlanEditor';
import { useRoomStore } from './store/useRoomStore';
import { useTranslation } from './lib/i18n';

export default function App() {
  const editorMode = useRoomStore((s) => s.editorMode);
  const selection = useRoomStore((s) => s.selection);
  const selections = useRoomStore((s) => s.selections);
  const tool = useRoomStore((s) => s.tool);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const removeFurnitures = useRoomStore((s) => s.removeFurnitures);
  const removeInnerWall = useRoomStore((s) => s.removeInnerWall);
  const removeOpening = useRoomStore((s) => s.removeOpening);
  const removeVertex = useRoomStore((s) => s.removeVertex);
  const popOutlineVertex = useRoomStore((s) => s.popOutlineVertex);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const duplicateFurnitures = useRoomStore((s) => s.duplicateFurnitures);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const rotateFurnitures = useRoomStore((s) => s.rotateFurnitures);
  const setSelection = useRoomStore((s) => s.setSelection);
  const selectAllFurniture = useRoomStore((s) => s.selectAllFurniture);
  const persistError = useRoomStore((s) => s.persistError);
  const clearPersistError = useRoomStore((s) => s.clearPersistError);
  const editorReady = useRoomStore((s) => s.ready);

  const { t } = useTranslation();
  const clipboardRef = useRef<Furniture[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('room-builder-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        'room-builder-sidebar-collapsed',
        sidebarCollapsed ? '1' : '0',
      );
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) return;

      const meta = e.ctrlKey || e.metaKey;

      // Undo / Redo
      if (meta && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useRoomStore.temporal.getState().undo();
        return;
      }
      if (
        meta &&
        ((e.shiftKey && e.key.toLowerCase() === 'z') ||
          e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        useRoomStore.temporal.getState().redo();
        return;
      }
      // Select all furniture
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllFurniture();
        return;
      }

      if (e.key === 'Escape') {
        if (selection) {
          e.preventDefault();
          setSelection(null);
        }
        return;
      }

      if (tool === 'outline' && e.key === 'Backspace') {
        e.preventDefault();
        if (selection?.kind === 'vertex') {
          const idx = Number(selection.id);
          const cur = useRoomStore.getState().floor.outline.length;
          if (cur > 3) {
            removeVertex(idx);
            setSelection(null);
            return;
          }
        }
        popOutlineVertex();
        return;
      }

      if (selections.length === 0 && !selection) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const furnIds = selections
          .filter((s) => s.kind === 'furniture')
          .map((s) => s.id);
        if (furnIds.length > 1) {
          // Many at once → confirm.
          const ok = window.confirm(
            t('confirm.deleteFurnitureMany', { n: furnIds.length }),
          );
          if (!ok) return;
          removeFurnitures(furnIds);
          setSelection(null);
          return;
        }
        if (!selection) return;
        if (selection.kind === 'furniture') removeFurniture(selection.id);
        else if (selection.kind === 'innerWall') removeInnerWall(selection.id);
        else if (selection.kind === 'opening') removeOpening(selection.id);
        else if (selection.kind === 'vertex') {
          const cur = useRoomStore.getState().floor.outline.length;
          if (cur <= 3) return;
          removeVertex(Number(selection.id));
        }
        setSelection(null);
        return;
      }

      if (selection?.kind === 'furniture' && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const ids =
          selections.length > 1
            ? selections
                .filter((s) => s.kind === 'furniture')
                .map((s) => s.id)
            : [selection.id];
        const delta = e.shiftKey ? -Math.PI / 2 : Math.PI / 2;
        if (ids.length > 1) {
          rotateFurnitures(ids, delta);
        } else {
          const f = useRoomStore
            .getState()
            .furniture.find((x) => x.id === selection.id);
          if (!f) return;
          updateFurniture(f.id, { rotationY: f.rotationY + delta });
        }
        return;
      }

      // Copy: Ctrl+C on furniture (single or multi)
      if (meta && e.key.toLowerCase() === 'c' && selection?.kind === 'furniture') {
        e.preventDefault();
        const ids = selections
          .filter((s) => s.kind === 'furniture')
          .map((s) => s.id);
        const all = useRoomStore.getState().furniture;
        clipboardRef.current = all.filter((f) => ids.includes(f.id));
        return;
      }
      // Paste: Ctrl+V — re-add furniture from clipboard with fresh ids and slight offset
      if (meta && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        const store = useRoomStore.getState();
        const newSelections: { kind: 'furniture'; id: string }[] = [];
        for (const f of clipboardRef.current) {
          const id = store.addFurniture(f.type, { x: f.x + 0.3, z: f.z + 0.3 });
          // Carry over rotation/size/color from the copied originals.
          store.updateFurniture(id, {
            label: f.label,
            width: f.width,
            depth: f.depth,
            height: f.height,
            rotationY: f.rotationY,
            color: f.color,
          });
          newSelections.push({ kind: 'furniture', id });
        }
        useRoomStore.getState().setSelections(newSelections);
        return;
      }

      if (
        meta &&
        e.key.toLowerCase() === 'd' &&
        selection?.kind === 'furniture'
      ) {
        e.preventDefault();
        const ids = selections
          .filter((s) => s.kind === 'furniture')
          .map((s) => s.id);
        if (ids.length > 1) {
          duplicateFurnitures(ids);
        } else {
          duplicateFurniture(selection.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selection,
    selections,
    tool,
    popOutlineVertex,
    removeFurniture,
    removeFurnitures,
    removeInnerWall,
    removeOpening,
    removeVertex,
    duplicateFurniture,
    duplicateFurnitures,
    updateFurniture,
    rotateFurnitures,
    setSelection,
    selectAllFurniture,
    t,
  ]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('app.skipToMain')}
      </a>
      <div
        className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      >
        <header className="app-header">
          <h1 className="app-title">{t('app.title')}</h1>
          <HeaderControls />
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-pressed={sidebarCollapsed}
            title={
              sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')
            }
            aria-label={
              sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')
            }
          >
            {sidebarCollapsed ? '◀' : '▶'}
          </button>
        </header>
        <div className="app-main" id="main-content">
          <main className="canvas-area" aria-label={t('app.canvasArea')}>
            <TopSelectionBar />
            {editorMode === 'plan' ? <FloorPlanEditor /> : <Scene />}
          </main>
          <Sidebar />
        </div>
        {!editorReady && <div className="hydrating-hint" aria-live="polite">読込中…</div>}
        {persistError && (
          <div className="persist-error" role="alert">
            <span>{persistError}</span>
            <button
              type="button"
              className="qbtn"
              onClick={clearPersistError}
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </>
  );
}
