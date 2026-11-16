/**
 * Size-chart parsing. Takes a table as rows of cell text — from a product
 * page, a bookmarklet capture or text the user pasted — and produces a typed
 * chart: which column is which dimension, the unit, whether figures are flat
 * widths, and whether the chart describes the garment or the intended body.
 */
import { CIRCUMFERENCE_DIMS, type ChartColumn, type ChartRow, type DimKey, type Range, type SizeChart } from '../garments/types';
import type { Unit } from '../units';

export interface ParsedChart extends SizeChart {
  /** Rough quality signal used to pick the best table on a page. */
  confidence: number;
  /** True when the unit could not be read and was inferred from magnitudes. */
  unitGuessed: boolean;
}

const DIM_PATTERNS: Array<[DimKey | 'size' | 'ignore', RegExp]> = [
  ['ignore', /\b(height|weight|age|back rise|cup|band)\b/i],
  ['length', /\b(to (the )?(hem|floor)|hps|body length|back length|front length|total length|centre back length|center back length|cb length)\b/i],
  ['bicep', /\b(bicep|upper arm|sleeve width|arm width|muscle)\b/i],
  ['cuff', /\b(cuffs?|sleeve opening|wrist)\b/i],
  ['sleeve', /\b(sleeves?|arm length|[äa]rmel|manches?|manga)\b/i],
  ['inseam', /\b(inseam|inside leg|inner leg|in-seam|schrittl[äa]nge|entrejambe)\b/i],
  ['outseam', /\b(outseam|outside leg|out-seam|side length)\b/i],
  ['rise', /\brise\b/i],
  ['thigh', /\b(thighs?|oberschenkel|cuisse)\b/i],
  ['knee', /\bknees?\b/i],
  ['legOpening', /\b(leg opening|leg hem|ankle|bottom opening|leg width|hem opening)\b/i],
  ['shoulder', /\b(shoulders?|schulter|[ée]paules?|hombros?)\b/i],
  ['neck', /\b(neck|collar|kragen)\b/i],
  ['chest', /\b(chest|bust|pit[- ]to[- ]pit|p2p|armpit|brust|poitrine|pecho|petto|underarm)\b/i],
  ['waist', /\b(waist|taille|cintura|vita)\b/i],
  ['hip', /\b(hips?|seat|h[üu]fte|hanches|cadera)\b/i],
  ['hem', /\b(hem|sweep|bottom width|bottom)\b/i],
  ['footLength', /\b(foot length|foot|heel[- ]to[- ]toe|insole)\b/i],
  ['length', /\b(length|l[äa]nge|longueur|largo|long)\b/i],
  ['size', /^(size|sizes|us|uk|eu|eur|it|fr|de|jp|au|intl?|international|alpha|numeric|tag|label|gr[öo][ßs]+e|taille|talla)\b/i],
];

const FLAT_RE = /\b(width|flat|across|half|pit[- ]to[- ]pit|p2p|laid)\b|1\/2|½/i;
const CB_RE = /\b(cent(er|re) back|cb|from (the )?(neck|nape)|neck to (cuff|wrist))\b/i;
const SIZE_LABEL_RE = /^(x{0,4}[sl]|[2-6]x[sl]?|m|medium|small|large|one size|os|o\/s|[0-9]{1,3}(\.5)?([a-z]{1,2})?|[0-9]{2}\s*[x/]\s*[0-9]{2}|(us|uk|eu|w|l)\s?[0-9]{1,3}(\.5)?|[0-9]{1,2}\s?(-|\/)\s?[0-9]{1,2}|[a-z]{1,4}\s?\/\s?[a-z]{1,4})(\s?(tall|short|long|regular|petite|plus|r|s|l))?$/i;

export function classifyHeader(text: string): DimKey | 'size' | 'ignore' | null {
  const t = text.replace(/[_*]/g, ' ').trim();
  if (!t) return null;
  for (const [key, re] of DIM_PATTERNS) if (re.test(t)) return key;
  return null;
}

