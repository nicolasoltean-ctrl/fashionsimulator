/** Fit-map palette: red = too small, amber = tight, green = good, blue = loose. */
const STOPS: Array<[number, [number, number, number]]> = [
  [-3, [0.48, 0.08, 0.1]],
  [-2, [0.83, 0.18, 0.18]],
  [-1.4, [0.93, 0.45, 0.12]],
  [-1, [0.95, 0.74, 0.2]],
  [-0.7, [0.74, 0.78, 0.27]],
  [-0.3, [0.46, 0.72, 0.33]],
  [0.5, [0.3, 0.66, 0.36]],
  [1.2, [0.2, 0.63, 0.62]],
  [2, [0.25, 0.5, 0.85]],
  [3, [0.36, 0.32, 0.78]],
];

export function scoreToRgb(score: number): [number, number, number] {
  if (score <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    if (score <= STOPS[i][0]) {
      const [x0, c0] = STOPS[i - 1];
      const [x1, c1] = STOPS[i];
      const t = (score - x0) / (x1 - x0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function scoreToCss(score: number): string {
  const [r, g, b] = scoreToRgb(score);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export const FIT_LEGEND: Array<{ label: string; score: number }> = [
  { label: 'Too small', score: -2.4 },
  { label: 'Tight', score: -1.3 },
  { label: 'Fitted', score: -0.5 },
  { label: 'Regular', score: 0.5 },
  { label: 'Loose', score: 1.5 },
  { label: 'Oversized', score: 2.6 },
];
