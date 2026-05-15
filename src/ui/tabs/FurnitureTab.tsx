import { useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { FurnitureType } from '../../lib/types';
import {
  listFurnitureMeta,
  type FurnitureMeta,
} from '../../lib/furnitureRegistry';
import { useTranslation } from '../../lib/i18n';

const CATEGORY_ORDER: FurnitureMeta['category'][] = [
  'living',
  'bedroom',
  'dining',
  'kitchen',
  'bath',
  'storage',
  'misc',
];

export const FURNITURE_DRAG_MIME = 'application/x-room-builder-furniture';

export function FurnitureTab() {
  const furniture = useRoomStore((s) => s.furniture);
  const addFurniture = useRoomStore((s) => s.addFurniture);
  const setSelection = useRoomStore((s) => s.setSelection);
  const selection = useRoomStore((s) => s.selection);
  const setDraggingFurnitureType = useRoomStore(
    (s) => s.setDraggingFurnitureType,
  );
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map<FurnitureMeta['category'], FurnitureMeta[]>();
    for (const m of listFurnitureMeta()) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return CATEGORY_ORDER.flatMap((cat) => {
      const list = map.get(cat);
      return list ? [{ category: cat, items: list }] : [];
    });
  }, []);

  const onDragStart = (
    e: React.DragEvent<HTMLButtonElement>,
    type: FurnitureType,
  ) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(FURNITURE_DRAG_MIME, type);
    e.dataTransfer.setData('text/plain', type);
    setDraggingFurnitureType(type);
  };

  const onDragEnd = () => {
    setDraggingFurnitureType(null);
  };

  return (
    <div className="tab-content">
      {grouped.map(({ category, items }) => (
        <section className="panel" key={category}>
          <h3 className="panel-title">
            {t(`category.${category}`)}{' '}
            <span className="panel-title-hint">
              ({t('panel.dragHint')})
            </span>
          </h3>
          <div className="button-grid">
            {items.map((m) => (
              <button
                key={m.type}
                type="button"
                className="furniture-add-btn"
                draggable
                onDragStart={(e) => onDragStart(e, m.type)}
                onDragEnd={onDragEnd}
                onClick={() => addFurniture(m.type)}
                title={`${m.label} — ${m.defaults.width}×${m.defaults.depth}×${m.defaults.height}m`}
              >
                <span
                  className="fadd-swatch"
                  style={{ background: m.defaults.color }}
                  aria-hidden="true"
                />
                <span className="fadd-label">{m.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="panel">
        <h3 className="panel-title">
          {t('panel.furnitureList')} ({furniture.length})
        </h3>
        {furniture.length === 0 ? (
          <p className="empty-hint">{t('panel.empty.furniture')}</p>
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
                        {f.type}
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
