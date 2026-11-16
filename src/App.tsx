import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildBody } from './lib/body';
import { FIT_LEGEND, scoreToCss } from './lib/colors';
import { bodyBase, recommendSize } from './lib/garments/fit';
import type { Garment } from './lib/garments/types';
import { BOOKMARKLET_HASH, IMPORT_MESSAGE, READY_MESSAGE } from './lib/import/bookmarklet';
import { extractProduct } from './lib/import/extract';
import { isSnapshot } from './lib/import/snapshot';
import { buildBodyMesh } from './lib/mesh';
import { dressBody } from './lib/outfit';
import { fmt } from './lib/units';
import { useStore } from './state/store';
import { Viewport, type GarmentLayer } from './three/Viewport';
import { draftFromProduct, GarmentEditor, type EditorSeed } from './ui/GarmentEditor';
import { MeasurementsPanel } from './ui/MeasurementsPanel';
import { OutfitPanel } from './ui/OutfitPanel';

export function App() {
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);
  const measurements = useStore((s) => s.measurements);
  const closet = useStore((s) => s.closet);
  const worn = useStore((s) => s.worn);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const addGarment = useStore((s) => s.addGarment);
  const updateGarment = useStore((s) => s.updateGarment);
  const wearGarment = useStore((s) => s.wearGarment);

  const [editor, setEditor] = useState<{ seed: EditorSeed | null } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const body = useMemo(() => buildBody(measurements), [measurements]);
  const bodyMesh = useMemo(() => buildBodyMesh(body), [body]);
  const dressed = useMemo(() => dressBody(body, closet, worn, (cm) => fmt(cm, unit)), [body, closet, worn, unit]);
  const layers = useMemo<GarmentLayer[]>(() => dressed.map((d) => ({ id: d.garment.id, mesh: d.mesh, color: d.garment.color })), [dressed]);
  const recommended = useMemo(() => {
    const base = bodyBase(body);
    const out: Record<string, string | null> = {};
    for (const g of closet) out[g.id] = recommendSize(body, g, base)?.size ?? null;
    return out;
  }, [body, closet]);

  // Receive a product captured by the bookmarklet in another tab.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: unknown; snapshot?: unknown } | null;
      if (!data || data.type !== IMPORT_MESSAGE || !isSnapshot(data.snapshot)) return;
      setEditor({ seed: { ...draftFromProduct(extractProduct(data.snapshot)), isNew: true } });
    };
    window.addEventListener('message', onMessage);
    if (window.location.hash === BOOKMARKLET_HASH) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      (window.opener as Window | null)?.postMessage(READY_MESSAGE, '*');
    }
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const closeEditor = useCallback(() => setEditor(null), []);
  const save = (g: Garment, isNew: boolean) => {
    if (isNew) {
      addGarment(g);
      const best = recommendSize(body, g, bodyBase(body))?.size ?? g.chart.rows[Math.floor(g.chart.rows.length / 2)]?.label;
      if (best) wearGarment(g.id, best);
    } else updateGarment(g);
    setEditor(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">Atelier</span>
          <span className="tagline">Try on anything, at its real size</span>
        </div>
        <div className="topbar-tools">
          <div className="segmented" role="group" aria-label="Units">
            <button type="button" aria-pressed={unit === 'cm'} onClick={() => setUnit('cm')}>cm</button>
            <button type="button" aria-pressed={unit === 'in'} onClick={() => setUnit('in')}>in</button>
          </div>
        </div>
      </header>

      <MeasurementsPanel body={body} />

      <main className="stage">
        <Viewport body={bodyMesh} height={body.lm.topY} garments={layers} view={view} highlightId={hover} />
        <div className="stage-tools">
          <div className="segmented" role="group" aria-label="Display">
            <button type="button" aria-pressed={view === 'fabric'} onClick={() => setView('fabric')}>Fabric</button>
            <button type="button" aria-pressed={view === 'fit'} onClick={() => setView('fit')}>Fit map</button>
          </div>
        </div>
        {view === 'fit' && (
          <ul className="legend" aria-label="Fit map colours">
            {FIT_LEGEND.map((l) => (
              <li key={l.label}><span className="dot" style={{ background: scoreToCss(l.score) }} aria-hidden />{l.label}</li>
            ))}
          </ul>
        )}
        <p className="stage-hint">Drag to turn · scroll to zoom · right-drag to move</p>
      </main>

      <OutfitPanel
        dressed={dressed}
        recommended={recommended}
        onAdd={() => setEditor({ seed: null })}
        onEdit={(g) => setEditor({ seed: { garment: g, isNew: false } })}
        onHover={setHover}
      />

      {editor && <GarmentEditor key={editor.seed?.garment.id ?? 'new'} seed={editor.seed} onClose={closeEditor} onSave={save} />}
    </div>
  );
}
