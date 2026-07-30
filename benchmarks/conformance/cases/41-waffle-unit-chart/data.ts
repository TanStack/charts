export type WaffleCategory = 'Adopted' | 'Evaluating' | 'Not planned'

export interface WaffleSegment {
  id: string
  category: WaffleCategory
  value: number
}

export const waffleCategories: readonly WaffleCategory[] = [
  'Adopted',
  'Evaluating',
  'Not planned',
]

export const waffleColors = ['#2563eb', '#f59e0b', '#94a3b8']

export function waffleData(revision = 0): readonly WaffleSegment[] {
  return revision % 2 === 0
    ? [
        { id: 'adopted', category: 'Adopted', value: 56 },
        { id: 'evaluating', category: 'Evaluating', value: 29 },
        { id: 'not-planned', category: 'Not planned', value: 15 },
      ]
    : [
        { id: 'adopted', category: 'Adopted', value: 52 },
        { id: 'evaluating', category: 'Evaluating', value: 32 },
        { id: 'not-planned', category: 'Not planned', value: 16 },
      ]
}
