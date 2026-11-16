import { useEffect, useRef, useState } from 'react';
import {
  CATEGORIES, CATEGORY_LABEL, FIT_INTENT_LABEL, NECKLINE_LABEL, isUpper, slotOf,
  type Category, type DimKey, type FitIntent, type Garment, type Neckline, type SizeChart, type SleeveStyle,
} from '../lib/garments/types';
import { bookmarkletHref } from '../lib/import/bookmarklet';
import { dominantColor, importFromUrl, ImportError } from '../lib/import/client';
import type { ProductDraft } from '../lib/import/extract';
import { blankChart, type ParsedChart } from '../lib/import/sizechart';
import { newId } from '../state/store';
import { ChartEditor } from './ChartEditor';

const DEFAULT_COLOR: Record<Category, string> = {
  tee: '#e8e4dc', tank: '#e8e4dc', shirt: '#c9d6e6', sweater: '#8a8f7c', jacket: '#4b4f55', coat: '#3c3a38',
  dress: '#5d6f7f', pants: '#3a4660', shorts: '#8c8576', skirt: '#2b2b2e', shoes: '#efede8',
};

const DEFAULT_COLUMNS: Record<Category, DimKey[]> = {
  tee: ['chest', 'length', 'shoulder', 'sleeve'], tank: ['chest', 'length'], shirt: ['chest', 'length', 'shoulder', 'sleeve'],
  sweater: ['chest', 'length', 'shoulder', 'sleeve'], jacket: ['chest', 'length', 'shoulder', 'sleeve'], coat: ['chest', 'length', 'shoulder', 'sleeve'],
  dress: ['chest', 'waist', 'hip', 'length'], pants: ['waist', 'hip', 'rise', 'thigh', 'inseam', 'legOpening'],
  shorts: ['waist', 'hip', 'rise', 'inseam'], skirt: ['waist', 'hip', 'length'], shoes: ['footLength'],
};

const STRETCH_OPTIONS: Array<[number, string]> = [
  [0, 'None — rigid woven, leather'],
  [0.03, 'Slight — denim, twill, poplin'],
  [0.08, 'Comfort stretch — 1–2% elastane'],
  [0.15, 'Knit — jersey, T-shirt fabric'],
  [0.25, 'Stretchy knit — rib, sweater knit'],
  [0.5, 'High stretch — leggings, swim'],
];

