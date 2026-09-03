import type { CarsRow } from '@tanstack/charts-data/cars'

const pointsPerView = 300

export function selectManyPointData(rows: readonly CarsRow[], revision = 0) {
  const start = Math.abs(revision % 2) * (rows.length - pointsPerView)
  return rows.slice(start, start + pointsPerView)
}
