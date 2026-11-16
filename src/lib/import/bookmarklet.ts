/**
 * The "Send to Atelier" bookmarklet. Shops that block automated requests, or
 * that only load their size guide in a pop-up, can still be imported: the
 * bookmarklet runs in the shopper's own tab, captures the product data and
 * any tables currently on the page (open the size guide first), and hands
 * them to this app in a new tab via postMessage.
 */
export const IMPORT_MESSAGE = 'atelier-import';
export const READY_MESSAGE = 'atelier-ready';
export const BOOKMARKLET_HASH = '#capture';

function capture(appOrigin: string, hash: string, readyMsg: string, importMsg: string) {
  const T = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const meta: Record<string, string> = {};
  document.querySelectorAll('meta[property],meta[name]').forEach((m) => {
    const k = (m.getAttribute('property') ?? m.getAttribute('name') ?? '').toLowerCase();
    const v = m.getAttribute('content');
    if (k && v && !(k in meta) && /^(og:|twitter:|product:|description$)/.test(k)) meta[k] = v.slice(0, 600);
  });
  const jsonLd: unknown[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      if ((s.textContent ?? '').length < 200000) jsonLd.push(JSON.parse(s.textContent ?? ''));
    } catch {
      /* ignore */
    }
  });
  const tables: Array<{ rows: string[][]; context: string }> = [];
  document.querySelectorAll('table').forEach((table) => {
    if (tables.length >= 24) return;
    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      if (tr.closest('table') !== table || rows.length >= 60) return;
      const cells: string[] = [];
      tr.querySelectorAll('th,td').forEach((c) => {
        if (c.closest('tr') !== tr) return;
        cells.push(T(c));
        const span = Math.min(Number(c.getAttribute('colspan')) || 1, 12);
        for (let i = 1; i < span; i++) cells.push('');
      });
      if (cells.length) rows.push(cells);
    });
    if (rows.length < 2) return;
    const bits = [T(table.querySelector('caption'))];
    let node: Element | null = table;
    for (let hops = 0; node && hops < 4 && bits.join(' ').length < 300; hops++) {
      let prev = node.previousElementSibling;
      for (let k = 0; prev && k < 3; k++, prev = prev.previousElementSibling) {
        const t = T(prev);
        if (t && t.length < 300) bits.push(t);
      }
      node = node.parentElement;
    }
    tables.push({ rows, context: bits.filter(Boolean).join(' · ').slice(0, 500) });
  });
  const hints: string[] = [];
  document
    .querySelectorAll('[class*="description" i],[class*="detail" i],[class*="material" i],[class*="composition" i],[itemprop="description"]')
    .forEach((el) => {
      if (hints.join(' ').length < 3000) hints.push(T(el).slice(0, 1200));
    });
  const snap = { url: location.href, title: document.title, meta, jsonLd, tables, text: hints.join(' ').slice(0, 3000) };
  const win = window.open(appOrigin + '/' + hash);
  if (!win) {
    alert('Atelier: allow pop-ups for this site, then click the bookmarklet again.');
    return;
  }
  const onReady = (e: MessageEvent) => {
    if (e.origin !== appOrigin || e.data !== readyMsg) return;
    window.removeEventListener('message', onReady);
    win.postMessage({ type: importMsg, snapshot: snap }, appOrigin);
  };
  window.addEventListener('message', onReady);
}

/** javascript: URL for the bookmarks bar, bound to wherever this app is served. */
export function bookmarkletHref(appOrigin: string): string {
  const args = [appOrigin, BOOKMARKLET_HASH, READY_MESSAGE, IMPORT_MESSAGE].map((a) => JSON.stringify(a)).join(',');
  return `javascript:(${capture.toString()})(${args});void 0`;
}
