/**
 * Demo wardrobe so the simulator is usable before anything is imported. These
 * are generic pieces with plausible size charts — not any real brand's data.
 */
import type { Category, ChartColumn, DimKey, FitIntent, Garment, Neckline, Range, SizeChart, SleeveStyle } from './garments/types';
import type { Unit } from './units';

type Cell = number | [number, number] | null;

function chart(unit: Unit, kind: SizeChart['kind'], cols: Array<DimKey | ChartColumn>, rows: Record<string, Cell[]>): SizeChart {
  return {
    unit,
    kind,
    columns: cols.map((c) => (typeof c === 'string' ? { key: c, label: c } : c)),
    rows: Object.entries(rows).map(([label, values]) => ({
      label,
      values: values.map((v): Range | null => (v === null ? null : typeof v === 'number' ? [v, v] : v)),
    })),
  };
}

const flat = (key: DimKey, label: string): ChartColumn => ({ key, label, flat: true });

interface Spec {
  id: string;
  name: string;
  category: Category;
  color: string;
  stretch: number;
  fitIntent?: FitIntent;
  neckline?: Neckline;
  sleeves?: SleeveStyle;
  chart: SizeChart;
  notes?: string;
}

const make = (s: Spec): Garment => ({
  brand: 'Demo wardrobe',
  fitIntent: 'regular',
  neckline: 'crew',
  sleeves: 'auto',
  source: 'sample',
  ...s,
});

