import { mean } from 'd3-array'
import type { AaplRow } from '@tanstack/charts-data/aapl'

export interface DifferencePoint extends AaplRow {
  average: number
}

export function rollingCloseAverage(
  rows: readonly AaplRow[],
  window: number,
): readonly DifferencePoint[] {
  return rows.flatMap((row, index) => {
    if (index < window - 1) return []
    const average = mean(
      rows.slice(index - window + 1, index + 1),
      (observation) => observation.Close,
    )
    return average === undefined ? [] : [{ ...row, average }]
  })
}
