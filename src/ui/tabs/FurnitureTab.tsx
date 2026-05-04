import { Button } from '@serendie/ui';
import { useRoomStore } from '../../store/useRoomStore';
import {
  FURNITURE_TYPE_LABELS,
  type FurnitureType,
} from '../../lib/types';

const TYPES: FurnitureType[] = [
  'sofa',
  'bed',
  'table',
  'roundTable',
  'desk',
  'nightstand',
  'chair',
  'shelf',
  'cupboard',
  'tvBoard',
  'tv',
  'plant',
  'kitchenSink',
  'stove',
  'refrigerator',
  'microwave',
  'toaster',
  'coffeeMaker',
  'riceCooker',
  'washingMachine',
  'washBasin',
  'box',
];

export function FurnitureTab() {
  const furniture = useRoomStore((s) => s.furniture);
  const addFurniture = useRoomStore((s) => s.addFurniture);
  const setSelection = useRoomStore((s) => s.setSelection);
  const selection = useRoomStore((s) => s.selection);

  return (
    <div className="tab-content">
      <section className="panel">
        <h3 className="panel-title">家具を追加</h3>
        <div className="button-grid">
          {TYPES.map((t) => (
            <Button
              key={t}
              styleType="outlined"
              size="small"
              onClick={() => addFurniture(t)}
            >
              + {FURNITURE_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">家具リスト ({furniture.length})</h3>
        {furniture.length === 0 ? (
          <p className="empty-hint">まだ家具がありません。</p>
        ) : (
          <ul className="item-list" role="list">
            {furniture.map((f) => {
              const isSel =
                selection?.kind === 'furniture' && selection.id === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`item-row${isSel ? ' is-selected' : ''}`}
                    aria-pressed={isSel}
                    onClick={() =>
                      setSelection({ kind: 'furniture', id: f.id })
                    }
                  >
                    <span
                      className="item-color-dot"
                      aria-hidden="true"
                      style={{ background: f.color }}
                    />
                    <span className="item-label">
                      {f.label}
                      <span className="item-type">
                        {FURNITURE_TYPE_LABELS[f.type]}
                      </span>
                    </span>
                    <span className="item-dim">
                      {f.width.toFixed(1)}×{f.depth.toFixed(1)}×{f.height.toFixed(1)}m
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
