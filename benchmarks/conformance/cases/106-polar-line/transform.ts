import { weather } from '@tanstack/charts-data/weather'
import type { WeatherRow } from '@tanstack/charts-data/weather'

const selectableYears = [2012, 2013] as const

export function seattleWeatherYear(revision = 0): readonly WeatherRow[] {
  const year =
    selectableYears[revision % selectableYears.length] ?? selectableYears[0]
  return weather.filter(
    (row) => row.location === 'Seattle' && row.date.getUTCFullYear() === year,
  )
}

export function dayOfYearAngle(row: WeatherRow): number {
  const year = row.date.getUTCFullYear()
  const yearStart = Date.UTC(year, 0, 1)
  const nextYear = Date.UTC(year + 1, 0, 1)
  return ((row.date.getTime() - yearStart) / (nextYear - yearStart)) * 360
}
