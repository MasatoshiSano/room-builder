<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-04 | Updated: 2026-05-04 -->

# store

## Purpose
Zustand を使った単一グローバルストア。間取り（外周・内壁・開口・背景画像）／家具／UI 状態（選択・ツール・モード・グリッド）／保存プラン一覧をすべて保持する。`subscribeWithSelector` で `localStorage` への自動同期も行う。

## Key Files
| File | Description |
|------|-------------|
| `useRoomStore.ts` | 唯一のストア。全アクション（`setOutline` / `appendOutlineVertex` / `addInnerWall` / `addOpening` / `addFurniture` / `loadPlan` / `savePlan` ...）を含む |

## For AI Agents

### Working In This Directory
- ストアキー（永続化）:
  - `room-builder-state-v2` — 現在の `floor` + `furniture`（リアルタイム同期）
  - `room-builder-saved-plans-v1` — 保存プラン一覧
  - 旧キー `room-builder-state-v1` は読み込み時に自動削除される。
- 永続化は `useRoomStore.subscribe((s) => ({ floor, furniture }), …)` のセレクタ購読で実装。`floor` / `furniture` 以外のフィールドは保存対象外。
- 初回読み込み時、`outline.length >= 3` なら `editorMode='arrange'` / `tool='select'`、未確定なら `'plan'` / `'outline'` で起動する。
- 内壁を削除すると、その内壁を参照する開口（`wallRef.type==='inner' && wallId===id`）は自動的に消える。家具は内壁削除では消えない。
- 外周頂点は最低 3 つ維持される（`removeVertex` は 3 以下では何もしない）。
- 外周は `setOutline` 時に `ensureCCW` で CCW へ正規化される。

### Testing Requirements
- 主要な状態遷移（追加・更新・削除・複製・読込・保存）を dev server 上で確認。
- ブラウザリロードで内容が復元されること、別キーのプランが独立で保存されることを確認。

### Common Patterns
- 各更新アクションは `set((s) => ({ ... }))` でイミュータブル更新。`get()` は値参照のみで使う。
- 値の同一参照を返す No-op（`if (...) return {};`）で再レンダーを抑制する場面あり。
- ID は `lib/uid.ts` の `uid()` で発行する。

## Dependencies

### Internal
- `../lib/types` — 全ドメイン型
- `../lib/uid` — ID 生成
- `../lib/geometry` — `ensureCCW`
- `../lib/sampleData` — `createSamplePlan`（初回起動とサンプル読込で使用）

### External
- `zustand`（`create` + `subscribeWithSelector`）

<!-- MANUAL: -->
