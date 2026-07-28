import { timeSeries } from '../../shared/data'
import type { TimePoint } from '../../shared/data'

export const seriesNames: readonly TimePoint['series'][] = [
  'Atlas',
  'Beacon',
  'Comet',
]

export const seriesColors: Record<TimePoint['series'], string> = {
  Atlas: '#2563eb',
  Beacon: '#ea580c',
  Comet: '#059669',
}

export const streamValueDomain: readonly [number, number] = [0, 190]

export function streamData(revision = 0): readonly TimePoint[] {
  return timeSeries(revision)
}
