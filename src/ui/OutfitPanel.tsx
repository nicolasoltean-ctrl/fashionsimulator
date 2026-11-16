import { useState } from 'react';
import type { Overall } from '../lib/garments/fit';
import { CATEGORY_LABEL, slotOf, type Garment } from '../lib/garments/types';
import type { DressedItem } from '../lib/outfit';
import { useStore } from '../state/store';
import { FitReport } from './FitReport';

const LEVEL_CLASS: Record<Overall['level'], string> = {
  'too-small': 'bad', tight: 'warn', good: 'good', loose: 'neutral', unknown: 'neutral',
};

interface Props {
  dressed: DressedItem[];
  /** Best size per closet garment for the current body. */
  recommended: Record<string, string | null>;
  onAdd(): void;
  onEdit(g: Garment): void;
  onHover(id: string | null): void;
}

export function OutfitPanel({ dressed, recommended, onAdd, onEdit, onHover }: Props) {
  const unit = useStore((s) => s.unit);
  const closet = useStore((s) => s.closet);
  const worn = useStore((s) => s.worn);
  const outfits = useStore((s) => s.outfits);
  const wearGarment = useStore((s) => s.wearGarment);
  const takeOff = useStore((s) => s.takeOff);
  const setSize = useStore((s) => s.setSize);
  const setTucked = useStore((s) => s.setTucked);
  const removeGarment = useStore((s) => s.removeGarment);
  const clearOutfit = useStore((s) => s.clearOutfit);
  const saveOutfit = useStore((s) => s.saveOutfit);
  const loadOutfit = useStore((s) => s.loadOutfit);
  const deleteOutfit = useStore((s) => s.deleteOutfit);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'top' | 'bottom' | 'dress' | 'shoes'>('all');

  const hasBottom = dressed.some((d) => slotOf(d.garment.category) === 'bottom');
  // Show outermost first, the way you would describe an outfit.
  const list = [...dressed].reverse();
  const wornIds = new Set(worn.map((w) => w.garmentId));
  const shown = closet.filter((g) => filter === 'all' || slotOf(g.category) === filter);

  return (
    <aside className="panel panel-right" aria-label="Outfit and closet">
      <div className="panel-head">
        <div className="head-row">
          <h2>Wearing</h2>
          {dressed.length > 0 && (
            <div className="button-row tight">
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  const name = window.prompt('Name this outfit', `Outfit ${outfits.length + 1}`);
                  if (name?.trim()) saveOutfit(name.trim());
                }}
              >Save outfit</button>
              <button type="button" className="btn small ghost" onClick={clearOutfit}>Undress</button>
            </div>
          )}
        </div>
      </div>

      {dressed.length === 0 && <p className="empty">Nothing on yet. Pick pieces from the closet below, or add clothing from any shop.</p>}

      <ul className="worn-list">
        {list.map(({ garment: g, fit, worn: w, recommended: rec }) => {
          const expanded = open === g.id;
          return (
            <li key={g.id} className="worn" onMouseEnter={() => onHover(g.id)} onMouseLeave={() => onHover(null)}>
              <div className="worn-main">
                <span className="swatch" style={{ background: g.color }} aria-hidden />
                <div className="worn-title">
                  <span className="name">{g.name}</span>
                  <span className="muted">{[g.brand, CATEGORY_LABEL[g.category]].filter(Boolean).join(' · ')}</span>
                </div>
                <label className="size-pick">
                  <span className="sr-only">Size of {g.name}</span>
                  <select value={fit.size} onChange={(e) => setSize(g.id, e.target.value)}>
                    {g.chart.rows.map((r) => (
                      <option key={r.label} value={r.label}>{r.label}{rec === r.label ? '  ★' : ''}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="icon-btn" aria-label={`Take off ${g.name}`} title="Take off" onClick={() => takeOff(g.id)}>×</button>
              </div>
              <button type="button" className={`fit-line tone-${LEVEL_CLASS[fit.overall.level]}`} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : g.id)}>
                <span className="fit-headline">{fit.overall.headline}</span>
                <span className="chev" aria-hidden>{expanded ? '–' : '+'}</span>
              </button>
              {rec && rec !== fit.size && (
                <p className="rec">
                  Best size for this body: <button type="button" className="link" onClick={() => setSize(g.id, rec)}>{rec}</button>
                </p>
              )}
              {slotOf(g.category) === 'top' && hasBottom && (g.category === 'tee' || g.category === 'tank' || g.category === 'shirt') && (
                <label className="check">
                  <input type="checkbox" checked={!!w.tucked} onChange={(e) => setTucked(g.id, e.target.checked)} />
                  Tucked in
                </label>
              )}
              {expanded && <FitReport fit={fit} unit={unit} />}
            </li>
          );
        })}
      </ul>

      {outfits.length > 0 && (
        <section className="saved">
          <h3>Saved outfits</h3>
          <ul>
            {outfits.map((o) => (
              <li key={o.id}>
                <button type="button" className="link" onClick={() => loadOutfit(o.id)}>{o.name}</button>
                <span className="muted">{o.worn.length} {o.worn.length === 1 ? 'piece' : 'pieces'}</span>
                <button type="button" className="icon-btn" aria-label={`Delete outfit ${o.name}`} title="Delete" onClick={() => deleteOutfit(o.id)}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="panel-head closet-head">
        <div className="head-row">
          <h2>Closet</h2>
          <button type="button" className="btn primary small" onClick={onAdd}>+ Add clothing</button>
        </div>
        <div className="segmented wide" role="group" aria-label="Filter closet">
          {(['all', 'top', 'bottom', 'dress', 'shoes'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'top' ? 'Tops' : f === 'bottom' ? 'Bottoms' : f === 'dress' ? 'Dresses' : 'Shoes'}
            </button>
          ))}
        </div>
      </div>

      <ul className="closet">
        {shown.map((g) => {
          const on = wornIds.has(g.id);
          const rec = recommended[g.id] ?? null;
          return (
            <li key={g.id} className={`card${on ? ' on' : ''}`}>
              <button
                type="button"
                className="card-main"
                aria-pressed={on}
                title={on ? 'Take off' : 'Try on'}
                onClick={() => (on ? takeOff(g.id) : wearGarment(g.id, rec ?? g.chart.rows[Math.floor(g.chart.rows.length / 2)]?.label ?? ''))}
              >
                {g.image
                  ? <img src={g.image} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ background: g.color }} onError={(e) => { e.currentTarget.removeAttribute('src'); e.currentTarget.classList.add('img-missing'); }} />
                  : <span className="card-swatch" style={{ background: g.color }} aria-hidden />}
                <span className="card-text">
                  <span className="name">{g.name}</span>
                  <span className="muted">{[g.brand, g.price].filter(Boolean).join(' · ') || CATEGORY_LABEL[g.category]}</span>
                  <span className="muted">{rec ? `Best size ${rec}` : `${g.chart.rows.length} sizes`}</span>
                </span>
                <span className="card-state">{on ? 'On' : 'Try on'}</span>
              </button>
              <div className="card-tools">
                {g.url && <a href={g.url} target="_blank" rel="noreferrer noopener">Shop page</a>}
                <button type="button" className="link" onClick={() => onEdit(g)}>Edit</button>
                <button
                  type="button"
                  className="link"
                  onClick={() => { if (window.confirm(`Remove “${g.name}” from the closet?`)) removeGarment(g.id); }}
                >Remove</button>
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="empty">Nothing here yet.</li>}
      </ul>
    </aside>
  );
}
