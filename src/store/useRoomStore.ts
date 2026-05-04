import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  FURNITURE_DEFAULTS,
  FURNITURE_TYPE_LABELS,
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

const STORAGE_KEY = 'room-builder-state-v2';
const PLANS_KEY = 'room-builder-saved-plans-v1';
const PERSIST_DEBOUNCE_MS = 250;

interface PersistedState {
  floor: FloorPlan;
  furniture: Furniture[];
}

export interface SavedPlan {
  id: string;
  name: string;
  savedAt: number;
  data: PersistedState;
}

interface RoomStore extends PersistedState {
  selection: Selection | null;
  editorMode: EditorMode;
  tool: Tool;
  gridSize: number;
  showGrid3D: boolean;
  personView: { x: number; z: number; rotationY: number; pitch: number } | null;
  savedPlans: SavedPlan[];
  persistError: string | null;

  // floor
  setOutline: (outline: Vec2[]) => void;
  appendOutlineVertex: (p: Vec2) => void;
  /** Insert vertex at `index` (so the new vertex ends up at array[index]). */
  insertOutlineVertex: (index: number, p: Vec2) => void;
  popOutlineVertex: () => void;
  closeOutline: () => void;
  updateVertex: (index: number, p: Vec2) => void;
  removeVertex: (index: number) => void;
  setFloorHeight: (h: number) => void;
  setWallColor: (c: string) => void;
  setFloorColor: (c: string) => void;
  setWallOpacity: (v: number) => void;

  // background image
  setBackgroundImage: (img: BackgroundImage | undefined) => void;
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
  addFurniture: (type: FurnitureType) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => void;

  // ui
  setEditorMode: (m: EditorMode) => void;
  setTool: (t: Tool) => void;
  setSelection: (s: Selection | null) => void;
  setGridSize: (n: number) => void;
  setShowGrid3D: (v: boolean) => void;
  setPersonView: (v: { x: number; z: number; rotationY: number; pitch: number } | null) => void;
  resetAll: () => void;
  loadSample: () => void;

  // persistence error feedback
  clearPersistError: () => void;

  // saved plans
  savePlan: (name: string) => void;
  overwritePlan: (id: string) => void;
  loadPlan: (id: string) => void;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  exportSavedPlans: () => string; // returns JSON string
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

// ---------- safe JSON + sanitization (defense-in-depth on localStorage) ----------

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
  const r = raw as Partial<BackgroundImage>;
  if (typeof r.src !== 'string') return undefined;
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(r.src)) return undefined;
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
  return {
    id: r.id,
    type: r.type as FurnitureType,
    label: r.label,
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
  return { floor, furniture };
}

function loadPersisted(): PersistedState | null {
  try {
    localStorage.removeItem('room-builder-state-v1');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizePersisted(safeJsonParse(raw));
  } catch {
    return null;
  }
}

function loadSavedPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
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
  } catch {
    return [];
  }
}

function persistSavedPlans(plans: SavedPlan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('savedPlans persist failed:', msg);
    useRoomStore.setState({
      persistError:
        '保存プランの書き込みに失敗しました（容量上限の可能性）。',
    });
  }
}

const persisted = loadPersisted();
const initial: PersistedState = persisted ?? createSamplePlan();

