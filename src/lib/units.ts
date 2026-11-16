export type Unit = 'cm' | 'in';

export const CM_PER_IN = 2.54;

export function toCm(value: number, unit: Unit): number {
  return unit === 'in' ? value * CM_PER_IN : value;
}

export function fromCm(cm: number, unit: Unit): number {
  return unit === 'in' ? cm / CM_PER_IN : cm;
}

/** Format a centimetre value in the chosen display unit. */
export function fmt(cm: number, unit: Unit, digits = 1): string {
  const v = fromCm(cm, unit);
  const s = v.toFixed(digits).replace(/\.0+$/, '');
  return `${s} ${unit}`;
}

/** Signed format, e.g. "+4.5 cm". */
export function fmtSigned(cm: number, unit: Unit, digits = 1): string {
  const v = fromCm(cm, unit);
  const s = Math.abs(v).toFixed(digits).replace(/\.0+$/, '');
  const sign = v > 0.0001 ? '+' : v < -0.0001 ? '−' : '±';
  return `${sign}${s} ${unit}`;
}
