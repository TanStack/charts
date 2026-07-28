export const selectionPeriods = ['Jan', 'Feb', 'Mar', 'Apr', 'May'] as const

export type SelectionPeriod = (typeof selectionPeriods)[number]

export const selectionIds = [
  'north',
  'south',
  'central',
  'east',
  'west',
] as const

export type SelectionId = (typeof selectionIds)[number]

export interface SelectionDatum {
  id: SelectionId
  period: SelectionPeriod
  value: number
}

const initialData: readonly SelectionDatum[] = [
  { id: 'north', period: 'Jan', value: 38 },
  { id: 'south', period: 'Feb', value: 57 },
  { id: 'central', period: 'Mar', value: 45 },
  { id: 'east', period: 'Apr', value: 72 },
  { id: 'west', period: 'May', value: 63 },
]

export function chartTableData(revision = 0): readonly SelectionDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) =>
    row.id === 'south'
      ? { ...row, value: 64 }
      : row.id === 'west'
        ? { ...row, value: 69 }
        : row,
  )
}

export function isSelectionId(value: unknown): value is SelectionId {
  return selectionIds.some((id) => id === value)
}
