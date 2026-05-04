<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# shapes

## Purpose
家具タイプごとの 3D メッシュコンポーネント。すべて `{ width, depth, height, color }` プロパティを受け取り、原点（家具中心）を中心とした `<group>` を返す純粋プレゼンテーション部品。`FurnitureItem.tsx` の `ShapeFor` スイッチから種類別にディスパッチされる。

## Key Files
| File | Description |
|------|-------------|
| `Box.tsx` | 既定の汎用ボックス。指定サイズの単純な箱 |
| `Sofa.tsx` | 座面・背もたれ・肘掛け・脚（4本）の合成 |
| `Bed.tsx` | フレーム＋マットレス（少し小さい）＋ヘッドボード |
| `Table.tsx` | 矩形天板＋脚 |
| `RoundTable.tsx` | 丸天板＋脚（2D ではエリプス、3D ではシリンダー系） |
| `Desk.tsx` | 作業机（天板＋脚） |
| `Nightstand.tsx` | サイドテーブル |
| `Chair.tsx` | 座面・背もたれ・脚 |
| `Shelf.tsx` | 棚（多段） |
| `Cupboard.tsx` | 食器棚 |

## For AI Agents

### Working In This Directory
- 共通プロパティ型（`ShapeProps = { width, depth, height, color }`）は各ファイルでローカル宣言されている。型を揃えれば良いだけなので一元化は必須ではない。
- すべての Shape は **家具中心が原点 (0, 0, 0)、底面が y=0** を想定して描く。`FurnitureItem` 側がワールド位置と回転を加える。
- 影は `castShadow` / `receiveShadow` を必要なメッシュにだけ付ける。座面・背もたれは `castShadow`、脚は影は省略しても良い（パフォーマンス優先）。
- 色は `color` プロップを基本色に使い、副パーツ（脚・フレーム）はファイル内の固定色（例: `#3f3a35` / `#5a4a3a`）でアクセントを付ける。
- 新しい家具タイプを追加するときは:
  1. `lib/types.ts` の `FurnitureType` に追加 → `FURNITURE_TYPE_LABELS` と `FURNITURE_DEFAULTS` も更新
  2. このディレクトリに新ファイルを作成
  3. `scene/FurnitureItem.tsx` の `ShapeFor` スイッチに分岐追加
  4. `ui/tabs/FurnitureTab.tsx` の `TYPES` 配列に追加

### Testing Requirements
- dev server で 3D ビューに切り替え、サイドバー「家具」タブから新しい家具を追加して見た目を確認する。
- `width=0.1` まで縮めても破綻しないかチェック（`Math.max(0.1, ...)` でクランプされる）。

### Common Patterns
- 比率はすべて `width / depth / height` の割合で記述する（絶対値固定はアームや脚の太さなど局所のみ）。
- 形状追加時は基本 `<boxGeometry>` 中心。曲面は `RoundTable` などごく一部。

## Dependencies

### Internal
- なし（純粋に Three.js プリミティブのみ）

### External
- `three` / `@react-three/fiber`（JSX エレメント）

<!-- MANUAL: -->
