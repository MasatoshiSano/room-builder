<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# scene

## Purpose
3D ビュー（Three.js + @react-three/fiber + drei）。床・壁・家具のレンダリングと、3D 上での家具のドラッグ移動・回転・リサイズ・高さ変更を担当する。外壁は半透明（カメラが部屋の外でも中が見える）、内壁は不透明。

## Key Files
| File | Description |
|------|-------------|
| `Scene.tsx` | `<Canvas>` ルート。`OrbitControls` / `Grid` / 環境光 / `Floor` / `Walls` / 各 `FurnitureItem` をマウントし、外周のバウンディングボックスからカメラ位置と `OrbitControls` のターゲットを決める |
| `Floor.tsx` | 外周ポリゴンから `Shape` → `ShapeGeometry` を生成し、x π/2 回転で xz 平面に伏せる |
| `Walls.tsx` | 外周エッジと内壁を `Wall` にマップ。開口は `groupOpenings` で壁単位にまとめてから渡す |
| `Wall.tsx` | 1 枚の壁を描画。`computeWallSegments` で開口を避けた矩形群を生成し、外壁は厚み 0.08 の半透明、内壁は 0.1 の不透明で描画 |
| `FurnitureItem.tsx` | 家具 1 つの 3D メッシュ + 選択時の `<Html>` ポップオーバー（回転・複製・削除）と角・上ハンドルでのリサイズ／高さ変更 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `shapes/` | 家具タイプ別のメッシュコンポーネント（see `shapes/AGENTS.md`） |

## For AI Agents

### Working In This Directory
- 座標系: x（東）／y（上）／z（南）。`outline` は xz 平面、家具の `rotationY` は y 軸まわり。
- ドラッグはレイキャストで床面（`y=0`）にヒットさせ、ポインタ初期位置とのオフセットを保ったまま新位置を計算する（`screenToFloor`）。
- 衝突は `isFurniturePlacementValid`（`../lib/collision.ts`）。3D 側はリアルタイムに「全方向 → x のみ → z のみ」を試して壁沿いに滑らせる挙動。
- リサイズはアンカー（反対側の角）をワールド座標で固定し、ローカル座標でサイズと中心を再計算する。
- 高さハンドルはカメラ投影でピクセル↔メートルの変換係数を求めて使う。

### Testing Requirements
- dev server で 3D ビューに切り替え、家具のドラッグ・回転・リサイズ・高さ変更・複製・削除を確認する。
- 外壁が半透明、内壁が不透明であることを目視確認。
- 開口（ドア・窓）が壁に正しく抜けていること。

### Common Patterns
- メッシュは可能な限り `useMemo` で再計算を避ける。
- `<Html>` は `pointerEvents: 'auto'` を明示し、`onPointerDown={(e) => e.stopPropagation()}` で 3D シーンの選択解除と競合しないようにする。

## Dependencies

### Internal
- `../lib/types` — `Vec2` / `Furniture` / `FloorPlan` / `Opening`
- `../lib/geometry` — `outerEdges` / `innerEdges` / `bbox`
- `../lib/wallSegments` — `computeWallSegments`
- `../lib/collision` — `isFurniturePlacementValid`
- `../store/useRoomStore` — 状態と更新

### External
- `three`、`@react-three/fiber`、`@react-three/drei`（`OrbitControls` / `Grid` / `Html`）
- `three-stdlib`（OrbitControls の型）

<!-- MANUAL: -->
