<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# ui

## Purpose
2D／3D キャンバスの外側にある UI 一式。ヘッダ（モード切替・グリッド）、トップ選択バー、サイドバー（タブ式編集パネル）、保存プラン管理、背景画像セクション、選択中アイテムの数値編集フォームを含む。Serendie UI（`Tabs` / `Button` / `TextField`）と独自スタイルを併用する。

## Key Files
| File | Description |
|------|-------------|
| `Sidebar.tsx` | 右サイドバー。Serendie の `Tabs` で「間取り／ドア・窓／家具」を切り替える |
| `HeaderControls.tsx` | アプリヘッダ右の表示モード（2D／3D）とグリッドサイズ（0.05 / 0.1 / 0.25 / 0.5m）切替 |
| `TopSelectionBar.tsx` | キャンバス上部のフローティング選択バー。選択中アイテム（頂点／内壁／開口／家具／背景画像）の主要数値を一行で編集 |
| `NumberField.tsx` | Serendie `TextField` ラッパ（type=number, min/max, step, blur で commit） |
| `CompactNumberField.tsx` | TopSelectionBar 用の素の `<input type=number>` ベースのコンパクトフィールド（Enter で commit + blur） |
| `BackgroundImageSection.tsx` | PNG 下絵の取り込み・差し替え・削除・表示／ロック切替・座標／不透明度編集 |
| `SavedPlansSection.tsx` | 保存プラン一覧。保存・読込・名前変更（インライン）・削除 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `tabs/` | サイドバーのタブごとのパネル（see `tabs/AGENTS.md`） |

## For AI Agents

### Working In This Directory
- フォーム系コンポーネントは「ドラフト文字列を `useState` で持ち、blur／Enter で commit」というパターンを徹底する（即時 onChange だと数値の途中入力で予期しない補正が走る）。
- 数値の commit 時は `Number(v.toFixed(2))` で 2 桁丸め。
- 削除や閉じる操作のあとは `setSelection(null)` を必ず呼んで選択不整合を防ぐ。
- ファイル読込（`BackgroundImageSection`）は `FileReader` → `new Image()` で `naturalWidth/Height` から 6m 幅基準にメートル換算する。

### Testing Requirements
- TopSelectionBar が選択種別ごと（5 種）に正しいフィールド構成を出すこと。
- SavedPlansSection の保存／読込／リネーム／削除がリロード後も整合すること。
- BackgroundImageSection の画像差し替えで座標／回転／不透明度がリセットせず引き継がれるかどうかは現状の仕様（新規取り込み時のみリセットしている）。

### Common Patterns
- Serendie の `Button`（`styleType="filled" / "outlined" / "ghost"`）と `Tabs` / `TextField` を使用する。素のボタンが必要なときは `qbtn` / `tool-btn` クラスを当てる。
- 全コンポーネントが `useRoomStore` のセレクタを通して状態を取得する。

## Dependencies

### Internal
- `../store/useRoomStore` — 全状態
- `../lib/types` — `FurnitureType` / `FURNITURE_TYPE_LABELS`
- `../lib/geometry` — `distance` / `outerEdges` / `innerEdges`

### External
- `@serendie/ui` — `Button` / `Tabs` / `TabItem` / `TextField`

<!-- MANUAL: -->
