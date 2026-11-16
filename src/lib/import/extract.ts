/**
 * Product extraction. A page is first reduced to a small, serialisable
 * snapshot (structured data, meta tags, tables) — by the app from fetched
 * HTML, or by the bookmarklet inside the shopper's own browser — and the
 * snapshot is then turned into a garment draft.
 */
import type { Category, FitIntent, Neckline, SleeveStyle } from '../garments/types';
import { parseSizeTable, type ParsedChart } from './sizechart';

export interface SnapshotTable {
  rows: string[][];
  /** Caption, nearby heading and other text that describes the table. */
  context: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  meta: Record<string, string>;
  jsonLd: unknown[];
  tables: SnapshotTable[];
  /** Visible text near the product description, for fabric and fit hints. */
  text: string;
}

export interface ProductDraft {
  name: string;
  brand?: string;
  url?: string;
  image?: string;
  price?: string;
  category: Category;
  stretch: number;
  fitIntent: FitIntent;
  neckline: Neckline;
  sleeves: SleeveStyle;
  /** Colour name from the page, if any. */
  colorName?: string;
  /** Candidate size charts, best first. */
  charts: ParsedChart[];
  /** Sizes the shop lists for sale. */
  sizes: string[];
  notes: string[];
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const asArray = <T,>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v.trim() || undefined : typeof v === 'number' ? String(v) : undefined;

function typeIs(node: Json, name: string): boolean {
  return asArray(node['@type'] as string | string[]).some((t) => typeof t === 'string' && t.toLowerCase() === name.toLowerCase());
}

/** Every object in a JSON-LD payload, flattening @graph and nesting. */
function flattenLd(input: unknown, out: Json[] = [], depth = 0): Json[] {
  if (depth > 6) return out;
  if (Array.isArray(input)) input.forEach((x) => flattenLd(x, out, depth + 1));
  else if (isObj(input)) {
    out.push(input);
    if (input['@graph']) flattenLd(input['@graph'], out, depth + 1);
    if (input.mainEntity) flattenLd(input.mainEntity, out, depth + 1);
  }
  return out;
}

function imageOf(v: unknown): string | undefined {
  for (const x of asArray(v as unknown)) {
    if (typeof x === 'string' && x) return x;
    if (isObj(x)) {
      const u = str(x.url) ?? str(x.contentUrl) ?? str(x.src);
      if (u) return u;
    }
  }
  return undefined;
}

function absolutise(u: string | undefined, base: string): string | undefined {
  if (!u) return undefined;
  try {
    return new URL(u.startsWith('//') ? `https:${u}` : u, base || undefined).toString();
  } catch {
    return u;
  }
}

const CURRENCY: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'CA$', AUD: 'A$' };

