import { validateInferredLogDomain } from './scale-input'
import type {
  ChartColorScaleFactory,
  ChartColorOptions,
  ChartKey,
  ChartTheme,
  ConfiguredColorScaleLike,
  InferableColorScaleLike,
  ResolvedColorScaleKind,
  ResolvedColorScale,
} from './types'

export function createColorScale(
  values: readonly unknown[],
  options: ChartColorOptions | undefined,
  theme: ChartTheme,
): ResolvedColorScale {
  if (options?.scale) {
    const infer = isColorScaleFactory(options.scale)
    const source = infer
      ? (options.scale as unknown as () => InferableColorScaleLike<any, any>)()
      : options.scale
    if (typeof source !== 'function' || typeof source.copy !== 'function') {
      throw new TypeError('A color scale must be callable and copyable')
    }
    if (
      infer &&
      (typeof source.domain !== 'function' ||
        typeof source.range !== 'function')
    ) {
      throw new TypeError(
        'A color scale factory must return a scale with domain and range methods',
      )
    }
    const scale = (source as ConfiguredColorScaleLike<any, any>).copy()
    const kind = colorScaleKind(scale as InferableColorScaleLike<any, any>)
    if (infer) {
      const inferable = scale as InferableColorScaleLike<any, any>
      if (options.range?.length) {
        inferable.range(options.range)
      }
      const domain = options.domain ?? inferColorDomain(inferable, values)
      if (options.domain !== undefined || domain.length) {
        inferable.domain(domain)
      }
      const range = inferable.range()
      if (!range.length || range.some((value) => typeof value !== 'string')) {
        throw new TypeError('A color-scale factory requires a string range')
      }
    }
    if (options.nice) {
      const nice = (scale as InferableColorScaleLike<any, any>).nice
      if (typeof nice !== 'function') {
        throw new TypeError('This color scale does not support nicening')
      }
      nice.call(scale, typeof options.nice === 'number' ? options.nice : 5)
    }
    const domain = scale.domain?.() ?? options.domain ?? []
    const range = (scale.range?.() ?? options.range ?? theme.palette).map(
      String,
    )
    return {
      type: 'configured',
      kind,
      domain,
      range,
      map: (value) =>
        value == null ? (range[0] ?? 'currentColor') : String(scale(value)),
    }
  }
  if (options?.type) {
    return options.type.resolve({
      values,
      domain: options.domain,
      range: options.range,
      theme,
    })
  }
  const range = options?.range?.length ? options.range : theme.palette
  const domain = uniqueChartKeys(options?.domain ?? values)
  const mappedKeys = domain.map(valueKey)
  const map = (value: ChartKey | null | undefined) => {
    if (value == null) return range[0] ?? 'currentColor'
    let index = mappedKeys.indexOf(valueKey(value))
    if (index < 0) index = mappedKeys.push(valueKey(value)) - 1
    return range[index % range.length] ?? 'currentColor'
  }
  return { type: 'ordinal', kind: 'categorical', domain, range, map }
}

function uniqueChartKeys(values: readonly unknown[]): ChartKey[] {
  return [...new Set(values.filter(isChartKey))]
}

export function isChartKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}

function isColorScaleFactory(
  source: ConfiguredColorScaleLike<any, any> | ChartColorScaleFactory<any, any>,
): source is ChartColorScaleFactory<any, any> {
  return typeof source === 'function' && !('copy' in source)
}

function inferColorDomain(
  scale: InferableColorScaleLike<any, any>,
  values: readonly unknown[],
): ChartKey[] {
  const observed = values.filter(isChartKey)
  const quantiles = scale.quantiles
  const thresholds = scale.thresholds
  if (quantiles) {
    return quantitativeColorValues(observed)
  }

  if (scale.invertExtent && !thresholds) {
    throw new TypeError(
      'Threshold color-scale factory requires an explicit domain',
    )
  }

  if (scale.ticks || thresholds) {
    const numeric = quantitativeColorValues(observed)
    let minimum = Infinity
    let maximum = -Infinity
    for (const value of numeric) {
      minimum = Math.min(minimum, value)
      maximum = Math.max(maximum, value)
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
      return []
    }
    validateInferredLogDomain(scale, minimum, maximum)
    if (minimum === maximum) {
      if (minimum === 0) {
        maximum = 1
      } else {
        const offset = Math.abs(minimum) * 0.05 || 1
        minimum -= offset
        maximum += offset
      }
    }
    if (thresholds) return [minimum, maximum]
    const stopCount = Math.max(2, scale.domain().length, scale.range().length)
    return Array.from(
      { length: stopCount },
      (_value, index) =>
        minimum + ((maximum - minimum) * index) / (stopCount - 1),
    )
  }

  return uniqueChartKeys(observed)
}

function quantitativeColorValues(values: readonly ChartKey[]): number[] {
  const numeric = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  )
  if (numeric.length !== values.length) colorScaleTypeMismatch()
  return numeric
}

function colorScaleTypeMismatch(): never {
  throw new TypeError(
    'A quantitative color-scale factory requires numeric values',
  )
}

function colorScaleKind(
  scale: InferableColorScaleLike<any, any>,
): ResolvedColorScaleKind {
  if (scale.quantiles) {
    return scale.invertExtent ? 'quantile' : 'continuous'
  }
  if (scale.thresholds) return 'quantize'
  if (scale.invertExtent) return 'threshold'
  return scale.ticks ? 'continuous' : 'categorical'
}

export function valueKey(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  if (typeof value === 'string') return `string:${value.length}:${value}`
  return `${typeof value}:${String(value)}`
}

/** Orders ChartKey values independently from their collision-safe identity. */
export function compareChartKey(
  left: ChartKey | null,
  right: ChartKey | null,
): number {
  const leftOrder = `${typeof left}:${String(left)}`
  const rightOrder = `${typeof right}:${String(right)}`
  return leftOrder < rightOrder ? -1 : leftOrder > rightOrder ? 1 : 0
}
