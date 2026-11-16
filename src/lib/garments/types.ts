import type { Unit } from '../units';

export type Category =
  | 'tee'
  | 'tank'
  | 'shirt'
  | 'sweater'
  | 'jacket'
  | 'coat'
  | 'dress'
  | 'pants'
  | 'shorts'
  | 'skirt'
  | 'shoes';

export const CATEGORY_LABEL: Record<Category, string> = {
  tee: 'T-shirt / top',
  tank: 'Tank / sleeveless top',
  shirt: 'Shirt / blouse',
  sweater: 'Sweater / hoodie',
  jacket: 'Jacket / blazer',
  coat: 'Coat',
  dress: 'Dress',
  pants: 'Trousers / jeans',
  shorts: 'Shorts',
  skirt: 'Skirt',
  shoes: 'Shoes',
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export type Slot = 'top' | 'bottom' | 'dress' | 'shoes';

export function slotOf(c: Category): Slot {
  if (c === 'pants' || c === 'shorts' || c === 'skirt') return 'bottom';
  if (c === 'dress') return 'dress';
  if (c === 'shoes') return 'shoes';
  return 'top';
}

export const isUpper = (c: Category) => slotOf(c) === 'top' || c === 'dress';

/** Default stacking order, innermost first. */
export const LAYER_RANK: Record<Category, number> = {
  tank: 0, tee: 1, shirt: 2, dress: 2, pants: 3, shorts: 3, skirt: 3, sweater: 4, jacket: 5, coat: 6, shoes: 7,
};

/** A garment dimension a size chart can describe. */
export type DimKey =
  | 'chest'
  | 'waist'
  | 'hip'
  | 'hem'
  | 'shoulder'
  | 'sleeve'
  | 'bicep'
  | 'cuff'
  | 'neck'
  | 'length'
  | 'inseam'
  | 'outseam'
  | 'rise'
  | 'thigh'
  | 'knee'
  | 'legOpening'
  | 'footLength';

export const DIM_LABEL: Record<DimKey, string> = {
  chest: 'Chest / bust',
  waist: 'Waist',
  hip: 'Hip / seat',
  hem: 'Hem / sweep',
  shoulder: 'Shoulder width',
  sleeve: 'Sleeve length',
  bicep: 'Bicep / upper sleeve',
  cuff: 'Cuff / sleeve opening',
  neck: 'Neck / collar',
  length: 'Length',
  inseam: 'Inseam',
  outseam: 'Outseam',
  rise: 'Front rise',
  thigh: 'Thigh',
  knee: 'Knee',
  legOpening: 'Leg opening',
  footLength: 'Foot length',
};

export const DIM_KEYS = Object.keys(DIM_LABEL) as DimKey[];

/** Dimensions that go around the body (and so may be listed "flat", i.e. halved). */
export const CIRCUMFERENCE_DIMS: ReadonlySet<DimKey> = new Set<DimKey>([
  'chest', 'waist', 'hip', 'hem', 'bicep', 'cuff', 'neck', 'thigh', 'knee', 'legOpening',
]);

export interface ChartColumn {
  key: DimKey | 'ignore';
  /** Header text as the brand wrote it. */
  label: string;
  /** Measured flat across the garment: the real circumference is double. */
  flat?: boolean;
  /** Sleeve measured from the centre back of the neck rather than the shoulder seam. */
  fromCenterBack?: boolean;
}

/** [low, high] in the chart's unit; a single figure has low === high. */
export type Range = [number, number];

export interface ChartRow {
  label: string;
  values: Array<Range | null>;
}

export interface SizeChart {
  unit: Unit;
  /**
   * 'garment' — finished measurements of the piece itself.
   * 'body'    — the body measurements the brand says each size is cut for.
   */
  kind: 'garment' | 'body';
  columns: ChartColumn[];
  rows: ChartRow[];
}

export type FitIntent = 'skin' | 'slim' | 'regular' | 'relaxed' | 'oversized';

export const FIT_INTENT_LABEL: Record<FitIntent, string> = {
  skin: 'Second-skin / compression',
  slim: 'Slim',
  regular: 'Regular',
  relaxed: 'Relaxed',
  oversized: 'Oversized',
};

export type Neckline = 'crew' | 'vneck' | 'scoop' | 'collar' | 'turtle';

export const NECKLINE_LABEL: Record<Neckline, string> = {
  crew: 'Crew',
  vneck: 'V-neck',
  scoop: 'Scoop',
  collar: 'Collared',
  turtle: 'Turtleneck',
};

export type SleeveStyle = 'auto' | 'none' | 'short' | 'long';

export interface Garment {
  id: string;
  name: string;
  brand?: string;
  url?: string;
  image?: string;
  price?: string;
  category: Category;
  /** Display colour (hex). */
  color: string;
  /** How far the fabric stretches before it resists, as a fraction (0.15 = 15%). */
  stretch: number;
  /** The cut the brand describes. Only used to fill gaps the chart leaves. */
  fitIntent: FitIntent;
  neckline: Neckline;
  sleeves: SleeveStyle;
  chart: SizeChart;
  source: 'import' | 'manual' | 'sample';
  notes?: string;
}

export interface WornItem {
  garmentId: string;
  size: string;
  /** Tops only: worn tucked into the bottom. */
  tucked?: boolean;
}
