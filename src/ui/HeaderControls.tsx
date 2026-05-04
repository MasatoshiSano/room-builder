import { useRoomStore } from '../store/useRoomStore';

const GRID_VALUES = [0.05, 0.1, 0.25, 0.5];

export function HeaderControls() {
  const editorMode = useRoomStore((s) => s.editorMode);
  const setEditorMode = useRoomStore((s) => s.setEditorMode);
  const gridSize = useRoomStore((s) => s.gridSize);
  const setGridSize = useRoomStore((s) => s.setGridSize);
  const showGrid3D = useRoomStore((s) => s.showGrid3D);
  const setShowGrid3D = useRoomStore((s) => s.setShowGrid3D);

  return (
    <div className="header-controls">
      <div role="radiogroup" aria-label="表示モード" className="seg">
        <button
          type="button"
          className={`seg-btn${editorMode === 'plan' ? ' is-active' : ''}`}
          role="radio"
          aria-checked={editorMode === 'plan'}
          onClick={() => setEditorMode('plan')}
        >
          2D 間取り
        </button>
        <button
          type="button"
          className={`seg-btn${editorMode === 'arrange' ? ' is-active' : ''}`}
          role="radio"
          aria-checked={editorMode === 'arrange'}
          onClick={() => setEditorMode('arrange')}
        >
          3D 配置
        </button>
      </div>
      <div className="header-grid" aria-label="グリッド">
        <span className="header-grid-label">グリッド</span>
        <div role="radiogroup" className="seg">
          {GRID_VALUES.map((g) => (
            <button
              key={g}
              type="button"
              className={`seg-btn${gridSize === g ? ' is-active' : ''}`}
              role="radio"
              aria-checked={gridSize === g}
              onClick={() => setGridSize(g)}
            >
              {g}m
            </button>
          ))}
        </div>
        {editorMode === 'arrange' && (
          <button
            type="button"
            className={`seg-btn${showGrid3D ? ' is-active' : ''}`}
            role="switch"
            aria-checked={showGrid3D}
            title="3Dグリッド表示切替"
            onClick={() => setShowGrid3D(!showGrid3D)}
          >
            マス目
          </button>
        )}
      </div>
    </div>
  );
}
