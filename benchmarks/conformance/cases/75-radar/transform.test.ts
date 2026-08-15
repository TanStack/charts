import { describe, expect, it } from 'vitest'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { selectRadarAthlete } from './selection'
import { radarProfile } from './transform'

describe('radarProfile', () => {
  it('normalizes the four raw event measures without changing the athlete', () => {
    const radarAthlete = selectRadarAthlete(decathlon)
    const profile = radarProfile(decathlon, radarAthlete)

    expect(profile).toHaveLength(4)
    expect(
      profile.every((point) => point.Country === radarAthlete.Country),
    ).toBe(true)
    expect(
      profile.every(
        (point) =>
          point.relativePerformance >= 0 && point.relativePerformance <= 100,
      ),
    ).toBe(true)
  })
})
