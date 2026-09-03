import type { WindRow } from '@tanstack/charts-data/wind'

export function sampleWind(rows: readonly WindRow[]) {
  const longitudes = [...new Set(rows.map((row) => row.longitude))]
  const latitudes = [...new Set(rows.map((row) => row.latitude))]
  const selectedLongitudes = new Set(
    [0, 16, 32, 48, 64, 79].map((index) => longitudes[index]),
  )
  const selectedLatitudes = new Set(
    [0, 15, 30, 45, 59].map((index) => latitudes[index]),
  )

  return rows.filter(
    (row) =>
      selectedLongitudes.has(row.longitude) &&
      selectedLatitudes.has(row.latitude),
  )
}
