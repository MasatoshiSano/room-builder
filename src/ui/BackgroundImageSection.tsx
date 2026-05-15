import { useRef } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { CompactNumberField } from './CompactNumberField';

export function BackgroundImageSection() {
  const img = useRoomStore((s) => s.floor.backgroundImage);
  const setBg = useRoomStore((s) => s.setBackgroundImage);
  const setBgFromBlob = useRoomStore((s) => s.setBackgroundImageFromBlob);
  const updateBg = useRoomStore((s) => s.updateBackgroundImage);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowed.has(f.type)) {
      alert('対応していない画像形式です（PNG / JPEG / WebP のみ）');
      return;
    }
    const MAX_BYTES = 16 * 1024 * 1024;
    if (f.size > MAX_BYTES) {
      alert(
        `画像が大きすぎます（${(f.size / 1024 / 1024).toFixed(1)} MB）。16 MB 以下にしてください。`,
      );
      return;
    }
    let aspect = 1;
    try {
      const url = URL.createObjectURL(f);
      const i = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('decode failed'));
        im.src = url;
      });
      aspect = i.width / Math.max(1, i.height);
      URL.revokeObjectURL(url);
    } catch {
      alert('画像のデコードに失敗しました。');
      return;
    }
    const widthM = 6;
    const heightM = widthM / aspect;
    await setBgFromBlob(f, {
      x: 0,
      z: 0,
      width: widthM,
      height: heightM,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      locked: false,
    });
  };

  return (
    <section className="panel">
      <h3 className="panel-title">背景画像（PNG下絵）</h3>
      <p className="empty-hint">
        間取り図のスケッチを下絵として配置できます。寸法調整しながら壁を引いてください。
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFile}
        style={{ display: 'none' }}
      />
      <div className="button-row">
        <button
          type="button"
          className="qbtn is-primary"
          onClick={() => fileRef.current?.click()}
        >
          {img ? '画像を差し替え' : '画像を選択'}
        </button>
        {img && (
          <button
            type="button"
            className="qbtn is-danger"
            onClick={() => setBg(undefined)}
          >
            削除
          </button>
        )}
      </div>

      {img && (
        <>
          <div className="button-row">
            <button
              type="button"
              className={`qbtn${img.visible ? ' is-active' : ''}`}
              onClick={() => updateBg({ visible: !img.visible })}
              aria-pressed={img.visible}
            >
              {img.visible ? '👁 表示中' : '🚫 非表示'}
            </button>
            <button
              type="button"
              className={`qbtn${img.locked ? ' is-active' : ''}`}
              onClick={() => updateBg({ locked: !img.locked })}
              aria-pressed={img.locked}
              title="ロック中はキャンバス上で操作できません"
            >
              {img.locked ? '🔒 ロック中' : '🔓 操作可'}
            </button>
          </div>
          <div className="cnf-row-2">
            <CompactNumberField
              label="X"
              followGlobalUnit
              value={img.x}
              step={0.05}
              onChange={(x) => updateBg({ x })}
            />
            <CompactNumberField
              label="Z"
              followGlobalUnit
              value={img.z}
              step={0.05}
              onChange={(z) => updateBg({ z })}
            />
          </div>
          <div className="cnf-row-2">
            <CompactNumberField
              label="幅"
              followGlobalUnit
              value={img.width}
              min={0.1}
              step={0.05}
              onChange={(width) => updateBg({ width })}
            />
            <CompactNumberField
              label="高さ"
              followGlobalUnit
              value={img.height}
              min={0.1}
              step={0.05}
              onChange={(height) => updateBg({ height })}
            />
          </div>
          <div className="cnf-row-2">
            <CompactNumberField
              label="回転"
              unit="°"
              value={Number(((img.rotation * 180) / Math.PI).toFixed(1))}
              step={5}
              onChange={(deg) =>
                updateBg({ rotation: (deg * Math.PI) / 180 })
              }
            />
            <CompactNumberField
              label="不透明度"
              value={img.opacity}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(opacity) => updateBg({ opacity })}
            />
          </div>
        </>
      )}
    </section>
  );
}
