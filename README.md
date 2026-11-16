# Atelier — fashion fit simulator

Build outfits from clothing sold anywhere on the web and see how each piece
would actually fit a body with your measurements.

- **A mannequin built from tailoring measurements.** 25 measurements — height,
  neck, shoulders, chest, underbust, waist, high hip, hip, back length, rise,
  inseam, arm, bicep, wrist, thigh, knee, calf, ankle and more — drive a 3D
  figure. Every girth is solved so that a tape measure around the mannequin
  reads exactly what you typed.
- **Garments at their manufactured size.** Each piece is drawn from the
  brand's size chart: its chest, waist, hip, shoulder, sleeve, length, rise,
  thigh, inseam and leg opening, in the size you pick. A garment smaller than
  the body is stretched onto it; a larger one stands off and drapes.
- **A fit verdict per measurement.** Too small / tight / fitted / regular /
  loose / oversized for every girth, plus where hems, sleeves and waistbands
  land — shown as a report and as a colour map on the garment.
- **Import from any shop.** Paste a product URL, click a bookmarklet on the
  product page, or paste/type a size chart.
- **Layering.** A jacket is fitted over the sweater under it, not over bare
  skin. Tops can be worn tucked or untucked.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server also serves the import proxy, so
nothing else needs to run.

For a production build:

```bash
npm run build
npm start
```

`npm start` serves the built app and the import proxy on port 4173 (set `PORT`
to change it). `npm test` runs the test suite.

Everything you enter — measurements, closet, outfits — is stored in your
browser's local storage. There is no account and no database.

## Adding clothing

**From a link.** Paste a product page address. The app's server fetches that
one page and reads the product name, brand, price and photo (schema.org
JSON-LD, Open Graph tags) and any size table in the HTML. Shopify storefronts
are also read through their public product JSON. You then review the result:
correct the garment type, fabric stretch and cut, and check the size chart
before it is saved.

**From your own browser (bookmarklet).** Many large retailers refuse automated
requests, and many shops only load their size guide in a pop-up. Drag the
*Send to Atelier* button from the Add clothing dialog to your bookmarks bar.
On any product page, open the size guide and click the bookmark: the page's
product data and tables are captured in your own tab and handed to Atelier.
The import proxy identifies itself honestly and does not try to get past bot
protection — the bookmarklet is the route for those shops.

**By hand.** Paste a size table copied from anywhere (tab-, space-, comma- or
pipe-separated), or type the numbers into the chart editor.

### Getting the size chart right

The simulator is only as accurate as the chart, so the review step asks you to
confirm three things:

1. **Garment or body?** Some brands publish the *finished measurements of the
   garment*; others publish the *body each size is meant to fit*. Garment
   measurements are compared with your body directly. For a body chart the
   verdict compares your body with the brand's range, and the piece is drawn
   with the usual ease for the stated cut (slim, regular, relaxed…) on top of
   that range.
2. **Unit.** Centimetres or inches. If the chart did not say, the importer
   guesses from the magnitudes and flags it.
3. **Flat or around.** Chest "width" or "pit to pit" is half the
   circumference. Columns measured flat are doubled.

Anything the chart does not list (say, a T-shirt chart with chest and length
but no shoulder) is filled with a typical proportion so the piece can be
drawn. Those rows are labelled *not in chart* in the fit report and are never
used to judge the fit or recommend a size.

## How fit is decided

For each girth the engine compares the garment with what it has to go around
at the height where it sits — the body, plus any layers already worn:

| Verdict   | Rigid fabric (ease as % of body)        |
| --------- | --------------------------------------- |
| Too small | garment smaller than the body           |
| Tight     | up to about 3% (chest)                  |
| Fitted    | 3–8%                                    |
| Regular   | 8–16%                                   |
| Loose     | 16–27%                                  |
| Oversized | beyond                                  |

Thresholds differ by zone (a waistband has to hold the garment up; an upper
sleeve needs more room than a chest), and stretch fabrics are allowed to be
smaller than the body up to their stretch limit before they count as tight.

Placement follows the pattern too: a top's hem falls at *shoulder height minus
garment length*; a wider shoulder seam drops down the arm and carries the
sleeve with it; trousers hang from the crotch, the rise decides where the
waistband sits — and the waist measurement is compared with your body *at that
height*, not at your natural waist; an inseam longer than your leg stacks at
the ankle.

## What this is not

- **Not a cloth simulation.** Garments are parametric surfaces sized from the
  chart and draped by simple rules (hang from the fullest point above, pull in
  where the garment is narrower, fold where there is spare width). You get the
  right dimensions, proportions and tightness, not photoreal wrinkles.
- **Not a rendering of the product photo.** The piece takes its colour from
  the product image; prints, textures and construction details (plackets,
  pockets, pleats) are not reproduced.
- **Stylised garment types.** Tops, shirts, knitwear, jackets, coats, dresses,
  trousers, shorts, skirts and shoes are supported. Bags, hats, jewellery and
  other accessories are not.
- **Import depends on the shop.** A size chart that exists only as an image
  cannot be read automatically — type it in.

## Project layout

```
server/proxy.ts            import proxy (/api/fetch, /api/image) with SSRF guards
server/index.ts            production static server
src/lib/measurements.ts    measurement definitions, presets, consistency rules
src/lib/body.ts            measurements → parametric body
src/lib/geom.ts            cross-section maths (tape perimeters, hulls, splines)
src/lib/garments/resolve.ts  size-chart row → finished dimensions, with provenance
src/lib/garments/fit.ts    placement and fit verdicts
src/lib/garments/layers.ts body + worn layers as a surface
src/lib/mesh.ts            body and garment meshes
src/lib/import/            page snapshot, product extraction, size-chart parsing, bookmarklet
src/three/Viewport.tsx     three.js scene
src/ui/                    panels and dialogs
tests/                     vitest suites
```
