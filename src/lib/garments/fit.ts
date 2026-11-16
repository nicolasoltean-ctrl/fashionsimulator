/**
 * Fit engine. Given a mannequin, a garment and a size, works out where the
 * garment sits on the body and how every measured dimension compares with the
 * body underneath it.
 *
 * Each girth is reduced to a score on one scale:
 *   below -2  too small     -2..-1 tight      -1..0 fitted
 *   0..1      regular        1..2  loose      above 2 oversized
 * The same scores colour the fit map, so the 3D view and the report agree.
 */
import type { BodyModel } from '../body';
import { clamp, lerp, pchipFromKnots, type Radial } from '../geom';
import { resolveDims, type Dim, type DimSource, type Dims } from './resolve';
import { isUpper, slotOf, type FitIntent, type Garment, type Neckline, type WornItem } from './types';

/** The surface a garment is put on: the body plus whatever is already worn. */
export interface Base {
  wrapAt(y: number): Radial;
  circAt(y: number): number;
  armRadiusAt(s: number): number;
  legRadiusAt(y: number): number;
}

export type Status = 'too-small' | 'tight' | 'fitted' | 'regular' | 'loose' | 'oversized';
export type Tone = 'bad' | 'warn' | 'good' | 'neutral';

export const STATUS_LABEL: Record<Status, string> = {
  'too-small': 'Too small',
  tight: 'Tight',
  fitted: 'Fitted',
  regular: 'Regular',
  loose: 'Loose',
  oversized: 'Oversized',
};

export interface Zone {
  id: string;
  label: string;
  kind: 'girth' | 'length';
  garmentCm?: number;
  bodyCm?: number;
  easeCm?: number;
  score?: number;
  status?: Status;
  verdict: string;
  detail: string;
  tone: Tone;
  source: DimSource;
  /** False when the garment figure is an assumption rather than brand data. */
  judged: boolean;
}

export interface UpperPlacement {
  hemY: number;
  /** Finished circumference of the body of the garment between hem and chest. */
  circAt(y: number): number;
  shoulderScale: number;
  sleeves: 'none' | 'short' | 'long';
  sleeveEndS: number;
  sleeveRadiusAt(s: number): number;
  neckline: Neckline;
}

export interface LowerPlacement {
  waistbandY: number;
  crotchY: number;
  /** Where the hem would fall if the leg hung free; below ~1 cm it stacks. */
  hemY: number;
  pelvisCircAt(y: number): number;
  legRadiusAt(y: number): number;
}

export interface SkirtPlacement {
  waistbandY: number;
  hemY: number;
  circAt(y: number): number;
}

export interface Overall {
  level: 'too-small' | 'tight' | 'good' | 'loose' | 'unknown';
  headline: string;
  /** Lower is better. Used to recommend a size. */
  cost: number;
}

export interface FitResult {
  garment: Garment;
  size: string;
  dims: Dims;
  zones: Zone[];
  overall: Overall;
  upper?: UpperPlacement;
  lower?: LowerPlacement;
  skirt?: SkirtPlacement;
  shoe?: { lengthCm: number };
  /** Fit score along the garment, for the fit map. */
  torsoScoreAt(y: number): number;
  sleeveScoreAt(s: number): number;
  legScoreAt(y: number): number;
}

export function bodyBase(body: BodyModel): Base {
  return {
    wrapAt: body.wrapAt,
    circAt: body.circAt,
    armRadiusAt: body.arm.radiusAt,
    legRadiusAt: body.leg.radiusAt,
  };
}

const TAU = Math.PI * 2;

/** Ease-to-body ratios separating tight | fitted | regular | loose | oversized. */
type Thresholds = [number, number, number, number];
const TH: Record<string, Thresholds> = {
  chest: [0.03, 0.08, 0.16, 0.27],
  topWaist: [0.03, 0.1, 0.22, 0.35],
  topHip: [0.02, 0.07, 0.16, 0.27],
  bicep: [0.05, 0.12, 0.25, 0.4],
  cuff: [0.03, 0.15, 0.4, 0.8],
  neck: [0.01, 0.05, 0.1, 0.16],
  waistband: [0.0, 0.025, 0.06, 0.11],
  seat: [0.015, 0.05, 0.11, 0.2],
  thigh: [0.03, 0.09, 0.18, 0.3],
  lowerLeg: [0.0, 0.1, 0.3, 0.6],
  skirtHem: [0.0, 0.1, 0.4, 0.9],
};

