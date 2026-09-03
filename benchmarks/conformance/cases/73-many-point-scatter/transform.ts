import type { CarsRow } from '@tanstack/charts-data/cars'

export interface CarSeries {
  cylinders: number
  rows: readonly CarsRow[]
}

export function groupCarsByCylinder(
  rows: readonly CarsRow[],
): readonly CarSeries[] {
  const groups = new Map<number, CarsRow[]>()

  for (const row of rows) {
    const group = groups.get(row.cylinders)
    if (group === undefined) {
      groups.set(row.cylinders, [row])
    } else {
      group.push(row)
    }
  }

  return Array.from(groups, ([cylinders, groupRows]) => ({
    cylinders,
    rows: groupRows,
  }))
}
