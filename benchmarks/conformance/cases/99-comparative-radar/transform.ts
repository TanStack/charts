import { extent } from 'd3-array'
import type { DecathlonRow } from '@tanstack/charts-data/decathlon'
import { radarCountries, radarEvents, timedEvents } from './selection'
import type { RadarCountry, RadarEvent } from './selection'

export interface ComparativeRadarDatum {
  readonly event: RadarEvent
  readonly USA: number
  readonly GBR: number
}

export interface ComparativeRadarPoint {
  readonly event: RadarEvent
  readonly Country: RadarCountry
  readonly relativePerformance: number
}

function normalizeResult(
  sourceRows: readonly DecathlonRow[],
  row: DecathlonRow,
  event: RadarEvent,
): number {
  const eventExtent = extent(sourceRows, (sourceRow) => sourceRow[event]) as [
    number,
    number,
  ]
  const [minimum, maximum] = eventExtent ?? [0, 1]
  const proportion = (row[event] - minimum) / (maximum - minimum || 1)
  return (timedEvents.has(event) ? 1 - proportion : proportion) * 100
}

export function comparativeRadarData(
  sourceRows: readonly DecathlonRow[],
  profiles: Readonly<Record<RadarCountry, DecathlonRow>>,
): readonly ComparativeRadarDatum[] {
  return radarEvents.map((event) => ({
    event,
    USA: normalizeResult(sourceRows, profiles.USA, event),
    GBR: normalizeResult(sourceRows, profiles.GBR, event),
  }))
}

export function comparativeRadarPoints(
  sourceRows: readonly DecathlonRow[],
  profiles: Readonly<Record<RadarCountry, DecathlonRow>>,
): readonly ComparativeRadarPoint[] {
  return radarCountries.flatMap((Country) =>
    radarEvents.map((event) => ({
      event,
      Country,
      relativePerformance: normalizeResult(
        sourceRows,
        profiles[Country],
        event,
      ),
    })),
  )
}
