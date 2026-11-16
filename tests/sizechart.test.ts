import { describe, expect, it } from 'vitest';
import { classifyHeader, parseCell, parseSizeTable, parseSizeText } from '../src/lib/import/sizechart';

describe('cells', () => {
  it('reads plain numbers, ranges, fractions and units', () => {
    expect(parseCell('34')).toEqual({ range: [34, 34], unit: null });
    expect(parseCell('34-36')!.range).toEqual([34, 36]);
    expect(parseCell('34 – 36"')).toEqual({ range: [34, 36], unit: 'in' });
    expect(parseCell('34 1/2')!.range).toEqual([34.5, 34.5]);
    expect(parseCell('34½')!.range).toEqual([34.5, 34.5]);
    expect(parseCell('86,5 cm')).toEqual({ range: [86.5, 86.5], unit: 'cm' });
    expect(parseCell('—')).toBeNull();
    expect(parseCell('')).toBeNull();
  });

  it('prefers centimetres when a cell lists both units', () => {
    expect(parseCell('34 / 86.5')).toEqual({ range: [86.5, 86.5], unit: 'cm' });
    expect(parseCell('86.5 (34)')).toEqual({ range: [86.5, 86.5], unit: 'cm' });
    expect(parseCell('34-36 in / 86-91 cm')).toEqual({ range: [86, 91], unit: 'cm' });
  });
});

describe('headers', () => {
  it('maps brand wording onto dimensions', () => {
    expect(classifyHeader('Chest Width (cm)')).toBe('chest');
    expect(classifyHeader('Pit to Pit')).toBe('chest');
    expect(classifyHeader('Bust')).toBe('chest');
    expect(classifyHeader('Sleeve Length')).toBe('sleeve');
    expect(classifyHeader('Sleeve Opening')).toBe('cuff');
    expect(classifyHeader('Body Length')).toBe('length');
    expect(classifyHeader('Shoulder to Hem')).toBe('length');
    expect(classifyHeader('Across Shoulders')).toBe('shoulder');
    expect(classifyHeader('Front Rise')).toBe('rise');
    expect(classifyHeader('Leg Opening')).toBe('legOpening');
    expect(classifyHeader('Inside Leg')).toBe('inseam');
    expect(classifyHeader('Low Hip')).toBe('hip');
    expect(classifyHeader('Size')).toBe('size');
    expect(classifyHeader('Height')).toBe('ignore');
    expect(classifyHeader('Colour')).toBeNull();
  });
});

