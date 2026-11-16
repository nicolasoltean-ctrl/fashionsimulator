import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Garment, WornItem } from '../lib/garments/types';
import { DEFAULT_MEASUREMENTS, PRESETS, reconcile, scaleToHeight, type MeasurementKey, type Measurements } from '../lib/measurements';
import { wear } from '../lib/outfit';
import { SAMPLE_GARMENTS } from '../lib/samples';
import type { Unit } from '../lib/units';

export type ViewMode = 'fabric' | 'fit';

export interface SavedProfile {
  id: string;
  name: string;
  m: Measurements;
}

export interface SavedOutfit {
  id: string;
  name: string;
  worn: WornItem[];
}

interface State {
  unit: Unit;
  measurements: Measurements;
  presetId: string | null;
  profiles: SavedProfile[];
  closet: Garment[];
  worn: WornItem[];
  outfits: SavedOutfit[];
  view: ViewMode;

  setUnit(unit: Unit): void;
  setMeasurement(key: MeasurementKey, cm: number): void;
  setHeightProportional(cm: number): void;
  applyPreset(id: string): void;
  saveProfile(name: string): void;
  loadProfile(id: string): void;
  deleteProfile(id: string): void;

  addGarment(g: Garment): void;
  updateGarment(g: Garment): void;
  removeGarment(id: string): void;
  wearGarment(id: string, size: string): void;
  takeOff(id: string): void;
  setSize(id: string, size: string): void;
  setTucked(id: string, tucked: boolean): void;
  clearOutfit(): void;
  saveOutfit(name: string): void;
  loadOutfit(id: string): void;
  deleteOutfit(id: string): void;
  setView(view: ViewMode): void;
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      unit: 'cm',
      measurements: DEFAULT_MEASUREMENTS,
      presetId: PRESETS[0].id,
      profiles: [],
      closet: SAMPLE_GARMENTS,
      worn: [
        { garmentId: 'sample-tee', size: 'M' },
        { garmentId: 'sample-jeans', size: '33' },
      ],
      outfits: [],
      view: 'fabric',

      setUnit: (unit) => set({ unit }),
      setMeasurement: (key, cm) =>
        set((s) => ({ measurements: reconcile({ ...s.measurements, [key]: cm }, key), presetId: null })),
      setHeightProportional: (cm) => set((s) => ({ measurements: scaleToHeight(s.measurements, cm), presetId: null })),
      applyPreset: (id) => {
        const p = PRESETS.find((x) => x.id === id);
        if (p) set({ measurements: { ...p.m }, presetId: id });
      },
      saveProfile: (name) =>
        set((s) => ({ profiles: [...s.profiles, { id: newId('profile'), name, m: { ...s.measurements } }] })),
      loadProfile: (id) => {
        const p = get().profiles.find((x) => x.id === id);
        if (p) set({ measurements: reconcile({ ...DEFAULT_MEASUREMENTS, ...p.m }), presetId: null });
      },
      deleteProfile: (id) => set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),

      addGarment: (g) => set((s) => ({ closet: [g, ...s.closet] })),
      updateGarment: (g) =>
        set((s) => ({
          closet: s.closet.map((x) => (x.id === g.id ? g : x)),
          // Keep a worn size valid if the chart was edited.
          worn: s.worn.map((w) =>
            w.garmentId === g.id && !g.chart.rows.some((r) => r.label === w.size)
              ? { ...w, size: g.chart.rows[0]?.label ?? w.size }
              : w,
          ),
        })),
      removeGarment: (id) =>
        set((s) => ({
          closet: s.closet.filter((g) => g.id !== id),
          worn: s.worn.filter((w) => w.garmentId !== id),
          outfits: s.outfits.map((o) => ({ ...o, worn: o.worn.filter((w) => w.garmentId !== id) })),
        })),
      wearGarment: (id, size) =>
        set((s) => {
          const g = s.closet.find((x) => x.id === id);
          return g ? { worn: wear(s.closet, s.worn, g, size) } : {};
        }),
      takeOff: (id) => set((s) => ({ worn: s.worn.filter((w) => w.garmentId !== id) })),
      setSize: (id, size) => set((s) => ({ worn: s.worn.map((w) => (w.garmentId === id ? { ...w, size } : w)) })),
      setTucked: (id, tucked) => set((s) => ({ worn: s.worn.map((w) => (w.garmentId === id ? { ...w, tucked } : w)) })),
      clearOutfit: () => set({ worn: [] }),
      saveOutfit: (name) => set((s) => ({ outfits: [...s.outfits, { id: newId('outfit'), name, worn: s.worn.map((w) => ({ ...w })) }] })),
      loadOutfit: (id) => {
        const o = get().outfits.find((x) => x.id === id);
        if (o) set((s) => ({ worn: o.worn.filter((w) => s.closet.some((g) => g.id === w.garmentId)).map((w) => ({ ...w })) }));
      },
      deleteOutfit: (id) => set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) })),
      setView: (view) => set({ view }),
    }),
    {
      name: 'atelier-v1',
      version: 1,
      partialize: (s) => ({
        unit: s.unit, measurements: s.measurements, presetId: s.presetId, profiles: s.profiles,
        closet: s.closet, worn: s.worn, outfits: s.outfits, view: s.view,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const merged = { ...current, ...p };
        merged.measurements = reconcile({ ...DEFAULT_MEASUREMENTS, ...(p.measurements ?? {}) });
        // Refresh built-in samples so chart corrections reach existing users.
        const own = (p.closet ?? []).filter((g) => g.source !== 'sample');
        const keptSamples = p.closet ? SAMPLE_GARMENTS.filter((g) => p.closet!.some((x) => x.id === g.id)) : SAMPLE_GARMENTS;
        merged.closet = [...own, ...keptSamples];
        return merged;
      },
    },
  ),
);
