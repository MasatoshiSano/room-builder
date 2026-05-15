import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { temporal } from 'zundo';
import {
  type BackgroundImage,
  type EditorMode,
  type FloorPlan,
  type Furniture,
  type FurnitureType,
  type InnerWall,
  type Opening,
  type OpeningKind,
  type Selection,
  type Tool,
  type Vec2,
  type WallRef,
} from '../lib/types';
import { uid } from '../lib/uid';
import { ensureCCW } from '../lib/geometry';
import { createSamplePlan } from '../lib/sampleData';
import {
  getFurnitureMeta,
  makeFurnitureFromType,
} from '../lib/furnitureRegistry';
import {
  dataUrlToBlob,
  idbDeleteBlob,
  idbGetPlans,
  idbGetState,
  idbPutBlob,
  idbPutPlans,
  idbPutState,
  revokeBlobObjectUrl,
} from '../lib/persistence';
import { registerBuiltInShapes } from '../scene/shapes/registry';
import type { Unit } from '../lib/units';

// Eagerly register built-in shapes so the registry is populated before any
// store action that might consult it (addFurniture, sanitize, etc.).
registerBuiltInShapes();

const STORAGE_KEY_LEGACY = 'room-builder-state-v2';
const PLANS_KEY_LEGACY = 'room-builder-saved-plans-v1';
const SETTINGS_KEY = 'room-builder-settings-v1';
const PERSIST_DEBOUNCE_MS = 250;
const STATE_SCHEMA_VERSION = 3;
const PLANS_SCHEMA_VERSION = 2;

type LightingPreset = 'day' | 'evening' | 'night';

interface SerializedBackgroundImage extends Omit<BackgroundImage, 'src'> {
  /** Either a `data:` URL (legacy) or a `blob://<key>` reference. */
  src: string;
}

interface PersistedState {
  version: number;
  floor: FloorPlan;
  furniture: Furniture[];
}

export interface SavedPlan {
  id: string;
  name: string;
  savedAt: number;
  data: PersistedState;
}

interface SavedPlansEnvelope {
  kind: 'room-builder.saved-plans';
  version: number;
  exportedAt: string;
  plans: SavedPlan[];
}

export interface PersonView {
  x: number;
  z: number;
  rotationY: number;
  pitch: number;
}

export interface PersonViewSettings {
  eyeHeight: number;
  fov: number;
  moveSpeed: number;
}

export interface AppSettings {
  unit: Unit;
  showGrid3D: boolean;
  showCeiling: boolean;
  showShadows: boolean;
  /** When true, outer walls also cast shadows (allows window-beam light effect). */
  outerWallShadow: boolean;
  showClearance: boolean;
  clearanceMeters: number;
  lighting: LightingPreset;
  /** Sun azimuth in degrees (0 = +Z south, 90 = +X east). */
  sunAzimuth: number;
  /** Sun elevation in degrees above horizon (1..89). */
  sunElevation: number;
  personView: PersonViewSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  unit: 'm',
  showGrid3D: true,
  showCeiling: false,
  showShadows: true,
  outerWallShadow: false,
  showClearance: false,
  clearanceMeters: 0.5,
  lighting: 'day',
  sunAzimuth: 135,
  sunElevation: 55,
  personView: { eyeHeight: 1.6, fov: 70, moveSpeed: 2.2 },
};

interface RoomStore {
  // ----- persisted (history-tracked) -----
  floor: FloorPlan;
  furniture: Furniture[];

  // ----- transient UI -----
  selection: Selection | null;
  selections: Selection[];
  editorMode: EditorMode;
  tool: Tool;
  gridSize: number;
  personView: PersonView | null;
  personPlacing: boolean;
  savedPlans: SavedPlan[];
  persistError: string | null;
  settings: AppSettings;
  ready: boolean;
  /** UI hint for "drag furniture from sidebar" — type being dragged. */
  draggingFurnitureType: FurnitureType | null;

  // floor
  setOutline: (outline: Vec2[]) => void;
  appendOutlineVertex: (p: Vec2) => void;
  insertOutlineVertex: (index: number, p: Vec2) => void;
  popOutlineVertex: () => void;
  closeOutline: () => void;
  updateVertex: (index: number, p: Vec2) => void;
  removeVertex: (index: number) => void;
  setFloorHeight: (h: number) => void;
  setWallColor: (c: string) => void;
  setFloorColor: (c: string) => void;
  setWallOpacity: (v: number) => void;

  // background image (now Blob-backed; src is "blob:<key>")
  setBackgroundImage: (img: BackgroundImage | undefined) => void;
  setBackgroundImageFromBlob: (
    blob: Blob,
    base: Omit<BackgroundImage, 'src'>,
  ) => Promise<void>;
  updateBackgroundImage: (patch: Partial<BackgroundImage>) => void;

