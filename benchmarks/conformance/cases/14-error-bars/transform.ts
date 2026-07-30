import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

export interface ErrorPoint {
  species: string
  mean: number
  low: number
  high: number
}

export function summarizeErrorBars(
  rows: readonly PenguinsRow[],
): readonly ErrorPoint[] {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    if (row.body_mass_g === null) continue
    const values = groups.get(row.species)
    if (values) values.push(row.body_mass_g)
    else groups.set(row.species, [row.body_mass_g])
  }

  return [...groups].map(([species, values]) => {
    const mean =
      values.reduce((total, value) => total + value, 0) / values.length
    const variance =
      values.reduce((total, value) => total + (value - mean) ** 2, 0) /
      Math.max(1, values.length - 1)
    const deviation = Math.sqrt(variance)
    return {
      species,
      mean,
      low: mean - deviation,
      high: mean + deviation,
    }
  })
}