const INTENT_SCORE: Record<FitIntent, number> = { skin: -0.8, slim: -0.5, regular: 0.2, relaxed: 1, oversized: 1.8 };

export function statusOf(score: number): Status {
  if (score < -2) return 'too-small';
  if (score < -1) return 'tight';
  if (score < 0) return 'fitted';
  if (score < 1) return 'regular';
  if (score < 2) return 'loose';
  return 'oversized';
}

/** Score a finished garment girth against the girth of what it goes around. */
export function scoreFromEase(garmentCm: number, bodyCm: number, stretch: number, th: Thresholds): number {
  const rho = (garmentCm - bodyCm) / bodyCm;
  // A rigid cloth cannot be smaller than the body; a stretch one can, up to its limit.
  const xs = [-0.01 - stretch * 0.85, th[0] - stretch * 0.6, th[1], th[2], th[3]];
  for (let i = 1; i < xs.length; i++) if (xs[i] <= xs[i - 1]) xs[i] = xs[i - 1] + 0.005;
  const ys = [-2, -1, 0, 1, 2];
  if (rho <= xs[0]) return Math.max(-3, -2 + ((rho - xs[0]) / 0.06));
  if (rho >= xs[4]) return Math.min(3, 2 + (rho - xs[4]) / 0.15);
  for (let i = 0; i < 4; i++) {
    if (rho <= xs[i + 1]) return lerp(ys[i], ys[i + 1], (rho - xs[i]) / (xs[i + 1] - xs[i]));
  }
  return 2;
}

/** Score a body against the body range a brand lists for the size. */
export function scoreFromBodyRange(
  bodyCm: number,
  range: [number, number],
  stretch: number,
  intent: FitIntent,
  easeCm: number,
  waistband: boolean,
): number {
  const [lo, hi] = range;
  // A waistband has to hold the garment up whatever the cut of the rest.
  const centre = waistband ? (intent === 'skin' ? -0.6 : 0) : INTENT_SCORE[intent];
  const span = Math.max(hi - lo, 0.01);
  if (bodyCm >= lo && bodyCm <= hi) return centre + 0.4 - (0.8 * (bodyCm - lo)) / span;
  if (bodyCm > hi) {
    const atHi = centre - 0.4;
    const give = waistband
      ? Math.max(1.5, stretch * bodyCm * 0.6 + Math.abs(easeCm) * 0.5)
      : Math.max(2, stretch * bodyCm * 0.5 + Math.max(easeCm, 0) * 0.5);
    return Math.max(-3, atHi - ((bodyCm - hi) / give) * (atHi + 2));
  }
  const step = (waistband ? 0.03 : 0.05) * bodyCm;
  return Math.min(3, centre + 0.4 + (lo - bodyCm) / step);
}

interface GirthOpts {
  id: string;
  label: string;
  dim: Dim | undefined;
  bodyCm: number;
  th: Thresholds;
  g: Garment;
  waistband?: boolean;
  /** Girth of the garment at this level if it differs from the chart dimension. */
  garmentCm?: number;
  unit: (cm: number) => string;
}

