import { useSyncExternalStore } from 'react';

export type Locale = 'ja' | 'en';

const STORAGE_KEY = 'room-builder-locale';

const dictionaries: Record<Locale, Record<string, string>> = {
  ja: {
    'app.title': 'Room Builder',
    'app.skipToMain': 'メインコンテンツへスキップ',
    'app.canvasArea': 'メイン編集エリア',

    'header.mode.plan': '2D 間取り',
    'header.mode.arrange': '3D 配置',
    'header.grid': 'グリッド',
    'header.grid3d': 'マス目',
    'header.personView': '👤 人視点',
    'header.personView.exit': '人視点を解除',
    'header.personView.cancelPlace': '配置モード解除',
    'header.personView.start': '人視点を配置 (2Dマップでクリック→ドラッグして向きを決定)',
    'header.undo': '元に戻す',
    'header.redo': 'やり直し',
    'header.locale': '言語',
    'header.unit': '単位',
    'header.export': '出力',
    'header.exportSvg': 'SVG (2D)',
    'header.exportPng': 'PNG (3D)',
    'header.exportGltf': 'GLB (3D)',
    'header.print': '印刷',
    'header.lighting': '照明',
    'header.lighting.daytime': '昼',
    'header.lighting.evening': '夕',
    'header.lighting.night': '夜',
    'header.ceiling': '天井',
    'header.shadow': '影',
    'header.wallShadow': '壁影',
    'header.wallShadow.title': '外壁から影を落とす（窓からの光のスジ）',
    'header.clearance': '通路',

    'sidebar.tab.plan': '間取り',
    'sidebar.tab.openings': 'ドア・窓',
    'sidebar.tab.furniture': '家具',

    'tool.select': '選択',
    'tool.outline': '外周描画',
    'tool.innerWall': '内壁',
    'tool.door': 'ドア',
    'tool.window': '窓',
    'tool.closeOutline': '外周を閉じる',
    'tool.popOne': '↶ 1点戻す',
    'tool.zoomIn': '拡大',
    'tool.zoomOut': '縮小',
    'tool.rotate90': 'ビューを90°回転',
    'tool.resetView': 'ビューをリセット',

    'panel.room': '部屋の設定',
    'panel.ceilingHeight': '天井高',
    'panel.wallColor': '壁の色',
    'panel.floorColor': '床の色',
    'panel.wallOpacity': '壁の透明度',
    'panel.quickStart': 'クイックスタート',
    'panel.sample': 'サンプルを読込（1LDK）',
    'panel.square4x4': '正方形 4×4m',
    'panel.lShape': 'L字',
    'panel.clear': 'クリア',
    'panel.vertices': '頂点',
    'panel.innerWalls': '内壁',
    'panel.reset': 'リセット',
    'panel.resetAll': 'すべてクリア',
    'panel.addFurniture': '家具を追加',
    'panel.furnitureList': '家具リスト',
    'panel.empty.furniture': 'まだ家具がありません。',
    'panel.empty.vertices': 'ツールバーの「外周描画」で頂点を打つ、または上のクイックスタートを使用。',
    'panel.dragHint': 'ドラッグして配置',

    'category.living': 'リビング',
    'category.bedroom': '寝室',
    'category.dining': 'ダイニング',
    'category.kitchen': 'キッチン',
    'category.bath': '浴室・水回り',
    'category.storage': '収納',
    'category.misc': 'その他',

    'topbar.delete': '削除',
    'topbar.duplicate': '複製',
    'topbar.rotateLeft': '左90°回転 (Shift+R)',
    'topbar.rotateRight': '右90°回転 (R)',

    'help.outline.empty': '部屋の頂点をクリックして配置してください。',
    'help.outline.few': '頂点 {n}点（緑＝直近）。あと{rem}点以上必要です。',
    'help.outline.ready': '緑＝直近の頂点。始点(青)クリックまたは「外周を閉じる」で確定。赤い破線=交差するため追加できません。',
    'help.innerWall.start': '始点をクリックしてください。',
    'help.innerWall.end': '終点をクリックしてください。',
    'help.door': '配置したい壁をクリックしてください。',
    'help.window': '外壁をクリックしてください。',
    'help.select': '頂点・壁・開口・家具をドラッグで編集。背景ドラッグでパン、ホイールでズーム。',
    'help.personPlace': '人視点の配置: 床面をクリックして開始位置を決め、そのままドラッグして向きを示し、離すと 3D 人視点に切り替わります。',

    'confirm.resetAll': 'すべての家具と間取りをクリアします。よろしいですか？（Undoで戻せます）',
    'confirm.deletePlan': 'このプランを削除します。元に戻せません。よろしいですか？',
    'confirm.deleteVertices': '頂点を{n}個削除します。よろしいですか？',
    'confirm.deleteFurnitureMany': '選択中の家具{n}個を削除します。よろしいですか？',

    'persist.error': 'localStorage への保存に失敗しました（容量上限の可能性）。背景画像のサイズを確認してください。',
    'persist.error.plans': '保存プランの書き込みに失敗しました（容量上限の可能性）。',

    'plans.title': '保存した間取り',
    'plans.namePlaceholder': 'プラン名（任意）',
    'plans.save': '保存',
    'plans.export': '⤓ エクスポート',
    'plans.import': '⤒ インポート',
    'plans.exportTitle': '保存プランを JSON ファイルにダウンロード',
    'plans.importTitle': 'JSON ファイルから読み込み',
    'plans.empty': 'まだ保存された間取りはありません。',
    'plans.replaceQ': '既存の保存プランを置き換えますか？\n  OK = 置き換え（既存は消えます）\n  キャンセル = 既存に追加（マージ）',
    'plans.imported': 'インポート完了: {added} 件追加 / {skipped} 件スキップ',
    'plans.importErr': 'インポート失敗: {error}',
    'plans.fileReadErr': 'ファイルの読み込みに失敗しました',
    'plans.overwriteQ': '「{name}」に上書き保存しますか？',
    'plans.deleteQ': '「{name}」を削除しますか？',
    'plans.overwrite': '上書き保存',
    'plans.rename': '名前を変更',
    'plans.delete': '削除',

    'sidebar.aria': '編集パネル',
    'topbar.aria': '選択中の項目',
    'topbar.deselect': '選択解除',
    'tab.placeTool': '配置ツール',
    'tab.placeQuick': 'ツールを選んだあと、2D間取りエディタで壁をクリックして配置します。',
    'tab.placeWall': '＋ ドア',
    'tab.placeWindow': '＋ 窓（外壁のみ）',
    'tab.doors': 'ドア',
    'tab.windows': '窓',
    'tab.empty.doors': 'まだドアがありません。',
    'tab.empty.windows': 'まだ窓がありません。',
    'tab.outerWall': '外壁',
    'tab.innerWall': '内壁',

    'sidebar.collapse': 'サイドバーを閉じる',
    'sidebar.expand': 'サイドバーを開く',
  },
  en: {
    'app.title': 'Room Builder',
    'app.skipToMain': 'Skip to main content',
    'app.canvasArea': 'Main editing area',

    'header.mode.plan': '2D Floor',
    'header.mode.arrange': '3D Arrange',
    'header.grid': 'Grid',
    'header.grid3d': 'Cells',
    'header.personView': '👤 First-person',
    'header.personView.exit': 'Exit first-person',
    'header.personView.cancelPlace': 'Cancel placement',
    'header.personView.start': 'Place first-person view (click and drag on 2D map)',
    'header.undo': 'Undo',
    'header.redo': 'Redo',
    'header.locale': 'Language',
    'header.unit': 'Units',
    'header.export': 'Export',
    'header.exportSvg': 'SVG (2D)',
    'header.exportPng': 'PNG (3D)',
    'header.exportGltf': 'GLB (3D)',
    'header.print': 'Print',
    'header.lighting': 'Lighting',
    'header.lighting.daytime': 'Day',
    'header.lighting.evening': 'Dusk',
    'header.lighting.night': 'Night',
    'header.ceiling': 'Ceiling',
    'header.shadow': 'Shadow',
    'header.wallShadow': 'Wall shadow',
    'header.wallShadow.title': 'Cast shadows from outer walls (window light beams)',
    'header.clearance': 'Walkway',

    'sidebar.tab.plan': 'Floor',
    'sidebar.tab.openings': 'Doors & Windows',
    'sidebar.tab.furniture': 'Furniture',

    'tool.select': 'Select',
    'tool.outline': 'Outline',
    'tool.innerWall': 'Inner wall',
    'tool.door': 'Door',
    'tool.window': 'Window',
    'tool.closeOutline': 'Close outline',
    'tool.popOne': '↶ Undo last point',
    'tool.zoomIn': 'Zoom in',
    'tool.zoomOut': 'Zoom out',
    'tool.rotate90': 'Rotate view 90°',
    'tool.resetView': 'Reset view',

    'panel.room': 'Room settings',
    'panel.ceilingHeight': 'Ceiling height',
    'panel.wallColor': 'Wall color',
    'panel.floorColor': 'Floor color',
    'panel.wallOpacity': 'Wall opacity',
    'panel.quickStart': 'Quick start',
    'panel.sample': 'Load sample (1LDK)',
    'panel.square4x4': 'Square 4×4m',
    'panel.lShape': 'L-shape',
    'panel.clear': 'Clear',
    'panel.vertices': 'Vertices',
    'panel.innerWalls': 'Inner walls',
    'panel.reset': 'Reset',
    'panel.resetAll': 'Clear everything',
    'panel.addFurniture': 'Add furniture',
    'panel.furnitureList': 'Furniture list',
    'panel.empty.furniture': 'No furniture yet.',
    'panel.empty.vertices': 'Use the "Outline" tool, or pick a quick-start preset.',
    'panel.dragHint': 'Drag to place',

    'category.living': 'Living',
    'category.bedroom': 'Bedroom',
    'category.dining': 'Dining',
    'category.kitchen': 'Kitchen',
    'category.bath': 'Bath',
    'category.storage': 'Storage',
    'category.misc': 'Misc',

    'topbar.delete': 'Delete',
    'topbar.duplicate': 'Duplicate',
    'topbar.rotateLeft': 'Rotate left 90° (Shift+R)',
    'topbar.rotateRight': 'Rotate right 90° (R)',

    'help.outline.empty': 'Click to place outline vertices.',
    'help.outline.few': '{n} points so far. Need at least {rem} more.',
    'help.outline.ready': 'Green = last point. Click the blue first vertex, or "Close outline".',
    'help.innerWall.start': 'Click the start point.',
    'help.innerWall.end': 'Click the end point.',
    'help.door': 'Click a wall to place a door.',
    'help.window': 'Click an outer wall to place a window.',
    'help.select': 'Drag points / walls / furniture to edit. Drag background to pan, scroll to zoom.',
    'help.personPlace': 'Click on the floor and drag to set facing; release to enter 3D first-person.',

    'confirm.resetAll': 'Clear all furniture and floor plan. Continue? (Use Undo to revert)',
    'confirm.deletePlan': 'Delete this plan permanently. Continue?',
    'confirm.deleteVertices': 'Delete {n} vertices?',
    'confirm.deleteFurnitureMany': 'Delete {n} selected furniture items?',

    'persist.error': 'Failed to save to localStorage (likely quota). Check background image size.',
    'persist.error.plans': 'Failed to save plans (likely quota).',

    'plans.title': 'Saved plans',
    'plans.namePlaceholder': 'Plan name (optional)',
    'plans.save': 'Save',
    'plans.export': '⤓ Export',
    'plans.import': '⤒ Import',
    'plans.exportTitle': 'Download all saved plans as JSON',
    'plans.importTitle': 'Load plans from a JSON file',
    'plans.empty': 'No saved plans yet.',
    'plans.replaceQ': 'Replace existing saved plans?\n  OK = replace\n  Cancel = merge',
    'plans.imported': 'Imported: {added} added / {skipped} skipped',
    'plans.importErr': 'Import failed: {error}',
    'plans.fileReadErr': 'Failed to read file',
    'plans.overwriteQ': 'Overwrite "{name}"?',
    'plans.deleteQ': 'Delete "{name}"?',
    'plans.overwrite': 'Overwrite',
    'plans.rename': 'Rename',
    'plans.delete': 'Delete',

    'sidebar.aria': 'Editor panel',
    'topbar.aria': 'Selected item',
    'topbar.deselect': 'Deselect',
    'tab.placeTool': 'Placement tool',
    'tab.placeQuick': 'Pick a tool, then click a wall in the 2D editor to place.',
    'tab.placeWall': '+ Door',
    'tab.placeWindow': '+ Window (outer walls only)',
    'tab.doors': 'Doors',
    'tab.windows': 'Windows',
    'tab.empty.doors': 'No doors yet.',
    'tab.empty.windows': 'No windows yet.',
    'tab.outerWall': 'outer wall',
    'tab.innerWall': 'inner wall',

    'sidebar.collapse': 'Hide sidebar',
    'sidebar.expand': 'Show sidebar',
  },
};

let currentLocale: Locale = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'ja') return v;
    const browser = typeof navigator !== 'undefined' ? navigator.language : '';
    return browser.toLowerCase().startsWith('ja') ? 'ja' : 'ja';
  } catch {
    return 'ja';
  }
})();

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(loc: Locale): void {
  if (currentLocale === loc) return;
  currentLocale = loc;
  try {
    localStorage.setItem(STORAGE_KEY, loc);
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? dictionaries.ja;
  const raw = dict[key] ?? dictionaries.ja[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function useTranslation(): {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
} {
  const locale = useSyncExternalStore(
    subscribe,
    () => currentLocale,
    () => currentLocale,
  );
  return { t, locale, setLocale };
}
