import { useEffect, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { useTranslation, type Locale } from '../lib/i18n';
import {
  exportRendererPng,
  exportSceneGltf,
  exportSvgElement,
  printCurrentView,
} from '../lib/exporters';
import { getSceneRenderer, getSceneRoot } from '../scene/Scene';
import { getFloorPlanSvg } from '../editor2d/FloorPlanEditor';
import type { Unit } from '../lib/units';

const GRID_VALUES = [0.05, 0.1, 0.25, 0.5];
const UNIT_VALUES: Unit[] = ['m', 'cm', 'mm'];
const LOCALE_VALUES: Locale[] = ['ja', 'en'];
const LIGHTING_VALUES = ['day', 'evening', 'night'] as const;

/** Subscribe to zundo's pastStates / futureStates length so the buttons disable correctly. */
function useTemporalStateLengths(): { past: number; future: number } {
  const [state, setState] = useState(() => {
    const t = useRoomStore.temporal.getState();
    return { past: t.pastStates.length, future: t.futureStates.length };
  });
  useEffect(() => {
    const unsub = useRoomStore.temporal.subscribe((s) => {
      setState({ past: s.pastStates.length, future: s.futureStates.length });
    });
    return unsub;
  }, []);
  return state;
}

export function HeaderControls() {
  const editorMode = useRoomStore((s) => s.editorMode);
  const setEditorMode = useRoomStore((s) => s.setEditorMode);
  const gridSize = useRoomStore((s) => s.gridSize);
  const setGridSize = useRoomStore((s) => s.setGridSize);
  const settings = useRoomStore((s) => s.settings);
  const setShowGrid3D = useRoomStore((s) => s.setShowGrid3D);
  const setShowCeiling = useRoomStore((s) => s.setShowCeiling);
  const setShowShadows = useRoomStore((s) => s.setShowShadows);
  const setOuterWallShadow = useRoomStore((s) => s.setOuterWallShadow);
  const setShowClearance = useRoomStore((s) => s.setShowClearance);
  const setLighting = useRoomStore((s) => s.setLighting);
  const setSunAzimuth = useRoomStore((s) => s.setSunAzimuth);
  const setSunElevation = useRoomStore((s) => s.setSunElevation);
  const setUnit = useRoomStore((s) => s.setUnit);
  const personView = useRoomStore((s) => s.personView);
  const setPersonView = useRoomStore((s) => s.setPersonView);
  const personPlacing = useRoomStore((s) => s.personPlacing);
  const setPersonPlacing = useRoomStore((s) => s.setPersonPlacing);
  const floor = useRoomStore((s) => s.floor);
  const isOutlineClosed = floor.outline.length >= 3;

  const { t, locale, setLocale } = useTranslation();
  const { past, future } = useTemporalStateLengths();

  const undo = () => useRoomStore.temporal.getState().undo();
  const redo = () => useRoomStore.temporal.getState().redo();

  const onExportSvg = () => {
    const svg = getFloorPlanSvg();
    if (!svg) {
      alert('SVG が取得できませんでした（2Dエディタを表示中ですか？）');
      return;
    }
    exportSvgElement(svg, 'plan');
  };
  const onExportPng = () => {
    const gl = getSceneRenderer();
    if (!gl) {
      alert('3Dビューが取得できませんでした（3D配置モードに切替えてください）');
      return;
    }
    exportRendererPng(gl, 'view');
  };
  const onExportGltf = () => {
    const scene = getSceneRoot();
    if (!scene) {
      alert('3Dシーンが取得できませんでした（3D配置モードに切替えてください）');
      return;
    }
    exportSceneGltf(scene, 'scene');
  };

  return (
    <div className="header-controls">
      <div role="radiogroup" aria-label={t('header.mode.plan')} className="seg">
        <button
          type="button"
          className={`seg-btn${editorMode === 'plan' ? ' is-active' : ''}`}
          role="radio"
          aria-checked={editorMode === 'plan'}
          onClick={() => setEditorMode('plan')}
        >
          {t('header.mode.plan')}
        </button>
        <button
          type="button"
          className={`seg-btn${editorMode === 'arrange' ? ' is-active' : ''}`}
          role="radio"
          aria-checked={editorMode === 'arrange'}
          onClick={() => setEditorMode('arrange')}
        >
          {t('header.mode.arrange')}
        </button>
      </div>

      {/* Undo / Redo */}
      <div className="header-grid">
        <button
          type="button"
          className="seg-btn"
          onClick={undo}
          disabled={past === 0}
          title={`${t('header.undo')} (Ctrl+Z)`}
          aria-label={t('header.undo')}
        >
          ↶
        </button>
        <button
          type="button"
          className="seg-btn"
          onClick={redo}
          disabled={future === 0}
          title={`${t('header.redo')} (Ctrl+Shift+Z)`}
          aria-label={t('header.redo')}
        >
          ↷
        </button>
      </div>

      {/* Grid + cell + clearance */}
      <div className="header-grid" aria-label={t('header.grid')}>
        <span className="header-grid-label">{t('header.grid')}</span>
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
            className={`seg-btn${settings.showGrid3D ? ' is-active' : ''}`}
            role="switch"
            aria-checked={settings.showGrid3D}
            title={t('header.grid3d')}
            onClick={() => setShowGrid3D(!settings.showGrid3D)}
          >
            {t('header.grid3d')}
          </button>
        )}
        <button
          type="button"
          className={`seg-btn${settings.showClearance ? ' is-active' : ''}`}
          role="switch"
          aria-checked={settings.showClearance}
          title={t('header.clearance')}
          onClick={() => setShowClearance(!settings.showClearance)}
        >
          {t('header.clearance')}
        </button>
      </div>

      {/* Unit */}
      <div className="header-grid">
        <span className="header-grid-label">{t('header.unit')}</span>
        <div role="radiogroup" className="seg">
          {UNIT_VALUES.map((u) => (
            <button
              key={u}
              type="button"
              className={`seg-btn${settings.unit === u ? ' is-active' : ''}`}
              role="radio"
              aria-checked={settings.unit === u}
              onClick={() => setUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Lighting (3D only) */}
      {editorMode === 'arrange' && (
        <div className="header-grid">
          <span className="header-grid-label">{t('header.lighting')}</span>
          <div role="radiogroup" className="seg">
            {LIGHTING_VALUES.map((l) => (
              <button
                key={l}
                type="button"
                className={`seg-btn${settings.lighting === l ? ' is-active' : ''}`}
                role="radio"
                aria-checked={settings.lighting === l}
                onClick={() => setLighting(l)}
              >
                {t(`header.lighting.${l === 'day' ? 'daytime' : l}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`seg-btn${settings.showCeiling ? ' is-active' : ''}`}
            role="switch"
            aria-checked={settings.showCeiling}
            title={t('header.ceiling')}
            onClick={() => setShowCeiling(!settings.showCeiling)}
          >
            {t('header.ceiling')}
          </button>
          <button
            type="button"
            className={`seg-btn${settings.showShadows ? ' is-active' : ''}`}
            role="switch"
            aria-checked={settings.showShadows}
            title={t('header.shadow')}
            onClick={() => setShowShadows(!settings.showShadows)}
          >
            {t('header.shadow')}
          </button>
          <button
            type="button"
            className={`seg-btn${settings.outerWallShadow ? ' is-active' : ''}`}
            role="switch"
            aria-checked={settings.outerWallShadow}
            title={t('header.wallShadow.title')}
            onClick={() => setOuterWallShadow(!settings.outerWallShadow)}
            disabled={!settings.showShadows}
          >
            {t('header.wallShadow')}
          </button>
          <label className="sun-slider" title={`方位 ${settings.sunAzimuth.toFixed(0)}°`}>
            ☀
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={settings.sunAzimuth}
              onChange={(e) => setSunAzimuth(Number(e.target.value))}
              aria-label="日射方位"
            />
            <span>{settings.sunAzimuth.toFixed(0)}°</span>
          </label>
          <label className="sun-slider" title={`仰角 ${settings.sunElevation.toFixed(0)}°`}>
            ⟂
            <input
              type="range"
              min={1}
              max={89}
              step={1}
              value={settings.sunElevation}
              onChange={(e) => setSunElevation(Number(e.target.value))}
              aria-label="日射仰角"
            />
            <span>{settings.sunElevation.toFixed(0)}°</span>
          </label>
        </div>
      )}

      {/* Person view */}
      {isOutlineClosed && (
        <button
          type="button"
          className={`seg-btn${personView || personPlacing ? ' is-active' : ''}`}
          role="switch"
          aria-checked={!!personView || personPlacing}
          title={
            personView
              ? t('header.personView.exit')
              : personPlacing
                ? t('header.personView.cancelPlace')
                : t('header.personView.start')
          }
          onClick={() => {
            if (personView) {
              setPersonView(null);
              setPersonPlacing(false);
              return;
            }
            if (personPlacing) {
              setPersonPlacing(false);
              return;
            }
            setEditorMode('plan');
            setPersonPlacing(true);
          }}
        >
          {t('header.personView')}
        </button>
      )}

      {/* Export menu */}
      <div className="header-grid">
        <span className="header-grid-label">{t('header.export')}</span>
        <button type="button" className="seg-btn" onClick={onExportSvg}>
          {t('header.exportSvg')}
        </button>
        <button type="button" className="seg-btn" onClick={onExportPng}>
          {t('header.exportPng')}
        </button>
        <button type="button" className="seg-btn" onClick={onExportGltf}>
          {t('header.exportGltf')}
        </button>
        <button type="button" className="seg-btn" onClick={printCurrentView}>
          {t('header.print')}
        </button>
      </div>

      {/* Locale */}
      <div className="header-grid">
        <span className="header-grid-label">{t('header.locale')}</span>
        <div role="radiogroup" className="seg">
          {LOCALE_VALUES.map((l) => (
            <button
              key={l}
              type="button"
              className={`seg-btn${locale === l ? ' is-active' : ''}`}
              role="radio"
              aria-checked={locale === l}
              onClick={() => setLocale(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
