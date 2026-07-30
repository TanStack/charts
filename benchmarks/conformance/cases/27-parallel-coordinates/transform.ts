import { extent } from 'd3-array'
import { decathlonEvents } from './selection'
import type { DecathlonRow } from '@charts-poc/demo-data/decathlon'

export type DecathlonEvent = (typeof decathlonEvents)[number]

export interface NormalizedDecathlonResult {
  readonly Country: string
  readonly event: DecathlonEvent
  readonly relativePerformance: number
}

const timedEvents = new Set<DecathlonEvent>(['100 Meters', '100 Meter Hurdles'])
export function normalizeDecathlonResults(
  sourceRows: readonly DecathlonRow[],
  rows: readonly DecathlonRow[],
): readonly NormalizedDecathlonResult[] {
  const eventExtents = new Map(
    decathlonEvents.map((event) => [
      event,
      extent(sourceRows, (row) => row[event]) as [number, number],
    ]),
  )
  return rows.flatMap((row) =>
    decathlonEvents.map((event) => {
      const [minimum, maximum] = eventExtents.get(event) ?? [0, 1]
      const proportion = (row[event] - minimum) / (maximum - minimum || 1)
      return {
        Country: row.Country,
        event,
        relativePerformance:
          (timedEvents.has(event) ? 1 - proportion : proportion) * 100,
      }
    }),
  )
}
