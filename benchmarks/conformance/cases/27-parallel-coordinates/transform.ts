import { extent } from 'd3-array'
import { decathlonEvents, timedEvents } from './selection'
import type { DecathlonRow } from '@tanstack/charts-data/decathlon'
import type { DecathlonEvent } from './selection'

export interface NormalizedDecathlonResult {
  readonly Country: string
  readonly event: DecathlonEvent
  readonly relativePerformance: number
}

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
