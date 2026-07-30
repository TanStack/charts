export interface WaterfallContribution {
  id: string
  label: string
  value: number
}

const contributions: readonly WaterfallContribution[] = [
  { id: 'revenue', label: 'Revenue', value: 82 },
  { id: 'services', label: 'Services', value: 28 },
  { id: 'returns', label: 'Returns', value: -14 },
  { id: 'infrastructure', label: 'Infrastructure', value: -22 },
  { id: 'people', label: 'People', value: -31 },
  { id: 'other', label: 'Other', value: 9 },
]

export function waterfallData(revision = 0): readonly WaterfallContribution[] {
  return contributions.map((row) =>
    row.id === 'services' ? { ...row, value: row.value + revision * 3 } : row,
  )
}
