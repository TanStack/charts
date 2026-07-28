import { timeSeries } from '../../shared/data'

export const temperatureValueDomain: readonly [number, number] = [10, 60]

export interface TemperatureRangePoint {
  id: string
  date: Date
  low: number
  high: number
}

export function temperatureRangeData(
  revision = 0,
): readonly TemperatureRangePoint[] {
  return timeSeries(revision)
    .filter((row) => row.series === 'Atlas')
    .map((row, index): TemperatureRangePoint => {
      const spread = 4.5 + Math.sin((index + revision) / 4) * 1.4
      return {
        id: row.id,
        date: row.date,
        low: round(row.value - spread),
        high: round(row.value + spread),
      }
    })
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
