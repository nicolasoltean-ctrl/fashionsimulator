/**
 * Parametric mannequin. Converts a set of tailoring measurements into a body
 * description that both the renderer and the garment/fit engine consume.
 *
 * Coordinates are centimetres: y is up from the floor, x is the figure's side,
 * z is forward. Circumference measurements are honoured exactly: each key
 * cross-section is solved so that a tape measure around it reads the requested
 * value.
 */
import {
  COS,
  N_THETA,
  SIN,
  clamp,
  hullRadial,
  hullRadialOfPoints,
  lerp,
  lerpRadial,
  pchip,
  pchipFromKnots,
  perimeter,
  radialPoints,
  superellipse,
  type Radial,
} from './geom';
import { MIN_HEAD_AND_NECK, type Measurements } from './measurements';

export interface Landmarks {
  ankleY: number;
  kneeY: number;
  crotchY: number;
  hipY: number;
  highHipY: number;
  waistY: number;
  underbustY: number;
  chestY: number;
  shoulderY: number;
  napeY: number;
  /** High point shoulder: where the shoulder seam meets the neck. */
  hpsY: number;
  chinY: number;
  topY: number;
}

export interface ArmModel {
  /** Shoulder joint for the +x side; mirror x for the other arm. */
  origin: [number, number, number];
  /** Unit direction of the arm axis for the +x side. */
  dir: [number, number, number];
  /** Distance along the axis from the joint to the wrist. */
  length: number;
  radiusAt(s: number): number;
}

export interface LegModel {
  /** x of the leg axis for the +x side. */
  x: number;
  /** Top of the leg tube (hidden inside the pelvis). */
  topY: number;
  radiusAt(y: number): number;
}

export interface BodyModel {
  m: Measurements;
  lm: Landmarks;
  /** Vertical extent of the torso + neck surface. */
  torsoBottomY: number;
  torsoTopY: number;
  /** Torso skin cross-section (with bust/seat shaping), for rendering. */
  skinAt(y: number): Radial;
  /**
   * Forward offset of the torso centreline at height y (posture: the spine's
   * gentle S-curve). Every torso cross-section, skin or cloth, is shifted by it.
   */
  czAt(y: number): number;
  /**
   * What fabric or a tape measure wraps around at height y: the convex outline
   * of the torso, or of both legs together below the crotch.
   */
  wrapAt(y: number): Radial;
  /** Tape-measure circumference at height y. */
  circAt(y: number): number;
  arm: ArmModel;
  leg: LegModel;
  head: { center: [number, number, number]; radii: [number, number, number] };
  foot: { length: number; width: number; height: number };
}

const TAU = Math.PI * 2;
const TABLE_STEP = 1;

/** Sum of two angular gaussians centred `spread` either side of `centre` (radians). */
function twinBump(i: number, centre: number, spread: number, sigma: number): number {
  const t = (i / N_THETA) * TAU;
  const g = (c: number) => {
    let d = Math.abs(t - c) % TAU;
    if (d > Math.PI) d = TAU - d;
    return Math.exp(-((d / sigma) ** 2));
  };
  return g(centre - spread) + g(centre + spread);
}

const BUST_SHAPE = new Float64Array(N_THETA);
const SEAT_SHAPE = new Float64Array(N_THETA);
for (let i = 0; i < N_THETA; i++) {
  BUST_SHAPE[i] = twinBump(i, Math.PI / 2, (27 * Math.PI) / 180, (17 * Math.PI) / 180);
  SEAT_SHAPE[i] = twinBump(i, (3 * Math.PI) / 2, (30 * Math.PI) / 180, (25 * Math.PI) / 180);
}

