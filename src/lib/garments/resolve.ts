/**
 * Turns one row of a brand's size chart into the finished dimensions of the
 * garment in centimetres, and records where every number came from so the fit
 * report never presents a guess as a published measurement.
 */
import type { BodyModel } from '../body';
import { toCm } from '../units';
import {
  CIRCUMFERENCE_DIMS,
  isUpper,
  slotOf,
  type Category,
  type ChartRow,
  type DimKey,
  type FitIntent,
  type Garment,
  type SleeveStyle,
} from './types';

/**
 * chart    — published by the brand for this size.
 * derived  — the brand only publishes the body it cuts the size for; this is
 *            that body plus the usual ease for the stated cut.
 * assumed  — absent from the chart; filled with a typical proportion so the
 *            piece can be drawn. Never used to judge fit.
 */
export type DimSource = 'chart' | 'derived' | 'assumed';

export interface Dim {
  cm: number;
  source: DimSource;
  /** For 'derived' dims: the body range the brand lists for this size, in cm. */
  bodyRange?: [number, number];
}

export type Dims = Partial<Record<DimKey, Dim>>;

export interface Resolved {
  row: ChartRow | null;
  dims: Dims;
  sleeves: Exclude<SleeveStyle, 'auto'>;
}

const BY_INTENT = <T,>(skin: T, slim: T, regular: T, relaxed: T, oversized: T): Record<FitIntent, T> => ({
  skin, slim, regular, relaxed, oversized,
});

const TOP_CHEST_EASE = BY_INTENT(-5, 5, 10, 16, 26);
const DRESS_CHEST_EASE = BY_INTENT(-4, 3, 6, 12, 20);
const DRESS_WAIST_EASE = BY_INTENT(-4, 2, 4, 10, 20);
const BOTTOM_WAIST_EASE = BY_INTENT(-5, 1.5, 1.5, 2.5, 4);
const BOTTOM_HIP_EASE = BY_INTENT(-5, 2, 5, 10, 18);
const THIGH_EASE = BY_INTENT(-4, 3, 6, 11, 18);
const LAYER_EXTRA: Partial<Record<Category, number>> = { sweater: 2, jacket: 6, coat: 10 };

/** Ease a brand typically builds in over the body it sizes for (cm). */
export function designEase(key: DimKey, g: Pick<Garment, 'category' | 'fitIntent'>): number {
  const f = g.fitIntent;
  const slot = slotOf(g.category);
  if (slot === 'bottom') {
    if (key === 'waist') return BOTTOM_WAIST_EASE[f];
    if (key === 'hip') return BOTTOM_HIP_EASE[f];
    if (key === 'thigh') return THIGH_EASE[f];
    return 0;
  }
  if (g.category === 'dress') {
    if (key === 'chest') return DRESS_CHEST_EASE[f];
    if (key === 'waist') return DRESS_WAIST_EASE[f];
    if (key === 'hip') return DRESS_CHEST_EASE[f] + 2;
  } else {
    const extra = LAYER_EXTRA[g.category] ?? 0;
    if (key === 'chest') return TOP_CHEST_EASE[f] + extra;
    if (key === 'waist') return TOP_CHEST_EASE[f] + extra + 6;
    if (key === 'hip') return TOP_CHEST_EASE[f] + extra - 2;
  }
  if (key === 'shoulder') return BY_INTENT(0, 0, 1, 4, 10)[f];
  if (key === 'bicep') return BY_INTENT(-2, 4, 7, 10, 14)[f];
  if (key === 'footLength') return 1;
  return 0;
}

export function defaultSleeves(c: Category): Exclude<SleeveStyle, 'auto'> {
  if (c === 'tee') return 'short';
  if (c === 'tank' || c === 'dress') return 'none';
  return 'long';
}

export function findRow(g: Garment, size: string): ChartRow | null {
  return g.chart.rows.find((r) => r.label === size) ?? g.chart.rows[0] ?? null;
}

