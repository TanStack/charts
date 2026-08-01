import type {
  ChartPoint,
  ChartValue,
} from '../../packages/charts-core/src/types'

// Historical production baseline retained for isolated bundle comparison.
export function nearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  x: number,
  y: number,
  maxDistance: number,
): ChartPoint<TDatum, TXValue, TYValue> | null {
  let result: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let resultDistance = Infinity
  for (const point of points) {
    const dx = point.x - x
    const dy = point.y - y
    const distance = dx * dx + dy * dy
    if (distance < resultDistance) {
      result = point
      resultDistance = distance
    }
  }
  if (!result) return null
  return resultDistance <= Math.max(0, maxDistance) ** 2 ? result : null
}