const nearestStretch = (v: number) => STRETCH_OPTIONS.reduce((best, o) => (Math.abs(o[0] - v) < Math.abs(best - v) ? o[0] : best), 0);
const safeUrl = (u: string | undefined) => (u && /^https?:\/\//i.test(u) ? u : undefined);
const stripChart = (c: ParsedChart | SizeChart): SizeChart => ({ unit: c.unit, kind: c.kind, columns: c.columns, rows: c.rows });

export function draftFromProduct(d: ProductDraft): { garment: Garment; charts: ParsedChart[]; notes: string[] } {
  const sizes = d.sizes.length ? d.sizes : ['XS', 'S', 'M', 'L', 'XL'];
  return {
    garment: {
      id: newId('g'),
      name: d.name,
      brand: d.brand,
      url: safeUrl(d.url),
      image: safeUrl(d.image),
      price: d.price,
      category: d.category,
      color: DEFAULT_COLOR[d.category],
      stretch: nearestStretch(d.stretch),
      fitIntent: d.fitIntent,
      neckline: d.neckline,
      sleeves: d.sleeves,
      chart: d.charts[0] ? stripChart(d.charts[0]) : blankChart(DEFAULT_COLUMNS[d.category], sizes),
      source: 'import',
    },
    charts: d.charts,
    notes: d.notes,
  };
}

export function blankGarment(): Garment {
  return {
    id: newId('g'), name: '', category: 'tee', color: DEFAULT_COLOR.tee, stretch: 0.15, fitIntent: 'regular',
    neckline: 'crew', sleeves: 'auto', chart: blankChart(DEFAULT_COLUMNS.tee, ['S', 'M', 'L']), source: 'manual',
  };
}

export interface EditorSeed {
  garment: Garment;
  charts?: ParsedChart[];
  notes?: string[];
  isNew: boolean;
}

interface Props {
  /** Null opens the "add clothing" start screen. */
  seed: EditorSeed | null;
  onClose(): void;
  onSave(g: Garment, isNew: boolean): void;
}

export function GarmentEditor({ seed, onClose, onSave }: Props) {
  const [state, setState] = useState<EditorSeed | null>(seed);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [colorTouched, setColorTouched] = useState(!!seed && !seed.isNew);
  const [chartIndex, setChartIndex] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const bookmarklet = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    dialog.current?.querySelector<HTMLElement>('input,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // React refuses javascript: URLs in JSX, so the bookmarklet link is set directly.
  useEffect(() => {
    bookmarklet.current?.setAttribute('href', bookmarkletHref(window.location.origin));
  }, [state]);

  // Pick up the garment's colour from the product photo.
  const image = state?.garment.image;
  const isNew = state?.isNew;
  useEffect(() => {
    if (!image || !isNew || colorTouched) return;
    let live = true;
    void dominantColor(image).then((c) => {
      if (live && c) setState((s) => (s && !colorTouched ? { ...s, garment: { ...s.garment, color: c } } : s));
    });
    return () => { live = false; };
  }, [image, isNew, colorTouched]);

  const g = state?.garment;
  const patch = (p: Partial<Garment>) => setState((s) => (s ? { ...s, garment: { ...s.garment, ...p } } : s));

  const runImport = async () => {
    setBusy(true);
    setError('');
    try {
      const draft = await importFromUrl(url);
      setState({ ...draftFromProduct(draft), isNew: true });
      setChartIndex(0);
    } catch (err) {
      setError(err instanceof ImportError ? err.message : 'Something went wrong while reading that page.');
    } finally {
      setBusy(false);
    }
  };

  const measured = g ? g.chart.rows.some((r) => r.values.some((v, i) => v && g.chart.columns[i]?.key !== 'ignore')) : false;
  const canSave = !!g && g.name.trim().length > 0 && g.chart.rows.length > 0 && measured;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={g ? 'Garment details' : 'Add clothing'} ref={dialog}>
        <header className="modal-head">
          <h2>{!g ? 'Add clothing' : state!.isNew ? 'Check the details' : 'Edit garment'}</h2>
          <button type="button" className="icon-btn big" aria-label="Close" onClick={onClose}>×</button>
        </header>

        {!g && (
          <div className="modal-body">
            <section className="import-way">
              <h3>From a product page</h3>
              <p className="muted">Paste the address of any clothing product page — a boutique, a marketplace, a major retailer. Atelier reads the name, photo and size chart.</p>
              <form className="url-form" onSubmit={(e) => { e.preventDefault(); if (!busy && url.trim()) void runImport(); }}>
                <input
                  type="text"
                  inputMode="url"
                  aria-label="Product page address"
                  placeholder="https://shop.example.com/products/linen-shirt"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                />
                <button type="submit" className="btn primary" disabled={busy || !url.trim()}>{busy ? 'Reading…' : 'Import'}</button>
              </form>
              {error && <p className="error" role="alert">{error}</p>}
            </section>

            <section className="import-way">
              <h3>From your own browser</h3>
              <p className="muted">
                Some shops block automated requests, or only show their size guide in a pop-up. Drag this button to your bookmarks bar; then, on any
                product page — with the size guide open — click it to send the piece here.
              </p>
              <a ref={bookmarklet} className="bookmarklet" onClick={(e) => e.preventDefault()} title="Drag me to your bookmarks bar">
                Send to Atelier
              </a>
            </section>

            <section className="import-way">
              <h3>By hand</h3>
              <p className="muted">Type or paste a size chart yourself — useful for vintage, made-to-order or pieces you already own and have measured.</p>
              <button type="button" className="btn" onClick={() => setState({ garment: blankGarment(), isNew: true })}>Start with a blank garment</button>
            </section>
          </div>
        )}

        {g && (
          <>
            <div className="modal-body">
              {state!.notes?.map((n) => <p key={n} className="notice">{n}</p>)}
              <div className="editor-top">
                {g.image && <img className="editor-photo" src={g.image} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <div className="editor-fields">
                  <label>
                    <span className="label">Name</span>
                    <input type="text" value={g.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Linen camp shirt" />
                  </label>
                  <div className="two">
                    <label>
                      <span className="label">Brand / shop</span>
                      <input type="text" value={g.brand ?? ''} onChange={(e) => patch({ brand: e.target.value || undefined })} />
                    </label>
                    <label>
                      <span className="label">Type</span>
                      <select
                        value={g.category}
                        onChange={(e) => {
                          const category = e.target.value as Category;
                          const empty = !measured;
                          patch({
                            category,
                            ...(colorTouched ? {} : { color: DEFAULT_COLOR[category] }),
                            ...(empty ? { chart: blankChart(DEFAULT_COLUMNS[category], g.chart.rows.map((r) => r.label), g.chart.unit) } : {}),
                          });
                        }}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="two">
                    <label>
                      <span className="label">Fabric stretch</span>
                      <select value={g.stretch} onChange={(e) => patch({ stretch: Number(e.target.value) })}>
                        {STRETCH_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="label">Cut</span>
                      <select value={g.fitIntent} onChange={(e) => patch({ fitIntent: e.target.value as FitIntent })}>
                        {(Object.keys(FIT_INTENT_LABEL) as FitIntent[]).map((f) => <option key={f} value={f}>{FIT_INTENT_LABEL[f]}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="two">
                    {isUpper(g.category) && (
                      <label>
                        <span className="label">Neckline</span>
                        <select value={g.neckline} onChange={(e) => patch({ neckline: e.target.value as Neckline })}>
                          {(Object.keys(NECKLINE_LABEL) as Neckline[]).map((n) => <option key={n} value={n}>{NECKLINE_LABEL[n]}</option>)}
                        </select>
                      </label>
                    )}
                    {isUpper(g.category) && (
                      <label>
                        <span className="label">Sleeves</span>
                        <select value={g.sleeves} onChange={(e) => patch({ sleeves: e.target.value as SleeveStyle })}>
                          <option value="auto">Automatic</option>
                          <option value="none">Sleeveless</option>
                          <option value="short">Short</option>
                          <option value="long">Long</option>
                        </select>
                      </label>
                    )}
                    <label className="color-field">
                      <span className="label">Colour</span>
                      <input type="color" value={g.color} onChange={(e) => { setColorTouched(true); patch({ color: e.target.value }); }} />
                    </label>
                  </div>
                </div>
              </div>

              <section className="chart-section">
                <div className="chart-head">
                  <h3>Size chart</h3>
                  {state!.charts && state!.charts.length > 1 && (
                    <label className="inline">
                      <span className="label">Found {state!.charts.length} tables</span>
                      <select
                        value={chartIndex}
                        onChange={(e) => {
                          const i = Number(e.target.value);
                          setChartIndex(i);
                          patch({ chart: stripChart(state!.charts![i]) });
                        }}
                      >
                        {state!.charts.map((c, i) => (
                          <option key={i} value={i}>
                            Table {i + 1}: {c.columns.filter((x) => x.key !== 'ignore').map((x) => x.key).slice(0, 4).join(', ')} · {c.rows.length} sizes · {c.unit}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <p className="muted">
                  The simulator sizes the piece from these numbers, so check them against the shop’s size guide.
                  {slotOf(g.category) !== 'shoes' && ' Finished garment measurements give the most exact result.'}
                </p>
                <ChartEditor chart={g.chart} onChange={(chart) => patch({ chart })} />
              </section>
            </div>
            <footer className="modal-foot">
              {!canSave && <span className="muted">{g.name.trim() ? 'Add at least one measurement to the size chart.' : 'Give the piece a name.'}</span>}
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn primary" disabled={!canSave} onClick={() => onSave({ ...g, name: g.name.trim() }, state!.isNew)}>
                {state!.isNew ? 'Add to closet & try on' : 'Save changes'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
