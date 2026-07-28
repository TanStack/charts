import { valueKey } from './scales'
import type { ChartFocusStrategy, ChartPoint, ChartValue } from './types'

export const focusX = axisFocus('x', true)
export const focusY = axisFocus('y', true)
export const focusNearestX = axisFocus('x', false)
export const focusNearestY = axisFocus('y', false)

function axisFocus(axis: 'x' | 'y', grouped: boolean): ChartFocusStrategy {
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
      return grouped
        ? [primary, ...candidates.filter((point) => point !== primary)]
        : [primary]
    },
    group: grouped
      ? (points, point) => groupPoints(points, point, value)
      : (_points, point) => [point],
    navigation(points) {
      const sorted = [...points].sort(
        (left, right) => left.x - right.x || left.y - right.y,
      )
      if (!grouped) return sorted
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