function formatPrice(amount: unknown, currency: unknown): string | undefined {
  const a = str(amount);
  if (!a) return undefined;
  const n = Number(a.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const c = str(currency)?.toUpperCase();
  const body = n % 1 === 0 ? String(n) : n.toFixed(2);
  return c ? (CURRENCY[c] ? `${CURRENCY[c]}${body}` : `${body} ${c}`) : body;
}

export function guessCategory(text: string): Category {
  const t = ` ${text.toLowerCase()} `;
  const has = (re: RegExp) => re.test(t);
  if (has(/dress shirt/)) return 'shirt';
  if (has(/\b(sneakers?|trainers?|boots?|loafers?|sandals?|shoes?|heels|pumps|mules?|slippers?|derbys?|derbies|espadrilles?)\b/)) return 'shoes';
  if (has(/\b(skirts?|skort)\b/)) return 'skirt';
  if (has(/\b(shorts|bermudas?|trunks)\b/)) return 'shorts';
  if (has(/\b(jeans?|pants?|trousers?|chinos?|leggings?|joggers?|sweatpants|slacks|cargos?|tights|culottes)\b/)) return 'pants';
  if (has(/\b(dress|dresses|gown|jumpsuit|romper)\b/)) return 'dress';
  if (has(/\b(coat|parka|trench|overcoat|anorak|puffer|peacoat)\b/)) return 'coat';
  if (has(/\b(jacket|blazer|bomber|windbreaker|shacket|overshirt|gilet)\b/)) return 'jacket';
  if (has(/\b(hoodie|hoody|sweatshirt|sweater|cardigan|pullover|jumper|knit|knitwear|crewneck|fleece|quarter[- ]zip|half[- ]zip)\b/)) return 'sweater';
  if (has(/\b(tank|sleeveless|camisole|cami|singlet|bralette|vest top|crop top)\b/)) return 'tank';
  if (has(/\b(t-?shirts?|tees?|polo|henley|jersey|top|bodysuit)\b/)) return 'tee';
  if (has(/\b(shirt|blouse|button[- ]?(up|down)|flannel|oxford)\b/)) return 'shirt';
  return 'tee';
}

export function guessStretch(text: string, category: Category): number {
  const t = text.toLowerCase();
  const m = t.match(/(\d{1,2})\s*%\s*(elastane|spandex|lycra|elastan)/) ?? t.match(/(elastane|spandex|lycra|elastan)\s*(\d{1,2})\s*%/);
  if (m) {
    const pct = Number(/^\d/.test(m[1]) ? m[1] : m[2]);
    return Math.min(0.6, 0.03 + 0.05 * pct);
  }
  if (/\b(leggings?|tights|compression)\b/.test(t)) return 0.5;
  if (/\b(rib|ribbed|jersey|knit|knitted|fleece|french terry|stretch)\b/.test(t)) return category === 'sweater' ? 0.2 : 0.15;
  switch (category) {
    case 'tee': case 'tank': return 0.15;
    case 'sweater': return 0.2;
    case 'dress': return 0.05;
    case 'pants': case 'shorts': case 'skirt': return 0.03;
    case 'shoes': return 0;
    default: return 0.02;
  }
}

export function guessFitIntent(text: string): FitIntent {
  const t = text.toLowerCase();
  if (/\b(compression|second[- ]skin|leggings?|tights|bodycon)\b/.test(t)) return 'skin';
  if (/\b(oversized|over-sized|boxy)\b/.test(t)) return 'oversized';
  if (/\b(relaxed|loose|baggy|wide[- ]leg|roomy|easy fit)\b/.test(t)) return 'relaxed';
  if (/\b(slim|skinny|fitted|tailored fit|tapered)\b/.test(t)) return 'slim';
  return 'regular';
}

export function guessNeckline(text: string, category: Category): Neckline {
  const t = text.toLowerCase();
  if (/\bv[- ]?neck\b/.test(t)) return 'vneck';
  if (/\b(turtle ?neck|mock ?neck|roll ?neck|polo ?neck|funnel)\b/.test(t)) return 'turtle';
  if (/\bscoop\b/.test(t)) return 'scoop';
  if (/\b(polo|collar|button[- ]?(up|down))\b/.test(t)) return 'collar';
  if (category === 'shirt' || category === 'jacket' || category === 'coat') return 'collar';
  if (category === 'tank' || category === 'dress') return 'scoop';
  return 'crew';
}

export function guessSleeves(text: string): SleeveStyle {
  const t = text.toLowerCase();
  if (/\b(sleeveless|strapless|tank|cami|camisole|strappy|halter)\b/.test(t)) return 'none';
  if (/\blong[- ]sleeved?\b/.test(t)) return 'long';
  if (/\bshort[- ]sleeved?\b/.test(t)) return 'short';
  return 'auto';
}

function chartsFromTables(tables: SnapshotTable[]): ParsedChart[] {
  const charts: ParsedChart[] = [];
  for (const t of tables) {
    const c = parseSizeTable(t.rows, t.context);
    if (c && c.rows.length >= 1) charts.push(c);
  }
  charts.sort((a, b) => b.confidence - a.confidence);
  // Brands often print the same chart twice (cm and inches); keep distinct ones.
  const seen = new Set<string>();
  return charts.filter((c) => {
    const sig = `${c.unit}|${c.columns.map((x) => x.key).join(',')}|${c.rows.map((r) => r.label).join(',')}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

export function extractProduct(snap: PageSnapshot): ProductDraft {
  const nodes = snap.jsonLd.flatMap((x) => flattenLd(x));
  const product = nodes.find((n) => typeIs(n, 'Product')) ?? nodes.find((n) => typeIs(n, 'ProductGroup'));
  const meta = snap.meta;
  const notes: string[] = [];

  let name = str(product?.name) ?? meta['og:title'] ?? meta['twitter:title'] ?? snap.title;
  name = (name ?? '').replace(/\s+/g, ' ').trim();
  const brandNode = product?.brand;
  let brand = isObj(brandNode) ? str(brandNode.name) : str(brandNode);
  brand = brand ?? meta['product:brand'] ?? meta['og:site_name'];
  // Shop titles tend to end in " | Brand" or " – Brand".
  if (brand) {
    const tail = new RegExp(`\\s*[|–—-]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    name = name.replace(tail, '');
  }

  const image = absolutise(imageOf(product?.image) ?? meta['og:image:secure_url'] ?? meta['og:image'] ?? meta['twitter:image'], snap.url);

  const offers = asArray(product?.offers as unknown).filter(isObj);
  const variants = asArray(product?.hasVariant as unknown).filter(isObj);
  const allOffers = [...offers, ...variants.flatMap((v) => asArray(v.offers as unknown).filter(isObj))];
  let price: string | undefined;
  for (const o of allOffers) {
    price = formatPrice(o.price ?? o.lowPrice, o.priceCurrency);
    if (!price && isObj(o.priceSpecification)) price = formatPrice(o.priceSpecification.price, o.priceSpecification.priceCurrency);
    if (price) break;
  }
  price = price ?? formatPrice(meta['product:price:amount'] ?? meta['og:price:amount'], meta['product:price:currency'] ?? meta['og:price:currency']);

  const sizes: string[] = [];
  const addSize = (v: unknown) => {
    const s = str(v);
    if (s && s.length <= 14 && !sizes.includes(s)) sizes.push(s);
  };
  asArray(product?.size as unknown).forEach(addSize);
  variants.forEach((v) => addSize(v.size));

  const description = str(product?.description) ?? meta['og:description'] ?? meta.description ?? '';
  const material = str(product?.material) ?? '';
  const categoryText = [str(product?.category), meta['product:category'], name, snap.url.replace(/[-_/]/g, ' ')].filter(Boolean).join(' ');
  const hintText = [name, description, material, snap.text].join(' ').slice(0, 6000);

  const category = guessCategory(categoryText || snap.title);
  const charts = chartsFromTables(snap.tables);
  if (!charts.length) {
    notes.push('No size chart was found in the page itself. Many shops load it in a pop-up: open the size guide on the product page and use the bookmarklet, or paste the chart below.');
  } else if (charts[0].unitGuessed) {
    notes.push('The chart does not state its unit — check the unit selected below.');
  }
  if (!name) notes.push('Could not read a product name from the page.');

  return {
    name: name || 'Untitled garment',
    brand,
    url: snap.url || undefined,
    image,
    price,
    category,
    stretch: guessStretch(`${material} ${description} ${snap.text}`.slice(0, 6000), category),
    fitIntent: guessFitIntent(`${name} ${description}`.slice(0, 3000)),
    neckline: guessNeckline(hintText.slice(0, 1500), category),
    sleeves: guessSleeves(`${name} ${description}`.slice(0, 1500)),
    colorName: str(product?.color) ?? meta['product:color'],
    charts,
    sizes,
    notes,
  };
}

/** Shopify exposes product data at /products/<handle>.js on every storefront. */
export function shopifyJsonUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^(.*\/products\/[^/]+?)(\.js|\.json)?\/?$/);
    return m ? `${u.origin}${m[1]}.js` : null;
  } catch {
    return null;
  }
}

