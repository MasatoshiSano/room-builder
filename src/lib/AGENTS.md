<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# lib

## Purpose
純粋関数とドメイン型を集約する層。React や Three.js への依存を持たない。ストア・2D エディタ・3D シーンの全方向から参照される共通ユーティリティ。

## Key Files
| File | Description |
|------|-------------|
| `types.ts` | 全ドメイン型: `Vec2` / `FloorPlan` / `InnerWall` / `Opening` / `Furniture` / `BackgroundImage` / `Tool` / `Selection` 等。`FURNITURE_TYPE_LABELS` と `FURNITURE_DEFAULTS` も定義 |
| `geometry.ts` | ポリゴン・セグメント計算: `distance` / `snap` / `signedArea` / `ensureCCW` / `pointInPolygon` / `closestOnSegment` / `outerEdges` / `innerEdges` / `midpoint` / `bbox` |
| `collision.ts` | 家具配置の妥当性判定。`getFurnitureCorners`（回転考慮）・`rectIntersectsSegment` を経由して `isFurniturePlacementValid` |
| `wallSegments.ts` | 壁の長さ・高さと開口配列から、開口を避けた矩形セグメント列 `SegmentRect[]` を計算（重なり開口はマージ） |
| `sampleData.ts` | サンプル間取り（1LDK）。外周・内壁・開口・家具の手書き相当データを生成して `loadSample` に提供 |
| `uid.ts` | `Math.random` + `Date.now` ベースの簡易 ID 生成 |

## For AI Agents

### Working In This Directory
- このディレクトリのファイルは React フック・DOM API を import しないこと（純粋ロジックを保つ）。
- 新しいドメイン型を追加するときは `types.ts` に集約し、必要なら `FURNITURE_TYPE_LABELS` / `FURNITURE_DEFAULTS` も更新する。
- `geometry.ts` の関数は副作用なし。配列を破壊しない（`[...].reverse()` 等）パターンを踏襲する。
- 外周ポリゴンは CCW を保証する（`ensureCCW`）。`signedArea` は xz 平面で z を画面 y に投影した座標系基準。

### Testing Requirements
- 単体テストはまだない。新規ロジック追加時は手動確認が前提だが、ここの関数は副作用ゼロなので将来 Vitest 等で容易にテストを足せる。

### Common Patterns
- 開口の配置は壁長基準のオフセット `offset`／長さ `width`／床上高 `sillHeight` で管理する。`computeWallSegments` がそれを矩形列に展開。
- 家具の四隅は `getFurnitureCorners(f)` で得る（rotationY 適用済み）。

## Dependencies

### Internal
- `types.ts` は他全部の基盤。`geometry.ts` → `collision.ts` / `wallSegments.ts` / `sampleData.ts` の順に依存。

### External
- なし（標準 `Math` のみ）

<!-- MANUAL: -->
