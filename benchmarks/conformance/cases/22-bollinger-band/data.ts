import { timeSeries } from '../../shared/data'
import type { TimePoint } from '../../shared/data'

export const bollingerValueDomain: readonly [number, number] = [10, 65]

export function bollingerData(revision = 0): readonly TimePoint[] {
  return timeSeries(revision).filter((row) => row.series === 'Atlas')
}
