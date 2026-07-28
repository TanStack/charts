import type { ChartPoint } from './types'

export function nearestPoint<TDatum>(
  points: readonly ChartPoint<TDatum>[],
  x: number,
  y: number,
  maxDistance: number,
): ChartPoint<TDatum> | null {
  let result: ChartPoint<TDatum> | null = null
  let distanceSquared = maxDistance * maxDistance
  for (const point of points) {
    const dx = point.x - x
    const dy = point.y - y
    const candidate = dx * dx + dy * dy
    if (candidate >= distanceSquared) continue
    result = point
    distanceSquared = candidate
  }
  return result
}
