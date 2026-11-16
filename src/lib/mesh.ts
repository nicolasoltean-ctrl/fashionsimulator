/**
 * Mesh construction for the mannequin and for garments, as plain arrays so it
 * can be tested without a renderer.
 */
import type { BodyModel } from './body';
import {
  COS,
  N_THETA,
  SIN,
  clamp,
  hullRadialOfPoints,
  lerp,
  lerpRadial,
  perimeter,
  smoothstep,
  type Radial,
} from './geom';
import type { Base, FitResult } from './garments/fit';
import type { LayerStack } from './garments/layers';
import type { Category, Neckline } from './garments/types';

export interface MeshData {
  positions: number[];
  indices: number[];
  /** Per-vertex fit score (see fit.ts). Garments only. */
  scores: number[];
}

type V3 = [number, number, number];
const TAU = Math.PI * 2;
const LIMB_SEG = 32;

class Builder implements MeshData {
  positions: number[] = [];
  indices: number[] = [];
  scores: number[] = [];

  vertex(x: number, y: number, z: number, score = 0): number {
    this.positions.push(x, y, z);
    this.scores.push(score);
    return this.positions.length / 3 - 1;
  }

  /** Join two closed rings of equal length. */
  stitch(a: number[], b: number[], flip = false) {
    const n = a.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (flip) this.indices.push(a[i], a[j], b[i], a[j], b[j], b[i]);
      else this.indices.push(a[i], b[i], a[j], a[j], b[i], b[j]);
    }
  }

  fan(centre: number, ring: number[], flip = false) {
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (flip) this.indices.push(centre, ring[j], ring[i]);
      else this.indices.push(centre, ring[i], ring[j]);
    }
  }

  /** Horizontal ring from a radial. */
  radialRing(r: Radial, y: number, cz: number, score = 0): number[] {
    const out: number[] = [];
    for (let i = 0; i < N_THETA; i++) out.push(this.vertex(r[i] * COS[i], y, r[i] * SIN[i] + cz, score));
    return out;
  }

  /** Circular ring around `centre`, in the plane spanned by u and w. */
  circle(centre: V3, u: V3, w: V3, radius: number, score = 0, seg = LIMB_SEG): number[] {
    const out: number[] = [];
    for (let k = 0; k < seg; k++) {
      const t = (k / seg) * TAU;
      const c = Math.cos(t) * radius;
      const s = Math.sin(t) * radius;
      out.push(this.vertex(centre[0] + u[0] * c + w[0] * s, centre[1] + u[1] * c + w[1] * s, centre[2] + u[2] * c + w[2] * s, score));
    }
    return out;
  }

  ellipsoid(centre: V3, ax: V3, ay: V3, az: V3, floorY = -Infinity, lat = 16, lon = 28) {
    let prev: number[] | null = null;
    for (let i = 0; i <= lat; i++) {
      const phi = (i / lat) * Math.PI - Math.PI / 2;
      const cy = Math.sin(phi);
      const cr = Math.max(Math.cos(phi), 0.02);
      const ring: number[] = [];
      for (let k = 0; k < lon; k++) {
        const t = (k / lon) * TAU;
        const cx = Math.cos(t) * cr;
        const cz = Math.sin(t) * cr;
        ring.push(
          this.vertex(
            centre[0] + ax[0] * cx + ay[0] * cy + az[0] * cz,
            Math.max(floorY, centre[1] + ax[1] * cx + ay[1] * cy + az[1] * cz),
            centre[2] + ax[2] * cx + ay[2] * cy + az[2] * cz,
          ),
        );
      }
      if (prev) this.stitch(prev, ring);
      prev = ring;
    }
  }
}

