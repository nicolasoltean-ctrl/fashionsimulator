import { describe, expect, it } from 'vitest';
import { buildBody } from '../src/lib/body';
import { DEFAULT_MEASUREMENTS, MEASUREMENT_DEFS, PRESETS, reconcile, scaleToHeight, type Measurements } from '../src/lib/measurements';
import { buildBodyMesh } from '../src/lib/mesh';

const TAU = Math.PI * 2;

function expectHonoured(m: Measurements) {
  const b = buildBody(m);
  const lm = b.lm;
  // Girths: a tape around the mannequin reads what was entered.
  expect(b.circAt(lm.chestY)).toBeCloseTo(m.chest, 1);
  expect(b.circAt(lm.underbustY)).toBeCloseTo(m.underbust, 1);
  expect(b.circAt(lm.waistY)).toBeCloseTo(m.waist, 1);
  expect(b.circAt(lm.highHipY)).toBeCloseTo(m.highHip, 1);
  expect(b.circAt(lm.hipY)).toBeCloseTo(m.hip, 1);
  expect(TAU * b.leg.radiusAt(lm.crotchY - 2.5)).toBeCloseTo(m.thigh, 1);
  expect(TAU * b.leg.radiusAt(lm.kneeY)).toBeCloseTo(m.knee, 1);
  expect(TAU * b.leg.radiusAt(lm.ankleY)).toBeCloseTo(m.ankle, 1);
  expect(TAU * b.arm.radiusAt(0.25 * b.arm.length)).toBeCloseTo(m.bicep, 1);
  expect(TAU * b.arm.radiusAt(b.arm.length)).toBeCloseTo(m.wrist, 1);
  // Lengths
  expect(lm.crotchY).toBeCloseTo(m.inseam, 5);
  expect(lm.waistY - lm.crotchY).toBeCloseTo(m.rise, 5);
  expect(lm.napeY - lm.waistY).toBeCloseTo(m.backWaist, 5);
  expect(lm.topY).toBeCloseTo(m.height, 5);
  expect(lm.kneeY).toBeCloseTo(m.kneeHeight, 5);
}

describe('mannequin', () => {
  it('honours every preset exactly', () => {
    for (const p of PRESETS) expectHonoured(p.m);
  });

  it('honours arbitrary measurement sets', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < 60; n++) {
      const m = { ...DEFAULT_MEASUREMENTS };
      for (const d of MEASUREMENT_DEFS) m[d.key] = d.min + (d.max - d.min) * (0.2 + 0.6 * rnd());
      const r = reconcile(m);
      const body = buildBody(r);
      expect(body.circAt(body.lm.chestY)).toBeCloseTo(r.chest, 1);
      expect(body.circAt(body.lm.waistY)).toBeCloseTo(r.waist, 1);
      expect(body.circAt(body.lm.hipY)).toBeCloseTo(r.hip, 1);
      const mesh = buildBodyMesh(body);
      expect(mesh.positions.every(Number.isFinite)).toBe(true);
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
    }
  });

  it('measures the shoulders at the entered width', () => {
    const m = PRESETS[0].m;
    const b = buildBody(m);
    // Outer edge of the shoulder joint sits just beyond the shoulder point.
    const outer = b.arm.origin[0] + b.arm.radiusAt(0);
    expect(outer).toBeGreaterThan(m.shoulderWidth / 2);
    expect(outer).toBeLessThan(m.shoulderWidth / 2 + 3);
  });

  it('keeps an impossible stack of lengths physically consistent', () => {
    const tall = reconcile({ ...DEFAULT_MEASUREMENTS, inseam: 100 }, 'inseam');
    expect(tall.inseam).toBe(100);
    expect(tall.height).toBeGreaterThanOrEqual(tall.inseam + tall.rise + tall.backWaist + 21);
    const short = reconcile({ ...DEFAULT_MEASUREMENTS, height: 140 }, 'height');
    expect(short.height).toBe(140);
    expect(short.inseam + short.rise + short.backWaist + 21).toBeLessThanOrEqual(140 + 1e-6);
  });

  it('scales lengths with height while keeping girths', () => {
    const m = scaleToHeight(PRESETS[0].m, 160);
    expect(m.height).toBe(160);
    expect(m.inseam).toBeCloseTo((81 * 160) / 178, 5);
    expect(m.chest).toBe(100);
  });
});
