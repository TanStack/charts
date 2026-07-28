import { extent as d3Extent, ticks as d3Ticks } from 'd3-array'
import { format as d3Format } from 'd3-format'
import {
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scalePoint,
  scaleTime,
  scaleUtc,
} from 'd3-scale'
import type {
  ChartAxisOptions,
  ChartColorOptions,
  ChartKey,
  ChartScaleTransform,
  ChartTheme,
  ChartTick,
  ChartValue,
  ResolvedColorScale,
  ResolvedScale,
} from './types'

const formatSi = d3Format('.3~s')
const formatGeneral = d3Format('.3~g')

export function createColorScale(
  values: readonly unknown[],
  options: ChartColorOptions | undefined,
  theme: ChartTheme,
): ResolvedColorScale {
  if (options?.type) {
    return options.type.resolve({
      values,
      domain: options.domain,
      range: options.range,
      theme,
    })
  }

  const domain: ChartKey[] = []
  const keys: string[] = []
  const seen = new Set<string>()
  for (const value of options?.domain ?? values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const key = valueKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    domain.push(value)
    keys.push(key)
  }

  const range = options?.range?.length ? options.range : theme.palette
  const ordinal = scaleOrdinal<string, string>()
    .domain(keys)
    .range(range.length ? [...range] : ['currentColor'])

  const map = (value: ChartKey | null | undefined) => {
    if (value == null) return range[0] ?? 'currentColor'
    const key = valueKey(value)
    if (!seen.has(key)) {
      seen.add(key)
      domain.push(value)
    }
    return ordinal(key)
  }

  return { type: 'ordinal', domain, range, map }
}

export function valueKey(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}

export function numericValue(value: unknown): number {
  return value instanceof Date ? value.getTime() : Number(value)
}

export function createScale(
  id: string,
  values: readonly unknown[],
  range: readonly [number, number],
  options: ChartAxisOptions | undefined,
  tickCount: number,
): ResolvedScale {
  const outputRange: readonly [number, number] = options?.reverse
    ? [range[1], range[0]]
    : range
  const requested = options?.domain
  const firstValue = (requested ?? values).find(isChartValue)
  const suppliedStrategy =
    typeof options?.type === 'object' ? options.type : undefined
  const configuredType =
    typeof options?.type === 'string' ? options.type : undefined
  const strategy: ChartScaleTransform = suppliedStrategy ?? identityTransform
  const type: string =
    suppliedStrategy?.id ??
    configuredType ??
    (firstValue instanceof Date
      ? 'time'
      : typeof firstValue === 'string'
        ? 'band'
        : 'linear')

  if (type === 'band' || type === 'point') {
    const categoricalRange: readonly [number, number] =
      id === 'y' && outputRange[0] > outputRange[1]
        ? [outputRange[1], outputRange[0]]
        : outputRange
    return createCategoricalScale(
      id,
      type,
      requested ?? values,
      categoricalRange,
      options,
      tickCount,
    )
  }

  const requestedExtent =
    requested && requested.length >= 2
      ? ([requested[0], requested[requested.length - 1]] as const)
      : undefined
  const numericValues = values
    .map(numericValue)
    .filter((value) => strategy.filter?.(value) ?? true)
  const rawDomain = requestedExtent
    ? expandDomain(
        numericValue(requestedExtent[0]),
        numericValue(requestedExtent[1]),
      )
    : extent(numericValues, strategy.defaultDomain ?? [0, 1])
  const includeZero = options?.zero ?? false
  const zeroDomain: [number, number] = includeZero
    ? [Math.min(0, rawDomain[0]), Math.max(0, rawDomain[1])]
    : rawDomain
  const numericDomain =
    type === 'linear' && (options?.nice ?? !requested)
      ? niceDomain(zeroDomain, tickCount)
      : zeroDomain
  strategy.validate?.(numericDomain)

  if (type === 'time' || type === 'utc') {
    return createTemporalScale(
      id,
      type,
      numericDomain,
      outputRange,
      options,
      tickCount,
    )
  }

  const transformedDomain = [
    strategy.forward(numericDomain[0]),
    strategy.forward(numericDomain[1]),
  ] as const
  const d3Scale = scaleLinear()
    .domain([...transformedDomain])
    .range([...outputRange])
    .clamp(options?.clamp ?? false)
  const resolvedStrategy = strategy.resolve?.({
    domain: numericDomain,
    range: outputRange,
    clamp: options?.clamp ?? false,
    tickCount,
  })
  const map = (value: unknown) =>
    resolvedStrategy?.map(numericValue(value)) ??
    d3Scale(strategy.forward(numericValue(value)))
  const numericTicks =
    resolvedStrategy?.ticks ??
    (type === 'linear'
      ? d3Ticks(numericDomain[0], numericDomain[1], tickCount)
      : (strategy.ticks?.(numericDomain, transformedDomain, tickCount) ??
        d3Ticks(transformedDomain[0], transformedDomain[1], tickCount).map(
          strategy.inverse,
        )))
  const ticks: ChartTick[] = numericTicks.map((value) => ({
    value,
    position: map(value),
    label: options?.format?.(value) ?? formatNumber(value),
  }))

  return {
    id,
    type,
    domain: numericDomain,
    map,
    ticks,
    bandwidth: 0,
  }
}

