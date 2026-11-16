// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractProduct, guessCategory, guessFitIntent, guessNeckline, guessSleeves, guessStretch, mergeShopify, shopifyJsonUrl } from '../src/lib/import/extract';
import { isSnapshot, snapshotFromHtml, tablesOfHtml } from '../src/lib/import/snapshot';

const PAGE = `<!doctype html><html><head>
<title>Linen Camp Shirt – Sand | Marlowe &amp; Finch</title>
<meta property="og:site_name" content="Marlowe &amp; Finch">
<meta property="og:image" content="//cdn.example.com/img/camp-shirt.jpg">
<meta name="description" content="A relaxed short-sleeve camp collar shirt in washed linen.">
<script type="application/ld+json">{ "@context": "https://schema.org", "@graph": [
  { "@type": "BreadcrumbList", "itemListElement": [] },
  { "@type": "Product", "name": "Linen Camp Shirt", "brand": { "@type": "Brand", "name": "Marlowe & Finch" },
    "image": ["https://cdn.example.com/img/camp-shirt-1.jpg"], "color": "Sand", "material": "100% linen",
    "description": "Relaxed fit, short sleeve, camp collar.",
    "offers": [{ "@type": "Offer", "price": "128.00", "priceCurrency": "USD" }] } ] }</script>
<script type="application/ld+json">{ broken json </script>
</head><body>
<div class="product-description">Woven from 100% European linen. Relaxed fit.</div>
<table><tr><th>Region</th><th>Delivery</th></tr><tr><td>EU</td><td>3 days</td></tr></table>
<h3>Garment measurements (inches)</h3>
<table>
  <thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Shoulder</th><th>Sleeve</th></tr></thead>
  <tbody>
    <tr><td>S</td><td>42</td><td>27.5</td><td>17.5</td><td>9</td></tr>
    <tr><td>M</td><td>44</td><td>28.5</td><td>18.25</td><td>9.5</td></tr>
    <tr><td>L</td><td>46</td><td>29.5</td><td>19</td><td>10</td></tr>
  </tbody>
</table>
</body></html>`;

describe('page snapshot', () => {
  const snap = snapshotFromHtml(PAGE, 'https://shop.example.com/products/linen-camp-shirt');

  it('collects structured data, meta tags and tables', () => {
    expect(isSnapshot(snap)).toBe(true);
    expect(snap.jsonLd).toHaveLength(1);
    expect(snap.meta['og:site_name']).toBe('Marlowe & Finch');
    expect(snap.tables).toHaveLength(2);
    expect(snap.tables[1].context).toMatch(/Garment measurements \(inches\)/);
    expect(snap.tables[1].rows[2]).toEqual(['M', '44', '28.5', '18.25', '9.5']);
    expect(snap.text).toMatch(/European linen/);
  });

  it('survives being serialised, as the bookmarklet does', () => {
    expect(extractProduct(JSON.parse(JSON.stringify(snap))).name).toBe('Linen Camp Shirt');
  });
});

