import { useState } from 'react';
import { CIRCUMFERENCE_DIMS, DIM_KEYS, DIM_LABEL, type DimKey, type Range, type SizeChart } from '../lib/garments/types';
import { parseCell, parseSizeText } from '../lib/import/sizechart';

const cellText = (v: Range | null) => (v === null ? '' : v[0] === v[1] ? String(v[0]) : `${v[0]}–${v[1]}`);

interface Props {
  chart: SizeChart;
  onChange(chart: SizeChart): void;
}

/** Editable size chart: map each column to a dimension, fix the unit, edit any cell. */
export function ChartEditor({ chart, onChange }: Props) {
  const [paste, setPaste] = useState('');
  const [pasteOpen, setPasteOpen] = useState(chart.rows.length === 0);
  const [pasteError, setPasteError] = useState('');

  const setColumn = (i: number, patch: Partial<SizeChart['columns'][number]>) =>
    onChange({ ...chart, columns: chart.columns.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const setCell = (r: number, c: number, text: string) => {
    const parsed = parseCell(text);
    onChange({
      ...chart,
      rows: chart.rows.map((row, k) => (k === r ? { ...row, values: row.values.map((v, j) => (j === c ? (parsed ? parsed.range : null) : v)) } : row)),
    });
  };
  const used = new Set(chart.columns.map((c) => c.key));

  return (
    <div className="chart-editor">
      <div className="chart-options">
        <fieldset>
          <legend>These numbers describe</legend>
          <label className="radio">
            <input type="radio" checked={chart.kind === 'garment'} onChange={() => onChange({ ...chart, kind: 'garment' })} />
            <span><strong>The garment</strong> — finished measurements of the piece</span>
          </label>
          <label className="radio">
            <input type="radio" checked={chart.kind === 'body'} onChange={() => onChange({ ...chart, kind: 'body' })} />
            <span><strong>The body</strong> — who each size is meant to fit</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Unit</legend>
          <div className="segmented">
            <button type="button" aria-pressed={chart.unit === 'cm'} onClick={() => onChange({ ...chart, unit: 'cm' })}>cm</button>
            <button type="button" aria-pressed={chart.unit === 'in'} onClick={() => onChange({ ...chart, unit: 'in' })}>inches</button>
          </div>
        </fieldset>
      </div>

      {chart.columns.length > 0 && (
        <div className="chart-scroll">
          <table className="chart-table">
            <thead>
              <tr>
                <th scope="col">Size</th>
                {chart.columns.map((col, i) => (
                  <th scope="col" key={i}>
                    <select
                      value={col.key}
                      aria-label={`Column ${i + 1} measures`}
                      onChange={(e) => setColumn(i, { key: e.target.value as DimKey | 'ignore' })}
                    >
                      <option value="ignore">Ignore column</option>
                      {DIM_KEYS.map((k) => (
                        <option key={k} value={k} disabled={used.has(k) && col.key !== k}>{DIM_LABEL[k]}</option>
                      ))}
                    </select>
                    {col.label && col.label !== col.key && <span className="col-orig" title="Header on the brand's chart">“{col.label}”</span>}
                    {chart.kind === 'garment' && col.key !== 'ignore' && CIRCUMFERENCE_DIMS.has(col.key) && (
                      <label className="check tiny" title="Measured straight across the garment laid flat. The simulator doubles it.">
                        <input type="checkbox" checked={!!col.flat} onChange={(e) => setColumn(i, { flat: e.target.checked })} />
                        laid flat (½)
                      </label>
                    )}
                    {col.key === 'sleeve' && (
                      <label className="check tiny" title="Measured from the centre of the back neck, over the shoulder, to the cuff.">
                        <input type="checkbox" checked={!!col.fromCenterBack} onChange={(e) => setColumn(i, { fromCenterBack: e.target.checked })} />
                        from centre back
                      </label>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove column ${i + 1}`}
                      title="Remove column"
                      onClick={() => onChange({
                        ...chart,
                        columns: chart.columns.filter((_c, k) => k !== i),
                        rows: chart.rows.map((r) => ({ ...r, values: r.values.filter((_v, k) => k !== i) })),
                      })}
                    >×</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, r) => (
                <tr key={r}>
                  <th scope="row">
                    <input
                      className="cell size-cell"
                      aria-label={`Size label, row ${r + 1}`}
                      value={row.label}
                      onChange={(e) => onChange({ ...chart, rows: chart.rows.map((x, k) => (k === r ? { ...x, label: e.target.value } : x)) })}
                    />
                  </th>
                  {row.values.map((v, c) => (
                    <td key={`${c}:${cellText(v)}`}>
                      <input
                        className="cell"
                        aria-label={`${row.label} ${chart.columns[c].key}`}
                        defaultValue={cellText(v)}
                        placeholder="—"
                        onBlur={(e) => { if (e.target.value !== cellText(v)) setCell(r, c, e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      />
                    </td>
                  ))}
                  <td className="row-tools">
                    <button type="button" className="icon-btn" aria-label={`Remove size ${row.label}`} title="Remove size"
                      onClick={() => onChange({ ...chart, rows: chart.rows.filter((_x, k) => k !== r) })}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="button-row">
        <button type="button" className="btn small" onClick={() => onChange({ ...chart, rows: [...chart.rows, { label: `Size ${chart.rows.length + 1}`, values: chart.columns.map(() => null) }] })}>
          Add size
        </button>
        <button
          type="button"
          className="btn small"
          disabled={DIM_KEYS.every((k) => used.has(k))}
          onClick={() => {
            const key = DIM_KEYS.find((k) => !used.has(k))!;
            onChange({ ...chart, columns: [...chart.columns, { key, label: '' }], rows: chart.rows.map((r) => ({ ...r, values: [...r.values, null] })) });
          }}
        >
          Add measurement
        </button>
        <button type="button" className="btn small ghost" onClick={() => setPasteOpen(!pasteOpen)}>
          {pasteOpen ? 'Hide paste box' : 'Paste a size chart'}
        </button>
      </div>

      {pasteOpen && (
        <div className="paste-box">
          <label>
            <span className="label">Copy the size table from the shop’s size guide and paste it here</span>
            <textarea
              rows={6}
              value={paste}
              placeholder={'Size\tChest\tLength\tSleeve\nS\t48\t68\t20\nM\t51\t70\t21'}
              onChange={(e) => { setPaste(e.target.value); setPasteError(''); }}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="btn small primary"
              disabled={!paste.trim()}
              onClick={() => {
                const parsed = parseSizeText(paste);
                if (!parsed) {
                  setPasteError('Could not find a size table in that text. It needs a header row naming the measurements (chest, waist, length…) and one row per size.');
                  return;
                }
                onChange({ unit: parsed.unit, kind: parsed.kind, columns: parsed.columns, rows: parsed.rows });
                setPaste('');
                setPasteOpen(false);
              }}
            >
              Read chart
            </button>
            {pasteError && <span className="error" role="alert">{pasteError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
