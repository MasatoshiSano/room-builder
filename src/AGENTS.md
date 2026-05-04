<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# src

## Purpose
アプリ本体のソース。トップレベルの `App.tsx` がレイアウトとグローバルキーボードショートカットを担当し、配下のディレクトリで関心を分離する: 状態（store）、純粋ロジック（lib）、3D シーン（scene）、2D エディタ（editor2d）、UI 周辺（ui）。

## Key Files
| File | Description |
|------|-------------|
| `main.tsx` | React のエントリ。`StrictMode` で `<App />` をマウント |
| `App.tsx` | アプリシェル（ヘッダ・キャンバス・サイドバー）。Delete / Backspace / R / Shift+R / Ctrl+D のグローバルショートカットを管理 |
| `index.css` | グローバルスタイル（Serendie のテーマトークンを使用） |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `editor2d/` | 2D 間取りエディタ（SVG ベース、see `editor2d/AGENTS.md`） |
| `lib/` | 型定義と純粋関数群（geometry、collision、wallSegments、sampleData、uid、see `lib/AGENTS.md`） |
| `scene/` | 3D シーン（Canvas / 床 / 壁 / 家具、see `scene/AGENTS.md`） |
| `store/` | Zustand ストア（see `store/AGENTS.md`） |
| `ui/` | サイドバー・トップバー・各種コントロール（see `ui/AGENTS.md`） |

## For AI Agents

### Working In This Directory
- `App.tsx` は `editorMode` で 2D（`FloorPlanEditor`）と 3D（`Scene`）を切り替える単一スイッチ。新しいビューを追加するときも同じパターンに従う。
- グローバルキーハンドラはフォーム入力中は発火しない（`tagName` チェックあり）。新規ショートカット追加時もこの分岐を踏襲する。
- ファイル間のインポートは相対パス（`../store/useRoomStore` 等）で統一されている。

### Testing Requirements
- 自動テストなし。型チェックと手動動作確認のみ。

### Common Patterns
- 各 UI コンポーネントは Zustand のセレクタ単位で `useRoomStore((s) => s.x)` を呼んで購読範囲を絞る。複合オブジェクトを返さない。
- 2D / 3D 双方が同じ `floor` / `furniture` を購読しているので、片方の変更が即座にもう片方に反映される。

## Dependencies

### Internal
- 各サブディレクトリは `lib/types.ts` の型と `store/useRoomStore.ts` の状態に強く依存する。
- `geometry.ts` の純粋関数は scene / editor2d / store / ui の全方向から参照される。

### External
- React、Three.js / R3F、Zustand、Serendie UI（root の `AGENTS.md` を参照）

<!-- MANUAL: -->