  // inner walls
  addInnerWall: (wall: Omit<InnerWall, 'id'>) => string;
  updateInnerWall: (id: string, patch: Partial<InnerWall>) => void;
  removeInnerWall: (id: string) => void;

  // openings
  addOpening: (params: {
    kind: OpeningKind;
    wallRef: WallRef;
    offset: number;
  }) => string;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  // furniture
  addFurniture: (type: FurnitureType, pos?: { x: number; z: number }) => string;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;
  removeFurnitures: (ids: string[]) => void;
  duplicateFurniture: (id: string) => void;
  duplicateFurnitures: (ids: string[]) => void;
  rotateFurnitures: (ids: string[], deltaRad: number) => void;
  translateFurnitures: (ids: string[], dx: number, dz: number) => void;

  // ui
  setEditorMode: (m: EditorMode) => void;
  setTool: (t: Tool) => void;
  setSelection: (s: Selection | null) => void;
  setSelections: (s: Selection[]) => void;
  toggleInSelection: (s: Selection) => void;
  selectAllFurniture: () => void;
  setGridSize: (n: number) => void;
  setShowGrid3D: (v: boolean) => void;
  setShowCeiling: (v: boolean) => void;
  setShowShadows: (v: boolean) => void;
  setOuterWallShadow: (v: boolean) => void;
  setShowClearance: (v: boolean) => void;
  setClearanceMeters: (m: number) => void;
  setLighting: (p: LightingPreset) => void;
  setSunAzimuth: (deg: number) => void;
  setSunElevation: (deg: number) => void;
  setUnit: (u: Unit) => void;
  setPersonViewSetting: (patch: Partial<PersonViewSettings>) => void;
  setPersonView: (v: PersonView | null) => void;
  setPersonPlacing: (v: boolean) => void;
  setDraggingFurnitureType: (t: FurnitureType | null) => void;
  resetAll: () => void;
  loadSample: () => void;

  clearPersistError: () => void;
  flushPersist: () => void;

  // saved plans
  savePlan: (name: string) => void;
  overwritePlan: (id: string) => void;
  loadPlan: (id: string) => void;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  exportSavedPlans: () => string;
  importSavedPlans: (
    json: string,
    mode: 'merge' | 'replace',
  ) => { added: number; skipped: number; error?: string };
}

const DEFAULT_FLOOR: FloorPlan = {
  outline: [],
  innerWalls: [],
  openings: [],
  height: 2.5,
  wallColor: '#efe9dd',
  floorColor: '#d4c8b3',
};

// ---------- safe JSON + sanitization ----------

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return null;
  }
}

function isVec2(v: unknown): v is Vec2 {
  if (!v || typeof v !== 'object') return false;
  const r = v as { x?: unknown; z?: unknown };
  return (
    typeof r.x === 'number' &&
    typeof r.z === 'number' &&
    Number.isFinite(r.x) &&
    Number.isFinite(r.z)
  );
}

function sanitizeBackgroundImage(raw: unknown): BackgroundImage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<SerializedBackgroundImage>;
  if (typeof r.src !== 'string') return undefined;
  const allowed =
    /^data:image\/(png|jpeg|webp);base64,/.test(r.src) ||
    /^blob-key:/.test(r.src);
  if (!allowed) return undefined;
  return {
    src: r.src,
    x: typeof r.x === 'number' ? r.x : 0,
    z: typeof r.z === 'number' ? r.z : 0,
    width: typeof r.width === 'number' && r.width > 0 ? r.width : 1,
    height: typeof r.height === 'number' && r.height > 0 ? r.height : 1,
    rotation: typeof r.rotation === 'number' ? r.rotation : 0,
    opacity: typeof r.opacity === 'number' ? r.opacity : 0.5,
    visible: typeof r.visible === 'boolean' ? r.visible : true,
    locked: typeof r.locked === 'boolean' ? r.locked : false,
  };
}