describe('tables', () => {
  it('reads a flat garment chart in centimetres', () => {
    const c = parseSizeTable(
      [
        ['Size', 'Chest Width (cm)', 'Body Length (cm)', 'Sleeve Length (cm)'],
        ['S', '48', '68', '20'],
        ['M', '51', '70', '21'],
        ['L', '54', '72', '22'],
      ],
      'Garment measurements',
    )!;
    expect(c.unit).toBe('cm');
    expect(c.kind).toBe('garment');
    expect(c.columns.map((x) => x.key)).toEqual(['chest', 'length', 'sleeve']);
    expect(c.columns[0].flat).toBe(true);
    expect(c.rows.map((r) => r.label)).toEqual(['S', 'M', 'L']);
    expect(c.rows[1].values).toEqual([[51, 51], [70, 70], [21, 21]]);
  });

  it('reads a body chart with ranges in inches', () => {
    const c = parseSizeTable([
      ['', 'Chest', 'Waist', 'Hip'],
      ['S', '34-36"', '28-30"', '34-36"'],
      ['M', '38-40"', '32-34"', '38-40"'],
    ])!;
    expect(c.unit).toBe('in');
    expect(c.kind).toBe('body');
    expect(c.columns.every((x) => !x.flat)).toBe(true);
    expect(c.rows[0].values[0]).toEqual([34, 36]);
  });

  it('turns a chart that lists sizes across the top', () => {
    const c = parseSizeTable([
      ['Measurement', 'S', 'M', 'L'],
      ['Waist (in)', '30', '32', '34'],
      ['Front Rise (in)', '10', '10.5', '11'],
      ['Inseam (in)', '32', '32', '32'],
      ['Leg Opening (in)', '7', '7.25', '7.5'],
    ])!;
    expect(c.rows.map((r) => r.label)).toEqual(['S', 'M', 'L']);
    expect(c.columns.map((x) => x.key)).toEqual(['waist', 'rise', 'inseam', 'legOpening']);
    expect(c.kind).toBe('garment');
    // A 7 in leg opening can only be a flat width.
    expect(c.columns[3].flat).toBe(true);
    expect(c.columns[0].flat).toBeFalsy();
  });

  it('infers the unit when none is stated', () => {
    const cm = parseSizeTable([['Size', 'Chest', 'Length'], ['M', '104', '71'], ['L', '110', '73']])!;
    expect(cm.unit).toBe('cm');
    expect(cm.unitGuessed).toBe(true);
    const inches = parseSizeTable([['Size', 'Chest', 'Length'], ['M', '41', '28'], ['L', '43', '29']])!;
    expect(inches.unit).toBe('in');
  });

  it('keeps the first of duplicate columns and renames a trouser hem', () => {
    const c = parseSizeTable([
      ['Size', 'Waist', 'Front Rise', 'Back Rise', 'Thigh', 'Hem', 'Inseam'],
      ['32', '84', '27', '38', '62', '40', '81'],
    ])!;
    expect(c.columns.map((x) => x.key)).toEqual(['waist', 'rise', 'thigh', 'legOpening', 'inseam']);
  });

  it('picks the size column out of several regional ones', () => {
    const c = parseSizeTable([
      ['US', 'UK', 'EU', 'Bust (cm)', 'Waist (cm)', 'Hip (cm)'],
      ['2', '6', '34', '82', '64', '90'],
      ['4', '8', '36', '86', '68', '94'],
    ])!;
    expect(c.rows.map((r) => r.label)).toEqual(['2', '4']);
    expect(c.columns.map((x) => x.key)).toEqual(['chest', 'waist', 'hip']);
  });

  it('flags a sleeve measured from centre back', () => {
    const c = parseSizeTable([['Size', 'Chest', 'Sleeve (center back)'], ['M', '40', '34']])!;
    expect(c.columns[1].fromCenterBack).toBe(true);
  });

  it('rejects tables that are not size charts', () => {
    expect(parseSizeTable([['Shipping', 'Cost'], ['Standard', '$5'], ['Express', '$15']])).toBeNull();
    expect(parseSizeTable([['Size']])).toBeNull();
  });
});

describe('pasted text', () => {
  it('reads tab-separated text copied from a web page', () => {
    const c = parseSizeText('Size\tChest (in)\tLength (in)\tSleeve (in)\nS\t38\t27\t8\nM\t40\t28\t8.5\nL\t42\t29\t9')!;
    expect(c.unit).toBe('in');
    expect(c.rows).toHaveLength(3);
    expect(c.columns.map((x) => x.key)).toEqual(['chest', 'length', 'sleeve']);
  });

  it('reads space-aligned text with multi-word headers', () => {
    const c = parseSizeText('Size  Pit to Pit  Body Length  Sleeve Length\nS     20          27           8\nM     21          28           8.5')!;
    expect(c.columns.map((x) => x.key)).toEqual(['chest', 'length', 'sleeve']);
    expect(c.rows[1].values[0]).toEqual([21, 21]);
    expect(c.columns[0].flat).toBe(true);
  });

  it('reads single-spaced text with ranges', () => {
    const c = parseSizeText('Size Chest Waist Hip\nS 34 - 36 28 - 30 35 - 37\nM 38 - 40 32 - 34 39 - 41')!;
    expect(c.rows[0].values).toEqual([[34, 36], [28, 30], [35, 37]]);
    expect(c.kind).toBe('body');
  });

  it('reads markdown and CSV', () => {
    expect(parseSizeText('| Size | Waist | Inseam |\n|---|---|---|\n| 30 | 31.5 | 32 |\n| 32 | 33.5 | 32 |')!.rows).toHaveLength(2);
    expect(parseSizeText('Size,Bust,Waist,Hips\nXS,80,62,88\nS,84,66,92')!.columns.map((x) => x.key)).toEqual(['chest', 'waist', 'hip']);
  });

  it('returns null for text with no chart', () => {
    expect(parseSizeText('Free returns within 30 days.\nShips from our warehouse.')).toBeNull();
  });
});
