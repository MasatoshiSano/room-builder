import { Button } from '@serendie/ui';
import { useRoomStore } from '../../store/useRoomStore';
import { NumberField } from '../NumberField';
import { SavedPlansSection } from '../SavedPlansSection';
import { BackgroundImageSection } from '../BackgroundImageSection';
import { useTranslation } from '../../lib/i18n';

export function PlanTab() {
  const floor = useRoomStore((s) => s.floor);
  const setFloorHeight = useRoomStore((s) => s.setFloorHeight);
  const setWallColor = useRoomStore((s) => s.setWallColor);
  const setFloorColor = useRoomStore((s) => s.setFloorColor);
  const setWallOpacity = useRoomStore((s) => s.setWallOpacity);
  const setOutline = useRoomStore((s) => s.setOutline);
  const setSelection = useRoomStore((s) => s.setSelection);
  const setTool = useRoomStore((s) => s.setTool);
  const loadSample = useRoomStore((s) => s.loadSample);
  const resetAll = useRoomStore((s) => s.resetAll);
  const selection = useRoomStore((s) => s.selection);
  const { t } = useTranslation();

  return (
    <div className="tab-content">
      <section className="panel" aria-labelledby="plan-dim">
        <h3 id="plan-dim" className="panel-title">
          {t('panel.room')}
        </h3>
        <NumberField
          label={t('panel.ceilingHeight')}
          unit="m"
          value={floor.height}
          min={1.8}
          max={5}
          step={0.05}
          onChange={(h) => setFloorHeight(h)}
        />
        <label className="color-row">
          <span>{t('panel.wallColor')}</span>
          <input
            type="color"
            value={floor.wallColor}
            onChange={(e) => setWallColor(e.target.value)}
            aria-label={t('panel.wallColor')}
          />
          <span aria-hidden="true">{floor.wallColor}</span>
        </label>
        <label className="color-row">
          <span>{t('panel.floorColor')}</span>
          <input
            type="color"
            value={floor.floorColor}
            onChange={(e) => setFloorColor(e.target.value)}
            aria-label={t('panel.floorColor')}
          />
          <span aria-hidden="true">{floor.floorColor}</span>
        </label>
        <label className="color-row">
          <span>{t('panel.wallOpacity')}</span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={floor.wallOpacity ?? 0.6}
            onChange={(e) => setWallOpacity(Number(e.target.value))}
            aria-label={t('panel.wallOpacity')}
            style={{ flex: 1 }}
          />
          <span aria-hidden="true">
            {Math.round(((floor.wallOpacity ?? 0.6) as number) * 100)}%
          </span>
        </label>
      </section>

      <BackgroundImageSection />

      <SavedPlansSection />

      <section className="panel" aria-labelledby="plan-quick">
        <h3 id="plan-quick" className="panel-title">
          {t('panel.quickStart')}
        </h3>
        <p className="empty-hint">
          サンプルを読み込むか、テンプレートから始めて頂点をドラッグで調整できます。
        </p>
        <div className="button-row">
          <Button styleType="filled" size="small" onClick={() => loadSample()}>
            {t('panel.sample')}
          </Button>
        </div>
        <div className="button-row">
          <Button
            styleType="outlined"
            size="small"
            onClick={() => {
              setOutline([
                { x: -2, z: -2 },
                { x: 2, z: -2 },
                { x: 2, z: 2 },
                { x: -2, z: 2 },
              ]);
              setTool('select');
              setSelection(null);
            }}
          >
            {t('panel.square4x4')}
          </Button>
          <Button
            styleType="outlined"
            size="small"
            onClick={() => {
              setOutline([
                { x: -3, z: -2 },
                { x: 1, z: -2 },
                { x: 1, z: 0 },
                { x: 3, z: 0 },
                { x: 3, z: 2 },
                { x: -3, z: 2 },
              ]);
              setTool('select');
              setSelection(null);
            }}
          >
            {t('panel.lShape')}
          </Button>
          <Button
            styleType="ghost"
            size="small"
            onClick={() => {
              setOutline([]);
              setTool('outline');
              setSelection(null);
            }}
          >
            {t('panel.clear')}
          </Button>
        </div>
      </section>

      <section className="panel" aria-labelledby="plan-vertices">
        <h3 id="plan-vertices" className="panel-title">
          {t('panel.vertices')} ({floor.outline.length})
        </h3>
        {floor.outline.length === 0 ? (
          <p className="empty-hint">{t('panel.empty.vertices')}</p>
        ) : (
          <ul className="item-list" role="list">
            {floor.outline.map((v, i) => {
              const isSel =
                selection?.kind === 'vertex' && selection.id === String(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`item-row${isSel ? ' is-selected' : ''}`}
                    aria-pressed={isSel}
                    onClick={() =>
                      setSelection({ kind: 'vertex', id: String(i) })
                    }
                  >
                    <span className="item-color-dot" aria-hidden="true" />
                    <span className="item-label">
                      頂点 #{i + 1}
                      <span className="item-type">
                        {v.x.toFixed(2)}, {v.z.toFixed(2)} m
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="plan-inner">
        <h3 id="plan-inner" className="panel-title">
          {t('panel.innerWalls')} ({floor.innerWalls.length})
        </h3>
        {floor.innerWalls.length === 0 ? (
          <p className="empty-hint">「内壁」ツールで線を引いて部屋を分割できます。</p>
        ) : (
          <ul className="item-list" role="list">
            {floor.innerWalls.map((w) => {
              const isSel =
                selection?.kind === 'innerWall' && selection.id === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    className={`item-row${isSel ? ' is-selected' : ''}`}
                    aria-pressed={isSel}
                    onClick={() =>
                      setSelection({ kind: 'innerWall', id: w.id })
                    }
                  >
                    <span
                      className="item-color-dot"
                      aria-hidden="true"
                      style={{ background: '#5a4a3a' }}
                    />
                    <span className="item-label">
                      内壁
                      <span className="item-type">
                        ({w.start.x.toFixed(1)},{w.start.z.toFixed(1)})→({w.end.x.toFixed(1)},{w.end.z.toFixed(1)})
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">{t('panel.reset')}</h3>
        <div className="button-row">
          <Button
            styleType="outlined"
            size="small"
            onClick={() => {
              if (window.confirm(t('confirm.resetAll'))) {
                resetAll();
              }
            }}
          >
            {t('panel.resetAll')}
          </Button>
        </div>
      </section>
    </div>
  );
}
