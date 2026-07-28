import type {
  ChartScaleResolveContext,
  ChartValue,
  ConfiguredScaleLike,
  ResolvedScale,
} from './types'

export function resolveConfiguredScale<TValue extends ChartValue>(
  source: ConfiguredScaleLike<TValue>,
  context: ChartScaleResolveContext,
): ResolvedScale {
  const scale = source.copy()
  const categorical = scale.bandwidth !== undefined
  const naturalRange =
    categorical && context.id === 'y'
      ? ([Math.min(...context.range), Math.max(...context.range)] as const)
      : context.range
  const range = context.options?.reverse
    ? ([naturalRange[1], naturalRange[0]] as const)
    : naturalRange
  scale.range(range)
  const domain = scale.domain()
  const tickValues = scale.ticks?.(context.tickCount) ?? domain
  const tickFormat = scale.tickFormat?.(context.tickCount)
  const bandwidth = scale.bandwidth?.() ?? 0
  const map = (value: unknown) => {
    const result = scale(value as TValue)
    return result === undefined ? Number.NaN : result + bandwidth / 2
  }

  return {
    id: context.id,
    type: categorical ? 'band' : 'configured',
    domain,
    map,
    ticks: tickValues.map((value) => ({
      value,
      position: map(value),
      label:
        context.options?.format?.(value) ??
        tickFormat?.(value) ??
        formatValue(value),
    })),
    bandwidth,
  }
}

function formatValue(value: ChartValue): string {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}