function range(from: number, to: number, step: number): number[] {
  const n = Math.max(1, Math.ceil((to - from) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(lerp(from, to, i / n));
  return out;
}

/** Arm axis frame for one side (+1 / -1). */
function armFrame(body: BodyModel, side: number) {
  const o = body.arm.origin;
  const d = body.arm.dir;
  const origin: V3 = [o[0] * side, o[1], o[2]];
  const dir: V3 = [d[0] * side, d[1], d[2]];
  const u: V3 = [-d[1] * side, d[0], 0];
  const w: V3 = [0, 0, 1];
  const at = (s: number): V3 => [origin[0] + dir[0] * s, origin[1] + dir[1] * s, origin[2] + dir[2] * s];
  return { origin, dir, u, w, at };
}

/**
 * Tube along the arm from a rounded cap at the shoulder to `end`. `sagAt`
 * shifts the tube toward the underside of the arm: a sleeve rests on top of
 * the arm and its spare width hangs below, rather than standing off all round.
 */
function armTube(
  b: Builder,
  body: BodyModel,
  side: number,
  end: number,
  radiusAt: (s: number) => number,
  scoreAt: (s: number) => number,
  step = 1.5,
  sagAt: (s: number) => number = () => 0,
) {
  const f = armFrame(body, side);
  const centre = (s: number): V3 => {
    const p = f.at(s);
    const sag = sagAt(Math.max(s, 0));
    return [p[0] - f.u[0] * sag, p[1] - f.u[1] * sag, p[2]];
  };
  const r0 = radiusAt(0);
  let prev: number[] | null = null;
  const CAP = 6;
  for (let k = 0; k < CAP; k++) {
    const phi = (1 - k / CAP) * (Math.PI / 2);
    const ring = b.circle(centre(-r0 * Math.sin(phi)), f.u, f.w, Math.max(0.05, r0 * Math.cos(phi)), scoreAt(0));
    if (prev) b.stitch(prev, ring, side > 0);
    prev = ring;
  }
  for (const s of range(0, end, step)) {
    const ring = b.circle(centre(s), f.u, f.w, radiusAt(s), scoreAt(s));
    if (prev) b.stitch(prev, ring, side > 0);
    prev = ring;
  }
}

// ---------------------------------------------------------------- mannequin

export function buildBodyMesh(body: BodyModel): MeshData {
  const b = new Builder();
  const lm = body.lm;

  // Torso and neck
  const ys = [
    ...range(body.torsoBottomY, lm.shoulderY - 3, 1),
    ...range(lm.shoulderY - 3, lm.napeY + 4, 0.5).slice(1),
    ...range(lm.napeY + 4, body.torsoTopY, 1).slice(1),
  ];
  let prev: number[] | null = null;
  for (const y of ys) {
    const ring = b.radialRing(body.skinAt(y), y, body.czAt(y));
    if (prev) b.stitch(prev, ring);
    else b.fan(b.vertex(0, y - 0.4, 0), ring, true);
    prev = ring;
  }
  b.fan(b.vertex(0, body.torsoTopY, body.czAt(body.torsoTopY)), prev!);

  for (const side of [1, -1]) {
    // Leg
    const cx = body.leg.x * side;
    let lp: number[] | null = null;
    for (const y of range(0, body.leg.topY, 1.5)) {
      const ring = b.circle([cx, y, 0], [1, 0, 0], [0, 0, 1], body.leg.radiusAt(y));
      if (lp) b.stitch(lp, ring);
      lp = ring;
    }
    // Foot
    const ft = body.foot;
    b.ellipsoid([cx, ft.height * 0.42, ft.length * 0.23], [ft.width / 2, 0, 0], [0, ft.height * 0.6, 0], [0, 0, ft.length / 2], 0);

    // Arm and hand
    armTube(b, body, side, body.arm.length + 1.5, body.arm.radiusAt, () => 0);
    const f = armFrame(body, side);
    const k = (body.m.wrist / 17 + body.m.height / 178) / 2;
    const hc = f.at(body.arm.length + 8.2 * k);
    b.ellipsoid(hc, [f.u[0] * 1.9 * k, f.u[1] * 1.9 * k, 0], [f.dir[0] * 9.6 * k, f.dir[1] * 9.6 * k, 0], [0, 0, 4.3 * k]);
  }

  // Head
  const h = body.head;
  b.ellipsoid(h.center, [h.radii[0], 0, 0], [0, h.radii[1], 0], [0, 0, h.radii[2]], -Infinity, 32, 48);
  return b;
}

// ------------------------------------------------------------------ garments

const THICKNESS: Record<Category, number> = {
  tank: 0.2, tee: 0.25, shirt: 0.25, dress: 0.3, sweater: 0.6, jacket: 0.7, coat: 0.9,
  pants: 0.4, shorts: 0.35, skirt: 0.3, shoes: 0.5,
};

/** Base surface sampled once per garment so tilted rows and covers stay cheap. */
function wrapTable(base: Base, y0: number, y1: number) {
  const from = Math.floor(y0);
  const rows: Radial[] = [];
  for (let y = from; y <= Math.ceil(y1) + 1; y++) rows.push(base.wrapAt(y));
  const at = (y: number): Radial => {
    const f = clamp(y - from, 0, rows.length - 1.0001);
    const j = Math.floor(f);
    return lerpRadial(rows[j], rows[j + 1], f - j);
  };
  const val = (y: number, i: number): number => {
    const f = clamp(y - from, 0, rows.length - 1.0001);
    const j = Math.floor(f);
    return lerp(rows[j][i], rows[j + 1][i], f - j);
  };
  return { at, val };
}

function sampled(fn: (p: number) => number, from: number, to: number): (p: number) => number {
  const lo = Math.floor(from);
  const vals: number[] = [];
  for (let p = lo; p <= Math.ceil(to) + 1; p++) vals.push(fn(p));
  return (p: number) => {
    const f = clamp(p - lo, 0, vals.length - 1.0001);
    const j = Math.floor(f);
    return lerp(vals[j], vals[j + 1], f - j);
  };
}

/** Soft vertical folds; returns roughly -1..1. */
function fold(i: number, y: number, seed: number): number {
  const t = (i / N_THETA) * TAU;
  return (
    (Math.sin(9 * t + 0.5 * Math.sin(y * 0.19 + seed) + seed) + 0.45 * Math.sin(5 * t - 0.4 * Math.sin(y * 0.13) + seed * 2.1)) / 1.45
  );
}

/**
 * Radius multiplier for cloth with ease ratio `e` (garment girth / body girth
 * - 1). Cloth smaller than the body is stretched onto it; cloth larger than
 * the body stands off it and, lower down, breaks into folds.
 */
function drape(e: number, i: number, y: number, foldWeight: number, seed: number): number {
  if (e <= 0) return 1;
  const amp = Math.min(e * 0.3, 0.11) * foldWeight;
  return 1 + e - amp + amp * fold(i, y, seed);
}

interface HungRow {
  y: number;
  /** Cloth envelope before folds. */
  env: Radial;
  /** Ease of the cloth over that envelope (0 when the cloth is pulled in). */
  ease: number;
}

/**
 * Lay cloth of girth `circAt(y)` over the base surface from `topY` down to
 * `bottomY`. Cloth falls nearly straight from whatever stands proud above it
 * (bust, stomach, seat), so it bridges hollows instead of following them —
 * unless the garment is too narrow at that level, in which case it is pulled
 * in toward the body.
 */
function hang(
  tab: { at(y: number): Radial },
  topY: number,
  bottomY: number,
  circAt: (y: number) => number,
  cling: (y: number) => number = () => 0,
): HungRow[] {
  const ys = range(bottomY, topY, 1.2);
  const rows: HungRow[] = new Array(ys.length);
  const FALL = 0.12; // how fast hanging cloth may drift back toward the body, cm per cm
  let hung: Radial | null = null;
  for (let k = ys.length - 1; k >= 0; k--) {
    const y = ys[k];
    const base = tab.at(y);
    if (!hung) hung = base;
    else {
      const dy = ys[k + 1] - y;
      const next = new Float64Array(N_THETA);
      for (let i = 0; i < N_THETA; i++) next[i] = Math.max(base[i], hung[i] - FALL * dy);
      hung = next;
    }
    const c = cling(y);
    const env = new Float64Array(N_THETA);
    const target = c > 0 ? lerpRadial(hung, base, c) : hung;
    const girth = circAt(y);
    const pHung = perimeter(target);
    let ease = 0;
    if (girth >= pHung) {
      ease = (girth / pHung - 1) * (1 - c);
      env.set(target);
    } else {
      const pBase = perimeter(base);
      const t = pHung - pBase > 1e-6 ? clamp((girth - pBase) / (pHung - pBase), 0, 1) : 0;
      for (let i = 0; i < N_THETA; i++) env[i] = base[i] + (target[i] - base[i]) * t;
      // Pulled-in cloth becomes the new line the rest hangs from.
      hung = env;
    }
    rows[k] = { y, env, ease };
  }
  return rows;
}

/** Interpolate the unfolded envelope of hung rows, as a layer cover. */
function hungCover(rows: HungRow[], thickness: number): (y: number) => Radial {
  return (y: number) => {
    const n = rows.length;
    let j = 0;
    while (j < n - 2 && rows[j + 1].y < y) j++;
    const a = rows[j];
    const b = rows[Math.min(j + 1, n - 1)];
    const t = b.y > a.y ? clamp((y - a.y) / (b.y - a.y), 0, 1) : 0;
    const out = new Float64Array(N_THETA);
    const k = 1 + lerp(a.ease, b.ease, t) * 0.7;
    for (let i = 0; i < N_THETA; i++) out[i] = lerp(a.env[i], b.env[i], t) * k + thickness;
    return out;
  };
}

const NECK: Record<Neckline, { side: number; front: number; back: number; power: number }> = {
  crew: { side: 0.6, front: 4, back: 1.2, power: 1.6 },
  vneck: { side: 1.2, front: 15, back: 1.4, power: 3.2 },
  scoop: { side: 3.5, front: 11, back: 3, power: 1.1 },
  collar: { side: 0.2, front: 2.6, back: 0.4, power: 1.6 },
  turtle: { side: 0, front: 1.2, back: 0, power: 1.6 },
};

function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h / 997) * TAU;
}

