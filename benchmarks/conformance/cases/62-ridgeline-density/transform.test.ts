import { simpsons } from '@tanstack/charts-data/simpsons'
import { describe, expect, it } from 'vitest'
import { isRatedEpisode, ridgeSeasons } from './selection'
import { ridgeDensity } from './transform'

describe('ridgeDensity', () => {
  it('bins and normalizes the observed ratings above each season baseline', () => {
    const seasons = ridgeSeasons(0)
    const rows = ridgeDensity(simpsons.filter(isRatedEpisode), seasons)

    expect(rows).toHaveLength(72)
    for (const baseline of [0, 1, 2]) {
      const season = rows.filter((row) => row.baseline === baseline)
      expect(season).toHaveLength(24)
      const peak = Math.max(...season.map((row) => row.density))
      expect(peak).toBeGreaterThan(baseline + 0.5)
      expect(peak).toBeLessThanOrEqual(baseline + 0.78)
    }
  })
})
