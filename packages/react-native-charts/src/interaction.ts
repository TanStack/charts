import {
  resolveChartFocusStrategy,
  resolveChartPointerFocus,
  restoreChartFocusPoint,
  sameChartPointIdentity,
} from '@tanstack/charts/cursor/host'
import { focusDisabled } from '@tanstack/charts/focus/disabled'
import {
  findNearestPoint,
  viewportInteractionPoints,
} from '@tanstack/charts/scene'
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
  const points = viewportInteractionPoints(scene)
  const strategy = resolveFocusStrategy(definition.focus)
  const spatialIndex =
    definition.focus === false
      ? undefined
      : definition.spatialIndex?.(points, { scene })
  const maxDistance = definition.maxFocusDistance ?? 48
  const navigation = strategy?.navigation(points) ?? sceneOrder(points)

  return {
    resolve(x, y) {
      const focused = resolveChartPointerFocus(
        scene,
        strategy,
        x,
        y,
        maxDistance,
        points,
      )
      if (focused) return focused
      const point = spatialIndex
        ? spatialIndex.findNearest(x, y, maxDistance)
        : findNearestPoint(scene, x, y, maxDistance, points)
      const visible = point ? restoreFocusedPoint(points, point) : null
      return visible ? [visible] : []
    },
    group(point) {
      return strategy?.group(points, { point }) ?? [point]
    },
    navigation,
    restore(point) {
      return restoreFocusedPoint(points, point)
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
  return sameChartPointIdentity(left, right)
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
  return resolveChartFocusStrategy(focus)
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

const restoreFocusedPoint = restoreChartFocusPoint
