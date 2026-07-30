import { isChartValue, isFiniteNumber } from './mark'
import type {
  ChartNumericScale,
  ChartScaleFactory,
  ChartScaleInput,
  ChartValue,
  ConfiguredScaleLike,
  InferableScaleLike,
} from './types'

export interface ResolveScaleInputOptions {
  values: readonly unknown[]
  includeZero?: boolean
  nice?: boolean | number
  niceCount?: number
}

export function resolveScaleInput<TValue extends ChartValue>(
  source: ChartScaleInput<TValue>,
  options: ResolveScaleInputOptions,
): ConfiguredScaleLike<TValue> {
  const infer = isScaleFactory(source)
  const created = infer
    ? (source as unknown as () => InferableScaleLike<TValue>)()
    : source
  if (
    typeof created !== 'function' ||
    typeof created.copy !== 'function' ||
    typeof created.domain !== 'function' ||
    typeof created.range !== 'function'
  ) {
    throw new TypeError(
      'A scale factory must return a copyable scale with domain and range methods',
    )
  }
  const scale = created.copy()

  if (infer) {
    const domain = inferScaleDomain(scale, options.values, options.includeZero)
    if (domain) {
      const inferable = scale as InferableScaleLike<TValue>
      inferable.domain(domain as TValue[])
    }
  }

  applyScaleNice(scale, options.nice, options.niceCount)
  return scale
}

export function isScaleFactory<TValue extends ChartValue>(
  source: ChartScaleInput<TValue>,
): source is ChartScaleFactory<TValue> {
  return typeof source === 'function' && !('copy' in source)
}

export function resolveNumericScale(
  source: ChartNumericScale | undefined,
  values: readonly unknown[],
): ((value: number) => number) | undefined {
  if (!source) return undefined
  if (typeof source === 'function') return source
  const scale = resolveScaleInput(source.scale, {
    values,
    includeZero: true,
    nice: source.nice,
    niceCount: 5,
  })
  return (value) => scale(value) ?? Number.NaN
}

function inferScaleDomain(
  scale: ConfiguredScaleLike<any>,
  values: readonly unknown[],
  includeZero = false,
): ChartValue[] | undefined {
  const observed = values.filter(isChartValue)
  if (!observed.length) return undefined

  if (
    typeof scale.bandwidth === 'function' ||
    typeof scale.ticks !== 'function'
  ) {
    const domain: ChartValue[] = []
    const seen = new Set<string>()
    for (const value of observed) {
      const key =
        value instanceof Date
          ? `date:${value.getTime()}`
          : `${typeof value}:${String(value)}`
      if (seen.has(key)) continue
      seen.add(key)
      domain.push(value)
    }
    return domain
  }

  const temporal = scale.domain().some((value) => value instanceof Date)
  if (temporal) {
    const dates = observed.filter(
      (value): value is Date => value instanceof Date,
    )
    if (dates.length !== observed.length) {
      throw new TypeError(
        'A temporal scale factory requires Date channel values',
      )
    }
    let minimum = Infinity
    let maximum = -Infinity
    for (const value of dates) {
      const number = value.getTime()
      minimum = Math.min(minimum, number)
      maximum = Math.max(maximum, number)
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
      throw new TypeError(
        'A temporal scale factory requires Date channel values',
      )
    }
    if (minimum === maximum) {
      const halfDay = 43_200_000
      minimum -= halfDay
      maximum += halfDay
    }
    return [new Date(minimum), new Date(maximum)]
  }

  let minimum = Infinity
  let maximum = -Infinity
  for (const value of observed) {
    if (!isFiniteNumber(value)) {
      throw new TypeError(
        'A quantitative scale factory requires numeric values',
      )
    }
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new TypeError('A quantitative scale factory requires numeric values')
  }

  const logarithmic = isLogarithmicScale(scale)
  if (includeZero) {
    if (logarithmic) {
      throw new TypeError(
        'An inferred log scale cannot include an implicit zero baseline',
      )
    }
    minimum = Math.min(0, minimum)
    maximum = Math.max(0, maximum)
  }
  validateInferredLogDomain(scale, minimum, maximum)
  if (minimum === maximum) {
    if (minimum === 0) return [0, 1]
    const offset = Math.abs(minimum) * 0.05 || 1
    minimum -= offset
    maximum += offset
  }
  return [minimum, maximum]
}

export function isLogarithmicScale(scale: object): boolean {
  return (
    'base' in scale && typeof (scale as { base?: unknown }).base === 'function'
  )
}

export function validateInferredLogDomain(
  scale: object,
  minimum: number,
  maximum: number,
): void {
  if (
    isLogarithmicScale(scale) &&
    (minimum === 0 || maximum === 0 || (minimum < 0 && maximum > 0))
  ) {
    throw new TypeError('An inferred log domain cannot include or cross zero')
  }
}

function applyScaleNice(
  scale: ConfiguredScaleLike<any>,
  nice: boolean | number | undefined,
  defaultCount = 5,
): void {
  if (!nice) return
  const candidate = scale as ConfiguredScaleLike<any> & {
    nice?: (count?: number) => unknown
  }
  if (typeof candidate.nice !== 'function') {
    throw new TypeError('This scale does not support nicening')
  }
  candidate.nice(typeof nice === 'number' ? nice : defaultCount)
}
