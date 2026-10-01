import type { InteractionAxis } from './interaction-axis-internal'
import type { ChartValue } from './types'

export interface InteractionRange<TValue extends ChartValue> {
  readonly start: TValue
  readonly end: TValue
}

/** Shared semantic interval normalization for axis-bound interactions. */
export function normalizeInteractionRange<TValue extends ChartValue>(
  axis: InteractionAxis<TValue>,
  range: InteractionRange<TValue>,
): InteractionRange<TValue> {
  const [start, end] = axis.order(range.start, range.end)
  return { start, end }
}

export function sameInteractionRange<TValue extends ChartValue>(
  axis: InteractionAxis<TValue>,
  left: InteractionRange<TValue>,
  right: InteractionRange<TValue>,
) {
  return (
    axis.layoutKey(left.start) === axis.layoutKey(right.start) &&
    axis.layoutKey(left.end) === axis.layoutKey(right.end)
  )
}

export function cloneInteractionRange<TValue extends ChartValue>(
  range: InteractionRange<TValue>,
): InteractionRange<TValue> {
  return {
    start: cloneInteractionValue(range.start),
    end: cloneInteractionValue(range.end),
  }
}

export function cloneInteractionValue<TValue extends ChartValue>(
  value: TValue,
): TValue {
  return (value instanceof Date ? new Date(value.getTime()) : value) as TValue
}

/**
 * Whether idle pointer hover over a first-party host control reaches chart
 * point focus and tooltips. `capture` keeps hover inside the control;
 * `passthrough` forwards idle hover while presses, drags, wheel, clicks, and
 * keyboard input stay with the control.
 */
export type ChartControlHover = 'capture' | 'passthrough'

export function resolveControlHover(
  hover: ChartControlHover | undefined,
  owner: string,
): ChartControlHover {
  if (hover === undefined || hover === 'capture') return 'capture'
  if (hover === 'passthrough') return hover
  throw new TypeError(`${owner} hover must be "capture" or "passthrough"`)
}