describe('product extraction', () => {
  const draft = extractProduct(snapshotFromHtml(PAGE, 'https://shop.example.com/products/linen-camp-shirt'));

  it('reads the product', () => {
    expect(draft.name).toBe('Linen Camp Shirt');
    expect(draft.brand).toBe('Marlowe & Finch');
    expect(draft.price).toBe('$128');
    expect(draft.image).toBe('https://cdn.example.com/img/camp-shirt-1.jpg');
    expect(draft.colorName).toBe('Sand');
  });

  it('classifies it', () => {
    expect(draft.category).toBe('shirt');
    expect(draft.fitIntent).toBe('relaxed');
    expect(draft.neckline).toBe('collar');
    expect(draft.sleeves).toBe('short');
    expect(draft.stretch).toBeLessThan(0.05);
  });

  it('finds the size chart and ignores the shipping table', () => {
    expect(draft.charts).toHaveLength(1);
    const c = draft.charts[0];
    expect(c.unit).toBe('in');
    expect(c.kind).toBe('garment');
    expect(c.columns.map((x) => x.key)).toEqual(['chest', 'length', 'shoulder', 'sleeve']);
    expect(c.rows.map((r) => r.label)).toEqual(['S', 'M', 'L']);
    expect(draft.notes).toHaveLength(0);
  });

  it('falls back to meta tags and says so when there is no chart', () => {
    const html = `<html><head><title>Pleated Trousers | Atelier Nord</title>
      <meta property="og:title" content="Pleated Trousers | Atelier Nord"><meta property="og:site_name" content="Atelier Nord">
      <meta property="og:image" content="/media/trousers.jpg"><meta property="product:price:amount" content="189.5">
      <meta property="product:price:currency" content="EUR"></head><body></body></html>`;
    const d = extractProduct(snapshotFromHtml(html, 'https://nord.example/shop/pleated-trousers'));
    expect(d.name).toBe('Pleated Trousers');
    expect(d.brand).toBe('Atelier Nord');
    expect(d.image).toBe('https://nord.example/media/trousers.jpg');
    expect(d.price).toBe('€189.50');
    expect(d.category).toBe('pants');
    expect(d.charts).toHaveLength(0);
    expect(d.notes[0]).toMatch(/No size chart/);
  });

  it('reads sizes from product variants', () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"ProductGroup","name":"Rib Tank",
      "hasVariant":[{"@type":"Product","size":"S","offers":{"price":30,"priceCurrency":"GBP"}},{"@type":"Product","size":"M"}]}</script></head></html>`;
    const d = extractProduct(snapshotFromHtml(html, 'https://x.example/p/rib-tank'));
    expect(d.sizes).toEqual(['S', 'M']);
    expect(d.price).toBe('£30');
    expect(d.category).toBe('tank');
  });
});

describe('guesses', () => {
  it('categorises product names', () => {
    const cases: Array<[string, string]> = [
      ['Organic Cotton T-Shirt', 'tee'], ['Slim Fit Stretch Jeans', 'pants'], ['Short Sleeve Oxford Shirt', 'shirt'],
      ['Cargo Shorts', 'shorts'], ['Shirt Dress', 'dress'], ['Denim Jacket', 'jacket'], ['Wool Trench Coat', 'coat'],
      ['Cashmere Crewneck Sweater', 'sweater'], ['Pleated Midi Skirt', 'skirt'], ['Leather Chelsea Boots', 'shoes'],
      ['Bootcut Jeans', 'pants'], ['Dress Shirt', 'shirt'], ['Zip Hoodie', 'sweater'], ['Ribbed Tank', 'tank'],
    ];
    for (const [name, cat] of cases) expect(guessCategory(name), name).toBe(cat);
  });

  it('reads fabric and cut hints', () => {
    expect(guessStretch('98% cotton, 2% elastane', 'pants')).toBeCloseTo(0.13, 2);
    expect(guessStretch('100% cotton poplin', 'shirt')).toBe(0.02);
    expect(guessStretch('', 'tee')).toBe(0.15);
    expect(guessFitIntent('Oversized boxy tee')).toBe('oversized');
    expect(guessFitIntent('Slim tapered chino')).toBe('slim');
    expect(guessNeckline('V-neck merino', 'sweater')).toBe('vneck');
    expect(guessSleeves('Long-sleeve henley')).toBe('long');
    expect(guessSleeves('Sleeveless shell')).toBe('none');
  });
});

describe('Shopify storefronts', () => {
  it('derives the product JSON address', () => {
    expect(shopifyJsonUrl('https://shop.example.com/products/linen-camp-shirt?variant=1')).toBe('https://shop.example.com/products/linen-camp-shirt.js');
    expect(shopifyJsonUrl('https://shop.example.com/collections/all/products/tee/')).toBe('https://shop.example.com/collections/all/products/tee.js');
    expect(shopifyJsonUrl('https://shop.example.com/p/123')).toBeNull();
  });

  it('merges product JSON, including a chart in the description', () => {
    const seed = extractProduct({ url: 'https://shop.example.com/products/chore-coat', title: '', meta: {}, jsonLd: [], tables: [], text: '' });
    const merged = mergeShopify(seed, {
      title: 'Chore Coat', vendor: 'Field & Bench', type: 'Jackets', tags: ['workwear'], price: 24800,
      featured_image: '//cdn.shopify.example/chore.jpg',
      options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
      description: '<p>Heavy cotton canvas.</p><table><tr><th>Size</th><th>Pit to Pit (cm)</th><th>Length (cm)</th></tr><tr><td>S</td><td>55</td><td>68</td></tr><tr><td>M</td><td>58</td><td>70</td></tr></table>',
    }, tablesOfHtml);
    expect(merged.name).toBe('Chore Coat');
    expect(merged.brand).toBe('Field & Bench');
    expect(merged.price).toBe('248');
    expect(merged.image).toBe('https://cdn.shopify.example/chore.jpg');
    expect(merged.sizes).toEqual(['S', 'M', 'L']);
    expect(merged.category).toBe('coat');
    expect(merged.charts).toHaveLength(1);
    expect(merged.charts[0].columns[0]).toMatchObject({ key: 'chest', flat: true });
    expect(merged.notes.some((n) => n.startsWith('No size chart'))).toBe(false);
  });

  it('ignores JSON that is not a product', () => {
    const seed = extractProduct({ url: 'https://x.example/products/a', title: 'A', meta: {}, jsonLd: [], tables: [], text: '' });
    expect(mergeShopify(seed, { error: 'nope' }, tablesOfHtml)).toBe(seed);
  });
});
