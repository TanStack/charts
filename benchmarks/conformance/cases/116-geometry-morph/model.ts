export interface MorphDatum {
  id: string
  label: string
  value: number
  color: string
}

export type MorphMode = 'bars' | 'rose' | 'donut' | 'bubbles'

export const morphModes: readonly MorphMode[] = [
  'bars',
  'rose',
  'donut',
  'bubbles',
]

export const morphData: readonly MorphDatum[] = [
  { id: 'violet', label: 'V', value: 88, color: '#7c3aed' },
  { id: 'blue', label: 'B', value: 63, color: '#2563eb' },
  { id: 'cyan', label: 'C', value: 74, color: '#0891b2' },
  { id: 'green', label: 'G', value: 51, color: '#059669' },
  { id: 'orange', label: 'O', value: 81, color: '#ea580c' },
  { id: 'pink', label: 'P', value: 68, color: '#db2777' },
]
