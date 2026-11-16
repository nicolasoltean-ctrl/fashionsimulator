/**
 * The tailoring measurements that drive the mannequin. Everything is stored in
 * centimetres; the UI converts for display.
 */

export type MeasurementKey =
  | 'height'
  | 'head'
  | 'neck'
  | 'shoulderWidth'
  | 'shoulderDrop'
  | 'chest'
  | 'underbust'
  | 'waist'
  | 'highHip'
  | 'hip'
  | 'backWaist'
  | 'waistToHip'
  | 'rise'
  | 'inseam'
  | 'kneeHeight'
  | 'thigh'
  | 'knee'
  | 'calf'
  | 'ankle'
  | 'armLength'
  | 'bicep'
  | 'elbow'
  | 'forearm'
  | 'wrist'
  | 'footLength';

export type Measurements = Record<MeasurementKey, number>;

export type MeasurementGroup = 'Lengths' | 'Torso' | 'Arms' | 'Legs';

export interface MeasurementDef {
  key: MeasurementKey;
  label: string;
  group: MeasurementGroup;
  min: number;
  max: number;
  /** How a tailor takes it. Shown as help text. */
  how: string;
}

export const MEASUREMENT_DEFS: MeasurementDef[] = [
  { key: 'height', label: 'Height', group: 'Lengths', min: 130, max: 215, how: 'Floor to top of head, standing straight without shoes.' },
  { key: 'backWaist', label: 'Back length (nape to waist)', group: 'Lengths', min: 30, max: 56, how: 'From the bone at the base of the neck down the spine to the natural waist.' },
  { key: 'rise', label: 'Body rise (waist to crotch)', group: 'Lengths', min: 18, max: 40, how: 'Vertical distance from the natural waist to the crotch (waist-to-floor minus inseam).' },
  { key: 'inseam', label: 'Inside leg (inseam)', group: 'Lengths', min: 55, max: 105, how: 'Crotch to floor along the inside of the leg.' },
  { key: 'waistToHip', label: 'Waist to hip', group: 'Lengths', min: 12, max: 30, how: 'Natural waist down to the fullest part of the seat.' },
  { key: 'kneeHeight', label: 'Knee height', group: 'Lengths', min: 32, max: 68, how: 'Floor to the centre of the kneecap.' },
  { key: 'footLength', label: 'Foot length', group: 'Lengths', min: 19, max: 33, how: 'Heel to the tip of the longest toe.' },

  { key: 'head', label: 'Head', group: 'Torso', min: 48, max: 66, how: 'Around the head above the ears and brow.' },
  { key: 'neck', label: 'Neck', group: 'Torso', min: 27, max: 56, how: 'Around the base of the neck where a collar sits.' },
  { key: 'shoulderWidth', label: 'Shoulder width', group: 'Torso', min: 30, max: 60, how: 'Across the back from shoulder point to shoulder point.' },
  { key: 'shoulderDrop', label: 'Shoulder slope', group: 'Torso', min: 1.5, max: 10, how: 'How far the shoulder point sits below the base of the neck.' },
  { key: 'chest', label: 'Chest / bust', group: 'Torso', min: 68, max: 165, how: 'Around the fullest part of the chest, tape level under the arms.' },
  { key: 'underbust', label: 'Underbust / ribcage', group: 'Torso', min: 58, max: 155, how: 'Around the ribcage directly below the bust.' },
  { key: 'waist', label: 'Natural waist', group: 'Torso', min: 52, max: 165, how: 'Around the narrowest part of the torso.' },
  { key: 'highHip', label: 'High hip', group: 'Torso', min: 60, max: 170, how: 'Around the top of the hip bones, about 10 cm below the waist.' },
  { key: 'hip', label: 'Hip / seat', group: 'Torso', min: 70, max: 175, how: 'Around the fullest part of the seat.' },

  { key: 'armLength', label: 'Arm length (shoulder to wrist)', group: 'Arms', min: 44, max: 76, how: 'Shoulder point to wrist bone, arm slightly bent.' },
  { key: 'bicep', label: 'Bicep', group: 'Arms', min: 20, max: 56, how: 'Around the fullest part of the upper arm.' },
  { key: 'elbow', label: 'Elbow', group: 'Arms', min: 18, max: 42, how: 'Around the elbow with the arm relaxed.' },
  { key: 'forearm', label: 'Forearm', group: 'Arms', min: 18, max: 44, how: 'Around the fullest part of the forearm.' },
  { key: 'wrist', label: 'Wrist', group: 'Arms', min: 12, max: 24, how: 'Around the wrist bone.' },

  { key: 'thigh', label: 'Thigh', group: 'Legs', min: 38, max: 95, how: 'Around the fullest part of the upper thigh.' },
  { key: 'knee', label: 'Knee', group: 'Legs', min: 27, max: 60, how: 'Around the knee over the kneecap.' },
  { key: 'calf', label: 'Calf', group: 'Legs', min: 26, max: 60, how: 'Around the fullest part of the calf.' },
  { key: 'ankle', label: 'Ankle', group: 'Legs', min: 17, max: 34, how: 'Around the ankle just above the bone.' },
];

export const MEASUREMENT_GROUPS: MeasurementGroup[] = ['Lengths', 'Torso', 'Arms', 'Legs'];

export const DEF_BY_KEY = Object.fromEntries(MEASUREMENT_DEFS.map((d) => [d.key, d])) as Record<
  MeasurementKey,
  MeasurementDef
