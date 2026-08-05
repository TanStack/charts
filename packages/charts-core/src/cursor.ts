import { focusNearestX, focusNearestY, focusX, focusY } from './focus'
import { findContainingScenePoint } from './nearest'
import { valueKey } from './scales'
import type {
  ChartCursorBinding,
  ChartCursorController,
  ChartCursorCoordinates,
  ChartCursorPointIdentity,
  ChartCursorPresentation,
  ChartCursorState,
  ChartCursorStateUpdater,
  ChartCursorValues,
  ChartFocusMode,
  ChartFocusSource,
  ChartFocusState,
  ChartFocusStrategy,
  ChartPoint,
  ChartScene,
  ChartValue,
} from './types'

/** Creates a framework-neutral cursor store that can be shared by many hosts. */
export function createChartCursor<
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialState: ChartCursorState<TXValue, TYValue> | null = null,
): ChartCursorController<TXValue, TYValue> {
  validateCursorState(initialState)
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setState(next) {
      const resolved =
        typeof next === 'function'
          ? next(state)
          : (next as ChartCursorState<TXValue, TYValue> | null)
      validateCursorState(resolved)
      if (Object.is(resolved, state)) return
      state = resolved
      for (const listener of [...listeners]) listener()
    },
  }
}

/** Projects shared cursor state into one chart's plot and scales. */
export function resolveChartCursorPresentation<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  binding: ChartCursorBinding<TDatum, TXValue, TYValue>,
  state: ChartCursorState<TXValue, TYValue> | null,
): ChartCursorPresentation<TXValue, TYValue> | null {
  if (!state) return null
  const match = binding.mode === 'focus' ? (binding.match ?? 'xy') : 'xy'
  const x =
    match === 'y' ? undefined : resolveCursorAxis(scene, binding, state, 'x')
  const y =
    match === 'x' ? undefined : resolveCursorAxis(scene, binding, state, 'y')
  return x || y || state.anchor === 'value'
    ? { state, axes: match, x, y }
    : null
}

/** Creates free-cursor state from a scene position without resolving a datum. */
export function createFreeChartCursorState<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  binding: Extract<
    ChartCursorBinding<TDatum, TXValue, TYValue>,
    { mode: 'free' }
  >,
  position: Readonly<{ x: number; y: number }>,
  source: ChartFocusSource = 'pointer',
  pinned = false,
): ChartCursorState<TXValue, TYValue> {
  const normalized = {
    x: normalizePosition(position.x, scene.chart.x, scene.chart.width),
    y: normalizePosition(position.y, scene.chart.y, scene.chart.height),
  }
  const base: ChartCursorState<TXValue, TYValue> = {
    anchor: 'normalized',
    scene: position,
    normalized,
    source,
    pinned,
  }
  const presentation = resolveChartCursorPresentation(scene, binding, base)
  const value = cursorValues(presentation?.x?.value, presentation?.y?.value)
  return value ? { ...base, value } : base
}

/** Creates a semantic cursor from focus selected by the existing focus engine. */
export function createFocusChartCursorState<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  binding: Extract<
    ChartCursorBinding<TDatum, TXValue, TYValue>,
    { mode: 'focus' }
  >,
  focus: ChartFocusState<TDatum, TXValue, TYValue>,
): ChartCursorState<TXValue, TYValue> {
  const match = binding.match ?? 'xy'
  const point = focus.primary
  if (match === 'x') {
    return {
      anchor: 'value',
      value: { x: point.xValue },
      scene: { x: point.x },
      normalized: {
        x: normalizePosition(point.x, scene.chart.x, scene.chart.width),
      },
      group: point.group,
      origin: cursorPointIdentity(point),
      source: focus.source,
      pinned: focus.pinned,
    }
  }
  if (match === 'y') {
    return {
      anchor: 'value',
      value: { y: point.yValue },
      scene: { y: point.y },
      normalized: {
        y: normalizePosition(point.y, scene.chart.y, scene.chart.height),
      },
      group: point.group,
      origin: cursorPointIdentity(point),
      source: focus.source,
      pinned: focus.pinned,
    }
  }
  return {
    anchor: 'value',
    value: { x: point.xValue, y: point.yValue },
    scene: { x: point.x, y: point.y },
    normalized: {
      x: normalizePosition(point.x, scene.chart.x, scene.chart.width),
      y: normalizePosition(point.y, scene.chart.y, scene.chart.height),
    },
    group: point.group,
    origin: cursorPointIdentity(point),
    source: focus.source,
    pinned: focus.pinned,
  }
}

