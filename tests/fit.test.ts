import { describe, expect, it } from 'vitest';
import { buildBody } from '../src/lib/body';
import { bodyBase, fitGarment, recommendSize, type FitResult } from '../src/lib/garments/fit';
import type { DimKey, Garment, Range } from '../src/lib/garments/types';
import { PRESETS } from '../src/lib/measurements';
import { dressBody, wear } from '../src/lib/outfit';
import { SAMPLE_GARMENTS } from '../src/lib/samples';

const body = buildBody(PRESETS[0].m); // chest 100, waist 85, hip 100, shoulders 46, arm 61, inseam 81
const base = bodyBase(body);

function garment(over: Partial<Garment>, cols: DimKey[], rows: Record<string, Array<number | Range>>, kind: 'garment' | 'body' = 'garment'): Garment {
  return {
    id: 'g', name: 'Test', category: 'shirt', color: '#888888', stretch: 0, fitIntent: 'regular', neckline: 'crew', sleeves: 'auto', source: 'manual',
    chart: {
      unit: 'cm', kind, columns: cols.map((key) => ({ key, label: key })),
      rows: Object.entries(rows).map(([label, v]) => ({ label, values: v.map((x): Range => (typeof x === 'number' ? [x, x] : x)) })),
    },
    ...over,
  };
}
const zone = (r: FitResult, id: string) => r.zones.find((z) => z.id === id)!;
const fit = (g: Garment, size: string) => fitGarment(body, g, { size }, base);

describe('girth against garment measurements', () => {
  const shirt = garment({}, ['chest'], { under: [96], equal: [100], snug: [104], regular: [112], loose: [122], huge: [140] });

  it('is too small when a rigid garment is smaller than the body', () => {
    const r = fit(shirt, 'under');
    expect(zone(r, 'chest').status).toBe('too-small');
    expect(r.overall.level).toBe('too-small');
    expect(r.overall.headline).toMatch(/too small at the chest/i);
  });

  it('is tight when the garment only equals the body', () => {
    const r = fit(shirt, 'equal');
    expect(zone(r, 'chest').status).toBe('tight');
    expect(zone(r, 'chest').easeCm).toBeCloseTo(0, 1);
    expect(r.overall.level).toBe('tight');
  });

  it('moves through fitted, regular, loose and oversized as ease grows', () => {
    expect(zone(fit(shirt, 'snug'), 'chest').status).toBe('fitted');
    expect(zone(fit(shirt, 'regular'), 'chest').status).toBe('regular');
    expect(zone(fit(shirt, 'loose'), 'chest').status).toBe('loose');
    expect(zone(fit(shirt, 'huge'), 'chest').status).toBe('oversized');
  });

  it('lets a stretch fabric run smaller than the body', () => {
    const knit = { ...shirt, stretch: 0.25 };
    expect(zone(fit(knit, 'under'), 'chest').status).toBe('fitted');
    expect(zone(fit(knit, 'under'), 'chest').easeCm).toBeCloseTo(-4, 1);
    const tiny = garment({ stretch: 0.25 }, ['chest'], { xs: [70] });
    expect(zone(fit(tiny, 'xs'), 'chest').status).toBe('too-small');
  });

  it('doubles measurements listed flat', () => {
    const g = garment({}, ['chest'], { M: [56] });
    g.chart.columns[0].flat = true;
    expect(fit(g, 'M').dims.chest!.cm).toBe(112);
  });

  it('converts inches', () => {
    const g = garment({}, ['chest'], { M: [44] });
    g.chart.unit = 'in';
    expect(fit(g, 'M').dims.chest!.cm).toBeCloseTo(111.76, 2);
  });
});

describe('girth against a brand body chart', () => {
  const tee = garment({ category: 'tee', stretch: 0.15 }, ['chest'], { S: [[86, 91]], M: [[96, 101]], L: [[106, 111]], XL: [[116, 121]] }, 'body');

  it('fits when the body is inside the range the size is cut for', () => {
    const r = fit(tee, 'M');
    expect(zone(r, 'chest').source).toBe('derived');
    expect(r.overall.level).toBe('good');
    expect(zone(r, 'chest').detail).toMatch(/inside that range/);
  });

  it('is tight or too small when the body is over the range', () => {
    const r = fit(tee, 'S'); // body 100 vs 86-91
    expect(['tight', 'too-small']).toContain(zone(r, 'chest').status);
    expect(zone(r, 'chest').detail).toMatch(/9\.0 cm over/);
    expect(['tight', 'too-small']).toContain(r.overall.level);
  });

  it('is loose when the body is under the range', () => {
    expect(['loose', 'oversized']).toContain(zone(fit(tee, 'XL'), 'chest').status);
  });

  it('recommends the size whose range holds the body', () => {
    expect(recommendSize(body, tee, base)?.size).toBe('M');
  });
});

