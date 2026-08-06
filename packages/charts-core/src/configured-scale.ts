import type {
  ChartContinuousValue,
  ChartContinuousDomain,
  ChartScaleResolveContext,
  ChartValue,
  ChartScaleInput,
  ConfiguredScaleLike,
  ResolvedScale,
} from './types'
import { isLogarithmicScale, resolveScaleInput } from './scale-input'

export function resolveConfiguredScale<TValue extends ChartValue>(
  source: ChartScaleInput<TValue>,
  context: ChartScaleResolveContext,
): ResolvedScale {
  const scale = resolveScaleInput(source, {
    values: context.values,
    includeZero: context.includeZero,
    nice: context.options?.nice,
    niceCount: context.tickCount,
  })
  const contentDomain = copyDomain(scale.domain())
  const viewport = resolveViewport(scale, context, contentDomain)
  const categorical = scale.bandwidth !== undefined
  const naturalRange =
    categorical && context.id === 'y'
      ? ([Math.min(...context.range), Math.max(...context.range)] as const)
      : context.range
  const range = context.options?.reverse
    ? ([naturalRange[1], naturalRange[0]] as const)
    : naturalRange
  scale.range(range)
  const domain = copyDomain(scale.domain())
  if (
    viewport &&
    (!sameDomain(domain, viewport.domain) ||
      !mapsDomainToRange(scale, viewport.domain, range))
  ) {
    throw new TypeError(
      `Chart viewport "${context.id}" requires independent configurable domain and range capabilities`,
    )
  }
  const tickOptions =
    context.options?.axis === false ? undefined : context.options?.axis?.ticks
  const configuredTicks = tickOptions === false ? undefined : tickOptions
  const tickValues =
    configuredTicks?.values ?? scale.ticks?.(context.tickCount) ?? domain
  const tickFormat = scale.tickFormat?.(context.tickCount)
  const bandwidth = scale.bandwidth?.() ?? 0
  const map = (value: unknown) => {
    const result = scale(value as TValue)
    return result === undefined ? Number.NaN : result + bandwidth / 2
  }
  const invert = scale.invert
    ? (position: number) => scale.invert!(position - bandwidth / 2)
    : undefined

  return {
    id: context.id,
    type: categorical ? 'band' : 'configured',
    domain,
    map,
    ...(invert ? { invert } : {}),
    ticks: tickValues.map((value) => ({
      value,
      position: map(value),
      label:
        configuredTicks?.format?.(value) ??
        tickFormat?.(value) ??
        formatValue(value),
    })),
    bandwidth,
    ...(viewport
      ? {
          viewport: {
            contentDomain,
            domain: viewport.domain,
            translate: viewport.translate,
            map: (value: unknown) => map(value) + viewport.translate,
          },
        }
      : {}),
  }
}

function resolveViewport<TValue extends ChartValue>(
  scale: ConfiguredScaleLike<TValue>,
  context: ChartScaleResolveContext,
  contentDomain: readonly TValue[],
):
  | {
      domain: ChartContinuousDomain
      translate: number
    }
  | undefined {
  const viewport = context.options?.viewport
  if (!viewport) return undefined
  const capable = scale as ConfiguredScaleLike<TValue> & {
    invert?: unknown
    clamp?: () => unknown
  }
  if (
    scale.bandwidth !== undefined ||
    typeof scale.ticks !== 'function' ||
    typeof capable.invert !== 'function'
  ) {
    throw new TypeError(
      `Chart viewport "${context.id}" requires a continuous numeric or temporal scale`,
    )
  }
  if (typeof capable.clamp === 'function' && capable.clamp() === true) {
    throw new TypeError(
      `Chart viewport "${context.id}" does not support a clamped scale`,
    )
  }

  const domain = viewport.domain as readonly ChartValue[]
  if (domain.length !== 2 || !sameContinuousType(domain[0], domain[1])) {
    invalidViewportDomain(context.id)
  }
  const first = continuousNumber(domain[0]!)
  const last = continuousNumber(domain[1]! as ChartContinuousValue)
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === last) {
    invalidViewportDomain(context.id)
  }
  validateViewportLogDomains(scale, context.id, contentDomain, domain)
  const translate = viewport.translate ?? 0
  if (!Number.isFinite(translate)) {
    throw new TypeError(
      `Chart viewport "${context.id}" translate must be a finite number`,
    )
  }

  if (sameDomain(scale.domain(), domain)) {
    configureScaleDomain(
      scale,
      [domain[1]!, domain[0]!] as TValue[],
      context.id,
    )
  }
  configureScaleDomain(scale, domain as readonly TValue[], context.id)

  const resolved = copyDomain(scale.domain())
  if (resolved.length !== 2 || !sameContinuousType(resolved[0], resolved[1])) {
    invalidConfigurableDomain(context.id)
  }

  return {
    domain: resolved as unknown as ChartContinuousDomain,
    translate,
  }
}