/** Resolves a semantic shared cursor to local points, then reuses focus grouping. */
export function resolveChartCursorFocus<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  binding: Extract<
    ChartCursorBinding<TDatum, TXValue, TYValue>,
    { mode: 'focus' }
  >,
  state: ChartCursorState<TXValue, TYValue> | null,
  strategy?: ChartFocusStrategy<TDatum, TXValue, TYValue>,
): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
  if (state?.anchor !== 'value') return []
  const match = binding.match ?? 'xy'
  const xValue = state.value.x
  const yValue = state.value.y
  if ((match === 'x' || match === 'xy') && xValue === undefined) return []
  if ((match === 'y' || match === 'xy') && yValue === undefined) return []

  const matches = points.filter(
    (point) =>
      (match === 'y' || sameChartValue(point.xValue, xValue)) &&
      (match === 'x' || sameChartValue(point.yValue, yValue)),
  )
  const groupedMatches =
    state.group === undefined
      ? matches
      : matches.filter((candidate) =>
          sameChartValue(candidate.group, state.group),
        )
  const candidates = groupedMatches.length ? groupedMatches : matches
  const origin = state.origin
  const point =
    (origin ? cursorPointFromIdentity(candidates, origin) : undefined) ??
    candidates[0]
  return point ? (strategy?.group(points, { point }) ?? [point]) : []
}

/** Resolves built-in focus names without importing renderer or platform code. */
export function resolveChartFocusStrategy<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  focus: ChartFocusMode<TDatum, TXValue, TYValue> | undefined,
): ChartFocusStrategy<TDatum, TXValue, TYValue> | undefined {
  if (focus === false) return undefined
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

/**
 * Resolves explicit pointer focus, or returns undefined for default nearest
 * focus. An empty array means the explicit strategy found no target. A points
 * array distinct from scene.points preserves presentation-point resolution.
 */
export function resolveChartPointerFocus<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  focusMode: ChartFocusMode<TDatum, TXValue, TYValue> | undefined,
  x: number,
  y: number,
  maxDistance: number,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[] = scene.points,
): readonly ChartPoint<TDatum, TXValue, TYValue>[] | undefined {
  const strategy = resolveChartFocusStrategy(focusMode)
  if (!strategy) return undefined
  if (
    points === scene.points &&
    (strategy === focusNearestX ||
      strategy === focusNearestY ||
      strategy === focusX ||
      strategy === focusY)
  ) {
    const contained = findContainingScenePoint(scene, x, y)
    if (contained) {
      return contained.point
        ? strategy.group(points, { point: contained.point })
        : []
    }
  }
  return strategy.resolve(points, { x, y, maxDistance })
}

export function sameChartPointIdentity<
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

function cursorPointIdentity(
  point: Pick<ChartPoint, 'key' | 'markId' | 'datumIndex'>,
): ChartCursorPointIdentity {
  return {
    key: point.key,
    markId: point.markId,
    datumIndex: point.datumIndex,
  }
}

function cursorPointFromIdentity<
  TPoint extends Pick<ChartPoint, 'key' | 'markId' | 'datumIndex'>,
>(points: readonly TPoint[], identity: ChartCursorPointIdentity) {
  const keyed = points.filter(
    (point) => point.key === identity.key && point.markId === identity.markId,
  )
  if (keyed.length === 1) return keyed[0]
  if (keyed.length > 1) {
    return (
      keyed.find((point) => point.datumIndex === identity.datumIndex) ??
      keyed[0]
    )
  }
  return undefined
}

export function restoreChartFocusPoint<
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
        sameChartValue(point.xValue, previous.xValue) &&
        sameChartValue(point.yValue, previous.yValue),
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

export function chartPointFromNavigationOrder<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  current: ChartPoint<TDatum, TXValue, TYValue> | null,
  key: string,
): ChartPoint<TDatum, TXValue, TYValue> | null | undefined {
  const currentIndex = current
    ? points.findIndex((point) => sameChartPointIdentity(point, current))
    : -1
  let nextIndex: number
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = Math.min(points.length - 1, currentIndex + 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = Math.max(0, currentIndex < 0 ? 0 : currentIndex - 1)
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = points.length - 1
      break
    default:
      return undefined
  }
  return points[nextIndex] ?? null
}