describe('lengths and placement', () => {
  it('reports where a hem falls from the garment length', () => {
    const cropped = garment({ category: 'tee' }, ['chest', 'length'], { M: [108, 42] });
    const long = garment({ category: 'tee' }, ['chest', 'length'], { M: [108, 64] });
    expect(zone(fit(cropped, 'M'), 'length').verdict).toMatch(/cropped/);
    expect(fit(long, 'M').upper!.hemY).toBeCloseTo(body.lm.hpsY - 64, 5);
    expect(zone(fit(long, 'M'), 'length').verdict).toMatch(/hip/);
  });

  it('judges sleeve length against the arm, allowing for a dropped shoulder', () => {
    const mk = (sleeve: number, shoulder: number) => garment({}, ['chest', 'shoulder', 'sleeve'], { M: [112, shoulder, sleeve] });
    expect(zone(fit(mk(52, 46), 'M'), 'sleeve').verdict).toBe('Too short');
    expect(zone(fit(mk(60, 46), 'M'), 'sleeve').verdict).toBe('To the wrist');
    expect(zone(fit(mk(70, 46), 'M'), 'sleeve').verdict).toBe('Too long');
    // The same sleeve on a 10 cm wider shoulder seam reaches 5 cm further down the arm.
    const a = fit(mk(60, 46), 'M').upper!.sleeveEndS;
    const b = fit(mk(60, 56), 'M').upper!.sleeveEndS;
    expect(b - a).toBeCloseTo(5, 5);
  });

  it('treats a very long sleeve figure as measured from centre back', () => {
    const g = garment({}, ['chest', 'shoulder', 'sleeve'], { M: [112, 46, 86] });
    expect(fit(g, 'M').dims.sleeve!.cm).toBeCloseTo(86 - 23, 5);
  });

  it('flags narrow shoulders', () => {
    const g = garment({}, ['chest', 'shoulder'], { M: [112, 38] });
    expect(zone(fit(g, 'M'), 'shoulder').verdict).toBe('Too narrow');
    expect(fit(g, 'M').overall.level).toBe('too-small');
  });

  it('places trousers by rise and inseam', () => {
    const mk = (inseam: number, rise = 26) =>
      garment({ category: 'pants' }, ['waist', 'hip', 'rise', 'thigh', 'inseam', 'legOpening'], { M: [90, 106, rise, 64, inseam, 40] });
    const r = fit(mk(79), 'M');
    expect(r.lower!.hemY).toBeCloseTo(81 - 1.5 - 79, 5);
    expect(zone(r, 'inseam').verdict).toBe('Full length');
    expect(zone(fit(mk(66), 'M'), 'inseam').verdict).toBe('Ankle length');
    expect(zone(fit(mk(94), 'M'), 'inseam').verdict).toBe('Too long');
    // A longer rise carries the waistband higher on the body.
    expect(fit(mk(79, 30), 'M').lower!.waistbandY).toBeGreaterThan(fit(mk(79, 22), 'M').lower!.waistbandY + 6);
  });

  it('measures a low-rise waistband against the body where it actually sits', () => {
    const g = garment({ category: 'pants' }, ['waist', 'hip', 'rise', 'inseam'], { M: [88, 106, 20, 79] });
    const r = fit(g, 'M');
    expect(r.lower!.waistbandY).toBeLessThan(body.lm.waistY - 5);
    // Lower on the torso the body is wider than the natural waist (85).
    expect(zone(r, 'waist').bodyCm!).toBeGreaterThan(88);
    expect(zone(r, 'waist').status).toBe('too-small');
  });

  it('warns when a waistband is too big to stay up', () => {
    const g = garment({ category: 'pants' }, ['waist', 'hip', 'rise', 'inseam'], { M: [102, 112, 28, 79] });
    expect(fit(g, 'M').overall.headline).toMatch(/too big at the waistband/i);
  });
});

describe('assumed dimensions', () => {
  it('draws but does not judge what the chart omits', () => {
    const g = garment({ category: 'tee' }, ['chest'], { M: [108] });
    const r = fit(g, 'M');
    expect(r.dims.length!.source).toBe('assumed');
    expect(zone(r, 'length').judged).toBe(false);
    expect(zone(r, 'shoulder').judged).toBe(false);
    expect(zone(r, 'chest').judged).toBe(true);
  });

  it('refuses a verdict when the chart has nothing to judge', () => {
    const g = garment({ category: 'tee' }, [], { M: [] });
    expect(fit(g, 'M').overall.level).toBe('unknown');
    expect(recommendSize(body, g, base)).toBeNull();
  });
});