/** Merge Shopify product JSON into a draft. `tablesOf` parses the description HTML. */
export function mergeShopify(draft: ProductDraft, data: unknown, tablesOf: (html: string) => SnapshotTable[]): ProductDraft {
  if (!isObj(data) || !str(data.title)) return draft;
  const out = { ...draft, notes: [...draft.notes] };
  out.name = str(data.title) ?? out.name;
  out.brand = str(data.vendor) ?? out.brand;
  const featured = imageOf(data.featured_image) ?? imageOf(data.images);
  out.image = absolutise(featured, draft.url ?? '') ?? out.image;
  const cents = Number(data.price);
  if (!out.price && Number.isFinite(cents) && cents > 0) out.price = (cents / 100).toFixed(2).replace(/\.00$/, '');
  const options = asArray(data.options as unknown).filter(isObj);
  const sizeOpt = options.find((o) => /size|taille|gr[öo]ße|talla/i.test(str(o.name) ?? ''));
  const sizes = asArray(sizeOpt?.values as unknown).map(str).filter((s): s is string => !!s);
  if (sizes.length) out.sizes = sizes;
  const type = `${str(data.type) ?? ''} ${asArray(data.tags as unknown).map(str).join(' ')}`;
  const html = str(data.description) ?? '';
  const text = html.replace(/<[^>]+>/g, ' ');
  out.category = guessCategory(`${out.name} ${str(data.type) ?? ''}`);
  out.stretch = guessStretch(`${text} ${type}`, out.category);
  out.fitIntent = guessFitIntent(`${out.name} ${text} ${type}`);
  out.neckline = guessNeckline(`${out.name} ${text}`.slice(0, 1500), out.category);
  out.sleeves = guessSleeves(`${out.name} ${text}`.slice(0, 1500));
  if (html && !out.charts.length) {
    out.charts = chartsFromTables(tablesOf(html));
    if (out.charts.length) out.notes = out.notes.filter((n) => !n.startsWith('No size chart'));
  }
  return out;
}