export const useRoomStore = create<RoomStore>()(
  subscribeWithSelector((set, get) => ({
    floor: initial.floor,
    furniture: initial.furniture,
    selection: null,
    editorMode: initial.floor.outline.length >= 3 ? 'arrange' : 'plan',
    tool: initial.floor.outline.length >= 3 ? 'select' : 'outline',
    gridSize: 0.1,
    showGrid3D: true,
    personView: null,
    savedPlans: loadSavedPlans(),
    persistError: null,

    setOutline: (outline) =>
      set((s) => ({ floor: { ...s.floor, outline: ensureCCW(outline) } })),

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
          floor: {
            ...s.floor,
            outline: s.floor.outline.slice(0, -1),
          },
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

    setFloorHeight: (h) =>
      set((s) => ({ floor: { ...s.floor, height: h } })),
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
      set((s) => ({ floor: { ...s.floor, backgroundImage: img } })),

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

    addFurniture: (type) =>
      set((s) => {
        const def = FURNITURE_DEFAULTS[type];
        const f: Furniture = {
          id: uid(),
          type,
          label: FURNITURE_TYPE_LABELS[type],
          width: def.width,
          depth: def.depth,
          height: def.height,
          x: 0,
          z: 0,
          rotationY: 0,
          color: def.color,
        };
        return {
          furniture: [...s.furniture, f],
          selection: { kind: 'furniture', id: f.id },
        };
      }),

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
      })),

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
        };
      }),

    setEditorMode: (m) => set({ editorMode: m }),
    setTool: (t) => {
      const prev = get().tool;
      if (prev === t) return;
      set({ tool: t, selection: null });
    },
    setSelection: (s) => set({ selection: s }),
    setGridSize: (n) => set({ gridSize: n }),
    setShowGrid3D: (v) => set({ showGrid3D: v }),
    setPersonView: (v) => set({ personView: v }),
    resetAll: () =>
      set({
        floor: DEFAULT_FLOOR,
        furniture: [],
        selection: null,
        editorMode: 'plan',
        tool: 'outline',
        personView: null,
      }),

    loadSample: () => {
      const sample = createSamplePlan();
      set({
        floor: sample.floor,
        furniture: sample.furniture,
        selection: null,
        editorMode: 'arrange',
        tool: 'select',
        personView: null,
      });
    },

    clearPersistError: () => set({ persistError: null }),

    savePlan: (name) => {
      const plan: SavedPlan = {
        id: uid(),
        name: name.trim() || `プラン ${new Date().toLocaleString()}`,
        savedAt: Date.now(),
        data: {
          floor: get().floor,
          furniture: get().furniture,
        },
      };
      const next = [plan, ...get().savedPlans];
      persistSavedPlans(next);
      set({ savedPlans: next });
    },

    overwritePlan: (id) => {
      const next = get().savedPlans.map((p) =>
        p.id === id
          ? { ...p, savedAt: Date.now(), data: { floor: get().floor, furniture: get().furniture } }
          : p,
      );
      persistSavedPlans(next);
      set({ savedPlans: next });
    },

    loadPlan: (id) => {
      const plan = get().savedPlans.find((p) => p.id === id);
      if (!plan) return;
      set({
        floor: plan.data.floor,
        furniture: plan.data.furniture,
        selection: null,
        tool: 'select',
        // The previous person-view position belongs to the old plan; clear it
        // so the user doesn't end up stuck outside walls of the new one.
        personView: null,
      });
    },

    deletePlan: (id) => {
      const next = get().savedPlans.filter((p) => p.id !== id);
      persistSavedPlans(next);
      set({ savedPlans: next });
    },

    renamePlan: (id, name) => {
      const next = get().savedPlans.map((p) =>
        p.id === id ? { ...p, name } : p,
      );
      persistSavedPlans(next);
      set({ savedPlans: next });
    },

    exportSavedPlans: () => {
      const payload = {
        kind: 'room-builder.saved-plans',
        version: 1,
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
      const root = parsed as { plans?: unknown };
      // Accept both { plans: [...] } and a bare array.
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
        return { added: 0, skipped, error: '有効なプランがありませんでした' };
      }
      let next: SavedPlan[];
      if (mode === 'replace') {
        next = incoming;
      } else {
        const existingIds = new Set(get().savedPlans.map((p) => p.id));
        const merged = [...get().savedPlans];
        for (const p of incoming) {
          if (existingIds.has(p.id)) {
            // assign a fresh id to preserve both copies
            merged.unshift({ ...p, id: uid() });
          } else {
            merged.unshift(p);
          }
        }
        next = merged;
      }
      persistSavedPlans(next);
      set({ savedPlans: next });
      return { added: incoming.length, skipped };
    },
  })),
);

// ---------- debounced persistence (shallow equality on floor + furniture) ----------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized: string | null = null;

function flushPersist(state: PersistedState): void {
  try {
    const json = JSON.stringify(state);
    if (json === lastSerialized) return;
    localStorage.setItem(STORAGE_KEY, json);
    lastSerialized = json;
    if (useRoomStore.getState().persistError !== null) {
      useRoomStore.setState({ persistError: null });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('localStorage save failed:', msg);
    useRoomStore.setState({
      persistError:
        'localStorage への保存に失敗しました（容量上限の可能性）。背景画像のサイズを確認してください。',
    });
  }
}

function schedulePersist(state: PersistedState): void {
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushPersist(state);
  }, PERSIST_DEBOUNCE_MS);
}

useRoomStore.subscribe(
  (s) => ({ floor: s.floor, furniture: s.furniture }),
  (state) => schedulePersist(state),
  {
    equalityFn: (a, b) => a.floor === b.floor && a.furniture === b.furniture,
  },
);

if (!persisted) {
  flushPersist({ floor: initial.floor, furniture: initial.furniture });
}