function girthZone(o: GirthOpts): Zone | null {
  if (!o.dim || !(o.bodyCm > 0)) return null;
  const garmentCm = o.garmentCm ?? o.dim.cm;
  const ease = garmentCm - o.bodyCm;
  let score: number;
  let detail: string;
  if (o.dim.source === 'derived' && o.dim.bodyRange) {
    const [lo, hi] = o.dim.bodyRange;
    score = scoreFromBodyRange(o.bodyCm, [lo, hi], o.g.stretch, o.g.fitIntent, o.dim.cm - (lo + hi) / 2, !!o.waistband);
    const range = hi - lo < 0.05 ? o.unit(lo) : `${o.unit(lo)}–${o.unit(hi)}`;
    if (o.bodyCm > hi) detail = `Brand cuts this size for ${range}; the mannequin is ${o.unit(o.bodyCm - hi)} over.`;
    else if (o.bodyCm < lo) detail = `Brand cuts this size for ${range}; the mannequin is ${o.unit(lo - o.bodyCm)} under.`;
    else detail = `Brand cuts this size for ${range}; the mannequin is inside that range.`;
  } else {
    score = scoreFromEase(garmentCm, o.bodyCm, o.g.stretch, o.th);
    if (ease < -0.05) {
      const pct = Math.round((-ease / o.bodyCm) * 100);
      detail = `Garment is ${o.unit(-ease)} smaller than the body here${
        o.g.stretch > 0.03 ? ` — the fabric has to stretch ${pct}%.` : ' and the fabric has no give.'
      }`;
    } else {
      detail = `${o.unit(ease)} of ease over the body.`;
    }
  }
  const status = statusOf(score);
  let verdict = STATUS_LABEL[status];
  let tone: Tone = status === 'too-small' ? 'bad' : status === 'tight' ? 'warn' : status === 'fitted' || status === 'regular' ? 'good' : 'neutral';
  if (o.waistband) {
    if (status === 'loose') {
      verdict = 'Loose — needs a belt';
      tone = 'warn';
    } else if (status === 'oversized') {
      verdict = 'Too big';
      tone = 'bad';
    }
  }
  const judged = o.dim.source !== 'assumed';
  if (!judged) {
    tone = 'neutral';
    detail = 'Not in the size chart — drawn from a typical proportion, so not judged.';
  }
  return {
    id: o.id, label: o.label, kind: 'girth', garmentCm, bodyCm: o.bodyCm, easeCm: ease,
    score, status, verdict, detail, tone, source: o.dim.source, judged,
  };
}

function lengthZone(
  id: string,
  label: string,
  dim: Dim | undefined,
  verdict: string,
  detail: string,
  tone: Tone,
  extra: Partial<Zone> = {},
): Zone | null {
  if (!dim) return null;
  const judged = dim.source !== 'assumed';
  return {
    id, label, kind: 'length', garmentCm: dim.cm, verdict,
    detail: judged ? detail : `${detail} (Length is not in the size chart — typical value assumed.)`,
    tone: judged ? tone : 'neutral', source: dim.source, judged, ...extra,
  };
}

function torsoHemWords(y: number, body: BodyModel): string {
  const lm = body.lm;
  if (y > lm.underbustY) return 'above the ribcage (bralette length)';
  if (y > lm.waistY + 2) return 'above the waist (cropped)';
  if (y > lm.highHipY + 1) return 'at the waist';
  if (y > lm.hipY + 3) return 'at the high hip';
  if (y > lm.crotchY + 1) return 'at the hip';
  return legHemWords(y, body);
}

function legHemWords(y: number, body: BodyModel): string {
  const lm = body.lm;
  const thighLen = lm.crotchY - lm.kneeY;
  if (y > lm.crotchY - thighLen * 0.25) return 'at the top of the thigh';
  if (y > lm.kneeY + thighLen * 0.3) return 'mid-thigh';
  if (y > lm.kneeY + 4) return 'just above the knee';
  if (y > lm.kneeY - 4) return 'at the knee';
  if (y > lm.kneeY * 0.55) return 'below the knee (midi)';
  if (y > lm.ankleY + 5) return 'mid-calf';
  if (y > 4) return 'at the ankle';
  return 'at the floor';
}