export function resolveDims(g: Garment, size: string, body: BodyModel): Resolved {
  const row = findRow(g, size);
  const dims: Dims = {};
  const chart = g.chart;
  const upper = isUpper(g.category);
  let sleeveFromCB = false;

  if (row) {
    chart.columns.forEach((col, i) => {
      const v = row.values[i];
      if (!v || col.key === 'ignore') return;
      const key = col.key;
      const lo = toCm(v[0], chart.unit);
      const hi = toCm(v[1], chart.unit);
      const mid = (lo + hi) / 2;
      if (!(mid > 0)) return;
      const circ = CIRCUMFERENCE_DIMS.has(key);
      if (chart.kind === 'garment') {
        dims[key] = { cm: circ && col.flat ? mid * 2 : mid, source: 'chart' };
      } else if (circ || key === 'shoulder' || key === 'footLength') {
        if (key === 'neck') dims[key] = { cm: mid, source: 'chart' };
        else dims[key] = { cm: mid + designEase(key, g), source: 'derived', bodyRange: [lo, hi] };
      } else {
        // Lengths in a body chart (inseam, sleeve, length) describe the piece.
        dims[key] = { cm: mid, source: 'chart' };
      }
      if (key === 'sleeve' && col.fromCenterBack) sleeveFromCB = true;
    });
  }

  const f = g.fitIntent;
  const assume = (key: DimKey, cm: number) => {
    if (!dims[key] && cm > 0 && Number.isFinite(cm)) dims[key] = { cm, source: 'assumed' };
  };
  const m = body.m;

  if (upper) {
    const dress = g.category === 'dress';
    // Without any chest figure the piece is drawn as its stated cut on this body.
    assume('chest', m.chest + designEase('chest', g));
    const c = dims.chest!.cm;
    assume('shoulder', f === 'skin' ? m.shoulderWidth : 0.41 * c + 2);

    // A sleeve longer than any arm is measured from the centre back neck.
    let sleeves: Exclude<SleeveStyle, 'auto'> = g.sleeves === 'auto' ? defaultSleeves(g.category) : g.sleeves;
    if (dims.sleeve) {
      if (sleeveFromCB || dims.sleeve.cm > 72) {
        dims.sleeve = { ...dims.sleeve, cm: dims.sleeve.cm - dims.shoulder!.cm / 2 };
      }
      if (g.sleeves === 'auto') sleeves = dims.sleeve.cm >= 42 ? 'long' : 'short';
    }
    if (sleeves === 'short') assume('sleeve', 0.2 * c);
    if (sleeves === 'long') assume('sleeve', 0.3 * c + 32);
    if (sleeves !== 'none') {
      const outer = g.category === 'jacket' || g.category === 'coat' ? 0.02 : 0;
      assume('bicep', c * (BY_INTENT(0.33, 0.345, 0.37, 0.39, 0.41)[f] + outer));
      const b = dims.bicep!.cm;
      const cuffK: Partial<Record<Category, number>> = { sweater: 0.19, jacket: 0.26, coat: 0.28, tee: 0.2 };
      assume('cuff', sleeves === 'short' ? b * 0.92 : c * (cuffK[g.category] ?? 0.215));
    }

    const waistK = dress ? BY_INTENT(0.84, 0.84, 0.86, 0.95, 1)[f] : BY_INTENT(0.9, 0.94, 0.98, 1, 1)[f];
    assume('waist', c * waistK);
    const hipK = dress ? 1.08 : g.category === 'coat' ? 1.02 : 0.98;
    assume('hip', Math.max(c * hipK, dress ? dims.waist!.cm * 1.2 : 0));

    const lengthFor: Partial<Record<Category, number>> = {
      tee: 0.66 * c + 2, tank: 0.62 * c + 2, shirt: 0.68 * c + 3, sweater: 0.6 * c + 4,
      jacket: 0.58 * c + 5, coat: 0.8 * c + 10, dress: 92,
    };
    assume('length', lengthFor[g.category] ?? 70);
    const h = dims.hip!.cm;
    const len = dims.length!.cm;
    const hemFor: Partial<Record<Category, number>> = {
      sweater: h * 0.92, coat: h * 1.06,
      dress: h * (BY_INTENT(0.94, 1, 1.12, 1.3, 1.4)[f] + 0.003 * Math.max(0, len - 90)),
    };
    assume('hem', hemFor[g.category] ?? h);
    return { row, dims, sleeves };
  }

  if (slotOf(g.category) === 'bottom') {
    if (dims.outseam && !dims.inseam) {
      const rise = dims.rise?.cm ?? 27;
      dims.inseam = { cm: Math.max(4, dims.outseam.cm - rise), source: dims.outseam.source };
    }
    if (!dims.waist && dims.hip) assume('waist', dims.hip.cm / 1.2);
    assume('waist', m.waist + designEase('waist', g));
    assume('hip', Math.max(dims.waist!.cm * 1.18, m.hip + designEase('hip', g)));
    const h = dims.hip!.cm;
    assume('rise', 0.255 * h);
    if (g.category === 'skirt') {
      assume('length', 50);
      const len = dims.length!.cm;
      assume('hem', h * (BY_INTENT(0.92, 0.96, 1.12, 1.35, 1.6)[f] + 0.004 * Math.max(0, len - 45)));
    } else {
      assume('thigh', h * BY_INTENT(0.56, 0.575, 0.605, 0.645, 0.7)[f]);
      const t = dims.thigh!.cm;
      assume('inseam', g.category === 'shorts' ? 18 : m.inseam - 3);
      if (g.category === 'shorts') {
        assume('legOpening', t * 0.98);
        assume('knee', dims.legOpening!.cm);
      } else {
        if (dims.legOpening) assume('knee', t + (dims.legOpening.cm - t) * 0.62);
        assume('knee', h * BY_INTENT(0.36, 0.385, 0.43, 0.49, 0.56)[f]);
        assume('legOpening', h * BY_INTENT(0.22, 0.33, 0.38, 0.45, 0.54)[f]);
      }
    }
    return { row, dims, sleeves: 'none' };
  }

  // Shoes
  assume('footLength', m.footLength + 1);
  return { row, dims, sleeves: 'none' };
}
