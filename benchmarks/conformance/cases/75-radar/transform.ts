import { extent } from 'd3-array'
import type { DecathlonRow } from '@charts-poc/demo-data/decathlon'

export const radarEvents = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const

export type RadarEvent = (typeof radarEvents)[number]

export interface RadarPoint {
  readonly Country: string
  readonly event: RadarEvent
  readonly relativePerformance: number
}

const timedEvents = new Set<RadarEvent>(['100 Meters', '100 Meter Hurdles'])
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