describe('layering', () => {
  const closet = SAMPLE_GARMENTS;
  it('fits an outer layer over what is worn beneath it', () => {
    const alone = dressBody(body, closet, [{ garmentId: 'sample-chore', size: 'S' }])[0];
    const layered = dressBody(body, closet, [
      { garmentId: 'sample-chore', size: 'S' },
      { garmentId: 'sample-knit', size: 'L' },
      { garmentId: 'sample-tee', size: 'M' },
    ]);
    const jacket = layered.find((d) => d.garment.id === 'sample-chore')!;
    const ease = (r: FitResult) => zone(r, 'chest').easeCm!;
    expect(layered.map((d) => d.garment.id)).toEqual(['sample-tee', 'sample-knit', 'sample-chore']);
    expect(ease(jacket.fit)).toBeLessThan(ease(alone.fit) - 2);
  });

  it('puts an untucked top over the trousers and a tucked one under', () => {
    const order = (tucked: boolean) =>
      dressBody(body, closet, [{ garmentId: 'sample-tee', size: 'M', tucked }, { garmentId: 'sample-jeans', size: '33' }]).map((d) => d.garment.id);
    expect(order(false)).toEqual(['sample-jeans', 'sample-tee']);
    expect(order(true)).toEqual(['sample-tee', 'sample-jeans']);
  });

  it('keeps cloth outside the body everywhere', () => {
    for (const p of PRESETS) {
      const b = buildBody(p.m);
      const [d] = dressBody(b, closet, [{ garmentId: 'sample-dress', size: 'XS' }]);
      // Sample torso vertices: each must lie on or outside the body wrap at its height.
      const pos = d.mesh.positions;
      for (let i = 0; i < pos.length; i += 3 * 17) {
        const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2] - b.czAt(pos[i + 1])];
        const wrap = b.wrapAt(y);
        const ang = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
        const k = Math.round((ang / (Math.PI * 2)) * wrap.length) % wrap.length;
        expect(Math.hypot(x, z)).toBeGreaterThan(wrap[k] - 0.6);
      }
    }
  });

  it('replaces whatever occupies the same place', () => {
    const tee = closet.find((g) => g.id === 'sample-tee')!;
    const jeans = closet.find((g) => g.id === 'sample-jeans')!;
    const trousers = closet.find((g) => g.id === 'sample-trousers')!;
    const dress = closet.find((g) => g.id === 'sample-dress')!;
    const coat = closet.find((g) => g.id === 'sample-coat')!;
    let worn = wear(closet, [], tee, 'M');
    worn = wear(closet, worn, jeans, '33');
    worn = wear(closet, worn, trousers, 'L');
    expect(worn.map((w) => w.garmentId)).toEqual(['sample-tee', 'sample-trousers']);
    worn = wear(closet, worn, coat, '50');
    worn = wear(closet, worn, dress, 'M');
    expect(worn.map((w) => w.garmentId)).toEqual(['sample-coat', 'sample-dress']);
  });
});

describe('every sample on every body', () => {
  it('builds finite meshes and a verdict', () => {
    for (const p of PRESETS) {
      const b = buildBody(p.m);
      for (const g of SAMPLE_GARMENTS) {
        for (const row of g.chart.rows) {
          const [d] = dressBody(b, SAMPLE_GARMENTS, [{ garmentId: g.id, size: row.label }]);
          expect(d.mesh.positions.length, `${p.id}/${g.id}/${row.label}`).toBeGreaterThan(0);
          expect(d.mesh.positions.every(Number.isFinite), `${p.id}/${g.id}/${row.label}`).toBe(true);
          expect(d.mesh.scores.length).toBe(d.mesh.positions.length / 3);
          expect(d.fit.overall.headline.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('recommends sensible sizes for the standard forms', () => {
    const rec = (preset: number, id: string) =>
      recommendSize(buildBody(PRESETS[preset].m), SAMPLE_GARMENTS.find((g) => g.id === id)!, bodyBase(buildBody(PRESETS[preset].m)))?.size;
    expect(rec(0, 'sample-oxford')).toBe('M'); // chest 100 cm = 39.4 in → 38–40
    expect(rec(0, 'sample-coat')).toBe('50'); // chest 96–100
    expect(rec(1, 'sample-dress')).toBe('M'); // bust 90, waist 71, hip 97
    expect(rec(1, 'sample-sneakers')).toBe('EU 38'); // foot 24.0
    expect(rec(0, 'sample-sneakers')).toBe('EU 42'); // foot 26.5
  });
});
