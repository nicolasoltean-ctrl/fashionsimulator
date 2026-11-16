import { useEffect, useState } from 'react';
import { fromCm, toCm, type Unit } from '../lib/units';

interface Props {
  cm: number;
  unit: Unit;
  min: number;
  max: number;
  onChange(cm: number): void;
  label: string;
}

const show = (cm: number, unit: Unit) => {
  const v = fromCm(cm, unit);
  return (unit === 'in' ? Math.round(v * 4) / 4 : Math.round(v * 2) / 2).toString();
};

/** Numeric entry in the display unit; commits on blur or Enter. */
export function NumberField({ cm, unit, min, max, onChange, label }: Props) {
  const [text, setText] = useState(show(cm, unit));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(show(cm, unit));
  }, [cm, unit, editing]);

  const commit = () => {
    setEditing(false);
    const v = Number(text.replace(',', '.'));
    if (Number.isFinite(v) && text.trim()) onChange(Math.min(max, Math.max(min, toCm(v, unit))));
    else setText(show(cm, unit));
  };

  return (
    <span className="numfield">
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label} (${unit})`}
        value={text}
        onFocus={(e) => { setEditing(true); e.currentTarget.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = unit === 'in' ? 0.25 * 2.54 : 0.5;
            const next = Math.min(max, Math.max(min, cm + (e.key === 'ArrowUp' ? step : -step)));
            onChange(next);
            setText(show(next, unit));
          }
        }}
      />
      <span className="numfield-unit">{unit}</span>
    </span>
  );
}
