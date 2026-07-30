import { wind } from '@charts-poc/demo-data/wind'
import { describe, expect, it } from 'vitest'
import { windDirection, windLatitudeBand, windSpeed } from './transform'

describe('wind polar-scatter data', () => {
  it('selects complete source latitude bands and derives polar channels', () => {
    const initial = windLatitudeBand(0)
    const revised = windLatitudeBand(1)

    expect(initial).toHaveLength(80)
    expect(revised).toHaveLength(80)
    expect(initial.every((row) => row.latitude === 48.125)).toBe(true)
    expect(revised.every((row) => row.latitude === 55.125)).toBe(true)
    expect(initial.every((row) => wind.includes(row))).toBe(true)

    for (const row of [...initial, ...revised]) {
      expect(windDirection(row)).toBeGreaterThanOrEqual(0)
      expect(windDirection(row)).toBeLessThan(360)
      expect(windSpeed(row)).toBeCloseTo(Math.hypot(row.u, row.v))
    }
  })
})
