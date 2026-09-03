export interface PaletteMatrixRow {
  id: string
  period: string
  value: number
  comparison: number
}

export type PaletteTreatmentId = 'neutral' | 'vibrant' | 'monochrome'

export type PaletteToken =
  'primary' | 'secondary' | 'surface' | 'foreground' | 'muted' | 'grid'

interface PaletteTone {
  light: string
  dark: string
}

export interface PaletteTreatment {
  id: PaletteTreatmentId
  label: string
  tokens: Readonly<Record<PaletteToken, PaletteTone>>
}

const revisions: readonly (readonly PaletteMatrixRow[])[] = [
  [
    { id: 'jan', period: 'Jan', value: 42, comparison: 38 },
    { id: 'feb', period: 'Feb', value: 51, comparison: 43 },
    { id: 'mar', period: 'Mar', value: 47, comparison: 49 },
    { id: 'apr', period: 'Apr', value: 66, comparison: 55 },
    { id: 'may', period: 'May', value: 61, comparison: 60 },
    { id: 'jun', period: 'Jun', value: 76, comparison: 65 },
    { id: 'jul', period: 'Jul', value: 72, comparison: 70 },
    { id: 'aug', period: 'Aug', value: 86, comparison: 75 },
  ],
  [
    { id: 'jan', period: 'Jan', value: 46, comparison: 40 },
    { id: 'feb', period: 'Feb', value: 48, comparison: 45 },
    { id: 'mar', period: 'Mar', value: 58, comparison: 50 },
    { id: 'apr', period: 'Apr', value: 63, comparison: 56 },
    { id: 'may', period: 'May', value: 70, comparison: 61 },
    { id: 'jun', period: 'Jun', value: 68, comparison: 66 },
    { id: 'jul', period: 'Jul', value: 82, comparison: 71 },
    { id: 'aug', period: 'Aug', value: 79, comparison: 76 },
  ],
]

export const paletteTreatments: readonly PaletteTreatment[] = [
  {
    id: 'neutral',
    label: 'Neutral',
    tokens: {
      primary: { light: '#475569', dark: '#cbd5e1' },
      secondary: { light: '#94a3b8', dark: '#64748b' },
      surface: { light: '#f8fafc', dark: '#111827' },
      foreground: { light: '#0f172a', dark: '#f8fafc' },
      muted: { light: '#64748b', dark: '#94a3b8' },
      grid: { light: '#cbd5e1', dark: '#334155' },
    },
  },
  {
    id: 'vibrant',
    label: 'Vibrant',
    tokens: {
      primary: { light: '#7c3aed', dark: '#a78bfa' },
      secondary: { light: '#f97316', dark: '#fb923c' },
      surface: { light: '#faf7ff', dark: '#181225' },
      foreground: { light: '#2e1065', dark: '#f5f3ff' },
      muted: { light: '#7e22ce', dark: '#c4b5fd' },
      grid: { light: '#ddd6fe', dark: '#3b2d55' },
    },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    tokens: {
      primary: { light: '#18181b', dark: '#fafafa' },
      secondary: { light: '#71717a', dark: '#a1a1aa' },
      surface: { light: '#fafafa', dark: '#18181b' },
      foreground: { light: '#09090b', dark: '#fafafa' },
      muted: { light: '#71717a', dark: '#a1a1aa' },
      grid: { light: '#d4d4d8', dark: '#3f3f46' },
    },
  },
]

export function paletteMatrixRows(revision: number) {
  return revisions[Math.abs(revision) % revisions.length] ?? revisions[0]
}

export function paletteVariable(
  treatment: PaletteTreatment,
  token: PaletteToken,
) {
  return `--ts-matrix-${treatment.id}-${token}`
}

/** Resolve inside an element whose `color-scheme` includes `light dark`. */
export function paletteValue(treatment: PaletteTreatment, token: PaletteToken) {
  const tone = treatment.tokens[token]
  return `light-dark(${tone.light}, ${tone.dark})`
}

export function palettePaint(treatment: PaletteTreatment, token: PaletteToken) {
  return `var(${paletteVariable(treatment, token)}, ${paletteValue(treatment, token)})`
}
