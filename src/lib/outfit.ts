/**
 * Dress the mannequin: order the worn pieces from the skin outwards, fit each
 * one over the layers beneath it, and build its mesh.
 */
import type { BodyModel } from './body';
import { bodyBase, fitGarment, recommendSize, type FitResult } from './garments/fit';
import { LayerStack } from './garments/layers';
import { LAYER_RANK, slotOf, type Garment, type WornItem } from './garments/types';
import { buildGarmentMesh, type MeshData } from './mesh';

export interface DressedItem {
  worn: WornItem;
  garment: Garment;
  fit: FitResult;
  mesh: MeshData;
  /** Best size in this garment's chart for the body, if the chart allows a judgement. */
  recommended: string | null;
  tucked: boolean;
}

function rank(g: Garment, w: WornItem, hasBottom: boolean): number {
  const base = LAYER_RANK[g.category];
  // An untucked tee or shirt hangs over the waistband, so it goes on after the bottom.
  if (slotOf(g.category) === 'top' && base < LAYER_RANK.pants && hasBottom && !w.tucked) return LAYER_RANK.pants + 0.1 + base / 10;
  return base;
}

export function dressBody(
  body: BodyModel,
  closet: Garment[],
  worn: WornItem[],
  unit?: (cm: number) => string,
): DressedItem[] {
  const byId = new Map(closet.map((g) => [g.id, g]));
  const items = worn
    .map((w) => ({ w, g: byId.get(w.garmentId) }))
    .filter((x): x is { w: WornItem; g: Garment } => !!x.g);
  const hasBottom = items.some((x) => slotOf(x.g.category) === 'bottom');
  items.sort((a, b) => rank(a.g, a.w, hasBottom) - rank(b.g, b.w, hasBottom));

  const stack = new LayerStack(body);
  const bare = bodyBase(body);
  const out: DressedItem[] = [];
  for (const { w, g } of items) {
    const tucked = !!w.tucked && hasBottom && slotOf(g.category) === 'top';
    const fit = fitGarment(body, g, w, stack, unit);
    const recommended = recommendSize(body, g, bare)?.size ?? null;
    const mesh = buildGarmentMesh(body, fit, stack, tucked);
    out.push({ worn: w, garment: g, fit, mesh, recommended, tucked });
  }
  return out;
}

/** Wearing a piece replaces whatever already occupies the same place on the body. */
export function wear(closet: Garment[], worn: WornItem[], garment: Garment, size: string): WornItem[] {
  const byId = new Map(closet.map((g) => [g.id, g]));
  const slot = slotOf(garment.category);
  const kept = worn.filter((w) => {
    const g = byId.get(w.garmentId);
    if (!g || g.id === garment.id) return false;
    const s = slotOf(g.category);
    if (slot === 'dress') return s !== 'dress' && s !== 'bottom' && !(s === 'top' && LAYER_RANK[g.category] <= LAYER_RANK.shirt);
    if (s === 'dress') return slot !== 'bottom' && !(slot === 'top' && LAYER_RANK[garment.category] <= LAYER_RANK.shirt);
    if (s !== slot) return true;
    // Tops stack by kind: one base layer, one shirt, one knit, one jacket, one coat.
    return slot === 'top' && g.category !== garment.category;
  });
  return [...kept, { garmentId: garment.id, size }];
}