export function buildBody(m: Measurements): BodyModel {
  // ---- vertical landmarks -------------------------------------------------
  const crotchY = m.inseam;
  const waistY = crotchY + m.rise;
  const hipY = waistY - clamp(m.waistToHip, 6, m.rise - 5);
  const highHipY = lerp(waistY, hipY, 0.45);
  const napeY = waistY + m.backWaist;
  const shoulderY = napeY - m.shoulderDrop;
  const chestY = waistY + 0.5 * m.backWaist;
  const underbustY = waistY + 0.32 * m.backWaist;
  const topY = Math.max(m.height, napeY + MIN_HEAD_AND_NECK);
  const headH = clamp(0.405 * m.head, 17, topY - napeY - 0.5);
  const chinY = topY - headH;
  const kneeY = clamp(m.kneeHeight, crotchY * 0.4, crotchY * 0.8);
  const ankleY = 8;
  const lm: Landmarks = {
    ankleY, kneeY, crotchY, hipY, highHipY, waistY, underbustY, chestY,
    shoulderY, napeY, hpsY: napeY + 1, chinY, topY,
  };

  // ---- soft-tissue shaping ------------------------------------------------
  const bustAmp = clamp((m.chest - m.underbust - 10) * 0.55, 0, 14);
  const seatAmp = clamp((m.hip - m.highHip) * 0.22 + 0.8, 0.4, 5);
  const bustAt = (y: number) => {
    const sigma = y < chestY ? 6 : 7.5;
    return bustAmp * Math.exp(-(((y - chestY) / sigma) ** 2));
  };
  const seatAt = (y: number) => seatAmp * Math.exp(-(((y - hipY) / 7.5) ** 2));
  const shape = (y: number, a: number, b: number, n: number): Radial => {
    const r = superellipse(a, b, n);
    const bu = bustAt(y);
    const se = seatAt(y);
    if (bu > 0.01 || se > 0.01) {
      for (let i = 0; i < N_THETA; i++) r[i] += bu * BUST_SHAPE[i] + se * SEAT_SHAPE[i];
    }
    return r;
  };

  /** Solve the side semi-axis so the tape circumference at this level is `circ`. */
  const solve = (y: number, circ: number, k: number, n: number): [number, number] => {
    let a = circ / perimeter(superellipse(1, k, n));
    for (let it = 0; it < 6; it++) {
      const len = perimeter(hullRadial(shape(y, a, a * k, n)));
      a *= circ / len;
    }
    return [a, a * k];
  };

  // ---- limbs --------------------------------------------------------------
  const R = (circ: number) => circ / TAU;
  const armTopR = R(m.bicep) * 1.1;
  const jointX = m.shoulderWidth / 2 - armTopR * 0.75;
  const jointY = shoulderY - armTopR;
  const armAngle = (24 * Math.PI) / 180;
  const armLen = Math.max(20, m.armLength - 2);
  const armRadius = pchip(
    [-2, 0.25 * armLen, 0.52 * armLen, 0.66 * armLen, armLen, armLen + 3],
    [armTopR, R(m.bicep), R(m.elbow), R(m.forearm), R(m.wrist), R(m.wrist) * 0.98],
  );
  const arm: ArmModel = {
    origin: [jointX, jointY, 0],
    dir: [Math.sin(armAngle), -Math.cos(armAngle), 0],
    length: armLen,
    radiusAt: armRadius,
  };

  // ---- torso key sections -------------------------------------------------
  const [hipA, hipB] = solve(hipY, m.hip, 0.72, 2.4);
  const [hhA, hhB] = solve(highHipY, m.highHip, 0.74, 2.3);
  const [waA, waB] = solve(waistY, m.waist, 0.78, 2.2);
  const [ubA, ubB] = solve(underbustY, m.underbust, 0.74, 2.3);
  const [chA, chB] = solve(chestY, m.chest, 0.72, 2.4);
  const neckR = R(m.neck);
  const shA = jointX + 0.5;
  const shB = Math.max(chB * 0.52, neckR * 1.45);
  const upperChestY = lerp(chestY, shoulderY, 0.55);
  const neckBaseY = napeY + 0.5;
  const neckTopY = Math.max(chinY + 0.3 * headH, napeY + 6);
  const [nkA, nkB] = solve(napeY + 3, m.neck, 0.96, 2);
  // The torso ends exactly at the crotch, so the inseam is honoured.
  const capY = crotchY;

  const keys: Array<{ y: number; a: number; b: number; n: number }> = [
    { y: capY, a: hipA * 0.8, b: hipB * 0.7, n: 2.3 },
    { y: crotchY + 2.5, a: hipA * 0.975, b: hipB * 0.82, n: 2.4 },
    { y: hipY, a: hipA, b: hipB, n: 2.4 },
    { y: highHipY, a: hhA, b: hhB, n: 2.3 },
    { y: waistY, a: waA, b: waB, n: 2.2 },
    { y: underbustY, a: ubA, b: ubB, n: 2.3 },
    { y: chestY, a: chA, b: chB, n: 2.4 },
    { y: upperChestY, a: lerp(chA, shA, 0.72), b: chB * 0.87, n: 2.3 },
    { y: shoulderY, a: shA, b: shB, n: 2.15 },
    { y: neckBaseY, a: neckR * 1.3, b: neckR * 1.22, n: 2 },
    { y: napeY + 3, a: nkA, b: nkB, n: 2 },
    { y: neckTopY, a: nkA * 0.98, b: nkB * 0.98, n: 2 },
  ];
  const ys = keys.map((k) => k.y);
  for (let i = 1; i < ys.length; i++) if (ys[i] <= ys[i - 1]) ys[i] = ys[i - 1] + 0.4;
  const aAt = pchip(ys, keys.map((k) => k.a));
  const bAt = pchip(ys, keys.map((k) => k.b));
  const nAt = pchip(ys, keys.map((k) => k.n));
  const torsoBottomY = ys[0];
  const torsoTopY = ys[ys.length - 1];
  const skinExact = (y: number) => shape(y, aAt(y), bAt(y), nAt(y));

  // ---- legs ---------------------------------------------------------------
  const thighR = R(m.thigh);
  const kneeR = R(m.knee);
  const calfR = R(m.calf);
  const ankleR = R(m.ankle);
  const crotchHalfWidth = aAt(crotchY + 2.5);
  const legX = Math.max(thighR * 0.62, Math.min(thighR + 0.5, crotchHalfWidth - thighR * 0.98));
  const legTopY = Math.min(hipY, crotchY + 8);
  const legRadius = pchipFromKnots([
    [0, ankleR * 1.04],
    [ankleY, ankleR],
    [lerp(ankleY, kneeY, 0.42), lerp(ankleR, calfR, 0.72)],
    [lerp(ankleY, kneeY, 0.7), calfR],
    [kneeY, kneeR],
    [lerp(kneeY, crotchY, 0.5), lerp(kneeR, thighR, 0.6)],
    [crotchY - 2.5, thighR],
    [legTopY + 1, thighR * 0.98],
  ]);
  const leg: LegModel = { x: legX, topY: legTopY, radiusAt: legRadius };

  // ---- sampled tables -----------------------------------------------------
  const rows = Math.ceil(torsoTopY / TABLE_STEP) + 1;
  const skinRows: Array<Radial | null> = [];
  const wrapRows: Radial[] = [];
  const circRows: number[] = [];
  const LEG_SAMPLES = 20;
  for (let j = 0; j < rows; j++) {
    const y = Math.min(j * TABLE_STEP, torsoTopY);
    const hasTorso = y >= torsoBottomY;
    const skin = hasTorso ? skinExact(y) : null;
    skinRows.push(skin);
    let wrap: Radial;
    if (y >= crotchY + 3 && skin) {
      wrap = hullRadial(skin);
    } else {
      const pts: Array<[number, number]> = skin ? radialPoints(skin) : [];
      const r = legRadius(y);
      for (let k = 0; k < LEG_SAMPLES; k++) {
        const t = (k / LEG_SAMPLES) * TAU;
        pts.push([legX + r * Math.cos(t), r * Math.sin(t)]);
        pts.push([-legX + r * Math.cos(t), r * Math.sin(t)]);
      }
      wrap = hullRadialOfPoints(pts);
    }
    wrapRows.push(wrap);
    circRows.push(perimeter(wrap));
  }
  const sample = <T,>(y: number, pick: (j0: number, j1: number, t: number) => T): T => {
    const f = clamp(y / TABLE_STEP, 0, rows - 1);
    const j0 = Math.min(rows - 2, Math.floor(f));
    return pick(j0, j0 + 1, f - j0);
  };

  // Key levels are solved exactly, so answer those from the exact shape rather
  // than the 1 cm table.
  const skinAt = (y: number) => skinExact(clamp(y, torsoBottomY, torsoTopY));
  const wrapAt = (y: number) => sample(y, (j0, j1, t) => lerpRadial(wrapRows[j0], wrapRows[j1], t));
  const circAt = (y: number) => {
    if (y >= crotchY + 3) return perimeter(hullRadial(skinExact(clamp(y, torsoBottomY, torsoTopY))));
    return sample(y, (j0, j1, t) => lerp(circRows[j0], circRows[j1], t));
  };

  const czAt = pchipFromKnots([
    [hipY, 0],
    [waistY, 0.9],
    [chestY, -0.2],
    [shoulderY, -1.3],
    [neckBaseY, -0.5],
    [neckTopY, 1.8],
  ]);
  arm.origin[2] = czAt(shoulderY) * 0.6;

  const headR = R(m.head);
  return {
    m,
    lm,
    torsoBottomY,
    torsoTopY,
    skinAt,
    czAt,
    wrapAt,
    circAt,
    arm,
    leg,
    head: { center: [0, topY - headH / 2, czAt(neckTopY) + 0.6], radii: [headR * 0.92, headH / 2, headR * 1.08] },
    foot: { length: m.footLength, width: m.footLength * 0.37, height: 7 },
  };
}

/** Cartesian point of a radial sample. */
export function radialXZ(r: Radial, i: number): [number, number] {
  return [r[i] * COS[i], r[i] * SIN[i]];
}
