import { useRoomStore } from '../../store/useRoomStore';

export function OpeningsTab() {
  const floor = useRoomStore((s) => s.floor);
  const setSelection = useRoomStore((s) => s.setSelection);
  const setTool = useRoomStore((s) => s.setTool);
  const selection = useRoomStore((s) => s.selection);

  const doors = floor.openings.filter((o) => o.kind === 'door');
  const windows = floor.openings.filter((o) => o.kind === 'window');
  const isSelOpening = (id: string) =>
    selection?.kind === 'opening' && selection.id === id;

  return (
    <div className="tab-content">
      <section className="panel">
        <h3 className="panel-title">配置ツール</h3>
        <p className="empty-hint">
          ツールを選んだあと、2D間取りエディタで壁をクリックして配置します。
        </p>
        <div className="button-row">
          <button
            type="button"
            className="tool-btn"
            onClick={() => setTool('door')}
            disabled={floor.outline.length < 3}
          >
            ＋ ドア
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => setTool('window')}
            disabled={floor.outline.length < 3}
          >
            ＋ 窓（外壁のみ）
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">ドア ({doors.length})</h3>
        {doors.length === 0 ? (
          <p className="empty-hint">まだドアがありません。</p>
        ) : (
          <ul className="item-list" role="list">
            {doors.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={`item-row${isSelOpening(d.id) ? ' is-selected' : ''}`}
                  aria-pressed={isSelOpening(d.id)}
                  onClick={() => setSelection({ kind: 'opening', id: d.id })}
                >
                  <span className="item-color-dot" style={{ background: '#d97706' }} aria-hidden="true" />
                  <span className="item-label">
                    ドア
                    <span className="item-type">
                      {d.wallRef.type === 'outer' ? `外壁 #${d.wallRef.edgeIndex + 1}` : '内壁'}
                    </span>
                  </span>
                  <span className="item-dim">{d.width.toFixed(2)}×{d.height.toFixed(2)}m</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">窓 ({windows.length})</h3>
        {windows.length === 0 ? (
          <p className="empty-hint">まだ窓がありません。</p>
        ) : (
          <ul className="item-list" role="list">
            {windows.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className={`item-row${isSelOpening(w.id) ? ' is-selected' : ''}`}
                  aria-pressed={isSelOpening(w.id)}
                  onClick={() => setSelection({ kind: 'opening', id: w.id })}
                >
                  <span className="item-color-dot" style={{ background: '#0ea5e9' }} aria-hidden="true" />
                  <span className="item-label">
                    窓
                    <span className="item-type">
                      {w.wallRef.type === 'outer' ? `外壁 #${w.wallRef.edgeIndex + 1}` : '内壁'}
                    </span>
                  </span>
                  <span className="item-dim">{w.width.toFixed(2)}×{w.height.toFixed(2)}m</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
