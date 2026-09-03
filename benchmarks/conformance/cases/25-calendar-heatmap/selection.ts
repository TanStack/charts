import type { WeatherRow } from '@tanstack/charts-data/weather'

const daysPerView = 98

export function selectCalendarData(rows: readonly WeatherRow[], revision = 0) {
  const start = Math.abs(revision % 2) * daysPerView
  return rows.slice(start, start + daysPerView)
}