function sanitizeFloor(raw: unknown): FloorPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FloorPlan>;
  const outline = Array.isArray(r.outline)
    ? (r.outline as unknown[]).filter(isVec2)
    : [];
  const innerWalls: InnerWall[] = Array.isArray(r.innerWalls)
    ? (r.innerWalls as unknown[])
        .map((w): InnerWall | null => {
          if (!w || typeof w !== 'object') return null;
          const wr = w as Partial<InnerWall>;
          if (
            typeof wr.id !== 'string' ||
            !isVec2(wr.start) ||
            !isVec2(wr.end)
          ) {
            return null;
          }
          return { id: wr.id, start: wr.start, end: wr.end };
        })
        .filter((w): w is InnerWall => w !== null)
    : [];
  const innerWallIds = new Set(innerWalls.map((w) => w.id));
  const openings: Opening[] = Array.isArray(r.openings)
    ? (r.openings as unknown[])
        .map((o): Opening | null => {
          if (!o || typeof o !== 'object') return null;
          const op = o as Partial<Opening> & { wallRef?: unknown };
          if (typeof op.id !== 'string') return null;
          if (op.kind !== 'door' && op.kind !== 'window') return null;
          const ref = op.wallRef as Partial<WallRef> | undefined;
          if (!ref) return null;
          if (ref.type === 'outer') {
            if (!Number.isInteger((ref as { edgeIndex?: unknown }).edgeIndex)) {
              return null;
            }
          } else if (ref.type === 'inner') {
            const wid = (ref as { wallId?: unknown }).wallId;
            if (typeof wid !== 'string' || !innerWallIds.has(wid)) return null;
          } else {
            return null;
          }
          if (
            typeof op.offset !== 'number' ||
            typeof op.width !== 'number' ||
            typeof op.height !== 'number' ||
            typeof op.sillHeight !== 'number'
          ) {
            return null;
          }
          return {
            id: op.id,
            kind: op.kind,
            wallRef: ref as WallRef,
            offset: op.offset,
            width: op.width,
            height: op.height,
            sillHeight: op.sillHeight,
          };
        })
        .filter((o): o is Opening => o !== null)
    : [];
  return {
    outline,
    innerWalls,
    openings,
    height: typeof r.height === 'number' && r.height > 0 ? r.height : 2.5,
    wallColor: typeof r.wallColor === 'string' ? r.wallColor : '#efe9dd',
    floorColor: typeof r.floorColor === 'string' ? r.floorColor : '#d4c8b3',
    wallOpacity:
      typeof r.wallOpacity === 'number' &&
      r.wallOpacity > 0 &&
      r.wallOpacity <= 1
        ? r.wallOpacity
        : undefined,
    backgroundImage: sanitizeBackgroundImage(r.backgroundImage),
  };
}

function sanitizeFurnitureItem(raw: unknown): Furniture | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Furniture>;
  if (
    typeof r.id !== 'string' ||
    typeof r.type !== 'string' ||
    typeof r.label !== 'string' ||
    typeof r.width !== 'number' ||
    typeof r.depth !== 'number' ||
    typeof r.height !== 'number' ||
    typeof r.x !== 'number' ||
    typeof r.z !== 'number' ||
    typeof r.rotationY !== 'number' ||
    typeof r.color !== 'string'
  ) {
    return null;
  }
  // Validate the type is registered; unknown types fall back to 'box' with a
  // synthetic label so old/imported data doesn't crash the renderer.
  const t = r.type as FurnitureType;
  const meta = getFurnitureMeta(t);
  return {
    id: r.id,
    type: meta.type,
    label: r.label || meta.label,
    width: r.width,
    depth: r.depth,
    height: r.height,
    x: r.x,
    z: r.z,
    rotationY: r.rotationY,
    color: r.color,
  };
}

function sanitizePersisted(raw: unknown): PersistedState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<PersistedState>;
  const floor = sanitizeFloor(r.floor);
  if (!floor) return null;
  const furniture = Array.isArray(r.furniture)
    ? (r.furniture as unknown[])
        .map(sanitizeFurnitureItem)
        .filter((f): f is Furniture => f !== null)
    : [];
  const version =
    typeof r.version === 'number' ? r.version : STATE_SCHEMA_VERSION;
  return { version, floor, furniture };
}

// ---------- migration: localStorage data URL -> IDB blob ----------

async function migrateBackgroundDataUrlToBlob(
  state: PersistedState,
): Promise<PersistedState> {
  const bg = state.floor.backgroundImage;
  if (!bg) return state;
  if (!bg.src.startsWith('data:')) return state;
  const blob = dataUrlToBlob(bg.src);
  if (!blob) return state;
  const key = `bg-${uid()}`;
  try {
    await idbPutBlob(key, blob);
    return {
      ...state,
      floor: {
        ...state.floor,
        backgroundImage: { ...bg, src: `blob-key:${key}` },
      },
    };
  } catch {
    return state;
  }
}

