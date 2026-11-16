/**
 * Small geometry toolkit shared by the body and garment builders.
 *
 * Horizontal cross-sections of the torso are stored as "radials": the distance
 * from the vertical body axis to the surface, sampled at N_THETA fixed angles.
 * Angle 0 points to the figure's side (+x), 90° to the front (+z). Storing
 * rings this way makes layering trivial — the outer surface of several layers
 * is the per-angle maximum — and keeps every ring index-compatible for lofting.
 */

export const N_THETA = 72;

export const COS: Float64Array = new Float64Array(N_THETA);
export const SIN: Float64Array = new Float64Array(N_THETA);
for (let i = 0; i < N_THETA; i++) {
  const t = (i / N_THETA) * Math.PI * 2;
  COS[i] = Math.cos(t);
  SIN[i] = Math.sin(t);
}

export type Radial = Float64Array;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0 || 1e-9), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Superellipse radial with semi-axes a (side) and b (front/back). */
export function superellipse(a: number, b: number, n: number): Radial {
  const r = new Float64Array(N_THETA);
  for (let i = 0; i < N_THETA; i++) {
    const c = Math.abs(COS[i]) / a;
    const s = Math.abs(SIN[i]) / b;
    r[i] = Math.pow(Math.pow(c, n) + Math.pow(s, n), -1 / n);
  }
  return r;
}

/** Length of the closed polygon traced by a radial. */
export function perimeter(r: Radial): number {
  let len = 0;
  for (let i = 0; i < N_THETA; i++) {
    const j = (i + 1) % N_THETA;
    const dx = r[j] * COS[j] - r[i] * COS[i];
    const dz = r[j] * SIN[j] - r[i] * SIN[i];
    len += Math.hypot(dx, dz);
  }
  return len;
}

type P2 = [number, number];

/** Convex hull (Andrew monotone chain), counter-clockwise. */
export function convexHull(points: P2[]): P2[] {
  const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (pts.length < 3) return pts;
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: P2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Radial of the convex hull of a point set that surrounds the origin: where a
 * tape measure (or taut fabric) would sit around those points.
 */
export function hullRadialOfPoints(points: P2[]): Radial {
  const hull = convexHull(points);
  const out = new Float64Array(N_THETA);
  const n = hull.length;
  for (let i = 0; i < N_THETA; i++) {
    const dx = COS[i];
    const dz = SIN[i];
    let best = 0;
    for (let e = 0; e < n; e++) {
      const a = hull[e];
      const b = hull[(e + 1) % n];
      const ex = b[0] - a[0];
      const ez = b[1] - a[1];
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-12) continue;
      // Solve origin + t*d = a + u*e
      const t = (a[0] * ez - a[1] * ex) / den;
      const u = (a[0] * dz - a[1] * dx) / den;
      if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t > best) best = t;
    }
    out[i] = best;
  }
  return out;
}

export function radialPoints(r: Radial): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < N_THETA; i++) pts.push([r[i] * COS[i], r[i] * SIN[i]]);
  return pts;
}

/** Convex hull of a radial, as a radial. */
export function hullRadial(r: Radial): Radial {
  return hullRadialOfPoints(radialPoints(r));
}

/** The circumference a tape measure would read around this cross-section. */
export function tapePerimeter(r: Radial): number {
  return perimeter(hullRadial(r));
}

export function lerpRadial(a: Radial, b: Radial, t: number): Radial {
  const out = new Float64Array(N_THETA);
  for (let i = 0; i < N_THETA; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through (xs, ys). xs must be
 * strictly increasing. Never overshoots, so a waist stays the narrowest point.
 */
export function pchip(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => ys[0];
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const t = (x - xs[lo]) / h[lo];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h[lo] * m[lo] +
      (-2 * t3 + 3 * t2) * ys[lo + 1] +
      (t3 - t2) * h[lo] * m[lo + 1]
    );
  };
}

/** Build a pchip from unsorted knots, dropping knots that collide. */
export function pchipFromKnots(knots: Array<[number, number]>, minGap = 0.5): (x: number) => number {
  const sorted = knots.filter((k) => Number.isFinite(k[0]) && Number.isFinite(k[1])).sort((a, b) => a[0] - b[0]);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of sorted) {
    if (xs.length && x - xs[xs.length - 1] < minGap) continue;
    xs.push(x);
    ys.push(y);
  }
  return pchip(xs, ys);
}
