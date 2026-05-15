import { registerFurniture } from '../../lib/furnitureRegistry';
import { BoxShape } from './Box';
import { SofaShape } from './Sofa';
import { BedShape } from './Bed';
import { TableShape } from './Table';
import { RoundTableShape } from './RoundTable';
import { DeskShape } from './Desk';
import { NightstandShape } from './Nightstand';
import { ChairShape } from './Chair';
import { ShelfShape } from './Shelf';
import { CupboardShape } from './Cupboard';
import { TvBoardShape } from './TvBoard';
import { TvShape } from './Tv';
import { PlantShape } from './Plant';
import { KitchenSinkShape } from './KitchenSink';
import { StoveShape } from './Stove';
import { RefrigeratorShape } from './Refrigerator';
import { MicrowaveShape } from './Microwave';
import { ToasterShape } from './Toaster';
import { CoffeeMakerShape } from './CoffeeMaker';
import { RiceCookerShape } from './RiceCooker';
import { WashingMachineShape } from './WashingMachine';
import { WashBasinShape } from './WashBasin';

const FABRIC = { roughness: 0.95, metalness: 0 };
const WOOD = { roughness: 0.7, metalness: 0 };
const PAINTED_METAL = { roughness: 0.5, metalness: 0.4 };
const POLISHED_METAL = { roughness: 0.3, metalness: 0.85 };
const PLASTIC = { roughness: 0.55, metalness: 0 };
const PLANT = { roughness: 0.85, metalness: 0 };
const SCREEN = { roughness: 0.2, metalness: 0.05 };
const CERAMIC = { roughness: 0.35, metalness: 0.05 };

let registered = false;

export function registerBuiltInShapes(): void {
  if (registered) return;
  registered = true;

  registerFurniture({
    type: 'box',
    label: 'ボックス',
    category: 'misc',
    defaults: { width: 0.6, depth: 0.6, height: 0.6, color: '#9ca3af' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: BoxShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'sofa',
    label: 'ソファ',
    category: 'living',
    defaults: { width: 2.0, depth: 0.9, height: 0.85, color: '#6b8eb3' },
    material: FABRIC,
    stacking: { stackable: false, onTop: false },
    Shape: SofaShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'bed',
    label: 'ベッド',
    category: 'bedroom',
    defaults: { width: 1.4, depth: 2.0, height: 0.5, color: '#b89c7a' },
    material: FABRIC,
    stacking: { stackable: false, onTop: false },
    Shape: BedShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'table',
    label: 'テーブル',
    category: 'dining',
    defaults: { width: 1.4, depth: 0.8, height: 0.72, color: '#a98162' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: TableShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'roundTable',
    label: '丸テーブル',
    category: 'dining',
    defaults: { width: 1.0, depth: 1.0, height: 0.72, color: '#a98162' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: RoundTableShape,
    silhouette: 'ellipse',
  });
  registerFurniture({
    type: 'desk',
    label: '作業机',
    category: 'living',
    defaults: { width: 1.2, depth: 0.6, height: 0.72, color: '#8a7355' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: DeskShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'nightstand',
    label: 'サイドテーブル',
    category: 'bedroom',
    defaults: { width: 0.45, depth: 0.4, height: 0.55, color: '#9b8870' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: NightstandShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'chair',
    label: 'チェア',
    category: 'dining',
    defaults: { width: 0.5, depth: 0.5, height: 0.9, color: '#7d8a99' },
    material: WOOD,
    stacking: { stackable: true, onTop: false },
    Shape: ChairShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'shelf',
    label: 'シェルフ',
    category: 'storage',
    defaults: { width: 0.8, depth: 0.4, height: 1.8, color: '#8a6f53' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: ShelfShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'cupboard',
    label: '食器棚',
    category: 'kitchen',
    defaults: { width: 0.9, depth: 0.45, height: 1.9, color: '#6f5840' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: CupboardShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'tvBoard',
    label: 'テレビ台',
    category: 'living',
    defaults: { width: 1.5, depth: 0.45, height: 0.45, color: '#7a6248' },
    material: WOOD,
    stacking: { stackable: false, onTop: false },
    Shape: TvBoardShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'tv',
    label: 'テレビ',
    category: 'living',
    defaults: { width: 1.2, depth: 0.08, height: 0.7, color: '#1a1a1a' },
    material: SCREEN,
    stacking: { stackable: true, onTop: true },
    Shape: TvShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'plant',
    label: '植木',
    category: 'misc',
    defaults: { width: 0.4, depth: 0.4, height: 1.2, color: '#4a8a3a' },
    material: PLANT,
    stacking: { stackable: false, onTop: false },
    Shape: PlantShape,
    silhouette: 'ellipse',
  });
  registerFurniture({
    type: 'kitchenSink',
    label: 'キッチンシンク',
    category: 'kitchen',
    defaults: { width: 0.8, depth: 0.6, height: 0.85, color: '#c0bdb5' },
    material: POLISHED_METAL,
    stacking: { stackable: false, onTop: false },
    Shape: KitchenSinkShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'stove',
    label: 'コンロ',
    category: 'kitchen',
    defaults: { width: 0.75, depth: 0.6, height: 0.85, color: '#b0aea8' },
    material: PAINTED_METAL,
    stacking: { stackable: false, onTop: false },
    Shape: StoveShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'refrigerator',
    label: '冷蔵庫',
    category: 'kitchen',
    defaults: { width: 0.6, depth: 0.65, height: 1.8, color: '#d0cec8' },
    material: PAINTED_METAL,
    stacking: { stackable: false, onTop: false },
    Shape: RefrigeratorShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'microwave',
    label: '電子レンジ',
    category: 'kitchen',
    defaults: { width: 0.5, depth: 0.38, height: 0.32, color: '#3a3a3a' },
    material: PAINTED_METAL,
    stacking: { stackable: true, onTop: true },
    Shape: MicrowaveShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'toaster',
    label: 'トースター',
    category: 'kitchen',
    defaults: { width: 0.32, depth: 0.22, height: 0.22, color: '#888880' },
    material: POLISHED_METAL,
    stacking: { stackable: true, onTop: true },
    Shape: ToasterShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'coffeeMaker',
    label: 'コーヒーメーカー',
    category: 'kitchen',
    defaults: { width: 0.28, depth: 0.24, height: 0.38, color: '#2a2a2a' },
    material: PLASTIC,
    stacking: { stackable: true, onTop: true },
    Shape: CoffeeMakerShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'riceCooker',
    label: '炊飯器',
    category: 'kitchen',
    defaults: { width: 0.28, depth: 0.28, height: 0.22, color: '#e0ddd5' },
    material: PLASTIC,
    stacking: { stackable: true, onTop: true },
    Shape: RiceCookerShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'washingMachine',
    label: '洗濯機',
    category: 'bath',
    defaults: { width: 0.6, depth: 0.6, height: 0.85, color: '#e8e8e8' },
    material: PAINTED_METAL,
    stacking: { stackable: false, onTop: false },
    Shape: WashingMachineShape,
    silhouette: 'rect',
  });
  registerFurniture({
    type: 'washBasin',
    label: '洗面台',
    category: 'bath',
    defaults: { width: 0.75, depth: 0.45, height: 1.8, color: '#dedad4' },
    material: CERAMIC,
    stacking: { stackable: false, onTop: false },
    Shape: WashBasinShape,
    silhouette: 'rect',
  });
}
