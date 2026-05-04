<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# room-builder

## Purpose
ブラウザで動作する部屋レイアウト・家具配置シミュレーター。2D間取りエディタで外周・内壁・ドア・窓を作図し、3Dビューで家具配置を編集できる。データは `localStorage` に永続化され、複数プランを名前付きで保存可能。Vite + React + Three.js（@react-three/fiber + drei）+ Zustand 構成。

## Key Files
| File | Description |
|------|-------------|
| `index.html` | エントリ HTML（`data-panda-theme="konjo"` で Serendie UI のテーマを適用） |
| `package.json` | 依存・スクリプト定義（`dev` / `build` / `preview` / `typecheck`） |
| `vite.config.ts` | Vite 設定（`@vitejs/plugin-react` のみ、最小構成） |
| `tsconfig.json` | TypeScript ルート設定（`tsconfig.app.json` と `tsconfig.node.json` を参照） |
| `tsconfig.app.json` | アプリ側の TS 設定 |
| `tsconfig.node.json` | Vite 設定ファイル用の TS 設定 |
| `package-lock.json` | npm ロックファイル |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | アプリのソースコード（see `src/AGENTS.md`） |

## For AI Agents

### Working In This Directory
- パッケージ追加・更新時は `npm install` を実行する。
- 型チェックは `npm run typecheck`（`tsc -b --noEmit`）。
- 本番ビルドは `npm run build`（`tsc -b && vite build`）。型エラーがあるとビルドは止まる。
- 開発サーバーは `npm run dev`（既定で `http://localhost:5173`）。
- node_modules は WSL ネイティブ FS で `npm install` する必要がある（Windows バイナリでは動かない）。

### Testing Requirements
- テストフレームワークは未導入。動作確認は手動（dev server 起動 → 2D 描画／3D 配置の挙動確認）。
- リグレッションは `typecheck` と `build` で最小限担保。

### Common Patterns
- 状態管理は Zustand（`src/store/useRoomStore.ts` 単一ストア）。
- `localStorage` キー: `room-builder-state-v2`（floor + furniture）、`room-builder-saved-plans-v1`（保存プラン一覧）。
- 座標系: 平面は (x, z) を使用（Three.js の床面と整合、y は高さ）。`Vec2 = { x, z }`。

## Dependencies

### External
- React 18.x — UI
- Vite 5.x — ビルド／開発サーバー
- TypeScript 5.6 — 型
- Three.js 0.169 + `@react-three/fiber` 8.x + `@react-three/drei` 9.x — 3D シーン
- Zustand 5.x — 状態管理（`subscribeWithSelector` middleware で localStorage 同期）
- `@serendie/ui` 3.x + `@serendie/symbols` — UI コンポーネント（タブ・ボタン・テキストフィールド）

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
