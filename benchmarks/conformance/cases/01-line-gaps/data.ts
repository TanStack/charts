import { timeSeries } from '../../shared/data'

export const gapValueDomain: readonly [number, number] = [20, 55]

export interface GapPoint {
  id: string
  date: Date
  value: number | null
}

export function gapData(revision = 0): readonly GapPoint[] {
  return timeSeries(revision)
    .filter((row) => row.series === 'Atlas')
    .map((row, index): GapPoint => ({
      id: row.id,
      date: row.date,
      value: index === 10 || index === 23 ? null : row.value,
    }))
}
