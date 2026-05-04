export type FurnitureType =
  | 'box'
  | 'sofa'
  | 'bed'
  | 'table'
  | 'roundTable'
  | 'desk'
  | 'nightstand'
  | 'chair'
  | 'shelf'
  | 'cupboard'
  | 'tvBoard'
  | 'tv'
  | 'plant'
  | 'kitchenSink'
  | 'stove'
  | 'refrigerator'
  | 'microwave'
  | 'toaster'
  | 'coffeeMaker'
  | 'riceCooker'
  | 'washingMachine'
  | 'washBasin';

export type EditorMode = 'plan' | 'arrange';

export type Tool =
  | 'select'
  | 'outline'
  | 'innerWall'
  | 'door'
  | 'window';

export interface Vec2 {
  x: number;
  z: number;
}

export interface InnerWall {
  id: string;
  start: Vec2;
  end: Vec2;
}

export type WallRef =
  | { type: 'outer'; edgeIndex: number }
  | { type: 'inner'; wallId: string };

export type OpeningKind = 'door' | 'window';

export interface Opening {
  id: string;
  kind: OpeningKind;
  wallRef: WallRef;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface BackgroundImage {
  src: string;
  x: number;
  z: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface FloorPlan {
  outline: Vec2[];
  innerWalls: InnerWall[];
  openings: Opening[];
  height: number;
  wallColor: string;
  floorColor: string;
  /** Wall transparency (0..1). Default 0.6. Forced to 1 in person view. */
  wallOpacity?: number;
  backgroundImage?: BackgroundImage;
}

export interface Furniture {
  id: string;
  type: FurnitureType;
  label: string;
  width: number;
  depth: number;
  height: number;
  x: number;
  z: number;
  rotationY: number;
  color: string;
}

export type SelectionKind =
  | 'vertex'
  | 'innerWall'
  | 'opening'
  | 'furniture'
  | 'backgroundImage';

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export const FURNITURE_TYPE_LABELS: Record<FurnitureType, string> = {
  box: 'ボックス',
  sofa: 'ソファ',
  bed: 'ベッド',
  table: 'テーブル',
  roundTable: '丸テーブル',
  desk: '作業机',
  nightstand: 'サイドテーブル',
  chair: 'チェア',
  shelf: 'シェルフ',
  cupboard: '食器棚',
  tvBoard: 'テレビ台',
  tv: 'テレビ',
  plant: '植木',
  kitchenSink: 'キッチンシンク',
  stove: 'コンロ',
  refrigerator: '冷蔵庫',
  microwave: '電子レンジ',
  toaster: 'トースター',
  coffeeMaker: 'コーヒーメーカー',
  riceCooker: '炊飯器',
  washingMachine: '洗濯機',
  washBasin: '洗面台',
};

export const FURNITURE_DEFAULTS: Record<
  FurnitureType,
  { width: number; depth: number; height: number; color: string }
> = {
  box: { width: 0.6, depth: 0.6, height: 0.6, color: '#9ca3af' },
  sofa: { width: 2.0, depth: 0.9, height: 0.85, color: '#6b8eb3' },
  bed: { width: 1.4, depth: 2.0, height: 0.5, color: '#b89c7a' },
  table: { width: 1.4, depth: 0.8, height: 0.72, color: '#a98162' },
  roundTable: { width: 1.0, depth: 1.0, height: 0.72, color: '#a98162' },
  desk: { width: 1.2, depth: 0.6, height: 0.72, color: '#8a7355' },
  nightstand: { width: 0.45, depth: 0.4, height: 0.55, color: '#9b8870' },
  chair: { width: 0.5, depth: 0.5, height: 0.9, color: '#7d8a99' },
  shelf: { width: 0.8, depth: 0.4, height: 1.8, color: '#8a6f53' },
  cupboard: { width: 0.9, depth: 0.45, height: 1.9, color: '#6f5840' },
  tvBoard: { width: 1.5, depth: 0.45, height: 0.45, color: '#7a6248' },
  tv: { width: 1.2, depth: 0.08, height: 0.7, color: '#1a1a1a' },
  plant: { width: 0.4, depth: 0.4, height: 1.2, color: '#4a8a3a' },
  kitchenSink: { width: 0.8, depth: 0.6, height: 0.85, color: '#c0bdb5' },
  stove: { width: 0.75, depth: 0.6, height: 0.85, color: '#b0aea8' },
  refrigerator: { width: 0.6, depth: 0.65, height: 1.8, color: '#d0cec8' },
  microwave: { width: 0.5, depth: 0.38, height: 0.32, color: '#3a3a3a' },
  toaster: { width: 0.32, depth: 0.22, height: 0.22, color: '#888880' },
  coffeeMaker: { width: 0.28, depth: 0.24, height: 0.38, color: '#2a2a2a' },
  riceCooker: { width: 0.28, depth: 0.28, height: 0.22, color: '#e0ddd5' },
  washingMachine: { width: 0.6, depth: 0.6, height: 0.85, color: '#e8e8e8' },
  washBasin: { width: 0.75, depth: 0.45, height: 1.8, color: '#dedad4' },
};
