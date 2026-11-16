/**
 * Browser-side import: fetch a product page through the app's proxy and turn
 * it into a draft garment.
 */
import { extractProduct, mergeShopify, shopifyJsonUrl, type ProductDraft } from './extract';
import { snapshotFromHtml, tablesOfHtml } from './snapshot';

interface ProxyResult {
  ok: boolean;
  status?: number;
  finalUrl?: string;
  body?: string;
  error?: string;
}

async function proxyFetch(url: string): Promise<ProxyResult> {
  let res: Response;
  try {
    res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
  } catch {
    return { ok: false, error: 'The import service is not reachable. Start the app with `npm run dev` or `npm start`.' };
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    return { ok: false, error: 'The import service is not running on this host (static deployment). Use the bookmarklet or paste the size chart instead.' };
  }
  return (await res.json()) as ProxyResult;
}

export class ImportError extends Error {}

export function normaliseUrl(input: string): string {
  const s = input.trim();
  if (!s) throw new ImportError('Paste a product page address first.');
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new ImportError('That does not look like a web address.');
  }
  if (!u.hostname.includes('.')) throw new ImportError('That does not look like a web address.');
  return u.toString();
}

export async function importFromUrl(input: string): Promise<ProductDraft> {
  const url = normaliseUrl(input);
  const page = await proxyFetch(url);
  let draft: ProductDraft | null = null;
  let blocked: string | null = null;
  if (page.ok && page.body) {
    draft = extractProduct(snapshotFromHtml(page.body, page.finalUrl ?? url));
  } else {
    blocked = page.error ?? (page.status ? `The shop answered with HTTP ${page.status}.` : 'The page could not be loaded.');
  }

  // Shopify storefronts publish product JSON even when the page itself is sparse.
  const jsonUrl = shopifyJsonUrl(page.finalUrl ?? url);
  if (jsonUrl && (!draft || !draft.charts.length || !draft.sizes.length || !draft.image)) {
    const res = await proxyFetch(jsonUrl);
    if (res.ok && res.body) {
      try {
        const data: unknown = JSON.parse(res.body);
        const seed: ProductDraft = draft ?? extractProduct({ url, title: '', meta: {}, jsonLd: [], tables: [], text: '' });
        const merged = mergeShopify(seed, data, tablesOfHtml);
        if (merged !== seed) {
          draft = merged;
          blocked = null;
        }
      } catch {
        /* not JSON: not a Shopify store */
      }
    }
  }

  if (!draft) {
    throw new ImportError(
      `${blocked} Some shops refuse automated requests — drag the bookmarklet to your bookmarks bar and click it on the product page, or add the piece manually.`,
    );
  }
  return draft;
}

/** Average colour of the product in an image, ignoring the studio backdrop. */
export async function dominantColor(imageUrl: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `/api/image?url=${encodeURIComponent(imageUrl)}`;
    await img.decode();
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const px = ctx.getImageData(0, 0, size, size).data;
    const at = (x: number, y: number) => {
      const i = (y * size + x) * 4;
      return [px[i], px[i + 1], px[i + 2], px[i + 3]] as const;
    };
    // The backdrop is whatever the corners agree on.
    const corners = [at(1, 1), at(size - 2, 1), at(1, size - 2), at(size - 2, size - 2)];
    const bg = [0, 1, 2].map((c) => corners.reduce((a, p) => a + p[c], 0) / 4);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.floor(size * 0.2); y < size * 0.8; y++) {
      for (let x = Math.floor(size * 0.25); x < size * 0.75; x++) {
        const p = at(x, y);
        if (p[3] < 128) continue;
        const d = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]);
        if (d < 36) continue;
        r += p[0]; g += p[1]; b += p[2]; n++;
      }
    }
    if (n < 30) return null;
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return null;
  }
}