export function fitGarment(
  body: BodyModel,
  g: Garment,
  worn: Pick<WornItem, 'size'>,
  base: Base,
  unit: (cm: number) => string = (cm) => `${cm.toFixed(1)} cm`,
): FitResult {
  const { row, dims, sleeves } = resolveDims(g, worn.size, body);
  const lm = body.lm;
  const m = body.m;
  const zones: Zone[] = [];
  const push = (z: Zone | null) => {
    if (z) zones.push(z);
  };
  const result: FitResult = {
    garment: g,
    size: row?.label ?? worn.size,
    dims,
    zones,
    overall: { level: 'unknown', headline: '', cost: 0 },
    torsoScoreAt: () => 0,
    sleeveScoreAt: () => 0,
    legScoreAt: () => 0,
  };
  const scoreOf = (id: string) => zones.find((z) => z.id === id)?.score;
  const slot = slotOf(g.category);

  // ------------------------------------------------------------------ tops
  if (isUpper(g.category)) {
    const chest = dims.chest!;
    const length = dims.length!;
    const hemY = lm.hpsY - length.cm;
    const coversWaist = hemY < lm.waistY - 2;
    const coversHip = hemY < lm.hipY + 4;
    const hipLevel = Math.max(hemY, lm.hipY);
    const longBody = hemY < lm.hipY - 6;

    const knots: Array<[number, number]> = [[lm.chestY, chest.cm]];
    if (coversWaist) knots.push([lm.waistY, dims.waist!.cm]);
    if (longBody) knots.push([lm.hipY, dims.hip!.cm]);
    if (hemY < lm.chestY - 2) knots.push([hemY, dims.hem!.cm]);
    const circAt = pchipFromKnots(knots);

    push(girthZone({ id: 'chest', label: 'Chest', dim: chest, bodyCm: base.circAt(lm.chestY), th: TH.chest, g, unit }));
    if (coversWaist) {
      push(girthZone({ id: 'waist', label: 'Waist', dim: dims.waist, bodyCm: base.circAt(lm.waistY), th: TH.topWaist, g, unit }));
    }
    if (coversHip) {
      // The hip is judged on whichever of hip / hem the chart actually gives.
      const src = longBody ? dims.hip : dims.hem?.source !== 'assumed' ? dims.hem : dims.hip;
      push(girthZone({
        id: 'hip', label: longBody ? 'Hip' : 'Hem at hip', dim: src, bodyCm: base.circAt(hipLevel),
        th: TH.topHip, g, garmentCm: circAt(hipLevel), unit,
      }));
    }

    // Shoulders
    const sh = dims.shoulder!;
    const dSh = sh.cm - m.shoulderWidth;
    const shScore = dSh < 0 ? Math.max(-3, dSh / 3 - (g.stretch > 0.1 ? 0 : 0.2)) : Math.min(3, dSh < 2.5 ? 0.2 : 0.2 + (dSh - 2.5) / 5);
    const shVerdict = dSh < -6 ? 'Too narrow' : dSh < -2.5 ? 'Narrow' : dSh < 2.5 ? 'On the shoulder' : dSh < 7 ? 'Slightly dropped' : 'Dropped shoulder';
    push(lengthZone('shoulder', 'Shoulders', sh, shVerdict,
      `Seam to seam ${unit(sh.cm)} against shoulders of ${unit(m.shoulderWidth)}.`,
      dSh < -6 ? 'bad' : dSh < -2.5 ? 'warn' : dSh < 2.5 ? 'good' : 'neutral',
      { bodyCm: m.shoulderWidth, easeCm: dSh, score: shScore }));

    // Sleeves
    const drop = clamp(dSh / 2, -3, 16);
    let sleeveEndS = 0;
    let sleeveRadiusAt = (_s: number) => 0;
    const arm = body.arm;
    if (sleeves !== 'none' && dims.sleeve && dims.bicep) {
      sleeveEndS = Math.max(3, drop + dims.sleeve.cm);
      const bicepS = 0.25 * arm.length;
      const rb = dims.bicep.cm / TAU;
      const rc = (dims.cuff?.cm ?? dims.bicep.cm * 0.9) / TAU;
      const sk: Array<[number, number]> = [[-3, rb * 1.12]];
      if (sleeveEndS > bicepS + 3) sk.push([bicepS, rb]);
      sk.push([sleeveEndS, sleeveEndS > bicepS + 3 ? rc : Math.max(rc, rb * 0.9)]);
      sleeveRadiusAt = pchipFromKnots(sk);
      const armAt = (s: number) => TAU * base.armRadiusAt(s);
      push(girthZone({
        id: 'bicep', label: 'Upper arm', dim: dims.bicep, bodyCm: armAt(Math.min(bicepS, sleeveEndS)),
        th: TH.bicep, g, garmentCm: TAU * sleeveRadiusAt(Math.min(bicepS, sleeveEndS)), unit,
      }));
      if (sleeves === 'long') {
        const over = sleeveEndS - arm.length;
        // Forearm clearance matters for slim long sleeves.
        const fs = 0.66 * arm.length;
        if (sleeveEndS > fs) {
          push(girthZone({
            id: 'forearm', label: 'Forearm', dim: dims.cuff?.source === 'assumed' ? dims.bicep : dims.cuff,
            bodyCm: armAt(fs), th: TH.cuff, g, garmentCm: TAU * sleeveRadiusAt(fs), unit,
          }));
        }
        const v = over < -5 ? 'Too short' : over < -2 ? 'Slightly short' : over < 3 ? 'To the wrist' : over < 7 ? 'Slightly long' : 'Too long';
        push(lengthZone('sleeve', 'Sleeve length', dims.sleeve, v,
          over < 0 ? `Ends ${unit(-over)} above the wrist.` : `Reaches ${unit(over)} past the wrist.`,
          over < -5 || over >= 7 ? 'warn' : over < -2 || over >= 3 ? 'neutral' : 'good', { easeCm: over }));
      } else {
        const frac = sleeveEndS / arm.length;
        const where = frac < 0.2 ? 'Cap sleeve' : frac < 0.36 ? 'Mid-bicep' : frac < 0.48 ? 'Above the elbow' : frac < 0.58 ? 'To the elbow' : 'Three-quarter';
        push(lengthZone('sleeve', 'Sleeve length', dims.sleeve, where,
          `Ends ${unit(sleeveEndS)} down the arm.`, 'neutral'));
      }
    }

    // Collar
    if (dims.neck && dims.neck.source !== 'assumed' && g.neckline === 'collar') {
      push(girthZone({ id: 'neck', label: 'Collar', dim: dims.neck, bodyCm: m.neck, th: TH.neck, g, unit }));
    }

    // Body length
    const where = torsoHemWords(hemY, body);
    push(lengthZone('length', 'Length', length, `Ends ${where}`,
      `${unit(length.cm)} from the shoulder: the hem falls ${where}.`, 'neutral'));

    result.upper = {
      hemY, circAt, shoulderScale: sh.cm / m.shoulderWidth, sleeves, sleeveEndS, sleeveRadiusAt, neckline: g.neckline,
    };
    const chestScore = scoreOf('chest') ?? 0;
    const tk: Array<[number, number]> = [[lm.chestY, chestScore], [lm.shoulderY, clamp(shScore, -3, Math.max(chestScore, 0.5))]];
    const ws = scoreOf('waist');
    if (ws !== undefined) tk.push([lm.waistY, ws]);
    const hs = scoreOf('hip');
    if (hs !== undefined) tk.push([hipLevel, hs]);
    if (hemY < hipLevel - 8) {
      tk.push([hemY, scoreFromEase(circAt(hemY), base.circAt(hemY), g.stretch, TH.skirtHem)]);
    }
    result.torsoScoreAt = pchipFromKnots(tk, 1);
    const bs = scoreOf('bicep');
    if (bs !== undefined) {
      const sk: Array<[number, number]> = [[0, Math.min(bs, Math.max(shScore, bs))], [0.25 * arm.length, bs]];
      const fz = scoreOf('forearm');
      if (fz !== undefined) sk.push([0.66 * arm.length, fz]);
      result.sleeveScoreAt = pchipFromKnots(sk, 1);
    }
  }

  // --------------------------------------------------------------- bottoms
  if (slot === 'bottom') {
    const waist = dims.waist!;
    const hip = dims.hip!;
    if (g.category === 'skirt') {
      const waistbandY = lm.waistY;
      const hemY = waistbandY - dims.length!.cm;
      const knots: Array<[number, number]> = [[waistbandY, waist.cm]];
      if (hemY < lm.hipY - 2) knots.push([lm.hipY, hip.cm]);
      knots.push([hemY, hemY < lm.hipY - 2 ? dims.hem!.cm : hip.cm]);
      const circAt = pchipFromKnots(knots);
      push(girthZone({ id: 'waist', label: 'Waistband', dim: waist, bodyCm: base.circAt(waistbandY), th: TH.waistband, g, waistband: true, unit }));
      if (hemY < lm.hipY + 2) {
        push(girthZone({ id: 'hip', label: 'Hip', dim: hip, bodyCm: base.circAt(lm.hipY), th: TH.seat, g, unit }));
      }
      const hemZone = girthZone({ id: 'hem', label: 'Hem', dim: dims.hem, bodyCm: base.circAt(hemY), th: TH.skirtHem, g, garmentCm: circAt(hemY), unit });
      if (hemZone) {
        if (hemZone.status === 'too-small' || hemZone.status === 'tight') hemZone.detail += ' A hem this close restricts your stride.';
        push(hemZone);
      }
      const where = legHemWords(hemY, body);
      push(lengthZone('length', 'Length', dims.length, `Ends ${where}`, `${unit(dims.length!.cm)} from the waist: the hem falls ${where}.`, 'neutral'));
      result.skirt = { waistbandY, hemY, circAt };
      const tk: Array<[number, number]> = [[waistbandY, scoreOf('waist') ?? 0]];
      if (scoreOf('hip') !== undefined) tk.push([lm.hipY, scoreOf('hip')!]);
      if (scoreOf('hem') !== undefined) tk.push([hemY, scoreOf('hem')!]);
      result.torsoScoreAt = pchipFromKnots(tk, 1);
    } else {
      const riseV = dims.rise!.cm * 0.94;
      let crotchG = lm.crotchY - 1.5;
      let waistbandY = crotchG + riseV;
      if (waist.source === 'derived' && dims.rise!.source === 'assumed') waistbandY = lm.waistY;
      if (waistbandY > lm.waistY + 2) {
        waistbandY = lm.waistY + 2;
        crotchG = waistbandY - riseV;
      }
      const inseam = dims.inseam!;
      const hemY = crotchG - inseam.cm;
      const pk: Array<[number, number]> = [[waistbandY, waist.cm], [crotchG, hip.cm]];
      const hipCovered = lm.hipY < waistbandY - 2 && lm.hipY > crotchG + 2;
      if (hipCovered) pk.push([lm.hipY, hip.cm]);
      const pelvisCircAt = pchipFromKnots(pk);
      const thighY = crotchG - 2.5;
      const lk: Array<[number, number]> = [[thighY, dims.thigh!.cm / TAU], [thighY + 12, dims.thigh!.cm / TAU]];
      const coversKnee = hemY < lm.kneeY - 3;
      if (coversKnee) lk.push([lm.kneeY, dims.knee!.cm / TAU]);
      lk.push([Math.min(hemY, thighY - 3), dims.legOpening!.cm / TAU]);
      const legRadiusAt = pchipFromKnots(lk);
      const legAt = (y: number) => TAU * base.legRadiusAt(y);

      // A body-chart waist always refers to the natural waist.
      const waistRefY = waist.source === 'derived' ? lm.waistY : waistbandY;
      push(girthZone({ id: 'waist', label: 'Waistband', dim: waist, bodyCm: base.circAt(waistRefY), th: TH.waistband, g, waistband: true, unit }));
      push(girthZone({ id: 'hip', label: 'Seat', dim: hip, bodyCm: base.circAt(lm.hipY), th: TH.seat, g, unit }));
      push(girthZone({ id: 'thigh', label: 'Thigh', dim: dims.thigh, bodyCm: legAt(lm.crotchY - 2.5), th: TH.thigh, g, unit }));
      if (coversKnee) {
        push(girthZone({ id: 'knee', label: 'Knee', dim: dims.knee, bodyCm: legAt(lm.kneeY), th: TH.lowerLeg, g, unit }));
        const calfY = lerp(lm.ankleY, lm.kneeY, 0.7);
        if (hemY < calfY) {
          const src = dims.legOpening?.source !== 'assumed' ? dims.legOpening : dims.knee;
          push(girthZone({ id: 'calf', label: 'Calf', dim: src, bodyCm: legAt(calfY), th: TH.lowerLeg, g, garmentCm: TAU * legRadiusAt(calfY), unit }));
        }
      }

      const wbDrop = lm.waistY - waistbandY;
      const sits = wbDrop < 2 ? 'at the natural waist (high rise)' : wbDrop < 7.5 ? 'below the navel (mid rise)' : 'on the hips (low rise)';
      const dropped = lm.crotchY - crotchG - 1.5;
      push(lengthZone('rise', 'Rise', dims.rise, dropped > 3 ? 'Dropped crotch' : `Sits ${sits.split(' (')[0]}`,
        dropped > 3
          ? `The rise is ${unit(dropped)} longer than the body rise, so the crotch hangs low.`
          : `With a ${unit(dims.rise!.cm)} rise the waistband sits ${sits}.`, 'neutral'));

      if (g.category === 'shorts') {
        const where = legHemWords(hemY, body);
        push(lengthZone('inseam', 'Inseam', inseam, `Ends ${where}`, `${unit(inseam.cm)} inseam: the hem falls ${where}.`, 'neutral'));
      } else {
        let v: string;
        let d: string;
        let tone: Tone = 'good';
        if (hemY > 16) { v = 'Cropped'; d = `Ends ${unit(hemY - lm.ankleY)} above the ankle bone.`; tone = 'neutral'; }
        else if (hemY > 5) { v = 'Ankle length'; d = `Hem sits ${unit(hemY)} off the floor.`; tone = 'neutral'; }
        else if (hemY > -3) { v = 'Full length'; d = hemY > 0.5 ? `Hem sits ${unit(hemY)} off the floor.` : 'Hem just reaches the floor — a slight break over a shoe.'; }
        else if (hemY > -9) { v = 'Long — stacks'; d = `${unit(-hemY)} longer than the leg: the fabric stacks at the ankle.`; tone = 'neutral'; }
        else { v = 'Too long'; d = `${unit(-hemY)} longer than the leg — needs hemming.`; tone = 'warn'; }
        push(lengthZone('inseam', 'Inseam', inseam, v, d, tone, { easeCm: -hemY }));
      }

      result.lower = { waistbandY, crotchY: crotchG, hemY, pelvisCircAt, legRadiusAt };
      const tk: Array<[number, number]> = [[waistbandY, scoreOf('waist') ?? 0]];
      if (hipCovered && scoreOf('hip') !== undefined) tk.push([lm.hipY, scoreOf('hip')!]);
      result.torsoScoreAt = pchipFromKnots(tk, 1);
      const lgk: Array<[number, number]> = [[thighY, scoreOf('thigh') ?? 0]];
      if (scoreOf('hip') !== undefined) lgk.push([thighY + 8, scoreOf('hip')!]);
      if (scoreOf('knee') !== undefined) lgk.push([lm.kneeY, scoreOf('knee')!]);
      if (scoreOf('calf') !== undefined) lgk.push([lerp(lm.ankleY, lm.kneeY, 0.7), scoreOf('calf')!]);
      result.legScoreAt = pchipFromKnots(lgk, 1);
    }
  }

  // ----------------------------------------------------------------- shoes
  if (slot === 'shoes') {
    const fl = dims.footLength!;
    // fl.cm is the inside length of the shoe: a foot needs about 1-1.5 cm in front of the toes.
    const room = fl.cm - m.footLength;
    const v = room < 0.3 ? 'Too small' : room < 0.8 ? 'Tight' : room < 1.7 ? 'Good length' : room < 2.5 ? 'Roomy' : 'Too big';
    const made = fl.bodyRange ? ` This size is made for a ${unit((fl.bodyRange[0] + fl.bodyRange[1]) / 2)} foot.` : '';
    push(lengthZone('foot', 'Foot length', fl, v,
      (room < 0 ? `The foot is ${unit(-room)} longer than the inside of the shoe.` : `${unit(room)} of room in front of the toes.`) + made,
      room < 0.3 || room >= 2.5 ? 'bad' : room < 0.8 || room >= 1.7 ? 'warn' : 'good',
      { bodyCm: m.footLength, easeCm: room, score: room < 0.3 ? -2.5 : room < 0.8 ? -1.5 : room < 1.7 ? 0 : room < 2.5 ? 1.5 : 2.5 }));
    result.shoe = { lengthCm: Math.max(fl.cm, m.footLength + 0.3) };
  }

  result.overall = summarise(zones, g);
  return result;
}

