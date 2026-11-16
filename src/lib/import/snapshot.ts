/**
 * Reduce a parsed HTML document to a PageSnapshot. Runs in the browser (and
 * under jsdom in tests). The bookmarklet in bookmarklet.ts mirrors this logic
 * inside the shop's own page.
 */
import type { PageSnapshot, SnapshotTable } from './extract';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function tablesOfDocument(doc: Document): SnapshotTable[] {
  const out: SnapshotTable[] = [];
  doc.querySelectorAll('table').forEach((table) => {
    if (out.length >= 24) return;
    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      if (tr.closest('table') !== table || rows.length >= 60) return;
      const cells: string[] = [];
      tr.querySelectorAll('th,td').forEach((cell) => {
        if (cell.closest('tr') !== tr) return;
        cells.push(text(cell));
        // Keep columns aligned under a spanning header.
        const span = Math.min(Number(cell.getAttribute('colspan')) || 1, 12);
        for (let i = 1; i < span; i++) cells.push('');
      });
      if (cells.length) rows.push(cells);
    });
    if (rows.length < 2) return;
    // Context: caption plus the nearest preceding heading or paragraph.
    const bits: string[] = [text(table.querySelector('caption'))];
    let node: Element | null = table;
    for (let hops = 0; node && hops < 4 && bits.join(' ').length < 300; hops++) {
      let prev: Element | null = node.previousElementSibling;
      for (let k = 0; prev && k < 3; k++, prev = prev.previousElementSibling) {
        const t = text(prev);
        if (t && t.length < 300) bits.push(t);
      }
      node = node.parentElement;
    }
    out.push({ rows, context: bits.filter(Boolean).join(' · ').slice(0, 500) });
  });
  return out;
}

export function snapshotFromDocument(doc: Document, url: string): PageSnapshot {
  const meta: Record<string, string> = {};
  doc.querySelectorAll('meta[property],meta[name]').forEach((m) => {
    const key = (m.getAttribute('property') ?? m.getAttribute('name') ?? '').toLowerCase();
    const value = m.getAttribute('content');
    if (key && value && !(key in meta) && /^(og:|twitter:|product:|description$)/.test(key)) meta[key] = value.slice(0, 600);
  });
  const jsonLd: unknown[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      jsonLd.push(JSON.parse(s.textContent ?? ''));
    } catch {
      /* malformed structured data is common; skip it */
    }
  });
  // Fabric and fit hints usually live in the description block.
  const hints: string[] = [];
  doc.querySelectorAll('[class*="description" i],[class*="detail" i],[class*="material" i],[class*="composition" i],[itemprop="description"]').forEach((el) => {
    if (hints.join(' ').length < 3000) hints.push(text(el).slice(0, 1200));
  });
  return {
    url,
    title: text(doc.querySelector('title')),
    meta,
    jsonLd,
    tables: tablesOfDocument(doc),
    text: hints.join(' ').slice(0, 3000),
  };
}

export function snapshotFromHtml(html: string, url: string): PageSnapshot {
  return snapshotFromDocument(new DOMParser().parseFromString(html, 'text/html'), url);
}

export function tablesOfHtml(html: string): SnapshotTable[] {
  return tablesOfDocument(new DOMParser().parseFromString(html, 'text/html'));
}

export function isSnapshot(v: unknown): v is PageSnapshot {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return typeof s.url === 'string' && Array.isArray(s.tables) && Array.isArray(s.jsonLd) && typeof s.meta === 'object';
}