export function chartPointFromSceneOrder<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  current: ChartPoint<TDatum, TXValue, TYValue> | null,
  key: string,
): ChartPoint<TDatum, TXValue, TYValue> | null | undefined {
  const direction =
    key === 'ArrowRight' || key === 'ArrowDown'
      ? 1
      : key === 'ArrowLeft' || key === 'ArrowUp'
        ? -1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? 2
            : undefined
  if (direction === undefined) return undefined
  if (!points.length) return null

  const currentIndex = current
    ? points.findIndex((point) => sameChartPointIdentity(point, current))
    : -1
  if (!current || currentIndex < 0 || direction === 0 || direction === 2) {
    return navigationExtreme(points, direction === 2)
  }

  let candidate: ChartPoint<TDatum, TXValue, TYValue> | null = null
  let candidateIndex = -1
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (!point) continue
    const relative = compareNavigationPoints(
      point,
      index,
      current,
      currentIndex,
    )
    if ((direction > 0 && relative <= 0) || (direction < 0 && relative >= 0)) {
      continue
    }
    if (
      !candidate ||
      direction *
        compareNavigationPoints(point, index, candidate, candidateIndex) <
        0
    ) {
      candidate = point
      candidateIndex = index
    }
  }
  return candidate ?? current
}

function navigationExtreme<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(points: readonly ChartPoint<TDatum, TXValue, TYValue>[], maximum: boolean) {
  let candidate = points[0] ?? null
  let candidateIndex = 0
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    if (!point || !candidate) continue
    const comparison = compareNavigationPoints(
      point,
      index,
      candidate,
      candidateIndex,
    )
    if ((maximum && comparison > 0) || (!maximum && comparison < 0)) {
      candidate = point
      candidateIndex = index
    }
  }
  return candidate
}

function compareNavigationPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: ChartPoint<TDatum, TXValue, TYValue>,
  leftIndex: number,
  right: ChartPoint<TDatum, TXValue, TYValue>,
  rightIndex: number,
) {
  return left.x - right.x || left.y - right.y || leftIndex - rightIndex
}

export function sameChartValue(left: unknown, right: unknown) {
  return valueKey(left) === valueKey(right)
}

function resolveCursorAxis<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
  TAxis extends 'x' | 'y',
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  binding: ChartCursorBinding<TDatum, TXValue, TYValue>,
  state: ChartCursorState<TXValue, TYValue>,
  axis: TAxis,
):
  | {
      position: number
      normalized: number
      value?: TAxis extends 'x' ? TXValue : TYValue
    }
  | undefined {
  const origin = axis === 'x' ? scene.chart.x : scene.chart.y
  const length = axis === 'x' ? scene.chart.width : scene.chart.height
  let position: number
  let normalized: number
  let value: TXValue | TYValue | undefined

  if (state.anchor === 'scene') {
    const coordinate = state.scene[axis]
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
      return undefined
    }
    position = coordinate
    normalized = normalizePosition(position, origin, length)
  } else if (state.anchor === 'normalized') {
    const coordinate = state.normalized[axis]
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
      return undefined
    }
    normalized = coordinate
    position = origin + normalized * length
  } else {
    value = state.value[axis] as TXValue | TYValue | undefined
    if (value === undefined) return undefined
    const scale = scene.scales[axis]
    if (!scale || scale.type === 'none') return undefined
    position = scale.map(value)
    if (!Number.isFinite(position)) return undefined
    normalized = normalizePosition(position, origin, length)
  }

  if (state.anchor !== 'value') {
    const options = binding.mode === 'free' ? binding[axis] : undefined
    value = options?.valueAt
      ? options.valueAt({ axis, scene, position, normalized })
      : (state.value?.[axis] as TXValue | TYValue | undefined)
  }

  return { position, normalized, value } as {
    position: number
    normalized: number
    value?: TAxis extends 'x' ? TXValue : TYValue
  }
}

function cursorValues<TXValue extends ChartValue, TYValue extends ChartValue>(
  x: TXValue | undefined,
  y: TYValue | undefined,
): ChartCursorValues<TXValue, TYValue> | undefined {
  return x !== undefined
    ? y !== undefined
      ? { x, y }
      : { x }
    : y !== undefined
      ? { y }
      : undefined
}

function normalizePosition(position: number, origin: number, length: number) {
  return (position - origin) / length
}

function validateCursorState(state: ChartCursorState | null) {
  if (!state) return
  const coordinates = state[state.anchor]
  if (
    !coordinates ||
    (coordinates.x === undefined && coordinates.y === undefined)
  ) {
    throw new TypeError(
      'A chart cursor requires at least one anchor coordinate',
    )
  }
  if (
    state.anchor !== 'value' &&
    ((coordinates.x !== undefined && !Number.isFinite(coordinates.x)) ||
      (coordinates.y !== undefined && !Number.isFinite(coordinates.y)))
  ) {
    throw new TypeError('Chart cursor coordinates must be finite numbers')
  }
}
