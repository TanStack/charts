import { distributionData } from '../../shared/data'

export interface BeeswarmPoint {
  id: number
  value: number
}

export function beeswarmData(revision = 0): readonly BeeswarmPoint[] {
  return distributionData(revision)
    .slice(0, 72)
    .map((row) => ({
      id: row.id,
      value: Math.round(row.value / 2) * 2,
    }))
}
