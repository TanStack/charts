import { type ChartCursorHostExtension } from './cursor-host-contract'
import { valueKey } from './scales'
export {
  chartPointFromNavigationOrder,
  chartPointFromSceneOrder,
  resolveChartFocusStrategy,
  resolveChartPointerFocus,
  restoreChartFocusPoint,
  sameChartPointIdentity,
} from './interaction'
import type {
  ChartCursorBinding,
  ChartCursorController,
  ChartCursorCoordinates,
  ChartCursorPointIdentity,
  ChartCursorPresentation,
  ChartCursorState,
  ChartCursorValues,
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

/** Platform-neutral cursor behavior injected into chart hosts by a binding. */
export const cursorHost: ChartCursorHostExtension = {
  id: 'cursor',
  __chartExtensionType: 'cursor',
  create(controller) {
    let publishedState: ReturnType<typeof controller.getState> | undefined
    let publishing = false
    return {
      controller,
      getState: () => controller.getState(),
      subscribe: (listener) =>
        controller.subscribe(() => {
          if (publishing) {
            publishedState = controller.getState() ?? undefined
          }
          listener()
        }),
      owns: (state) => state !== null && state === publishedState,
      publish(state) {
        publishedState = state
        publishing = true
        try {
          controller.setState(state)
        } finally {
          publishedState = controller.getState() ?? undefined
          publishing = false
        }
      },
      clearOwnedTransient() {
        const current = controller.getState()
        if (!current || current !== publishedState || current.pinned) {
          return false
        }
        publishedState = undefined
        controller.setState(null)
        return true
      },
      clear() {
        publishedState = undefined
        controller.setState(null)
      },
      destroy() {
        const current = controller.getState()
        if (current && current === publishedState && !current.pinned) {
          controller.setState(null)
        }
        publishedState = undefined
      },
      resolvePresentation: resolveChartCursorPresentation,
      resolveFocus: resolveChartCursorFocus,
      createFocusState: createFocusChartCursorState,
      createFreeState: createFreeChartCursorState,
    }
  },
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
