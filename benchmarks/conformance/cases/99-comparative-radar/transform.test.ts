import { describe, expect, it } from 'vitest'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { selectRadarProfiles } from './selection'
import { comparativeRadarData, comparativeRadarPoints } from './transform'

describe('comparative radar transforms', () => {
  it('produces equivalent wide and tidy profiles from the two raw rows', () => {
    const radarProfiles = selectRadarProfiles(decathlon)
    const wide = comparativeRadarData(decathlon, radarProfiles)
    const tidy = comparativeRadarPoints(decathlon, radarProfiles)

    expect(wide).toHaveLength(4)
    expect(tidy).toHaveLength(8)
    for (const row of wide) {
      expect(
        tidy.find(
          (point) => point.event === row.event && point.Country === 'USA',
        )?.relativePerformance,
      ).toBe(row.USA)
      expect(
        tidy.find(
          (point) => point.event === row.event && point.Country === 'GBR',
        )?.relativePerformance,
      ).toBe(row.GBR)
    }
  })
})