function unitOfText(text: string): Unit | null {
  if (/\b(cm|centimet(er|re)s?)\b/i.test(text)) return 'cm';
  if (/\b(in|inch|inches|ins)\b\.?|["”″]/i.test(text)) return 'in';
  return null;
}

export interface Cell {
  range: Range;
  unit: Unit | null;
}

const FRACTIONS: Record<string, string> = { '½': '.5', '¼': '.25', '¾': '.75', '⅛': '.125', '⅜': '.375', '⅝': '.625', '⅞': '.875' };

/** Parse one cell: "34", "34-36", "34 ½", `34"`, "86.5cm", "34 / 86", "34 (86.5)". */
export function parseCell(raw: string): Cell | null {
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/(\d)\s*([½¼¾⅛⅜⅝⅞])/g, (_m, d: string, f: string) => d + FRACTIONS[f]);
  s = s.replace(/(\d+)\s+(\d)\/(\d)\b/g, (_m, w: string, a: string, b: string) => String(Number(w) + Number(a) / Number(b)));
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?))?\s*(cm|mm|inches|inch|in\b|["”″]|'')?/gi;
  const found: Cell[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const lo = Number(m[1]);
    const hi = m[2] !== undefined ? Number(m[2]) : lo;
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    const u = m[3]?.toLowerCase();
    let unit: Unit | null = null;
    let k = 1;
    if (u === 'cm') unit = 'cm';
    else if (u === 'mm') { unit = 'cm'; k = 0.1; }
    else if (u) unit = 'in';
    found.push({ range: [Math.min(lo, hi) * k, Math.max(lo, hi) * k], unit });
  }
  if (!found.length) return null;
  if (found.length >= 2) {
    // A cell that lists the same figure in both units, e.g. "34 / 86".
    const a = (found[0].range[0] + found[0].range[1]) / 2;
    const b = (found[1].range[0] + found[1].range[1]) / 2;
    const ratio = b / a;
    if (ratio > 2.4 && ratio < 2.7) return { range: found[1].range, unit: 'cm' };
    if (ratio > 0.37 && ratio < 0.417) return { range: found[0].range, unit: 'cm' };
  }
  return found[0];
}

function transpose(rows: string[][]): string[][] {
  const width = Math.max(...rows.map((r) => r.length));
  const out: string[][] = [];
  for (let c = 0; c < width; c++) out.push(rows.map((r) => r[c] ?? ''));
  return out;
}

const countDims = (cells: string[]) =>
  cells.filter((c) => {
    const k = classifyHeader(c);
    return k && k !== 'size' && k !== 'ignore';
  }).length;

/** Typical flat-vs-around cut-offs in cm: below these a girth must be a flat width. */
const FLAT_BELOW: Partial<Record<DimKey, number>> = {
  chest: 72, waist: 50, hip: 62, hem: 62, thigh: 38, knee: 27, legOpening: 26, bicep: 21, cuff: 13,
};

export function parseSizeTable(input: string[][], context = ''): ParsedChart | null {
  let rows = input.map((r) => r.map((c) => (c ?? '').replace(/\s+/g, ' ').trim())).filter((r) => r.some((c) => c));
  if (rows.length < 2) return null;

  // Find the header: the first row (or column) naming at least one dimension.
  let headerRow = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (countDims(rows[i]) >= 1 && (countDims(rows[i]) >= 2 || rows[i].length <= 3)) { headerRow = i; break; }
  }
  const firstCol = rows.map((r) => r[0] ?? '');
  const colDims = countDims(firstCol);
  if (colDims >= 2 && (headerRow < 0 || colDims > countDims(rows[headerRow]))) {
    rows = transpose(rows);
    headerRow = 0;
  }
  if (headerRow < 0) return null;
  const header = rows[headerRow];
  const data = rows.slice(headerRow + 1);

  const seen = new Set<string>();
  const kinds = header.map((h) => {
    const k = classifyHeader(h);
    if (k && k !== 'size' && k !== 'ignore') {
      if (seen.has(k)) return 'ignore' as const;
      seen.add(k);
    }
    return k;
  });
  const dimCols = kinds.map((k, i) => (k && k !== 'size' && k !== 'ignore' ? i : -1)).filter((i) => i >= 0);
  if (!dimCols.length) return null;

  // The size label: a column headed "Size", else the first column that is not a dimension.
  let labelCol = kinds.findIndex((k) => k === 'size');
  if (labelCol < 0) labelCol = kinds.findIndex((k) => k === null);
  if (labelCol < 0) labelCol = 0;

  let unit: Unit | null = null;
  const votes: Record<Unit, number> = { cm: 0, in: 0 };
  const note = (u: Unit | null, w = 1) => { if (u) votes[u] += w; };
  note(unitOfText(context), 2);
  for (const i of dimCols) note(unitOfText(header[i]), 3);

  const parsed: Array<{ label: string; cells: Array<Cell | null> }> = [];
  for (const r of data) {
    const label = (r[labelCol] ?? '').trim();
    const cells = dimCols.map((i) => parseCell(r[i] ?? ''));
    if (!cells.some((c) => c)) continue;
    if (!label || /^(size|measurement)/i.test(label)) continue;
    cells.forEach((c) => note(c?.unit ?? null));
    parsed.push({ label, cells });
  }
  if (!parsed.length) return null;

  const colKeys = dimCols.map((i) => kinds[i] as DimKey);
  const median = (key: DimKey): number | null => {
    const c = colKeys.indexOf(key);
    if (c < 0) return null;
    const vals = parsed.map((p) => p.cells[c]).filter((x): x is Cell => !!x).map((x) => (x.range[0] + x.range[1]) / 2).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : null;
  };

  let unitGuessed = false;
  if (votes.cm || votes.in) unit = votes.cm >= votes.in ? 'cm' : 'in';
  else {
    unitGuessed = true;
    // No unit stated. Lengths separate the systems cleanly; girths less so.
    const longish = [median('length'), median('inseam'), median('outseam')].filter((v): v is number => v !== null);
    const girth = median('chest') ?? median('hip') ?? median('waist');
    const foot = median('footLength');
    if (longish.some((v) => v > 45)) unit = 'cm';
    else if (longish.some((v) => v >= 14 && v <= 40)) unit = 'in';
    else if (foot !== null) unit = foot > 15 ? 'cm' : 'in';
    else if (girth !== null) unit = girth > 62 ? 'cm' : girth < 40 ? 'in' : 'cm';
    else unit = 'cm';
  }

  const mentionsFlat = FLAT_RE.test(context) && /flat|laid/i.test(context);
  const columns: ChartColumn[] = dimCols.map((i, c) => {
    const key = colKeys[c];
    const col: ChartColumn = { key, label: header[i] };
    if (CIRCUMFERENCE_DIMS.has(key)) {
      const med = median(key);
      const cm = med === null ? null : unit === 'in' ? med * 2.54 : med;
      const limit = FLAT_BELOW[key];
      if (FLAT_RE.test(header[i]) || mentionsFlat || (cm !== null && limit !== undefined && cm < limit)) col.flat = true;
    }
    if (key === 'sleeve' && CB_RE.test(header[i])) col.fromCenterBack = true;
    return col;
  });

  // A "hem" in a trouser chart is the leg opening.
  const isBottomChart = colKeys.some((k) => k === 'inseam' || k === 'thigh' || k === 'rise' || k === 'outseam');
  if (isBottomChart) {
    for (const col of columns) if (col.key === 'hem' && !colKeys.includes('legOpening')) col.key = 'legOpening';
  }

  const chartRows: ChartRow[] = parsed.map((p) => ({ label: p.label, values: p.cells.map((c) => (c ? c.range : null)) }));

  // Garment measurements or the body the size is cut for?
  let garment = 0;
  let body = 0;
  if (columns.some((c) => c.flat)) garment += 3;
  if (/\b(garment|product|finished|flat|laid|item) (measure|dimension|size)|measured flat|garment\b/i.test(context)) garment += 3;
  if (/\b(body measure|your measure|to fit|fits (chest|waist|bust|hip)|find your size)\b/i.test(context)) body += 3;
  for (const k of colKeys) if (['length', 'shoulder', 'hem', 'rise', 'thigh', 'legOpening', 'knee', 'bicep', 'cuff'].includes(k)) garment += 1;
  const girthIdx = columns.map((c, i) => (CIRCUMFERENCE_DIMS.has(c.key as DimKey) ? i : -1)).filter((i) => i >= 0);
  const hasRanges = chartRows.some((r) => girthIdx.some((i) => r.values[i] && r.values[i]![1] - r.values[i]![0] > 0.01));
  if (hasRanges) body += 2;
  if (columns.every((c) => ['chest', 'waist', 'hip', 'neck', 'sleeve', 'inseam'].includes(c.key))) body += 1;
  const kind: SizeChart['kind'] = garment > body ? 'garment' : 'body';

  const sizeish = parsed.filter((p) => SIZE_LABEL_RE.test(p.label)).length / parsed.length;
  const confidence = columns.length * 2 + Math.min(parsed.length, 8) + sizeish * 4 + (unitGuessed ? 0 : 1);

  return { unit, kind, columns, rows: chartRows, confidence, unitGuessed };
}

