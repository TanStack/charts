export interface WaterfallPoint {
  id: string
  label: string
  start: number
  end: number
  kind: 'increase' | 'decrease' | 'total'
}

const changes = [
  ['Revenue', 82],
  ['Services', 28],
  ['Returns', -14],
  ['Infrastructure', -22],
  ['People', -31],
  ['Other', 9],
] as const

export function waterfallData(revision = 0): readonly WaterfallPoint[] {
  const rows: WaterfallPoint[] = []
  let total = 0
  for (const [label, baseValue] of changes) {
    const value = baseValue + (label === 'Services' ? revision * 3 : 0)
    const start = total
    total += value
    rows.push({
      id: label,
      label,
      start,
      end: total,
      kind: value >= 0 ? 'increase' : 'decrease',
    })
  }
  rows.push({
    id: 'Net',
    label: 'Net',
    start: 0,
    end: total,
    kind: 'total',
  })
  return rows
}
