export type WaffleCategory = 'Adopted' | 'Evaluating' | 'Not planned'

export interface WaffleSegment {
  id: string
  category: WaffleCategory
  value: number
}

export interface WaffleCell {
  id: string
  category: WaffleCategory
  column: number
  row: number
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

export function waffleCells(
  segments: readonly WaffleSegment[],
  columns: number,
): readonly WaffleCell[] {
  const cells: WaffleCell[] = []
  let unit = 0

  for (const segment of segments) {
    for (let offset = 0; offset < segment.value; offset += 1) {
      cells.push({
        id: `unit-${unit}`,
        category: segment.category,
        column: unit % columns,
        row: Math.floor(unit / columns),
      })
      unit += 1
    }
  }

  return cells
}