export const SAMPLE_GARMENTS: Garment[] = [
  make({
    id: 'sample-tee', name: 'Heavyweight crew tee', category: 'tee', color: '#ece8df', stretch: 0.15,
    notes: 'Garment measurements, laid flat (cm).',
    chart: chart('cm', 'garment', [flat('chest', 'Chest width'), 'length', 'shoulder', 'sleeve'], {
      XS: [46, 66, 41, 19], S: [48.5, 68, 43, 20], M: [51, 70, 45, 21], L: [54, 72, 47.5, 22], XL: [57.5, 74, 50, 23], XXL: [61, 76, 52.5, 24],
    }),
  }),
  make({
    id: 'sample-tank', name: 'Ribbed tank', category: 'tank', color: '#2a2a2c', stretch: 0.35, fitIntent: 'skin', neckline: 'scoop',
    notes: 'Body size chart (cm): the brand lists who each size is for.',
    chart: chart('cm', 'body', ['chest', 'waist'], {
      XS: [[78, 82], [60, 64]], S: [[83, 87], [65, 69]], M: [[88, 92], [70, 74]], L: [[93, 98], [75, 80]], XL: [[99, 105], [81, 87]],
    }),
  }),
  make({
    id: 'sample-oxford', name: 'Oxford button-down shirt', category: 'shirt', color: '#a9c2df', stretch: 0.02, neckline: 'collar',
    notes: 'Body size chart (inches); sleeve measured from centre back.',
    chart: chart('in', 'body', ['neck', 'chest', 'waist', { key: 'sleeve', label: 'Sleeve (centre back)', fromCenterBack: true }], {
      S: [[14, 14.5], [34, 36], [28, 30], [32, 33]], M: [[15, 15.5], [38, 40], [32, 34], [33, 34]],
      L: [[16, 16.5], [42, 44], [36, 38], [34, 35]], XL: [[17, 17.5], [46, 48], [40, 42], [35, 36]],
    }),
  }),
  make({
    id: 'sample-knit', name: 'Merino crewneck', category: 'sweater', color: '#6f2f33', stretch: 0.25,
    notes: 'Garment measurements, laid flat (cm).',
    chart: chart('cm', 'garment', [flat('chest', 'Chest width'), 'length', 'shoulder', 'sleeve', flat('hem', 'Hem width')], {
      XS: [47, 61, 39.5, 59], S: [50, 63.5, 42, 61], M: [53, 66, 44, 63], L: [56, 68.5, 46.5, 65], XL: [59.5, 71, 49, 66.5],
    }),
  }),
  make({
    id: 'sample-chore', name: 'Canvas chore jacket', category: 'jacket', color: '#4a5340', stretch: 0, neckline: 'collar', fitIntent: 'relaxed',
    notes: 'Garment measurements, laid flat (cm).',
    chart: chart('cm', 'garment', [flat('chest', 'Pit to pit'), 'length', 'shoulder', 'sleeve'], {
      S: [55, 68, 45.5, 62], M: [58, 70, 47.5, 63.5], L: [61, 72, 49.5, 65], XL: [64.5, 74, 52, 66.5],
    }),
  }),
  make({
    id: 'sample-coat', name: 'Wool overcoat', category: 'coat', color: '#35373c', stretch: 0, neckline: 'collar',
    notes: 'Body size chart (cm) plus finished length.',
    chart: chart('cm', 'body', ['chest', 'length'], {
      '44': [[84, 88], 104], '46': [[88, 92], 105], '48': [[92, 96], 106], '50': [[96, 100], 107], '52': [[100, 104], 108], '54': [[104, 108], 109], '56': [[108, 112], 110],
    }),
  }),
  make({
    id: 'sample-jeans', name: 'Slim rigid jeans', category: 'pants', color: '#2c3b57', stretch: 0.02, fitIntent: 'slim',
    notes: 'Garment measurements (inches), 32" inseam.',
    chart: chart('in', 'garment', ['waist', 'rise', 'hip', 'thigh', 'knee', 'legOpening', 'inseam'], {
      '28': [29.5, 10, 37, 21.5, 14.5, 13, 32], '29': [30.5, 10.25, 38, 22, 14.75, 13.25, 32], '30': [31.5, 10.5, 39, 22.5, 15, 13.5, 32],
      '31': [32.5, 10.5, 40, 23, 15.25, 13.75, 32], '32': [33.5, 10.75, 41, 23.5, 15.5, 14, 32], '33': [34.5, 11, 42, 24, 15.75, 14.25, 32],
      '34': [35.5, 11, 43, 24.5, 16, 14.5, 32], '36': [37.5, 11.5, 45, 25.5, 16.5, 15, 32], '38': [39.5, 11.75, 47, 26.5, 17, 15.5, 32],
    }),
  }),
  make({
    id: 'sample-trousers', name: 'Pleated wide-leg trousers', category: 'pants', color: '#b7a58a', stretch: 0.02, fitIntent: 'relaxed',
    notes: 'Body size chart (cm), high rise.',
    chart: chart('cm', 'body', ['waist', 'hip', 'rise', 'inseam'], {
      XS: [[60, 64], [86, 90], 31, 78], S: [[65, 69], [91, 95], 31.5, 79], M: [[70, 75], [96, 101], 32, 80],
      L: [[76, 82], [102, 108], 33, 81], XL: [[83, 90], [109, 116], 34, 82], XXL: [[91, 99], [117, 125], 35, 82],
    }),
  }),
  make({
    id: 'sample-shorts', name: 'Running shorts', category: 'shorts', color: '#1f5c63', stretch: 0.3,
    notes: 'Garment measurements (inches); elastic waistband.',
    chart: chart('in', 'garment', ['waist', 'hip', 'inseam', 'rise'], {
      S: [27, 40, 5, 11], M: [29.5, 42.5, 5, 11.5], L: [32, 45, 5, 12], XL: [35, 48, 5, 12.5],
    }),
  }),
  make({
    id: 'sample-skirt', name: 'A-line midi skirt', category: 'skirt', color: '#1d1d1f', stretch: 0,
    notes: 'Garment measurements (cm).',
    chart: chart('cm', 'garment', ['waist', 'hip', 'length', 'hem'], {
      '34': [64, 92, 74, 150], '36': [68, 96, 75, 154], '38': [72, 100, 76, 158], '40': [76, 104, 77, 162], '42': [81, 109, 78, 167], '44': [87, 115, 78, 173],
    }),
  }),
  make({
    id: 'sample-dress', name: 'Bias-cut slip dress', category: 'dress', color: '#5f7361', stretch: 0.05, fitIntent: 'slim', neckline: 'vneck', sleeves: 'none',
    notes: 'Body size chart (cm) plus finished length.',
    chart: chart('cm', 'body', ['chest', 'waist', 'hip', 'length'], {
      XS: [[78, 82], [60, 64], [86, 90], 112], S: [[83, 87], [65, 69], [91, 95], 114], M: [[88, 92], [70, 74], [96, 100], 116],
      L: [[93, 98], [75, 80], [101, 106], 118], XL: [[99, 105], [81, 87], [107, 113], 119],
    }),
  }),
  make({
    id: 'sample-sneakers', name: 'Leather court sneakers', category: 'shoes', color: '#f2f0ea', stretch: 0,
    notes: 'Foot length each size is made for (cm).',
    chart: chart('cm', 'body', ['footLength'], {
      'EU 37': [23.5], 'EU 38': [24.1], 'EU 39': [24.8], 'EU 40': [25.4], 'EU 41': [26.1], 'EU 42': [26.7],
      'EU 43': [27.4], 'EU 44': [28.1], 'EU 45': [28.7], 'EU 46': [29.4],
    }),
  }),
];
