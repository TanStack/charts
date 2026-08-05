import { isChartKey, valueKey } from './scales'
import type {
  Channel,
  ChannelAccessor,
  ChartKey,
  ChartValue,
  InitializedMark,
  MarkInitializeContext,
  ChartMark,
  ChartMotionDefinition,
  ChartMarkState,
  ChartMarkStateStyle,
  VisualChannel,
} from './types'

declare const process: { env: { NODE_ENV?: string } } | undefined

const warnedKeyFallbacks = new WeakSet<object>()

export { isChartKey }

export function isChartValue(value: unknown): value is ChartValue {
  return (
    typeof value === 'string' ||
    (value instanceof Date && Number.isFinite(value.getTime())) ||
    isFiniteNumber(value)
  )
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isNonnegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

export function createMark<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialize: (
    context: MarkInitializeContext,
  ) => InitializedMark<TDatum, TXValue, TYValue>,
  motion?: ChartMotionDefinition<TDatum>,
): ChartMark<TDatum, TXValue, TYValue> {
  return motion === undefined ? { initialize } : { initialize, motion }
}

export function markStates<TDatum, TStyle extends ChartMarkStateStyle<TDatum>>(
  data: readonly TDatum[],
  definitions: readonly ChartMarkState<TDatum, TStyle>[] | undefined,
): InitializedMark['states'] {
  return definitions?.length
    ? {
        data,
        definitions: definitions as readonly ChartMarkState<any>[],
      }
    : undefined
}

export function visualValue<TDatum, TValue>(
  channel: VisualChannel<TDatum, TValue> | undefined,
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
  fallback: TValue,
): TValue {
  return typeof channel === 'function'
    ? (channel as ChannelAccessor<TDatum, TValue>)(datum, { index, data })
    : (channel ?? fallback)
}

export function channelValues<TDatum, TValue>(
  data: readonly TDatum[],
  channel: Channel<TDatum, TValue> | undefined,
  fallback: ChannelAccessor<TDatum, TValue>,
): TValue[] {
  if (typeof channel === 'function') {
    return data.map((datum, index) => channel(datum, { index, data }))
  }
  if (channel !== undefined) {
    return data.map((datum) =>
      datum != null && typeof datum === 'object'
        ? (datum as Record<string, TValue>)[channel]
        : undefined,
    ) as TValue[]
  }
  return data.map((datum, index) => fallback(datum, { index, data }))
}

export function inferredKeyValues<TDatum>(
  data: readonly TDatum[],
  key: Channel<TDatum, ChartKey> | undefined,
  options: {
    groups?: readonly unknown[]
    candidates?: readonly (readonly unknown[])[]
    markId?: string
    warningIdentity?: object
  } = {},
): ChartKey[] {
  if (key !== undefined) {
    return channelValues(data, key, (_datum, { index }) => index)
  }

  const candidates = [
    data.map((datum) =>
      datum != null && typeof datum === 'object'
        ? (datum as Record<string, unknown>).id
        : undefined,
    ),
    data.map((datum) => {
      if (datum == null || typeof datum !== 'object') return undefined
      const nested = (datum as Record<string, unknown>).data
      return nested != null && typeof nested === 'object'
        ? (nested as Record<string, unknown>).id
        : undefined
    }),
    ...(options.candidates ?? []),
  ]

  for (const candidate of candidates) {
    if (candidate.length !== data.length) continue
    const normalized = candidate.map(normalizeInferredKey)
    if (
      normalized.every((value): value is ChartKey => value !== undefined) &&
      keysAreUniqueWithinGroups(normalized, options.groups)
    ) {
      return normalized
    }
  }

  warnAboutKeyFallback(
    options.markId,
    options.candidates,
    options.warningIdentity,
  )
  return data.map((_datum, index) => index)
}

export function compositeKeyValues(
  ...channels: readonly (readonly unknown[])[]
): (ChartKey | undefined)[] {
  const length = channels[0]?.length ?? 0
  return Array.from({ length }, (_value, index) => {
    const parts = channels.map((channel) =>
      normalizeInferredKey(channel[index]),
    )
    return parts.every((part) => part !== undefined)
      ? JSON.stringify(parts.map(valueKey))
      : undefined
  })
}

function normalizeInferredKey(value: unknown): ChartKey | undefined {
  if (isChartKey(value)) return value
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `date:${value.getTime()}`
  }
  return undefined
}

function keysAreUniqueWithinGroups(
  keys: readonly ChartKey[],
  groups: readonly unknown[] | undefined,
): boolean {
  const seen = new Set<string>()
  for (let index = 0; index < keys.length; index += 1) {
    const identity = `${valueKey(groups?.[index] ?? null)}:${valueKey(keys[index])}`
    if (seen.has(identity)) return false
    seen.add(identity)
  }
  return true
}

function warnAboutKeyFallback(
  markId: string | undefined,
  candidates: readonly (readonly unknown[])[] | undefined,
  warningIdentity: object | undefined,
) {
  if (
    !markId ||
    !candidates?.length ||
    !warningIdentity ||
    warnedKeyFallbacks.has(warningIdentity) ||
    typeof process === 'undefined' ||
    process.env.NODE_ENV === 'production'
  ) {
    return
  }
  warnedKeyFallbacks.add(warningIdentity)
  console.warn(
    `TanStack Charts could not infer a unique key for mark "${markId}". ` +
      'Using row position; supply key for stable identity across updates.',
  )
}
