import { useEffect } from 'react';
import { Scene } from './scene/Scene';
import { Sidebar } from './ui/Sidebar';
import { TopSelectionBar } from './ui/TopSelectionBar';
import { HeaderControls } from './ui/HeaderControls';
import { FloorPlanEditor } from './editor2d/FloorPlanEditor';
import { useRoomStore } from './store/useRoomStore';

export default function App() {
  const editorMode = useRoomStore((s) => s.editorMode);
  const selection = useRoomStore((s) => s.selection);
  const tool = useRoomStore((s) => s.tool);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const removeInnerWall = useRoomStore((s) => s.removeInnerWall);
  const removeOpening = useRoomStore((s) => s.removeOpening);
  const removeVertex = useRoomStore((s) => s.removeVertex);
  const popOutlineVertex = useRoomStore((s) => s.popOutlineVertex);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const setSelection = useRoomStore((s) => s.setSelection);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable);
      if (typing) return;

      if (e.key === 'Escape') {
        if (selection) {
          e.preventDefault();
          setSelection(null);
        }
        return;
      }

      if (tool === 'outline' && e.key === 'Backspace') {
        e.preventDefault();
        popOutlineVertex();
        return;
      }

      if (!selection) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selection.kind === 'furniture') removeFurniture(selection.id);
        else if (selection.kind === 'innerWall') removeInnerWall(selection.id);
        else if (selection.kind === 'opening') removeOpening(selection.id);
        else if (selection.kind === 'vertex') removeVertex(Number(selection.id));
        setSelection(null);
        return;
      }

      if (selection.kind === 'furniture' && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const f = useRoomStore
          .getState()
          .furniture.find((x) => x.id === selection.id);
        if (!f) return;
        const delta = e.shiftKey ? -Math.PI / 2 : Math.PI / 2;
        updateFurniture(f.id, { rotationY: f.rotationY + delta });
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'd' &&
        selection.kind === 'furniture'
      ) {
        e.preventDefault();
        duplicateFurniture(selection.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selection,
    tool,
    popOutlineVertex,
    removeFurniture,
    removeInnerWall,
    removeOpening,
    removeVertex,
    duplicateFurniture,
    updateFurniture,
    setSelection,
  ]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        メインコンテンツへスキップ
      </a>
      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-title">Room Builder</h1>
          <HeaderControls />
        </header>
        <div className="app-main" id="main-content">
          <main className="canvas-area" aria-label="メイン編集エリア">
            <TopSelectionBar />
            {editorMode === 'plan' ? <FloorPlanEditor /> : <Scene />}
          </main>
          <Sidebar />
        </div>
      </div>
    </>
  );
}