const DIM_PHRASE = /(pit[- ]to[- ]pit|p2p|(?:front |back )?rise|leg opening|sleeve(?: length| opening| width)?|(?:body |back |front |total )?length|inside leg|outside leg|upper arm|(?:across )?shoulders?(?: width)?|(?:chest|bust|waist|hips?|hem|thigh|knee|neck|collar|bicep|cuff|inseam|outseam|seat|sweep|foot)(?: width| length)?|size|us|uk|eu)(?:\s*\((?:cm|in|inches|")\))?/gi;

/** Split pasted text into cells and parse it as a size chart. */
export function parseSizeText(text: string): ParsedChart | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/ /g, ' ').trimEnd()).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const splitWith = (re: RegExp) => lines.map((l) => l.split(re).map((c) => c.trim()));
  const candidates: string[][][] = [];
  if (lines.some((l) => l.includes('\t'))) candidates.push(splitWith(/\t/));
  if (lines.some((l) => l.includes('|'))) candidates.push(lines.filter((l) => !/^[\s|:-]+$/.test(l)).map((l) => l.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim())));
  if (lines.some((l) => /;/.test(l))) candidates.push(splitWith(/;/));
  if (lines.some((l) => /,/.test(l) && !/\d,\d/.test(l))) candidates.push(splitWith(/,/));
  candidates.push(splitWith(/\s{2,}/));
  // Single spaces: keep multi-word headers together, split data on whitespace.
  candidates.push(
    lines.map((l) => {
      if (!/\d/.test(l.replace(/\((cm|in)\)/gi, '')) || countDims(l.split(/\s+/)) >= 2) {
        const phrases = l.match(DIM_PHRASE);
        if (phrases && phrases.length >= 2) return phrases.map((p) => p.trim());
      }
      // Re-join "34 - 36" style ranges before splitting.
      return l.replace(/(\d)\s*(-|–|—)\s*(\d)/g, '$1-$3').replace(/(\d)\s+(\d\/\d)/g, '$1_$2').split(/\s+/).map((c) => c.replace('_', ' '));
    }),
  );
  let best: ParsedChart | null = null;
  for (const rows of candidates) {
    const widths = rows.map((r) => r.length);
    const consistent = widths.filter((w) => w === widths[0]).length / widths.length;
    const chart = parseSizeTable(rows, text.slice(0, 400));
    if (!chart) continue;
    chart.confidence += consistent * 3;
    if (!best || chart.confidence > best.confidence) best = chart;
  }
  return best;
}

/** An empty chart for manual entry. */
export function blankChart(keys: DimKey[], sizes: string[], unit: Unit = 'cm'): SizeChart {
  return {
    unit,
    kind: 'garment',
    columns: keys.map((key) => ({ key, label: key })),
    rows: sizes.map((label) => ({ label, values: keys.map(() => null) })),
  };
}