/**
 * Build a garment over the current layer stack and add its outer surface to
 * the stack. `tucked` gathers a top in below the waist.
 */
export function buildGarmentMesh(body: BodyModel, fit: FitResult, stack: LayerStack, tucked = false): MeshData {
  const b = new Builder();
  const g = fit.garment;
  const t = THICKNESS[g.category];
  const lm = body.lm;
  const seed = seedOf(g.id);

  if (fit.upper) {
    const up = fit.upper;
    // A tucked tail is folded away inside the trousers.
    const hemY = Math.max(up.hemY, tucked ? lm.crotchY + 5 : 0.8);
    const neckY = lm.napeY + 0.5;
    const tab = wrapTable(stack, Math.min(hemY, lm.chestY) - 1, lm.napeY + 10);
    const baseCirc = sampled((y) => perimeter(tab.at(y)), Math.min(hemY, lm.chestY) - 1, lm.napeY + 2);
    const chestE = up.circAt(lm.chestY) / baseCirc(lm.chestY) - 1;
    const shoulderE = Math.max(0, up.shoulderScale - 1);
    // Above the chest the garment follows the shoulders; ease blends from the
    // chest to the shoulder seam and closes at the neckline.
    const easeAbove = (y: number): number => {
      if (y <= lm.shoulderY) return lerp(Math.max(chestE, 0), shoulderE, clamp((y - lm.chestY) / (lm.shoulderY - lm.chestY), 0, 1));
      return lerp(shoulderE, 0, clamp((y - lm.shoulderY) / Math.max(neckY - lm.shoulderY, 0.5), 0, 1));
    };
    const foldW = (y: number) => smoothstep(lm.chestY + 2, lm.chestY - 22, y);
    const cling = tucked ? (y: number) => 1 - smoothstep(lm.waistY - 3, lm.waistY + 7, y) : undefined;
    const body_ = hemY < lm.chestY ? hang(tab, lm.chestY, hemY, up.circAt, cling) : [];

    let prev: number[] | null = null;
    for (const row of body_) {
      const ring: number[] = [];
      const cz = body.czAt(row.y);
      const score = fit.torsoScoreAt(row.y);
      const fw = foldW(row.y);
      for (let i = 0; i < N_THETA; i++) {
        const r = row.env[i] * drape(row.ease, i, row.y, fw, seed) + t;
        ring.push(b.vertex(r * COS[i], row.y, r * SIN[i] + cz, score));
      }
      if (prev) b.stitch(prev, ring);
      prev = ring;
    }
    const addRow = (yOf: (i: number) => number) => {
      const ring: number[] = [];
      for (let i = 0; i < N_THETA; i++) {
        const y = yOf(i);
        const r = tab.val(y, i) * (1 + easeAbove(y)) + t;
        ring.push(b.vertex(r * COS[i], y, r * SIN[i] + body.czAt(y), fit.torsoScoreAt(y)));
      }
      if (prev) b.stitch(prev, ring);
      prev = ring;
      return ring;
    };
    if (!body_.length) addRow(() => lm.chestY);

    const nk = NECK[up.neckline];
    const top = new Float64Array(N_THETA);
    for (let i = 0; i < N_THETA; i++) {
      const front = Math.pow(Math.max(0, SIN[i]), nk.power);
      const back = Math.pow(Math.max(0, -SIN[i]), 2);
      top[i] = Math.max(lm.chestY + 3, neckY - nk.side - (nk.front - nk.side) * front - (nk.back - nk.side) * back);
    }
    const ROWS = 28;
    for (let k = 1; k <= ROWS; k++) addRow((i) => lerp(lm.chestY, top[i], k / ROWS));

    if (up.neckline === 'turtle' || up.neckline === 'collar') {
      const turtle = up.neckline === 'turtle';
      const height = turtle ? Math.min(7, lm.chinY - neckY + 1.5) : 3.4;
      const steps = turtle ? 5 : 3;
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        const ring: number[] = [];
        for (let i = 0; i < N_THETA; i++) {
          const y = top[i] + height * f;
          const r = tab.val(y, i) + t + (turtle ? 0.35 : 0.3 + 0.9 * f);
          ring.push(b.vertex(r * COS[i], y, r * SIN[i] + body.czAt(y), fit.torsoScoreAt(lm.shoulderY)));
        }
        b.stitch(prev!, ring);
        prev = ring;
      }
    }

    // Covers use the unfolded envelope: an outer layer flattens the folds.
    const lowerCover = body_.length ? hungCover(body_, t) : null;
    stack.addTorso(hemY, neckY, (y) => {
      if (lowerCover && y <= lm.chestY) return lowerCover(y);
      const r = tab.at(y);
      const k = 1 + easeAbove(y) * 0.7;
      for (let i = 0; i < N_THETA; i++) r[i] = r[i] * k + t;
      return r;
    });

    if (up.sleeves !== 'none') {
      const arm = body.arm;
      const end = Math.min(up.sleeveEndS, arm.length + 4.5);
      const excess = up.sleeveEndS - end;
      const baseArm = sampled(stack.armRadiusAt, -4, arm.length + 8);
      const radiusAt = (s: number) => {
        let r = Math.max(up.sleeveRadiusAt(s), baseArm(s)) + t;
        if (excess > 0.5) {
          // Extra length bunches above the cuff.
          const w = smoothstep(end - (excess * 2 + 4), end, s) * Math.min(1, excess / 5);
          r *= 1 + 0.07 * w * Math.sin((s - end) * 2.2);
        }
        return r;
      };
      const sagAt = (s: number) => Math.max(0, radiusAt(s) - baseArm(s) - t) * 0.85;
      for (const side of [1, -1]) armTube(b, body, side, end, radiusAt, fit.sleeveScoreAt, 1.2, sagAt);
      stack.addArm(-4, end, sampled((s) => Math.max(up.sleeveRadiusAt(s), baseArm(s)) + t, -4, end));
    }
  }

  if (fit.skirt) {
    const sk = fit.skirt;
    const hemY = Math.max(sk.hemY, 0.8);
    const tab = wrapTable(stack, hemY - 1, sk.waistbandY + 1);
    const rows = hang(tab, sk.waistbandY, hemY, sk.circAt);
    const foldW = (y: number) => smoothstep(lm.hipY + 3, lm.hipY - 14, y);
    let prev: number[] | null = null;
    for (const row of rows) {
      const ring: number[] = [];
      const cz = body.czAt(row.y);
      const score = fit.torsoScoreAt(row.y);
      const fw = foldW(row.y);
      for (let i = 0; i < N_THETA; i++) {
        const r = row.env[i] * drape(row.ease, i, row.y, fw, seed) + t;
        ring.push(b.vertex(r * COS[i], row.y, r * SIN[i] + cz, score));
      }
      if (prev) b.stitch(prev, ring);
      prev = ring;
    }
    stack.addTorso(hemY, sk.waistbandY, hungCover(rows, t));
  }

  if (fit.lower) {
    const lo = fit.lower;
    const leg = body.leg;
    const hemY = Math.max(lo.hemY, 1.2);
    const excess = hemY - lo.hemY;
    const tab = wrapTable(stack, lo.crotchY - 2, lo.waistbandY + 1);
    const baseCirc = sampled((y) => perimeter(tab.at(y)), lo.crotchY - 2, lo.waistbandY + 1);
    const pelvisEase = (y: number) => Math.max(0, lo.pelvisCircAt(y) / baseCirc(y) - 1);

    // Legs
    const baseLeg = sampled(stack.legRadiusAt, 0, lo.crotchY + 4);
    const seatK = 1 + pelvisEase(lo.crotchY);
    const seatHalf = tab.val(lo.crotchY, 0) * seatK + t;
    const legOuter = (y: number) => {
      let r = Math.max(lo.legRadiusAt(y), baseLeg(y)) + t;
      // Blend into the seat so a wide leg does not stand proud of the hip.
      const limit = Math.max(baseLeg(y) + t, seatHalf - leg.x + 0.4);
      r = lerp(r, Math.min(r, limit), smoothstep(lo.crotchY - 9, lo.crotchY - 1, y));
      if (excess > 0.5) {
        const w = smoothstep(hemY + excess * 2.2 + 4, hemY, y) * Math.min(1, excess / 6);
        r *= 1 + 0.035 * w * Math.sin((y - hemY) * 1.7) * (1 + 0.5 * Math.sin(y * 0.9));
      }
      return r;
    };
    const topY = lo.crotchY + 1.5;
    for (const side of [1, -1]) {
      let lp: number[] | null = null;
      for (const y of range(hemY, topY, 1.2)) {
        const ring = b.circle([leg.x * side, y, 0], [1, 0, 0], [0, 0, 1], legOuter(y), fit.legScoreAt(y));
        if (lp) b.stitch(lp, ring);
        lp = ring;
      }
    }
    const aroundLegs = (y: number): Radial => {
      const r = legOuter(y);
      const pts: Array<[number, number]> = [];
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * TAU;
        pts.push([leg.x + r * Math.cos(a), r * Math.sin(a)], [-leg.x + r * Math.cos(a), r * Math.sin(a)]);
      }
      return hullRadialOfPoints(pts);
    };

    // Seat and waistband. Below the crotch the seat eases into the thighs
    // instead of stopping in a ledge.
    const blend = clamp(lo.crotchY - hemY - 1, 0, 12);
    const seat = tab.at(lo.crotchY);
    let prev: number[] | null = null;
    const pelvisYs = [...(blend > 1 ? range(lo.crotchY - blend, lo.crotchY, 1).slice(0, -1) : []), ...range(lo.crotchY, lo.waistbandY, 1)];
    for (const y of pelvisYs) {
      const ring: number[] = [];
      const cz = body.czAt(y);
      if (y < lo.crotchY) {
        const legs = aroundLegs(y);
        const w = smoothstep(lo.crotchY, lo.crotchY - blend, y);
        const score = fit.legScoreAt(y);
        for (let i = 0; i < N_THETA; i++) {
          const r = Math.max(legs[i], lerp(seat[i] * seatK + t, legs[i], w)) + 0.02;
          ring.push(b.vertex(r * COS[i], y, r * SIN[i] + cz, score));
        }
      } else {
        const base = tab.at(y);
        const k = 1 + pelvisEase(y);
        const score = fit.torsoScoreAt(y);
        for (let i = 0; i < N_THETA; i++) {
          const r = base[i] * k + t;
          ring.push(b.vertex(r * COS[i], y, r * SIN[i] + cz, score));
        }
      }
      if (prev) b.stitch(prev, ring);
      prev = ring;
    }

    const legCover = sampled(legOuter, hemY, topY);
    stack.addLeg(hemY, topY, legCover);
    stack.addTorso(lo.crotchY, lo.waistbandY, (y) => {
      const r = tab.at(y);
      const k = 1 + pelvisEase(y);
      for (let i = 0; i < N_THETA; i++) r[i] = r[i] * k + t;
      return r;
    });
    // Below the crotch, anything worn over the trousers wraps both legs.
    stack.addTorso(hemY, lo.crotchY - 0.01, (y) => aroundLegs(y));
  }

  if (fit.shoe) {
    const ft = body.foot;
    const len = fit.shoe.lengthCm + 1.2;
    const score = fit.zones.find((z) => z.id === 'foot')?.score ?? 0;
    for (const side of [1, -1]) {
      const start = b.scores.length;
      b.ellipsoid(
        [body.leg.x * side, ft.height * 0.5, ft.length * 0.23 + (len - ft.length) / 2 - 0.4],
        [ft.width / 2 + 0.9, 0, 0], [0, ft.height * 0.66 + 0.6, 0], [0, 0, len / 2], 0, 12, 22,
      );
      for (let i = start; i < b.scores.length; i++) b.scores[i] = score;
    }
  }

  return b;
}