function configureScaleDomain<TValue extends ChartValue>(
  scale: ConfiguredScaleLike<TValue>,
  domain: readonly TValue[],
  id: string,
): void {
  const setDomain = scale.domain as unknown as (
    values: Iterable<TValue>,
  ) => unknown
  try {
    setDomain.call(scale, [...domain])
  } catch {
    invalidConfigurableDomain(id)
  }
  if (!sameDomain(scale.domain(), domain)) invalidConfigurableDomain(id)
}

function sameDomain(
  resolved: readonly ChartValue[],
  expected: readonly ChartValue[],
) {
  return (
    resolved.length === expected.length &&
    resolved.every((value, index) => sameChartValue(value, expected[index]!))
  )
}

function mapsDomainToRange<TValue extends ChartValue>(
  scale: ConfiguredScaleLike<TValue>,
  domain: ChartContinuousDomain,
  range: readonly [number, number],
) {
  const first = scale(domain[0] as TValue)
  const last = scale(domain[1] as TValue)
  return (
    first !== undefined &&
    last !== undefined &&
    Number.isFinite(first) &&
    Number.isFinite(last) &&
    Math.abs(first - range[0]) <= 1e-6 &&
    Math.abs(last - range[1]) <= 1e-6
  )
}

function copyDomain<TValue extends ChartValue>(domain: readonly TValue[]) {
  return domain.map((value) =>
    value instanceof Date ? new Date(value.getTime()) : value,
  ) as TValue[]
}

function invalidConfigurableDomain(id: string): never {
  throw new TypeError(
    `Chart viewport "${id}" requires a scale with a configurable domain`,
  )
}

function validateViewportLogDomains(
  scale: object,
  id: string,
  contentDomain: readonly ChartValue[],
  viewportDomain: readonly ChartValue[],
): void {
  if (!isLogarithmicScale(scale)) return
  const contentSign = logarithmicDomainSign(contentDomain)
  const viewportSign = logarithmicDomainSign(viewportDomain)
  if (
    contentSign === undefined ||
    viewportSign === undefined ||
    contentSign !== viewportSign
  ) {
    throw new TypeError(
      `Chart viewport "${id}" logarithmic content and viewport domains must be finite, nonzero, and stay on the same side of zero`,
    )
  }
}

function logarithmicDomainSign(domain: readonly ChartValue[]) {
  let sign: number | undefined
  for (const value of domain) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
      return undefined
    }
    const current = Math.sign(value)
    if (sign !== undefined && current !== sign) return undefined
    sign = current
  }
  return sign
}

function sameContinuousType(
  first: ChartValue | undefined,
  last: ChartValue | undefined,
): first is ChartContinuousValue {
  return (
    (typeof first === 'number' && typeof last === 'number') ||
    (first instanceof Date && last instanceof Date)
  )
}

function continuousNumber(value: ChartContinuousValue): number {
  return value instanceof Date ? value.getTime() : value
}

function sameChartValue(left: ChartValue | undefined, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}

function invalidViewportDomain(id: string): never {
  throw new TypeError(
    `Chart viewport "${id}" domain must contain two distinct finite numbers or Dates`,
  )
}

function formatValue(value: ChartValue): string {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}
