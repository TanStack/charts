import { valueKey } from './scales'
import type { PolarLayoutContext } from './polar-mark-internal'
import type {
  ChartFocusGroupContext,
  ChartFocusResolveContext,
  ChartPoint,
  ChartValue,
} from './types'

const polarFocusGeometry = Symbol('tanstack-charts-polar-focus')

type PolarFocusGeometry = readonly [
  scope: PolarLayoutContext,
  angle: number,
  radius: number,
  offsetX: number,
  offsetY: number,
]

const enum Geometry {
  Scope,
  Angle,
  Radius,
  OffsetX,
  OffsetY,
}

type PolarFocusPoint = ChartPoint & {
  [polarFocusGeometry]?: PolarFocusGeometry
}

/** Attaches renderer-neutral polar coordinates without widening ChartPoint. */
export function withPolarFocusGeometry<
  TPoint extends ChartPoint<any, any, any>,
>(
  point: TPoint,
  layout: PolarLayoutContext,
  angle: number,
  radius: number,
  offsetX: number,
  offsetY: number,
): TPoint {
  return Object.assign(point, {
    [polarFocusGeometry]: [layout, angle, radius, offsetX, offsetY],
  })
}

/** Groups the nearest angular ray across radial series. */
export const focusGroupAngle = {
  resolve<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusResolveContext,
  ) {
    const maximum = Math.max(0, context.maxDistance)
    let nearest: (typeof points)[number] | undefined
    let nearestGeometry: PolarFocusGeometry | undefined
    let primaryDistance = maximum
    let secondaryDistance = Infinity

    for (const point of points) {
      const geometry = geometryForPoint(point)
      if (!geometry) continue
      const centerX = point.x - geometry[Geometry.OffsetX]
      const centerY = point.y - geometry[Geometry.OffsetY]
      const nextPrimary = distanceToPolarRay(
        context.x,
        context.y,
        centerX,
        centerY,
        geometry[Geometry.Angle],
        geometry[Geometry.Scope].radius,
      )
      if (nextPrimary > primaryDistance) continue
      const nextSecondary = Math.hypot(point.x - context.x, point.y - context.y)
      if (nextPrimary < primaryDistance || nextSecondary < secondaryDistance) {
        nearest = point
        nearestGeometry = geometry
        primaryDistance = nextPrimary
        secondaryDistance = nextSecondary
      }
    }

    return nearest && nearestGeometry
      ? groupAnglePoints(points, nearest, nearestGeometry)
      : []
  },
  group<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusGroupContext<TDatum, TXValue, TYValue>,
  ) {
    const geometry = geometryForPoint(context.point)
    return geometry
      ? groupAnglePoints(points, context.point, geometry)
      : [context.point]
  },
  navigation<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) {
    const sorted = points
      .flatMap((point) => {
        const geometry = geometryForPoint(point)
        return geometry ? [{ point, geometry }] : []
      })
      .sort(
        (left, right) =>
          left.geometry[Geometry.Angle] - right.geometry[Geometry.Angle] ||
          left.geometry[Geometry.Radius] - right.geometry[Geometry.Radius],
      )
    const scopes = new Map<PolarLayoutContext, Set<string>>()
    return sorted.flatMap(({ point, geometry }) => {
      let values = scopes.get(geometry[Geometry.Scope])
      if (!values) scopes.set(geometry[Geometry.Scope], (values = new Set()))
      const key = valueKey(point.xValue)
      if (values.has(key)) return []
      values.add(key)
      return [point]
    })
  },
} satisfies UniversalPolarFocusStrategy

interface UniversalPolarFocusStrategy {
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

function geometryForPoint(point: ChartPoint): PolarFocusGeometry | undefined {
  return (point as PolarFocusPoint)[polarFocusGeometry]
}

function groupAnglePoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  point: ChartPoint<TDatum, TXValue, TYValue>,
  geometry: PolarFocusGeometry,
) {
  const value = valueKey(point.xValue)
  const unique = new Map<string, ChartPoint<TDatum, TXValue, TYValue>>()
  unique.set(valueKey(point.group), point)
  for (const candidate of points) {
    const candidateGeometry = geometryForPoint(candidate)
    if (
      candidateGeometry?.[Geometry.Scope] !== geometry[Geometry.Scope] ||
      valueKey(candidate.xValue) !== value
    ) {
      continue
    }
    const group = valueKey(candidate.group)
    if (!unique.has(group)) unique.set(group, candidate)
  }
  const sorted = [...unique.values()].sort(
    (left, right) =>
      (geometryForPoint(left)?.[Geometry.Radius] ?? 0) -
      (geometryForPoint(right)?.[Geometry.Radius] ?? 0),
  )
  return [point, ...sorted.filter((candidate) => candidate !== point)]
}

function distanceToPolarRay(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
  radius: number,
) {
  const unitX = Math.sin(angle)
  const unitY = -Math.cos(angle)
  const deltaX = x - centerX
  const deltaY = y - centerY
  const projection = Math.min(
    Math.max(deltaX * unitX + deltaY * unitY, 0),
    Math.max(0, radius),
  )
  return Math.hypot(deltaX - projection * unitX, deltaY - projection * unitY)
}
