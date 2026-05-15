import { useRoomStore } from '../store/useRoomStore';
import { CompactNumberField } from './CompactNumberField';
import { distance, outerEdges, innerEdges } from '../lib/geometry';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function TopSelectionBar() {
  const selection = useRoomStore((s) => s.selection);
  const floor = useRoomStore((s) => s.floor);
  const furniture = useRoomStore((s) => s.furniture);

  const updateVertex = useRoomStore((s) => s.updateVertex);
  const removeVertex = useRoomStore((s) => s.removeVertex);
  const updateInnerWall = useRoomStore((s) => s.updateInnerWall);
  const removeInnerWall = useRoomStore((s) => s.removeInnerWall);
  const updateOpening = useRoomStore((s) => s.updateOpening);
  const removeOpening = useRoomStore((s) => s.removeOpening);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const setSelection = useRoomStore((s) => s.setSelection);
  const updateBg = useRoomStore((s) => s.updateBackgroundImage);
  const setBg = useRoomStore((s) => s.setBackgroundImage);

  if (!selection) return null;

  let body: React.ReactNode = null;
  let title = '';
  let actions: React.ReactNode = null;

  if (selection.kind === 'vertex') {
    const idx = Number(selection.id);
    const v = floor.outline[idx];
    if (!v) return null;
    title = `頂点 #${idx + 1}`;
    body = (
      <>
        <CompactNumberField
          label="X"
          followGlobalUnit
          value={v.x}
          step={0.05}
          onChange={(x) => updateVertex(idx, { ...v, x })}
        />
        <CompactNumberField
          label="Z"
          followGlobalUnit
          value={v.z}
          step={0.05}
          onChange={(z) => updateVertex(idx, { ...v, z })}
        />
      </>
    );
    actions = (
      <button
        type="button"
        className="qbtn is-danger"
        disabled={floor.outline.length <= 3}
        onClick={() => {
          removeVertex(idx);
          setSelection(null);
        }}
      >
        削除
      </button>
    );
  } else if (selection.kind === 'innerWall') {
    const w = floor.innerWalls.find((x) => x.id === selection.id);
    if (!w) return null;
    const len = distance(w.start, w.end);
    title = `内壁 (${len.toFixed(2)}m)`;
    body = (
      <>
        <CompactNumberField
          label="始点X"
          followGlobalUnit
          value={w.start.x}
          step={0.05}
          onChange={(x) =>
            updateInnerWall(w.id, { start: { ...w.start, x } })
          }
        />
        <CompactNumberField
          label="始点Z"
          followGlobalUnit
          value={w.start.z}
          step={0.05}
          onChange={(z) =>
            updateInnerWall(w.id, { start: { ...w.start, z } })
          }
        />
        <CompactNumberField
          label="終点X"
          followGlobalUnit
          value={w.end.x}
          step={0.05}
          onChange={(x) => updateInnerWall(w.id, { end: { ...w.end, x } })}
        />
        <CompactNumberField
          label="終点Z"
          followGlobalUnit
          value={w.end.z}
          step={0.05}
          onChange={(z) => updateInnerWall(w.id, { end: { ...w.end, z } })}
        />
      </>
    );
    actions = (
      <button
        type="button"
        className="qbtn is-danger"
        onClick={() => {
          removeInnerWall(w.id);
          setSelection(null);
        }}
      >
        削除
      </button>
    );
  } else if (selection.kind === 'opening') {
    const op = floor.openings.find((x) => x.id === selection.id);
    if (!op) return null;
    const allEdges = [
      ...outerEdges(floor.outline),
      ...innerEdges(floor.innerWalls),
    ];
    const edge = allEdges.find((ed) =>
      op.wallRef.type === 'outer'
        ? ed.ref.type === 'outer' && ed.ref.edgeIndex === op.wallRef.edgeIndex
        : ed.ref.type === 'inner' && ed.ref.wallId === op.wallRef.wallId,
    );
    const wallLen = edge?.length ?? 0;
    title = op.kind === 'door' ? 'ドア' : '窓';
    body = (
      <>
        <CompactNumberField
          label="位置"
          followGlobalUnit
          value={op.offset}
          min={0}
          max={Math.max(0, wallLen - op.width)}
          step={0.05}
          onChange={(offset) => updateOpening(op.id, { offset })}
        />
        <CompactNumberField
          label="幅"
          followGlobalUnit
          value={op.width}
          min={0.3}
          max={Math.max(0.3, wallLen - op.offset)}
          step={0.05}
          onChange={(width) => updateOpening(op.id, { width })}
        />
        <CompactNumberField
          label="高さ"
          followGlobalUnit
          value={op.height}
          min={0.3}
          max={Math.max(0.3, floor.height - op.sillHeight)}
          step={0.05}
          onChange={(height) => updateOpening(op.id, { height })}
        />
        {op.kind === 'window' && (
          <CompactNumberField
            label="床上高"
            followGlobalUnit
            value={op.sillHeight}
            min={0}
            max={Math.max(0, floor.height - op.height)}
            step={0.05}
            onChange={(sillHeight) => updateOpening(op.id, { sillHeight })}
          />
        )}
      </>
    );
    actions = (
      <button
        type="button"
        className="qbtn is-danger"
        onClick={() => {
          removeOpening(op.id);
          setSelection(null);
        }}
      >
        削除
      </button>
    );
  } else if (selection.kind === 'backgroundImage') {
    const bg = floor.backgroundImage;
    if (!bg) return null;
    title = '背景画像';
    body = (
      <>
        <CompactNumberField
          label="X"
          followGlobalUnit
          value={bg.x}
          step={0.05}
          onChange={(x) => updateBg({ x })}
        />
        <CompactNumberField
          label="Z"
          followGlobalUnit
          value={bg.z}
          step={0.05}
          onChange={(z) => updateBg({ z })}
        />
        <CompactNumberField
          label="幅"
          followGlobalUnit
          value={bg.width}
          min={0.1}
          step={0.05}
          onChange={(width) => updateBg({ width })}
        />
        <CompactNumberField
          label="高さ"
          followGlobalUnit
          value={bg.height}
          min={0.1}
          step={0.05}
          onChange={(height) => updateBg({ height })}
        />
        <CompactNumberField
          label="回転"
          unit="°"
          value={Number(((bg.rotation * 180) / Math.PI).toFixed(1))}
          step={5}
          onChange={(deg) => updateBg({ rotation: (deg * Math.PI) / 180 })}
        />
        <CompactNumberField
          label="不透明度"
          value={bg.opacity}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(opacity) => updateBg({ opacity })}
        />
      </>
    );
    actions = (
      <>
        <button
          type="button"
          className={`qbtn${bg.locked ? ' is-active' : ''}`}
          onClick={() => updateBg({ locked: !bg.locked })}
        >
          {bg.locked ? '🔒' : '🔓'}
        </button>
        <button
          type="button"
          className="qbtn is-danger"
          onClick={() => {
            setBg(undefined);
            setSelection(null);
          }}
        >
          削除
        </button>
      </>
    );
  } else if (selection.kind === 'furniture') {
    const f = furniture.find((x) => x.id === selection.id);
    if (!f) return null;
    title = f.label;
    body = (
      <>
        <CompactNumberField
          label="幅"
          followGlobalUnit
          value={f.width}
          min={0.1}
          step={0.05}
          onChange={(width) => updateFurniture(f.id, { width })}
        />
        <CompactNumberField
          label="奥行"
          followGlobalUnit
          value={f.depth}
          min={0.1}
          step={0.05}
          onChange={(depth) => updateFurniture(f.id, { depth })}
        />
        <CompactNumberField
          label="高さ"
          followGlobalUnit
          value={f.height}
          min={0.1}
          step={0.05}
          onChange={(height) => updateFurniture(f.id, { height })}
        />
        <CompactNumberField
          label="X"
          followGlobalUnit
          value={f.x}
          step={0.05}
          onChange={(x) => updateFurniture(f.id, { x })}
        />
        <CompactNumberField
          label="Z"
          followGlobalUnit
          value={f.z}
          step={0.05}
          onChange={(z) => updateFurniture(f.id, { z })}
        />
        <CompactNumberField
          label="回転"
          unit="°"
          value={Number((f.rotationY * RAD_TO_DEG).toFixed(1))}
          step={5}
          onChange={(deg) =>
            updateFurniture(f.id, { rotationY: deg * DEG_TO_RAD })
          }
        />
        <label className="topbar-color">
          <input
            type="color"
            aria-label="家具の色"
            value={f.color}
            onChange={(e) => updateFurniture(f.id, { color: e.target.value })}
          />
        </label>
      </>
    );
    actions = (
      <>
        <button
          type="button"
          className="qbtn"
          onClick={() =>
            updateFurniture(f.id, { rotationY: f.rotationY - Math.PI / 2 })
          }
          title="左90°回転 (Shift+R)"
        >
          ↺
        </button>
        <button
          type="button"
          className="qbtn"
          onClick={() =>
            updateFurniture(f.id, { rotationY: f.rotationY + Math.PI / 2 })
          }
          title="右90°回転 (R)"
        >
          ↻
        </button>
        <button
          type="button"
          className="qbtn"
          onClick={() => duplicateFurniture(f.id)}
        >
          複製
        </button>
        <button
          type="button"
          className="qbtn is-danger"
          onClick={() => removeFurniture(f.id)}
        >
          削除
        </button>
      </>
    );
  }

  return (
    <div className="topbar" role="region" aria-label="選択中の項目">
      <div className="topbar-title">
        <span className="topbar-pill" />
        <span className="topbar-name">{title}</span>
      </div>
      <div className="topbar-fields">{body}</div>
      <div className="topbar-actions">
        {actions}
        <button
          type="button"
          className="qbtn"
          onClick={() => setSelection(null)}
          title="選択解除"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