function loadLegacyLocalStorage(): {
  state: PersistedState | null;
  plans: SavedPlan[];
} {
  let state: PersistedState | null = null;
  let plans: SavedPlan[] = [];
  try {
    localStorage.removeItem('room-builder-state-v1');
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (raw) {
      const parsed = sanitizePersisted(safeJsonParse(raw));
      if (parsed) state = parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(PLANS_KEY_LEGACY);
    if (raw) {
      const parsed = safeJsonParse(raw);
      if (Array.isArray(parsed)) {
        plans = (parsed as unknown[])
          .map((entry): SavedPlan | null => {
            if (!entry || typeof entry !== 'object') return null;
            const p = entry as Partial<SavedPlan>;
            if (
              typeof p.id !== 'string' ||
              typeof p.name !== 'string' ||
              typeof p.savedAt !== 'number'
            ) {
              return null;
            }
            const data = sanitizePersisted(p.data);
            if (!data) return null;
            return { id: p.id, name: p.name, savedAt: p.savedAt, data };
          })
          .filter((p): p is SavedPlan => p !== null);
      }
    }
  } catch {
    /* ignore */
  }
  return { state, plans };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;
    const r = parsed as Partial<AppSettings>;
    return {
      unit:
        r.unit === 'cm' || r.unit === 'mm' || r.unit === 'm'
          ? r.unit
          : DEFAULT_SETTINGS.unit,
      showGrid3D:
        typeof r.showGrid3D === 'boolean'
          ? r.showGrid3D
          : DEFAULT_SETTINGS.showGrid3D,
      showCeiling:
        typeof r.showCeiling === 'boolean'
          ? r.showCeiling
          : DEFAULT_SETTINGS.showCeiling,
      showShadows:
        typeof r.showShadows === 'boolean'
          ? r.showShadows
          : DEFAULT_SETTINGS.showShadows,
      outerWallShadow:
        typeof r.outerWallShadow === 'boolean'
          ? r.outerWallShadow
          : DEFAULT_SETTINGS.outerWallShadow,
      showClearance:
        typeof r.showClearance === 'boolean'
          ? r.showClearance
          : DEFAULT_SETTINGS.showClearance,
      clearanceMeters:
        typeof r.clearanceMeters === 'number' && r.clearanceMeters > 0
          ? r.clearanceMeters
          : DEFAULT_SETTINGS.clearanceMeters,
      lighting:
        r.lighting === 'day' ||
        r.lighting === 'evening' ||
        r.lighting === 'night'
          ? r.lighting
          : DEFAULT_SETTINGS.lighting,
      sunAzimuth:
        typeof r.sunAzimuth === 'number'
          ? ((r.sunAzimuth % 360) + 360) % 360
          : DEFAULT_SETTINGS.sunAzimuth,
      sunElevation:
        typeof r.sunElevation === 'number' && r.sunElevation > 0
          ? Math.max(1, Math.min(89, r.sunElevation))
          : DEFAULT_SETTINGS.sunElevation,
      personView: {
        eyeHeight:
          typeof r.personView?.eyeHeight === 'number' &&
          r.personView.eyeHeight > 0
            ? r.personView.eyeHeight
            : DEFAULT_SETTINGS.personView.eyeHeight,
        fov:
          typeof r.personView?.fov === 'number' && r.personView.fov > 10
            ? r.personView.fov
            : DEFAULT_SETTINGS.personView.fov,
        moveSpeed:
          typeof r.personView?.moveSpeed === 'number' &&
          r.personView.moveSpeed > 0
            ? r.personView.moveSpeed
            : DEFAULT_SETTINGS.personView.moveSpeed,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

// ---------- bootstrap initial state ----------

function bootstrapInitial(): {
  state: PersistedState;
  plans: SavedPlan[];
} {
  const legacy = loadLegacyLocalStorage();
  const initialState: PersistedState =
    legacy.state ?? {
      version: STATE_SCHEMA_VERSION,
      ...createSamplePlan(),
    };
  return { state: initialState, plans: legacy.plans };
}

const boot = bootstrapInitial();
const initialSettings = loadSettings();

export const useRoomStore = create<RoomStore>()(
  subscribeWithSelector(
    temporal(
      (set, get) => ({
        floor: boot.state.floor,
        furniture: boot.state.furniture,
        selection: null,
        selections: [],
        editorMode: boot.state.floor.outline.length >= 3 ? 'arrange' : 'plan',
        tool: boot.state.floor.outline.length >= 3 ? 'select' : 'outline',
        gridSize: 0.1,
        personView: null,
        personPlacing: false,
        savedPlans: boot.plans,
        persistError: null,
        settings: initialSettings,
        ready: false,
        draggingFurnitureType: null,

        setOutline: (outline) =>
          set((s) => ({
            floor: { ...s.floor, outline: ensureCCW(outline) },
          })),

        appendOutlineVertex: (p) =>
          set((s) => ({
            floor: { ...s.floor, outline: [...s.floor.outline, p] },
          })),

        insertOutlineVertex: (index, p) =>
          set((s) => {
            const n = s.floor.outline.length;
            const i = Math.max(0, Math.min(n, index));
            const next = [...s.floor.outline];
            next.splice(i, 0, p);
            return { floor: { ...s.floor, outline: next } };
          }),

        popOutlineVertex: () =>
          set((s) => {
            if (s.floor.outline.length === 0) return {};
            return {
              floor: { ...s.floor, outline: s.floor.outline.slice(0, -1) },
            };
          }),

        closeOutline: () =>
          set((s) => {
            if (s.floor.outline.length < 3) return {};
            return {
              floor: { ...s.floor, outline: ensureCCW(s.floor.outline) },
              tool: 'select',
            };
          }),

        updateVertex: (index, p) =>
          set((s) => {
            const next = [...s.floor.outline];
            next[index] = p;
            return { floor: { ...s.floor, outline: next } };
          }),

        removeVertex: (index) =>
          set((s) => {
            if (s.floor.outline.length <= 3) return {};
            const next = s.floor.outline.filter((_, i) => i !== index);
            return { floor: { ...s.floor, outline: next } };
          }),

        setFloorHeight: (h) => set((s) => ({ floor: { ...s.floor, height: h } })),
        setWallColor: (c) =>
          set((s) => ({ floor: { ...s.floor, wallColor: c } })),
        setFloorColor: (c) =>
          set((s) => ({ floor: { ...s.floor, floorColor: c } })),
        setWallOpacity: (v) =>
          set((s) => ({
            floor: {
              ...s.floor,
              wallOpacity: Math.max(0.05, Math.min(1, v)),
            },
          })),

        setBackgroundImage: (img) =>
          set((s) => {
            // Old image used a blob key? Revoke and delete.
            const old = s.floor.backgroundImage;
            if (old?.src.startsWith('blob-key:')) {
              const key = old.src.slice('blob-key:'.length);
              revokeBlobObjectUrl(key);
              void idbDeleteBlob(key);
            }
            return { floor: { ...s.floor, backgroundImage: img } };
          }),

        setBackgroundImageFromBlob: async (blob, base) => {
          const key = `bg-${uid()}`;
          try {
            await idbPutBlob(key, blob);
          } catch {
            useRoomStore.setState({
              persistError: 'IndexedDB への書き込みに失敗しました。',
            });
            return;
          }
          const cur = useRoomStore.getState().floor.backgroundImage;
          if (cur?.src.startsWith('blob-key:')) {
            const oldKey = cur.src.slice('blob-key:'.length);
            revokeBlobObjectUrl(oldKey);
            void idbDeleteBlob(oldKey);
          }
          useRoomStore.setState((s) => ({
            floor: {
              ...s.floor,
              backgroundImage: { ...base, src: `blob-key:${key}` },
            },
          }));
        },

        updateBackgroundImage: (patch) =>
          set((s) => {
            if (!s.floor.backgroundImage) return {};
            return {
              floor: {
                ...s.floor,
                backgroundImage: { ...s.floor.backgroundImage, ...patch },
              },
            };
          }),

        addInnerWall: (wall) => {
          const id = uid();
          set((s) => ({
            floor: {
              ...s.floor,
              innerWalls: [...s.floor.innerWalls, { id, ...wall }],
            },
          }));
          return id;
        },

        updateInnerWall: (id, patch) =>
          set((s) => ({
            floor: {
              ...s.floor,
              innerWalls: s.floor.innerWalls.map((w) =>
                w.id === id ? { ...w, ...patch } : w,
              ),
            },
          })),

        removeInnerWall: (id) =>
          set((s) => ({
            floor: {
              ...s.floor,
              innerWalls: s.floor.innerWalls.filter((w) => w.id !== id),
              openings: s.floor.openings.filter(
                (o) => !(o.wallRef.type === 'inner' && o.wallRef.wallId === id),
              ),
            },
          })),

        addOpening: ({ kind, wallRef, offset }) => {
          const id = uid();
          const opening: Opening =
            kind === 'door'
              ? {
                  id,
                  kind,
                  wallRef,
                  offset,
                  width: 0.8,
                  height: 2.0,
                  sillHeight: 0,
                }
              : {
                  id,
                  kind,
                  wallRef,
                  offset,
                  width: 1.2,
                  height: 1.0,
                  sillHeight: 0.9,
                };
          set((s) => ({
            floor: { ...s.floor, openings: [...s.floor.openings, opening] },
          }));
          return id;
        },

        updateOpening: (id, patch) =>
          set((s) => ({
            floor: {
              ...s.floor,
              openings: s.floor.openings.map((o) =>
                o.id === id ? { ...o, ...patch } : o,
              ),
            },
          })),

        removeOpening: (id) =>
          set((s) => ({
            floor: {
              ...s.floor,
              openings: s.floor.openings.filter((o) => o.id !== id),
            },
          })),

        addFurniture: (type, pos) => {
          const meta = getFurnitureMeta(type);
          // Default to room centroid (or origin if no outline yet).
          const fallback = pos ?? roomCentroid(get().floor);
          const f: Furniture = {
            id: uid(),
            ...makeFurnitureFromType(type, fallback),
            label: meta.label,
          };
          set((s) => ({
            furniture: [...s.furniture, f],
            selection: { kind: 'furniture', id: f.id },
            selections: [{ kind: 'furniture', id: f.id }],
          }));
          return f.id;
        },

        updateFurniture: (id, patch) =>
          set((s) => ({
            furniture: s.furniture.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          })),

        removeFurniture: (id) =>
          set((s) => ({
            furniture: s.furniture.filter((f) => f.id !== id),
            selection:
              s.selection?.kind === 'furniture' && s.selection.id === id
                ? null
                : s.selection,
            selections: s.selections.filter(
              (sel) => !(sel.kind === 'furniture' && sel.id === id),
            ),
          })),

        removeFurnitures: (ids) => {
          const idset = new Set(ids);
          set((s) => ({
            furniture: s.furniture.filter((f) => !idset.has(f.id)),
            selection:
              s.selection?.kind === 'furniture' && idset.has(s.selection.id)
                ? null
                : s.selection,
            selections: s.selections.filter(
              (sel) => !(sel.kind === 'furniture' && idset.has(sel.id)),
            ),
          }));
        },

        duplicateFurniture: (id) =>
          set((s) => {
            const orig = s.furniture.find((f) => f.id === id);
            if (!orig) return {};
            const copy: Furniture = {
              ...orig,
              id: uid(),
              x: orig.x + 0.3,
              z: orig.z + 0.3,
            };
            return {
              furniture: [...s.furniture, copy],
              selection: { kind: 'furniture', id: copy.id },
              selections: [{ kind: 'furniture', id: copy.id }],
            };
          }),

        duplicateFurnitures: (ids) =>
          set((s) => {
            const idset = new Set(ids);
            const copies: Furniture[] = [];
            for (const orig of s.furniture) {
              if (!idset.has(orig.id)) continue;
              copies.push({
                ...orig,
                id: uid(),
                x: orig.x + 0.3,
                z: orig.z + 0.3,
              });
            }
            return {
              furniture: [...s.furniture, ...copies],
              selection:
                copies.length > 0
                  ? { kind: 'furniture', id: copies[0].id }
                  : s.selection,
              selections: copies.map((c) => ({
                kind: 'furniture' as const,
                id: c.id,
              })),
            };
          }),

        rotateFurnitures: (ids, deltaRad) =>
          set((s) => {
            const idset = new Set(ids);
            return {
              furniture: s.furniture.map((f) =>
                idset.has(f.id) ? { ...f, rotationY: f.rotationY + deltaRad } : f,
              ),
            };
          }),

        translateFurnitures: (ids, dx, dz) =>
          set((s) => {
            const idset = new Set(ids);
            return {
              furniture: s.furniture.map((f) =>
                idset.has(f.id) ? { ...f, x: f.x + dx, z: f.z + dz } : f,
              ),
            };
          }),

        setEditorMode: (m) => set({ editorMode: m }),
        setTool: (t) => {
          const prev = get().tool;
          if (prev === t) return;
          set({ tool: t, selection: null, selections: [] });
        },
        setSelection: (s) =>
          set({ selection: s, selections: s ? [s] : [] }),
        setSelections: (sel) =>
          set({
            selections: sel,
            selection: sel.length > 0 ? sel[sel.length - 1] : null,
          }),
        toggleInSelection: (s) =>
          set((state) => {
            const has = state.selections.some(
              (x) => x.kind === s.kind && x.id === s.id,
            );
            const next = has
              ? state.selections.filter(
                  (x) => !(x.kind === s.kind && x.id === s.id),
                )
              : [...state.selections, s];
            return {
              selections: next,
              selection: next.length > 0 ? next[next.length - 1] : null,
            };
          }),
        selectAllFurniture: () =>
          set((s) => {
            const sel: Selection[] = s.furniture.map((f) => ({
              kind: 'furniture' as const,
              id: f.id,
            }));
            return {
              selections: sel,
              selection: sel.length > 0 ? sel[sel.length - 1] : null,
            };
          }),
        setGridSize: (n) => set({ gridSize: n }),
        setShowGrid3D: (v) =>
          set((s) => ({ settings: { ...s.settings, showGrid3D: v } })),
        setShowCeiling: (v) =>
          set((s) => ({ settings: { ...s.settings, showCeiling: v } })),
        setShowShadows: (v) =>
          set((s) => ({ settings: { ...s.settings, showShadows: v } })),
        setOuterWallShadow: (v) =>
          set((s) => ({ settings: { ...s.settings, outerWallShadow: v } })),
        setShowClearance: (v) =>
          set((s) => ({ settings: { ...s.settings, showClearance: v } })),
        setClearanceMeters: (m) =>
          set((s) => ({
            settings: {
              ...s.settings,
              clearanceMeters: Math.max(0.1, Math.min(2, m)),
            },
          })),
        setLighting: (p) =>
          set((s) => ({ settings: { ...s.settings, lighting: p } })),
        setSunAzimuth: (deg) =>
          set((s) => ({
            settings: {
              ...s.settings,
              sunAzimuth: ((deg % 360) + 360) % 360,
            },
          })),
        setSunElevation: (deg) =>
          set((s) => ({
            settings: {
              ...s.settings,
              sunElevation: Math.max(1, Math.min(89, deg)),
            },
          })),
        setUnit: (u) => set((s) => ({ settings: { ...s.settings, unit: u } })),
        setPersonViewSetting: (patch) =>
          set((s) => ({
            settings: {
              ...s.settings,
              personView: { ...s.settings.personView, ...patch },
            },
          })),
        setPersonView: (v) => set({ personView: v }),
        setPersonPlacing: (v) => set({ personPlacing: v }),
        setDraggingFurnitureType: (t) => set({ draggingFurnitureType: t }),
        resetAll: () => {
          // Clean up any background blob first.
          const cur = get().floor.backgroundImage;
          if (cur?.src.startsWith('blob-key:')) {
            const key = cur.src.slice('blob-key:'.length);
            revokeBlobObjectUrl(key);
            void idbDeleteBlob(key);
          }
          set({
            floor: DEFAULT_FLOOR,
            furniture: [],
            selection: null,
            selections: [],
            editorMode: 'plan',
            tool: 'outline',
            personView: null,
            personPlacing: false,
          });
        },

        loadSample: () => {
          const sample = createSamplePlan();
          set({
            floor: sample.floor,
            furniture: sample.furniture,
            selection: null,
            selections: [],
            editorMode: 'arrange',
            tool: 'select',
            personView: null,
            personPlacing: false,
          });
        },

        clearPersistError: () => set({ persistError: null }),
        flushPersist: () => {
          flushPersistNow({
            version: STATE_SCHEMA_VERSION,
            floor: get().floor,
            furniture: get().furniture,
          });
        },

        savePlan: (name) => {
          const plan: SavedPlan = {
            id: uid(),
            name: name.trim() || `プラン ${new Date().toLocaleString()}`,
            savedAt: Date.now(),
            data: {
              version: STATE_SCHEMA_VERSION,
              floor: get().floor,
              furniture: get().furniture,
            },
          };
          const next = [plan, ...get().savedPlans];
          void persistPlans(next);
          set({ savedPlans: next });
        },

        overwritePlan: (id) => {
          const next = get().savedPlans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  savedAt: Date.now(),
                  data: {
                    version: STATE_SCHEMA_VERSION,
                    floor: get().floor,
                    furniture: get().furniture,
                  },
                }
              : p,
          );
          void persistPlans(next);
          set({ savedPlans: next });
        },

        loadPlan: (id) => {
          const plan = get().savedPlans.find((p) => p.id === id);
          if (!plan) return;
          set({
            floor: plan.data.floor,
            furniture: plan.data.furniture,
            selection: null,
            selections: [],
            tool: 'select',
            personView: null,
            personPlacing: false,
          });
        },

        deletePlan: (id) => {
          const next = get().savedPlans.filter((p) => p.id !== id);
          void persistPlans(next);
          set({ savedPlans: next });
        },

        renamePlan: (id, name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const next = get().savedPlans.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p,
          );
          void persistPlans(next);
          set({ savedPlans: next });
        },

        exportSavedPlans: () => {
          const payload: SavedPlansEnvelope = {
            kind: 'room-builder.saved-plans',
            version: PLANS_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            plans: get().savedPlans,
          };
          return JSON.stringify(payload, null, 2);
        },

        importSavedPlans: (json, mode) => {
          const parsed = safeJsonParse(json);
          if (!parsed || typeof parsed !== 'object') {
            return { added: 0, skipped: 0, error: 'JSON の解析に失敗しました' };
          }
          const root = parsed as Partial<SavedPlansEnvelope> & {
            plans?: unknown;
          };
          if (
            'version' in root &&
            typeof root.version === 'number' &&
            root.version > PLANS_SCHEMA_VERSION
          ) {
            return {
              added: 0,
              skipped: 0,
              error: `未対応のバージョン (${root.version})。アプリを更新してください。`,
            };
          }
          const rawList: unknown[] = Array.isArray(root.plans)
            ? root.plans
            : Array.isArray(parsed)
              ? (parsed as unknown[])
              : [];
          if (rawList.length === 0) {
            return { added: 0, skipped: 0, error: 'プランが含まれていません' };
          }
          const incoming: SavedPlan[] = [];
          let skipped = 0;
          for (const entry of rawList) {
            if (!entry || typeof entry !== 'object') {
              skipped++;
              continue;
            }
            const p = entry as Partial<SavedPlan>;
            const data = sanitizePersisted(p.data);
            if (!data || typeof p.name !== 'string') {
              skipped++;
              continue;
            }
            incoming.push({
              id: typeof p.id === 'string' && p.id ? p.id : uid(),
              name: p.name,
              savedAt: typeof p.savedAt === 'number' ? p.savedAt : Date.now(),
              data,
            });
          }
          if (incoming.length === 0) {
            return {
              added: 0,
              skipped,
              error: '有効なプランがありませんでした',
            };
          }
          let next: SavedPlan[];
          if (mode === 'replace') {
            next = incoming;
          } else {
            const existingIds = new Set(get().savedPlans.map((p) => p.id));
            const merged = [...get().savedPlans];
            for (const p of incoming) {
              if (existingIds.has(p.id)) {
                merged.unshift({ ...p, id: uid() });
              } else {
                merged.unshift(p);
              }
            }
            next = merged;
          }
          void persistPlans(next);
          set({ savedPlans: next });
          return { added: incoming.length, skipped };
        },
      }),
      // ----- zundo options -----
      {
        partialize: (state) => ({
          floor: state.floor,
          furniture: state.furniture,
        }),
        equality: (a, b) => a.floor === b.floor && a.furniture === b.furniture,
        limit: 100,
      },
    ),
  ),
);

// ---------- room centroid helper ----------
function roomCentroid(floor: FloorPlan): { x: number; z: number } {
  if (floor.outline.length < 3) return { x: 0, z: 0 };
  let sx = 0;
  let sz = 0;
  for (const v of floor.outline) {
    sx += v.x;
    sz += v.z;
  }
  return { x: sx / floor.outline.length, z: sz / floor.outline.length };
}

// ---------- async hydration from IDB ----------

async function hydrateFromIDB(): Promise<void> {
  try {
    const idbState = await idbGetState<PersistedState>();
    if (idbState) {
      const sanitized = sanitizePersisted(idbState);
      if (sanitized) {
        useRoomStore.setState({
          floor: sanitized.floor,
          furniture: sanitized.furniture,
          editorMode:
            sanitized.floor.outline.length >= 3 ? 'arrange' : 'plan',
          tool: sanitized.floor.outline.length >= 3 ? 'select' : 'outline',
          ready: true,
        });
        useRoomStore.temporal.getState().clear();
        return;
      }
    }
    // Fall back to (already loaded) localStorage and migrate to IDB.
    const cur = useRoomStore.getState();
    const migrated = await migrateBackgroundDataUrlToBlob({
      version: STATE_SCHEMA_VERSION,
      floor: cur.floor,
      furniture: cur.furniture,
    });
    useRoomStore.setState({ floor: migrated.floor, ready: true });
    await idbPutState(migrated);
    useRoomStore.temporal.getState().clear();
  } catch {
    useRoomStore.setState({ ready: true });
    useRoomStore.temporal.getState().clear();
  }
  // Hydrate plans
  try {
    const plans = await idbGetPlans<SavedPlan>();
    if (plans && plans.length > 0) {
      useRoomStore.setState({ savedPlans: plans });
    } else {
      // Migrate existing localStorage plans into IDB.
      const cur = useRoomStore.getState().savedPlans;
      if (cur.length > 0) await idbPutPlans(cur);
    }
  } catch {
    /* ignore */
  }
}

// ---------- debounced persistence ----------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized: string | null = null;

function flushPersistNow(state: PersistedState): void {
  try {
    const json = JSON.stringify(state);
    if (json === lastSerialized) return;
    lastSerialized = json;
    void idbPutState(state).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('IDB save failed:', msg);
      useRoomStore.setState({
        persistError:
          'IndexedDB への保存に失敗しました。背景画像のサイズを確認してください。',
      });
    });
    if (useRoomStore.getState().persistError !== null) {
      useRoomStore.setState({ persistError: null });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('persist serialize failed:', msg);
  }
}

function schedulePersist(state: PersistedState): void {
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushPersistNow(state);
  }, PERSIST_DEBOUNCE_MS);
}

async function persistPlans(plans: SavedPlan[]): Promise<void> {
  try {
    await idbPutPlans(plans);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('plans persist failed:', msg);
    useRoomStore.setState({
      persistError: '保存プランの書き込みに失敗しました（容量上限の可能性）。',
    });
  }
}

useRoomStore.subscribe(
  (s) => ({ floor: s.floor, furniture: s.furniture }),
  (state) =>
    schedulePersist({
      version: STATE_SCHEMA_VERSION,
      floor: state.floor,
      furniture: state.furniture,
    }),
  {
    equalityFn: (a, b) => a.floor === b.floor && a.furniture === b.furniture,
  },
);

useRoomStore.subscribe(
  (s) => s.settings,
  (s) => persistSettings(s),
);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const cur = useRoomStore.getState();
    flushPersistNow({
      version: STATE_SCHEMA_VERSION,
      floor: cur.floor,
      furniture: cur.furniture,
    });
  });
}

// Kick off async hydration (don't block module init).
void hydrateFromIDB();