export const createContinuousScale = createScale

function createCategoricalScale(
  id: string,
  type: 'band' | 'point',
  values: readonly unknown[],
  range: readonly [number, number],
  options: ChartAxisOptions | undefined,
  tickCount: number,
): ResolvedScale {
  const domain: ChartValue[] = []
  const keys: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (!isChartValue(value)) continue
    const key = valueKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    domain.push(value)
    keys.push(key)
  }

  if (!domain.length) {
    domain.push('')
    keys.push(valueKey(''))
  }

  const padding = Math.max(0, options?.padding ?? (type === 'band' ? 0.1 : 0.5))
  const band =
    type === 'band'
      ? scaleBand<string>()
          .domain(keys)
          .range([...range])
          .paddingInner(Math.min(1, padding))
          .paddingOuter(padding / 2)
      : undefined
  const point =
    type === 'point'
      ? scalePoint<string>()
          .domain(keys)
          .range([...range])
          .padding(padding)
      : undefined
  const map = (value: unknown) => {
    const key = valueKey(value)
    if (band) {
      const position = band(key)
      return position === undefined
        ? Number.NaN
        : position + band.bandwidth() / 2
    }
    return point?.(key) ?? Number.NaN
  }
  const tickValues =
    domain.length <= tickCount
      ? domain
      : domain.filter(
          (_value, index) =>
            index % Math.ceil(domain.length / tickCount) === 0 ||
            index === domain.length - 1,
        )
  const ticks = tickValues.map((value) => ({
    value,
    position: map(value),
    label: options?.format?.(value) ?? formatCategorical(value),
  }))

  return {
    id,
    type,
    domain,
    map,
    ticks,
    bandwidth: band?.bandwidth() ?? 0,
  }
}

function createTemporalScale(
  id: string,
  type: 'time' | 'utc',
  numericDomain: readonly [number, number],
  range: readonly [number, number],
  options: ChartAxisOptions | undefined,
  tickCount: number,
): ResolvedScale {
  const domain: [Date, Date] = [
    new Date(numericDomain[0]),
    new Date(numericDomain[1]),
  ]
  const temporal =
    type === 'utc'
      ? scaleUtc()
          .domain(domain)
          .range([...range])
      : scaleTime()
          .domain(domain)
          .range([...range])
  temporal.clamp(options?.clamp ?? false)
  const map = (value: unknown) => temporal(new Date(numericValue(value)))
  const d3TickFormat = temporal.tickFormat(tickCount)
  const span = numericDomain[1] - numericDomain[0]
  const ticks = temporal.ticks(tickCount).map((value) => ({
    value,
    position: map(value),
    label:
      options?.format?.(value) ??
      (options?.locale != null || options?.timeZone != null
        ? formatDate(value, span, options, type === 'utc')
        : d3TickFormat(value)),
  }))

  return { id, type, domain, map, ticks, bandwidth: 0 }
}

export function extent(
  values: readonly number[],
  fallback: readonly [number, number] = [0, 1],
): [number, number] {
  const [min, max] = d3Extent(values, (value) =>
    Number.isFinite(value) ? value : undefined,
  )
  return min === undefined || max === undefined
    ? [...fallback]
    : expandDomain(min, max)
}

export function expandDomain(min: number, max: number): [number, number] {
  if (min !== max) return min < max ? [min, max] : [max, min]
  const offset = Math.abs(min) * 0.05 || 1
  return [min - offset, max + offset]
}

export function niceDomain(
  domain: readonly [number, number],
  count: number,
): [number, number] {
  const resolved = scaleLinear()
    .domain([...domain])
    .nice(count)
    .domain()
  return [resolved[0] ?? domain[0], resolved[1] ?? domain[1]]
}

export function linearTicks(
  domain: readonly [number, number],
  count: number,
): number[] {
  return d3Ticks(domain[0], domain[1], count)
}

export function formatNumber(value: number): string {
  return (Math.abs(value) >= 1_000 ? formatSi(value) : formatGeneral(value))
    .replace('G', 'B')
    .replace('µ', 'u')
}

const identityTransform: ChartScaleTransform = {
  id: 'linear',
  forward: (value: number) => value,
  inverse: (value: number) => value,
}

function formatDate(
  value: Date,
  span: number,
  options: ChartAxisOptions | undefined,
  utc: boolean,
): string {
  const locale = options?.locale
  const timeZone = options?.timeZone ?? (utc ? 'UTC' : undefined)
  const formatOptions: Intl.DateTimeFormatOptions =
    span <= 2 * 24 * 60 * 60_000
      ? { hour: 'numeric', minute: '2-digit', timeZone }
      : span <= 60 * 24 * 60 * 60_000
        ? { month: 'short', day: 'numeric', timeZone }
        : span <= 2 * 365 * 24 * 60 * 60_000
          ? { month: 'short', timeZone }
          : { year: 'numeric', timeZone }

  return new Intl.DateTimeFormat(
    locale == null ? undefined : [...new Set([locale].flat())],
    formatOptions,
  ).format(value)
}

function isChartValue(value: unknown): value is ChartValue {
  return (
    value instanceof Date ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}

function formatCategorical(value: ChartValue): string {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}