const joinWords = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

function summarise(zones: Zone[], g: Garment): Overall {
  const judged = zones.filter((z) => z.judged);
  const girths = judged.filter((z) => z.kind === 'girth' && z.score !== undefined);
  let cost = 0;
  const target = INTENT_SCORE[g.fitIntent];
  for (const z of girths) {
    const s = z.score!;
    const lowerLeg = z.id === 'knee' || z.id === 'calf' || z.id === 'forearm' || z.id === 'hem';
    if (s < -2) cost += 100 + (-2 - s) * 40;
    else if (s < -1) cost += 12 + (-1 - s) * 30;
    else cost += Math.abs(s - target) * (lowerLeg ? 0.5 : 2);
    if (z.id === 'waist' && z.verdict === 'Too big') cost += 40;
    if (z.id === 'waist' && z.verdict.startsWith('Loose')) cost += 8;
  }
  for (const z of judged) {
    if (z.kind !== 'length') continue;
    if (z.tone === 'bad') cost += 30;
    else if (z.tone === 'warn') cost += 6;
    else if (z.tone === 'neutral' && (z.id === 'sleeve' || z.id === 'inseam') && /short|long|stack/i.test(z.verdict)) cost += 2;
  }
  const names = (zs: Zone[]) => joinWords(zs.map((z) => z.label.toLowerCase()));
  const bad = judged.filter((z) => z.tone === 'bad');
  const small = bad.filter((z) => z.status === 'too-small' || /small|narrow/i.test(z.verdict));
  const big = bad.filter((z) => !small.includes(z));
  const warn = judged.filter((z) => z.tone === 'warn');
  const tight = warn.filter((z) => z.status === 'tight' || /narrow|tight/i.test(z.verdict));
  if (!judged.length) {
    return { level: 'unknown', headline: 'No size-chart measurements to judge — add them for a real fit check', cost: 50 };
  }
  if (small.length) return { level: 'too-small', headline: `Too small at the ${names(small)}`, cost };
  if (big.length) return { level: 'loose', headline: `Too big at the ${names(big)}`, cost };
  if (tight.length) return { level: 'tight', headline: `Tight at the ${names(tight)}`, cost };
  const avg = girths.length ? girths.reduce((a, z) => a + z.score!, 0) / girths.length : 0;
  let level: Overall['level'] = 'good';
  let headline = 'Good fit — comfortable ease';
  if (avg > 1.6) { level = 'loose'; headline = 'Oversized all over'; }
  else if (avg > 0.9) { level = 'loose'; headline = 'Loose, relaxed fit'; }
  else if (avg < -0.4) headline = 'Good fit — close to the body';
  const others = warn.filter((z) => !tight.includes(z));
  if (others.length) {
    const lead = level === 'loose' ? headline.split(',')[0] : 'Fits';
    headline = `${lead}, but ${others.map((z) => `${z.label.toLowerCase()} ${z.verdict.toLowerCase().replace(/^loose — /, '')}`).join('; ')}`;
  }
  return { level, headline, cost };
}

/** Run the fit for every size in the chart and return the best one. */
export function recommendSize(
  body: BodyModel,
  g: Garment,
  base: Base,
): { size: string; cost: number } | null {
  let best: { size: string; cost: number } | null = null;
  for (const row of g.chart.rows) {
    const r = fitGarment(body, g, { size: row.label }, base);
    if (r.overall.level === 'unknown') return null;
    if (!best || r.overall.cost < best.cost - 1e-6) best = { size: row.label, cost: r.overall.cost };
  }
  return best;
}
