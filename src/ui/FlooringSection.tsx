import { useRoomStore } from '../store/useRoomStore';
import { CompactNumberField } from './CompactNumberField';
import { DEFAULT_FLOOR_PATTERN, type FloorPattern, type FloorRegion } from '../lib/types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function PatternEditor({
  pattern,
  onPatch,
}: {
  pattern: FloorPattern;
  onPatch: (patch: Partial<FloorPattern>) => void;
}) {
  return (
    <>
      <label className="color-row">
        <span style={{ minWidth: 56 }}>向き</span>
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={Number(((pattern.direction * RAD_TO_DEG) % 180).toFixed(0))}
          onChange={(e) =>
            onPatch({ direction: Number(e.target.value) * DEG_TO_RAD })
          }
          aria-label="フローリングの向き"
          style={{ flex: 1 }}
        />
        <span aria-hidden="true">
          {Math.round((pattern.direction * RAD_TO_DEG) % 180)}°
        </span>
      </label>
      <div className="cnf-row-2">
        <CompactNumberField
          label="板幅"
          followGlobalUnit
          value={pattern.plankWidth}
          min={0.04}
          step={0.01}
          onChange={(plankWidth) => onPatch({ plankWidth })}
        />
        <CompactNumberField
          label="板長"
          followGlobalUnit
          value={pattern.plankLength}
          min={0.2}
          step={0.05}
          onChange={(plankLength) => onPatch({ plankLength })}
        />
      </div>
      <div className="cnf-row-2">
        <label className="color-row">
          <span style={{ minWidth: 36 }}>板色</span>
          <input
            type="color"
            value={pattern.color}
            onChange={(e) => onPatch({ color: e.target.value })}
            aria-label="板の色"
          />
          <span style={{ fontSize: 11, color: '#888' }}>{pattern.color}</span>
        </label>
        <label className="color-row">
          <span style={{ minWidth: 36 }}>継目</span>
          <input
            type="color"
            value={pattern.seamColor}
            onChange={(e) => onPatch({ seamColor: e.target.value })}
            aria-label="継ぎ目の色"
          />
          <span style={{ fontSize: 11, color: '#888' }}>{pattern.seamColor}</span>
        </label>
      </div>
      <label className="color-row">
        <span style={{ minWidth: 56 }}>揺らぎ</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={pattern.variation}
          onChange={(e) => onPatch({ variation: Number(e.target.value) })}
          aria-label="板の色揺らぎ"
          style={{ flex: 1 }}
        />
        <span aria-hidden="true">{Math.round(pattern.variation * 100)}%</span>
      </label>
    </>
  );
}

function RegionRow({ region }: { region: FloorRegion }) {
  const updateFloorRegion = useRoomStore((s) => s.updateFloorRegion);
  const patchPattern = useRoomStore((s) => s.patchFloorRegionPattern);
  const remove = useRoomStore((s) => s.removeFloorRegion);
  const selection = useRoomStore((s) => s.selection);
  const setSelection = useRoomStore((s) => s.setSelection);
  const isSel =
    selection?.kind === 'floorRegion' && selection.id === region.id;

  return (
    <li>
      <div
        className={`saved-row${isSel ? ' is-selected' : ''}`}
        style={{
          borderColor: isSel ? '#22d3ee' : undefined,
          background: isSel ? '#e8efff' : undefined,
        }}
      >
        <button
          type="button"
          className="saved-name-btn"
          onClick={() => setSelection({ kind: 'floorRegion', id: region.id })}
        >
          <span className="saved-name">{region.label}</span>
          <span className="saved-meta">
            {region.polygon.length}頂点 / {Math.round(region.pattern.plankWidth * 100)}×{Math.round(region.pattern.plankLength * 100)}cm
          </span>
        </button>
        <div className="saved-actions">
          <button
            type="button"
            className="qbtn is-danger"
            title="削除"
            onClick={() => {
              if (confirm(`部屋「${region.label}」のフローリング設定を削除しますか？`)) {
                remove(region.id);
              }
            }}
          >
            ✕
          </button>
        </div>
      </div>
      {isSel && (
        <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            className="cnf-input"
            value={region.label}
            placeholder="部屋名"
            onChange={(e) => updateFloorRegion(region.id, { label: e.target.value })}
            aria-label="部屋名"
          />
          <PatternEditor
            pattern={region.pattern}
            onPatch={(patch) => patchPattern(region.id, patch)}
          />
        </div>
      )}
    </li>
  );
}

export function FlooringSection() {
  const floor = useRoomStore((s) => s.floor);
  const patchPattern = useRoomStore((s) => s.patchFloorPattern);
  const addRegion = useRoomStore((s) => s.addFloorRegion);
  const pattern = floor.floorPattern ?? {
    ...DEFAULT_FLOOR_PATTERN,
    color: floor.floorColor,
  };
  const regions = floor.floorRegions ?? [];

  const onAddRegion = () => {
    // Compute room centroid + a 2×2m default rect inside the outline.
    let cx = 0;
    let cz = 0;
    if (floor.outline.length > 0) {
      for (const v of floor.outline) {
        cx += v.x;
        cz += v.z;
      }
      cx /= floor.outline.length;
      cz /= floor.outline.length;
    }
    const half = 1.0;
    const polygon = [
      { x: cx - half, z: cz - half },
      { x: cx + half, z: cz - half },
      { x: cx + half, z: cz + half },
      { x: cx - half, z: cz + half },
    ];
    const label = `部屋 ${regions.length + 1}`;
    addRegion(polygon, label, { ...pattern });
  };

  return (
    <section className="panel" aria-labelledby="flooring">
      <h3 id="flooring" className="panel-title">
        フローリング
        <span className="panel-title-hint">(部屋全体)</span>
      </h3>
      <PatternEditor pattern={pattern} onPatch={patchPattern} />
      <div style={{ borderTop: '0.5px solid var(--hig-separator, #ccc)', margin: '4px 0' }} />
      <div className="button-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--hig-label-secondary, #555)' }}>
          部屋ごとの上書き ({regions.length})
        </span>
        <button
          type="button"
          className="qbtn is-primary"
          onClick={onAddRegion}
          disabled={floor.outline.length < 3}
        >
          ＋ 部屋を追加
        </button>
      </div>
      {regions.length === 0 ? (
        <p className="empty-hint">
          部屋を追加すると、その範囲だけフローリングを差し替えできます。
        </p>
      ) : (
        <ul className="item-list" role="list" style={{ background: 'transparent' }}>
          {regions.map((r) => (
            <RegionRow key={r.id} region={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
