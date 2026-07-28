import { least } from 'd3-array'
import type { ChartPoint } from './types'

export function nearestPoint<TDatum>(
  points: readonly ChartPoint<TDatum>[],
  x: number,
  y: number,
  maxDistance: number,
): ChartPoint<TDatum> | null {
  const result = least(points, (point) => {
    const dx = point.x - x
    const dy = point.y - y
    return dx * dx + dy * dy
  })
  if (!result) return null
  const dx = result.x - x
  const dy = result.y - y
  return dx * dx + dy * dy <= Math.max(0, maxDistance) ** 2 ? result : null
}
