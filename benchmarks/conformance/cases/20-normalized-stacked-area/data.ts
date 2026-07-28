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

export const normalizedValueDomain: readonly [number, number] = [0, 1]

export function normalizedStackData(revision = 0): readonly TimePoint[] {
  return timeSeries(revision)
}
