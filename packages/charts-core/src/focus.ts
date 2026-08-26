import { valueKey } from './scales'
import { mappedFocusCoordinate } from './focus-coordinate-internal'
import type {
  ChartFocusGroupContext,
  ChartFocusResolveContext,
  ChartPoint,
  ChartValue,
} from './types'

export const focusGroupX = axisFocus('x', true)
export const focusGroupY = axisFocus('y', true)
export const focusNearestX = axisFocus('x', false)
export const focusNearestY = axisFocus('y', false)

function axisFocus(axis: 'x' | 'y', grouped: boolean) {
  const coordinate = (point: ChartPoint) => mappedFocusCoordinate(point, axis)
  const secondary = (point: ChartPoint) => (axis === 'x' ? point.y : point.x)

  return {
    resolve<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
      points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
      context: ChartFocusResolveContext,
    ) {
      const { x, y, maxDistance } = context
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
      const candidates = groupPoints(points, nearest, coordinate)
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
    group<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
      points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
      context: ChartFocusGroupContext<TDatum, TXValue, TYValue>,
    ) {
      const { point } = context
      return grouped ? groupPoints(points, point, coordinate) : [point]
    },
    navigation<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
      points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    ) {
      const sorted = [...points].sort(
        (left, right) => left.x - right.x || left.y - right.y,
      )
      if (!grouped) return sorted
      const unique = new Map<string, (typeof points)[number]>()
      for (const point of sorted) {
        const key = valueKey(coordinate(point))
        if (!unique.has(key)) unique.set(key, point)
      }
      return [...unique.values()]
    },
  } satisfies UniversalChartFocusStrategy
}

interface UniversalChartFocusStrategy {
  resolve: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusResolveContext,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  group: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusGroupContext<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  navigation: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
}

function groupPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  point: ChartPoint<TDatum, TXValue, TYValue>,
  coordinate: (point: ChartPoint<TDatum, TXValue, TYValue>) => number,
) {
  const key = valueKey(coordinate(point))
  const unique = new Map<string, ChartPoint<TDatum, TXValue, TYValue>>()
  unique.set(valueKey(point.group), point)
  for (const candidate of points) {
    if (valueKey(coordinate(candidate)) !== key) continue
    const group = valueKey(candidate.group)
    if (!unique.has(group)) unique.set(group, candidate)
  }
  const sorted = [...unique.values()].sort((left, right) => left.y - right.y)
  return [point, ...sorted.filter((candidate) => candidate !== point)]
}
