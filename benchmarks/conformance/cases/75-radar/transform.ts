import { extent } from 'd3-array'
import type { DecathlonRow } from '@tanstack/charts-data/decathlon'
import { radarEvents, timedEvents } from './selection'
import type { RadarEvent } from './selection'

export interface RadarPoint {
  readonly Country: string
  readonly event: RadarEvent
  readonly relativePerformance: number
}

export function radarProfile(
  sourceRows: readonly DecathlonRow[],
  row: DecathlonRow,
): readonly RadarPoint[] {
  const extents = new Map(
    radarEvents.map((event) => [
      event,
      extent(sourceRows, (sourceRow) => sourceRow[event]) as [number, number],
    ]),
  )
  return radarEvents.map((event) => {
    const [minimum, maximum] = extents.get(event) ?? [0, 1]
    const proportion = (row[event] - minimum) / (maximum - minimum || 1)
    return {
      Country: row.Country,
      event,
      relativePerformance:
        (timedEvents.has(event) ? 1 - proportion : proportion) * 100,
    }
  })
}
