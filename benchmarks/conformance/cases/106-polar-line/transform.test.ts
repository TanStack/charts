import { weather } from '@charts-poc/demo-data/weather'
import { describe, expect, it } from 'vitest'
import { dayOfYearAngle, seattleWeatherYear } from './transform'

describe('Seattle polar-line data', () => {
  it('selects complete published years without reshaping observations', () => {
    const initial = seattleWeatherYear(0)
    const revised = seattleWeatherYear(1)

    expect(initial).toHaveLength(366)
    expect(revised).toHaveLength(365)
    expect(initial.every((row) => row.location === 'Seattle')).toBe(true)
    expect(initial.every((row) => weather.includes(row))).toBe(true)
    expect(revised.every((row) => weather.includes(row))).toBe(true)
    expect(initial.map(dayOfYearAngle)).toEqual(
      [...initial.map(dayOfYearAngle)].sort((left, right) => left - right),
    )
  })
})