>;

export interface BodyPreset {
  id: string;
  label: string;
  m: Measurements;
}

export const PRESETS: BodyPreset[] = [
  {
    id: 'form-a',
    label: 'Form A · straight (178 cm)',
    m: {
      height: 178, head: 57, neck: 38.5, shoulderWidth: 46, shoulderDrop: 5,
      chest: 100, underbust: 91, waist: 85, highHip: 92, hip: 100,
      backWaist: 44, waistToHip: 21, rise: 27, inseam: 81, kneeHeight: 50,
      thigh: 58, knee: 39, calf: 38, ankle: 23.5,
      armLength: 61, bicep: 32, elbow: 27, forearm: 27.5, wrist: 17, footLength: 26.5,
    },
  },
  {
    id: 'form-b',
    label: 'Form B · curved (166 cm)',
    m: {
      height: 166, head: 55.5, neck: 33, shoulderWidth: 39.5, shoulderDrop: 4.5,
      chest: 90, underbust: 76, waist: 71, highHip: 86, hip: 97,
      backWaist: 40, waistToHip: 20, rise: 27, inseam: 76, kneeHeight: 46,
      thigh: 57, knee: 36.5, calf: 35.5, ankle: 21.5,
      armLength: 56.5, bicep: 27.5, elbow: 24, forearm: 23.5, wrist: 15, footLength: 24,
    },
  },
  {
    id: 'form-a-tall',
    label: 'Form A · tall & broad (190 cm)',
    m: {
      height: 190, head: 59, neck: 42, shoulderWidth: 50, shoulderDrop: 5.5,
      chest: 114, underbust: 104, waist: 98, highHip: 104, hip: 110,
      backWaist: 47, waistToHip: 22, rise: 29, inseam: 87, kneeHeight: 54,
      thigh: 64, knee: 42, calf: 41, ankle: 25,
      armLength: 66, bicep: 37, elbow: 30, forearm: 31, wrist: 18.5, footLength: 28.5,
    },
  },
  {
    id: 'form-b-petite',
    label: 'Form B · petite (155 cm)',
    m: {
      height: 155, head: 54.5, neck: 31.5, shoulderWidth: 37, shoulderDrop: 4.2,
      chest: 82, underbust: 70, waist: 64, highHip: 78, hip: 88,
      backWaist: 37, waistToHip: 18.5, rise: 25, inseam: 70.5, kneeHeight: 42,
      thigh: 51, knee: 33.5, calf: 32.5, ankle: 20,
      armLength: 52, bicep: 25, elbow: 22.5, forearm: 22, wrist: 14.2, footLength: 22.5,
    },
  },
  {
    id: 'form-b-full',
    label: 'Form B · full (170 cm)',
    m: {
      height: 170, head: 57, neck: 38, shoulderWidth: 42, shoulderDrop: 4.5,
      chest: 118, underbust: 100, waist: 102, highHip: 116, hip: 124,
      backWaist: 41.5, waistToHip: 21, rise: 30, inseam: 76, kneeHeight: 46,
      thigh: 72, knee: 45, calf: 43, ankle: 25,
      armLength: 58, bicep: 37, elbow: 30, forearm: 28.5, wrist: 17, footLength: 25,
    },
  },
];

export const DEFAULT_MEASUREMENTS: Measurements = { ...PRESETS[0].m };

/** Space that must remain above the nape for the neck and head. */
export const MIN_HEAD_AND_NECK = 21;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Keep a measurement set physically possible after an edit. The value the user
 * just changed (`changed`) is respected; dependent values give way.
 */
export function reconcile(input: Measurements, changed?: MeasurementKey): Measurements {
  const m = { ...input };
  for (const d of MEASUREMENT_DEFS) {
    if (!Number.isFinite(m[d.key])) m[d.key] = DEFAULT_MEASUREMENTS[d.key];
    m[d.key] = clamp(m[d.key], d.min, d.max);
  }

  // Vertical stack: inseam + rise + back length + head/neck = height.
  const stack = () => m.inseam + m.rise + m.backWaist + MIN_HEAD_AND_NECK;
  if (stack() > m.height) {
    if (changed === 'height') {
      // Shrink the segments proportionally to fit the requested height.
      const k = (m.height - MIN_HEAD_AND_NECK) / (m.inseam + m.rise + m.backWaist);
      m.inseam *= k;
      m.rise *= k;
      m.backWaist *= k;
    } else {
      m.height = Math.min(DEF_BY_KEY.height.max, stack());
      if (stack() > m.height && changed && (changed === 'inseam' || changed === 'rise' || changed === 'backWaist')) {
        m[changed] -= stack() - m.height;
      }
    }
  }

  // The hip line sits between the waist and the crotch.
  m.waistToHip = clamp(m.waistToHip, 8, m.rise - 5);
  // The knee sits between the ankle and the crotch.
  m.kneeHeight = clamp(m.kneeHeight, m.inseam * 0.45, m.inseam * 0.78);
  return m;
}

/** Scale every measurement so the figure keeps its proportions at a new height. */
export function scaleToHeight(m: Measurements, height: number): Measurements {
  const k = height / m.height;
  const lengths: MeasurementKey[] = [
    'height', 'backWaist', 'rise', 'inseam', 'waistToHip', 'kneeHeight', 'armLength', 'footLength', 'shoulderDrop',
  ];
  const out = { ...m };
  for (const key of lengths) out[key] = m[key] * k;
  return reconcile(out, 'height');
}
