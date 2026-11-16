import { scoreToCss } from '../lib/colors';
import type { FitResult, Zone } from '../lib/garments/fit';
import { fmt, fmtSigned, type Unit } from '../lib/units';

const SOURCE_TAG: Record<Zone['source'], string | null> = {
  chart: null,
  derived: 'from brand body chart',
  assumed: 'not in chart',
};

export function FitReport({ fit, unit }: { fit: FitResult; unit: Unit }) {
  const derived = fit.zones.some((z) => z.source === 'derived');
  const assumed = fit.zones.some((z) => z.source === 'assumed');
  const num = (cm: number) => fmt(cm, unit).replace(` ${unit}`, '');
  return (
    <div className="fit-report">
      <table>
        <thead>
          <tr>
            <th scope="col">Where</th>
            <th scope="col" className="num">Garment</th>
            <th scope="col" className="num">Body</th>
            <th scope="col" className="num">Ease</th>
            <th scope="col">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {fit.zones.map((z) => (
            <tr key={z.id} className={z.judged ? '' : 'unjudged'} title={z.detail}>
              <th scope="row">
                {z.label}
                {SOURCE_TAG[z.source] && <span className="src-tag">{SOURCE_TAG[z.source]}</span>}
              </th>
              <td className="num">{z.garmentCm !== undefined ? num(z.garmentCm) : '—'}</td>
              <td className="num">{z.bodyCm !== undefined ? num(z.bodyCm) : '—'}</td>
              <td className="num">{z.easeCm !== undefined ? fmtSigned(z.easeCm, unit).replace(` ${unit}`, '') : '—'}</td>
              <td>
                <span className={`verdict tone-${z.tone}`}>
                  {z.kind === 'girth' && z.score !== undefined && z.judged && (
                    <span className="dot" style={{ background: scoreToCss(z.score) }} aria-hidden />
                  )}
                  {z.verdict}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small-print units-note">Figures in {unit === 'cm' ? 'centimetres' : 'inches'}. Girths are measured around; “ease” is garment minus body.</p>
      <ul className="fit-details">
        {fit.zones.filter((z) => z.judged && (z.tone === 'bad' || z.tone === 'warn')).map((z) => (
          <li key={z.id}><strong>{z.label}:</strong> {z.detail}</li>
        ))}
      </ul>
      {derived && (
        <p className="muted small-print">
          This brand publishes the body each size is cut for, not the garment itself. Garment figures marked “from brand body chart” add the usual ease for a{' '}
          {fit.garment.fitIntent} cut.
        </p>
      )}
      {assumed && (
        <p className="muted small-print">
          Rows marked “not in chart” use typical proportions so the piece can be drawn; they are not judged. Add those measurements to the size chart for an exact result.
        </p>
      )}
    </div>
  );
}
