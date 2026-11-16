import type { BodyModel } from '../body';
import { N_THETA, clamp, hullRadial, perimeter, type Radial } from '../geom';
import type { Base } from './fit';

/** Distance over which a layer's edge tapers back to the body (cm). */
const FEATHER = 5;

interface Cover<T> {
  from: number;
  to: number;
  at(p: number): T;
}

/**
 * The body plus everything already put on it. Each garment is fitted against
 * the stack as it stands, then adds its own outer surface, so a jacket is
 * measured over the sweater beneath it rather than over bare skin.
 */
export class LayerStack implements Base {
  private torso: Array<Cover<Radial>> = [];
  private arms: Array<Cover<number>> = [];
  private legs: Array<Cover<number>> = [];

  constructor(private body: BodyModel) {}

  wrapAt = (y: number): Radial => {
    const body = this.body.wrapAt(y);
    let r = body;
    let covered = false;
    for (const c of this.torso) {
      if (y < c.from - FEATHER || y > c.to + FEATHER) continue;
      // Past its edge a layer tapers back to the body instead of ending in a ledge.
      const yc = clamp(y, c.from, c.to);
      const w = 1 - Math.abs(y - yc) / FEATHER;
      const cover = c.at(yc);
      const out = new Float64Array(N_THETA);
      for (let i = 0; i < N_THETA; i++) out[i] = Math.max(r[i], body[i] + (cover[i] - body[i]) * w);
      r = out;
      covered = true;
    }
    return covered ? hullRadial(r) : r;
  };

  circAt = (y: number): number => {
    if (!this.torso.some((c) => y >= c.from - FEATHER && y <= c.to + FEATHER)) return this.body.circAt(y);
    return perimeter(this.wrapAt(y));
  };

  armRadiusAt = (s: number): number => {
    let r = this.body.arm.radiusAt(s);
    for (const c of this.arms) if (s >= c.from && s <= c.to) r = Math.max(r, c.at(s));
    return r;
  };

  legRadiusAt = (y: number): number => {
    let r = this.body.leg.radiusAt(y);
    for (const c of this.legs) if (y >= c.from && y <= c.to) r = Math.max(r, c.at(y));
    return r;
  };

  addTorso(from: number, to: number, at: (y: number) => Radial) {
    this.torso.push({ from, to, at });
  }

  addArm(from: number, to: number, at: (s: number) => number) {
    this.arms.push({ from, to, at });
  }

  addLeg(from: number, to: number, at: (y: number) => number) {
    this.legs.push({ from, to, at });
  }
}
