import { valueKey } from './scales'
import type { ChartFocusStrategy, ChartPoint, ChartValue } from './types'

export const focusX = axisFocus('x')
export const focusY = axisFocus('y')

function axisFocus(axis: 'x' | 'y'): ChartFocusStrategy {
  const coordinate = (point: ChartPoint) => (axis === 'x' ? point.x : point.y)
  const value = (point: ChartPoint) =>
    axis === 'x' ? point.xValue : point.yValue
  const secondary = (point: ChartPoint) => (axis === 'x' ? point.y : point.x)

  return {
    resolve(points, x, y, maxDistance) {
      const target = axis === 'x' ? x : y
      let nearest: (typeof points)[number] | undefined
      let distance = maxDistance
      for (const point of points) {
        const nextDistance = Math.abs(coordinate(point) - target)
        if (nextDistance >= distance) continue
        nearest = point
        distance = nextDistance
      }
      if (!nearest) return []
      const candidates = groupPoints(points, nearest, value)
      const secondaryTarget = axis === 'x' ? y : x
      const primary = candidates.reduce(
        (closest, candidate) =>
          Math.abs(secondary(candidate) - secondaryTarget) <
          Math.abs(secondary(closest) - secondaryTarget)
            ? candidate
            : closest,
        nearest,
      )
      return [primary, ...candidates.filter((point) => point !== primary)]
    },
    group: (points, point) => groupPoints(points, point, value),
    navigation(points) {
      const sorted = [...points].sort(
        (left, right) => left.x - right.x || left.y - right.y,
      )
      const unique = new Map<string, (typeof points)[number]>()
      for (const point of sorted) {
        const key = valueKey(value(point))
        if (!unique.has(key)) unique.set(key, point)
      }
      return [...unique.values()]
    },
  }
}

function groupPoints<TDatum>(
  points: readonly ChartPoint<TDatum>[],
  point: ChartPoint<TDatum>,
  value: (point: ChartPoint<TDatum>) => ChartValue,
) {
  const key = valueKey(value(point))
  const unique = new Map<string, ChartPoint<TDatum>>()
  for (const candidate of points) {
    if (valueKey(value(candidate)) !== key) continue
    const group = valueKey(candidate.group)
    if (!unique.has(group)) unique.set(group, candidate)
  }
  const sorted = [...unique.values()].sort((left, right) => left.y - right.y)
  return [point, ...sorted.filter((candidate) => candidate !== point)]
}
