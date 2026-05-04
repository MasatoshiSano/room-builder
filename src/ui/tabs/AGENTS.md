<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# tabs

## Purpose
サイドバー（`Sidebar.tsx`）の 3 タブそれぞれの本体。Serendie の `Tabs` で切り替えられ、現在表示中のタブだけがマウントされる。

## Key Files
| File | Description |
|------|-------------|
| `PlanTab.tsx` | 「間取り」タブ。天井高・壁／床の色、背景画像セクション、保存プラン、クイックスタート（サンプル／4×4／L 字／クリア）、頂点・内壁の一覧、リセット |
| `OpeningsTab.tsx` | 「ドア・窓」タブ。配置ツール起動、ドア／窓の一覧（壁参照と寸法を表示し、クリックで選択） |
| `FurnitureTab.tsx` | 「家具」タブ。家具タイプ追加ボタン群（10 種）と現在の家具リスト（クリックで選択） |

## For AI Agents

### Working In This Directory
- 各タブは Zustand のセレクタで必要な状態だけを購読する。ストア構造を変えたときは 3 ファイル全てに伝搬しないか確認。
- クイックスタート（PlanTab）は `setOutline` → `setTool('select')` → `setSelection(null)` の順で UI 状態を整える。新しいテンプレートを追加するときも同じパターンに従う。
- `OpeningsTab` の配置ツールボタンは `floor.outline.length < 3` なら無効化される（外周未確定では配置不可）。
- 家具を追加するときは `addFurniture(type)` のみで OK（位置・回転・色はストア側でデフォルトを当てる）。`FURNITURE_DEFAULTS` を変えればここで触らずに反映される。

### Testing Requirements
- 3 タブの切替で前タブの状態（フォーム入力中など）がリセットされても問題ない構造であることを確認。
- 配置ツール起動 → 2D エディタへ遷移して壁クリックで開口が追加される一連の流れを確認。

### Common Patterns
- 一覧アイテムは `<button class="item-row">` で実装。選択中は `is-selected` を付与し、`aria-pressed` も合わせる。

## Dependencies

### Internal
- `../../store/useRoomStore` — 全状態と更新
- `../../lib/types` — `FurnitureType` / `FURNITURE_TYPE_LABELS`
- `../NumberField` / `../SavedPlansSection` / `../BackgroundImageSection`（PlanTab から利用）

### External
- `@serendie/ui` — `Button`

<!-- MANUAL: -->
