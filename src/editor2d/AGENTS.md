<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# editor2d

## Purpose
2D 間取りエディタ。SVG ベースで外周頂点・内壁・開口（ドア／窓）・家具・背景下絵を描画／編集する。ツール（select / outline / innerWall / door / window）に応じてポインタ操作の意味が切り替わる。パン・ズーム・90°回転を備えたビュー変換は `useViewBox` に切り出し。

## Key Files
| File | Description |
|------|-------------|
| `FloorPlanEditor.tsx` | エディタ本体。ツールバー、SVG レイヤー、頂点／内壁／開口の描画とポインタイベント、寸法ラベル、ヘルプ表示まで担当 |
| `FurnitureLayer.tsx` | SVG 上の家具レイヤー。クリックで選択、ドラッグで移動／角ハンドルでリサイズ、衝突判定で無効時に赤く表示し離したら元位置に戻す |
| `BackgroundImageLayer.tsx` | PNG 下絵の表示・移動・リサイズ。`locked` フラグで操作不可にできる |
| `use2DTransform.ts` | ワールド↔スクリーン変換の `Transform2D` を返すフック。初回 fit、`panBy` / `zoomBy` / `rotate90` / `resetView` を提供 |

## For AI Agents

### Working In This Directory
- ポインタ操作は `tool` の値で完全に分岐する。新しいツールを追加するときは `setTool` の許可値（`lib/types.ts` の `Tool`）と FloorPlanEditor / Sidebar の両方に追記する。
- 座標系は `Vec2 = { x, z }`。SVG の y 軸は z にマップされる（z は手前ほど大きい）。
- ヒットテストはスクリーンピクセル基準（`WALL_HIT_RADIUS_PX = 8`）→ ワールド単位に `transform.scale` で逆換算。
- 家具の移動／リサイズは `isFurniturePlacementValid`（`lib/collision.ts`）で衝突を確認し、無効ならドロップ時に元位置へ戻す。

### Testing Requirements
- 動作確認は dev server で行う。代表シナリオ:
  - 外周描画 → 始点クリックで閉じる
  - 内壁を引く → ドア／窓を配置
  - 家具を壁にめり込ませて離すと元位置に戻る
  - パン（Shift+ドラッグ／中ボタン）・ズーム（ホイール）・90° 回転

### Common Patterns
- ドラッグ状態は `useRef` で保持（再レンダーを避けるため）。
- ポインタ捕獲は `setPointerCapture(pointerId)` を使用。
- ビュー変換オブジェクト（`transform`）はメモ化されており、`toScreen` / `toWorld` をそのまま渡せば座標が一貫する。

## Dependencies

### Internal
- `../lib/geometry` — `closestOnSegment` / `outerEdges` / `innerEdges` / `snapPoint` / `bbox`
- `../lib/collision` — `isFurniturePlacementValid`
- `../lib/types` — `Vec2` / `WallRef` / `Furniture` / `BackgroundImage`
- `../store/useRoomStore` — 全データ／更新アクション

### External
- React（ポインタイベント、`useRef` / `useMemo` / `useState` / `useEffect`）
- SVG ネイティブ（追加ライブラリなし）

<!-- MANUAL: -->
