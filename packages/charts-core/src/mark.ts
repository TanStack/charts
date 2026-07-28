import type {
  Channel,
  ChannelAccessor,
  ChartKey,
  ChartValue,
  InitializedMark,
  MarkInitializeContext,
  ChartMark,
  VisualChannel,
} from './types'

export function isChartKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}

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
): ChartMark<TDatum, TXValue, TYValue> {
  return { initialize }
}

export function visualValue<TDatum, TValue>(
  channel: VisualChannel<TDatum, TValue> | undefined,
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
  fallback: TValue,
): TValue {
  return typeof channel === 'function'
    ? (channel as ChannelAccessor<TDatum, TValue>)(datum, index, data)
    : (channel ?? fallback)
}

export function channelValues<TDatum, TValue>(
  data: readonly TDatum[],
  channel: Channel<TDatum, TValue> | undefined,
  fallback: (datum: TDatum, index: number, data: readonly TDatum[]) => TValue,
): TValue[] {
  if (typeof channel === 'function') {
    return data.map((datum, index) => channel(datum, index, data))
  }
  if (channel !== undefined) {
    return data.map((datum) =>
      datum != null && typeof datum === 'object'
        ? (datum as Record<string, TValue>)[channel]
        : undefined,
    ) as TValue[]
  }
  return data.map(fallback)
}
