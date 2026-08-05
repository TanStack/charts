import {
  focusNearestX,
  focusNearestY,
  focusX,
  focusY,
} from '@tanstack/charts/focus'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import { findNearestPoint } from '@tanstack/charts/scene'
import type {
  ChartDefinition,
  ChartFocusMode,
  ChartFocusStrategy,
  ChartPoint,
  ChartScene,
  ChartValue,
} from '@tanstack/charts/types'

export interface NativeChartFocusModel<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  resolve: (
    x: number,
    y: number,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  group: (
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  navigation: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  restore: (
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ) => ChartPoint<TDatum, TXValue, TYValue> | null
}

export function createNativeChartFocusModel<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
): NativeChartFocusModel<TDatum, TXValue, TYValue> {
  const strategy = resolveFocusStrategy(definition.focus)
  const spatialIndex =
    definition.focus === false
      ? undefined
      : definition.spatialIndex?.(scene.points, scene)
  const maxDistance = definition.maxFocusDistance ?? 48
  const navigation =
    strategy?.navigation(scene.points) ?? sceneOrder(scene.points)

  return {
    resolve(x, y) {
      if (strategy) {
        return strategy.resolve(scene.points, x, y, maxDistance)
      }
      const point = spatialIndex
        ? spatialIndex.findNearest(x, y, maxDistance)
        : findNearestPoint(scene, x, y, maxDistance)
      return point ? [point] : []
    },
    group(point) {
      return strategy?.group(scene.points, point) ?? [point]
    },
    navigation,
    restore(point) {
      return restoreFocusedPoint(scene.points, point)
    },
  }
}

export function adjacentFocusPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  model: NativeChartFocusModel<TDatum, TXValue, TYValue>,
  current: ChartPoint<TDatum, TXValue, TYValue> | null,
  direction: -1 | 1,
) {
  const currentIndex = current
    ? model.navigation.findIndex((point) => samePointIdentity(point, current))
    : -1
  const nextIndex =
    currentIndex < 0
      ? direction > 0
        ? 0
        : model.navigation.length - 1
      : Math.max(
          0,
          Math.min(model.navigation.length - 1, currentIndex + direction),
        )
  return model.navigation[nextIndex] ?? null
}

export function samePointIdentity<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: ChartPoint<TDatum, TXValue, TYValue> | null,
  right: ChartPoint<TDatum, TXValue, TYValue> | null,
) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.key === right.key &&
      left.markId === right.markId &&
      left.datumIndex === right.datumIndex)
  )
}

export function samePointReferences<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  right: readonly ChartPoint<TDatum, TXValue, TYValue>[],
) {
  return (
    left.length === right.length &&
    left.every((point, index) => point === right[index])
  )
}

function resolveFocusStrategy<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  focus: ChartFocusMode<TDatum, TXValue, TYValue> | undefined,
): ChartFocusStrategy<TDatum, TXValue, TYValue> | undefined {
  if (focus === false) return focusDisabled
  if (typeof focus !== 'string') return focus
  switch (focus) {
    case 'nearest-x':
      return focusNearestX
    case 'nearest-y':
      return focusNearestY
    case 'group-x':
      return focusX
    case 'group-y':
      return focusY
    case 'nearest':
      return undefined
  }
}

function sceneOrder<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) {
  return points
    .map((point, index) => ({ point, index }))
    .sort(
      (left, right) =>
        left.point.x - right.point.x ||
        left.point.y - right.point.y ||
        left.index - right.index,
    )
    .map(({ point }) => point)
}

function restoreFocusedPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  previous: ChartPoint<TDatum, TXValue, TYValue>,
) {
  const matches = points.filter((point) => point.key === previous.key)
  if (matches.length < 2) return matches[0] ?? null

  const datumType = typeof previous.datum
  const hasReferenceIdentity =
    previous.datum !== null &&
    (datumType === 'object' || datumType === 'function')
  if (hasReferenceIdentity) {
    const sameDatum = matches.find((point) => point.datum === previous.datum)
    if (sameDatum) return sameDatum
  }

  return (
    matches.find(
      (point) =>
        point.markId === previous.markId &&
        Object.is(point.group, previous.group) &&
        chartValueEqual(point.xValue, previous.xValue) &&
        chartValueEqual(point.yValue, previous.yValue),
    ) ??
    matches.find(
      (point) =>
        point.markId === previous.markId &&
        point.datumIndex === previous.datumIndex,
    ) ??
    matches[0] ??
    null
  )
}

function chartValueEqual(left: ChartValue, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}
