import type { FloorPlan, Furniture } from './types';
import { uid } from './uid';

/**
 * サンプル間取り：1LDK（写真の手書き図面ベース）
 *
 *  - 玄関 + 水回り（北西の縦長エリア）
 *  - LD 約14.5帖（中央〜北東）
 *  - バルコニー（東に突出）
 *  - K 約3.7帖（中央南）
 *  - 洋室 約7.3帖 + WIC（南東）
 *  - 玄関土間の小さな張り出し（北の SB/トイレ部分）
 */
export function createSamplePlan(): { floor: FloorPlan; furniture: Furniture[] } {
  // ===== 内壁 ID =====
  const wEntryLD = uid();          // 玄関エリアとLDを分ける縦壁
  const wLDtoSouth = uid();        // LDとK・洋室を分ける横壁
  const wKtoBedroom = uid();       // K と 洋室を分ける縦壁
  const wWICnorth = uid();         // WIC 北面
  const wWICwest = uid();          // WIC 西面
  const wEntryHallway = uid();     // 玄関と水回りを分ける横壁
  const wBathToilet = uid();       // 浴室とトイレを分ける縦壁

  return {
    floor: {
      // 外周（CCW、x東、z南）— 北西の玄関→北の段差→LD北→東(バルコニー突出)→南東→南→玄関南へ戻る
      outline: [
        { x: -3.0, z: -2.5 },  // 0: NW
        { x: -1.5, z: -2.5 },  // 1: 玄関 北東
        { x: -1.5, z: -3.0 },  // 2: SB/トイレの北側段差 上
        { x: -0.7, z: -3.0 },  // 3: 段差 東
        { x: -0.7, z: -2.5 },  // 4: 段差 戻り
        { x: 3.5,  z: -2.5 },  // 5: LD NE
        { x: 3.5,  z: -0.6 },  // 6: バルコニー北側に向かう前
        { x: 4.0,  z: -0.6 },  // 7: バルコニー 北東
        { x: 4.0,  z: 2.0  },  // 8: バルコニー 南東
        { x: 3.5,  z: 2.0  },  // 9: バルコニー戻り
        { x: 3.5,  z: 3.5  },  // 10: 洋室 SE
        { x: -1.5, z: 3.5  },  // 11: K の南西
        { x: -1.5, z: 3.0  },  // 12: 玄関エントリー段差 上
        { x: -3.0, z: 3.0  },  // 13: SW
      ],
      innerWalls: [
        // 玄関エリアとLDを分ける縦壁
        {
          id: wEntryLD,
          start: { x: -0.7, z: -2.5 },
          end: { x: -0.7, z: -0.5 },
        },
        // LD と K・洋室 を分ける横壁
        {
          id: wLDtoSouth,
          start: { x: -1.5, z: -0.5 },
          end: { x: 3.5, z: -0.5 },
        },
        // K と 洋室 を分ける縦壁
        {
          id: wKtoBedroom,
          start: { x: 1.0, z: -0.5 },
          end: { x: 1.0, z: 3.5 },
        },
        // WIC（洋室南西の小さな衣裳部屋）
        {
          id: wWICnorth,
          start: { x: 1.0, z: 2.0 },
          end: { x: 2.6, z: 2.0 },
        },
        {
          id: wWICwest,
          start: { x: 2.6, z: 2.0 },
          end: { x: 2.6, z: 3.5 },
        },
        // 玄関 と 水回り（浴室・トイレ）を分ける横壁
        {
          id: wEntryHallway,
          start: { x: -3.0, z: -1.0 },
          end: { x: -0.7, z: -1.0 },
        },
        // 浴室とトイレを分ける縦壁
        {
          id: wBathToilet,
          start: { x: -2.0, z: -2.5 },
          end: { x: -2.0, z: -1.0 },
        },
      ],
      openings: [
        // 玄関ドア（外壁 西側 = エッジ#13、玄関エリアの南寄りに配置）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'outer', edgeIndex: 13 },
          offset: 4.5,  // 5.5m長の壁の上から(z= -1)あたり
          width: 0.9,
          height: 2.0,
          sillHeight: 0,
        },
        // LD 北面の窓（外壁 #4：(-0.7,-2.5)→(3.5,-2.5)、長さ4.2m）
        {
          id: uid(),
          kind: 'window',
          wallRef: { type: 'outer', edgeIndex: 4 },
          offset: 0.8,
          width: 2.4,
          height: 1.4,
          sillHeight: 0.5,
        },
        // バルコニー側 掃き出し窓（外壁 #5：(3.5,-2.5)→(3.5,-0.6)、長さ1.9m）
        {
          id: uid(),
          kind: 'window',
          wallRef: { type: 'outer', edgeIndex: 5 },
          offset: 0.3,
          width: 1.4,
          height: 2.0,
          sillHeight: 0.05,
        },
        // 洋室 東面の窓（外壁 #9：(3.5,2.0)→(3.5,3.5)、長さ1.5m）
        {
          id: uid(),
          kind: 'window',
          wallRef: { type: 'outer', edgeIndex: 9 },
          offset: 0.3,
          width: 1.0,
          height: 1.2,
          sillHeight: 0.9,
        },
        // 玄関→廊下のドア（内壁 wEntryLD）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wEntryLD },
          offset: 1.4,
          width: 0.85,
          height: 2.0,
          sillHeight: 0,
        },
        // 廊下/LDからキッチンへのドア（LD↔南壁）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wLDtoSouth },
          offset: 1.0,
          width: 1.4,  // 開放感のある広い間口
          height: 2.0,
          sillHeight: 0,
        },
        // 洋室への入口ドア（K↔洋室の壁）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wKtoBedroom },
          offset: 0.4,
          width: 0.85,
          height: 2.0,
          sillHeight: 0,
        },
        // WIC のドア（WIC 北面）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wWICnorth },
          offset: 0.5,
          width: 0.7,
          height: 2.0,
          sillHeight: 0,
        },
        // 浴室ドア（玄関↔水回りの壁の浴室側）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wEntryHallway },
          offset: 0.4,
          width: 0.7,
          height: 2.0,
          sillHeight: 0,
        },
        // トイレドア（同じ壁のトイレ側）
        {
          id: uid(),
          kind: 'door',
          wallRef: { type: 'inner', wallId: wEntryHallway },
          offset: 1.4,
          width: 0.6,
          height: 2.0,
          sillHeight: 0,
        },
      ],
      height: 2.5,
      wallColor: '#efe9dd',
      floorColor: '#d4c8b3',
    },
    furniture: [
      // ====== LD（中央〜北東、約 4.2 × 2.0m） ======
      {
        id: uid(),
        type: 'sofa',
        label: 'ソファ',
        width: 2.2,
        depth: 0.9,
        height: 0.85,
        x: 0.6,
        z: -0.95,
        rotationY: 0,
        color: '#6b8eb3',
      },
      {
        id: uid(),
        type: 'table',
        label: 'リビングテーブル',
        width: 1.1,
        depth: 0.55,
        height: 0.4,
        x: 0.6,
        z: -1.7,
        rotationY: 0,
        color: '#a98162',
      },
      {
        id: uid(),
        type: 'shelf',
        label: 'TVボード',
        width: 1.6,
        depth: 0.4,
        height: 0.5,
        x: 0.6,
        z: -2.25,
        rotationY: 0,
        color: '#5a4a3a',
      },
      {
        id: uid(),
        type: 'table',
        label: 'ダイニングテーブル',
        width: 1.4,
        depth: 0.8,
        height: 0.72,
        x: 2.5,
        z: -1.4,
        rotationY: Math.PI / 2,
        color: '#8a6a44',
      },
      {
        id: uid(),
        type: 'chair',
        label: 'ダイニングチェア',
        width: 0.45,
        depth: 0.45,
        height: 0.85,
        x: 2.0,
        z: -0.95,
        rotationY: -Math.PI / 2,
        color: '#7d8a99',
      },
      {
        id: uid(),
        type: 'chair',
        label: 'ダイニングチェア',
        width: 0.45,
        depth: 0.45,
        height: 0.85,
        x: 2.0,
        z: -1.85,
        rotationY: -Math.PI / 2,
        color: '#7d8a99',
      },
      {
        id: uid(),
        type: 'chair',
        label: 'ダイニングチェア',
        width: 0.45,
        depth: 0.45,
        height: 0.85,
        x: 3.0,
        z: -0.95,
        rotationY: Math.PI / 2,
        color: '#7d8a99',
      },
      {
        id: uid(),
        type: 'chair',
        label: 'ダイニングチェア',
        width: 0.45,
        depth: 0.45,
        height: 0.85,
        x: 3.0,
        z: -1.85,
        rotationY: Math.PI / 2,
        color: '#7d8a99',
      },

      // ====== K（中央南、約 2.5 × 4.0m） ======
      {
        id: uid(),
        type: 'shelf',
        label: 'キッチンカウンター',
        width: 2.4,
        depth: 0.65,
        height: 0.9,
        x: -0.2,
        z: -0.15,
        rotationY: 0,
        color: '#9b8d70',
      },
      {
        id: uid(),
        type: 'box',
        label: '冷蔵庫',
        width: 0.65,
        depth: 0.65,
        height: 1.8,
        x: -1.15,
        z: 0.5,
        rotationY: 0,
        color: '#cccccc',
      },

      // ====== 洋室（南東、約 2.5 × 4.0m） ======
      {
        id: uid(),
        type: 'bed',
        label: 'ダブルベッド',
        width: 1.4,
        depth: 2.0,
        height: 0.5,
        x: 1.85,
        z: 0.6,
        rotationY: 0,
        color: '#b89c7a',
      },
      {
        id: uid(),
        type: 'table',
        label: 'デスク',
        width: 1.2,
        depth: 0.55,
        height: 0.72,
        x: 2.95,
        z: 0.0,
        rotationY: Math.PI / 2,
        color: '#a98162',
      },
      {
        id: uid(),
        type: 'chair',
        label: 'デスクチェア',
        width: 0.5,
        depth: 0.5,
        height: 0.95,
        x: 2.4,
        z: 0.0,
        rotationY: Math.PI / 2,
        color: '#444a55',
      },
      {
        id: uid(),
        type: 'shelf',
        label: '本棚',
        width: 0.8,
        depth: 0.3,
        height: 1.6,
        x: 1.4,
        z: -0.2,
        rotationY: 0,
        color: '#8a6f53',
      },

      // ====== WIC ======
      {
        id: uid(),
        type: 'shelf',
        label: 'WICラック',
        width: 1.3,
        depth: 0.4,
        height: 1.8,
        x: 3.05,
        z: 2.3,
        rotationY: 0,
        color: '#6f5a45',
      },
    ],
  };
}
