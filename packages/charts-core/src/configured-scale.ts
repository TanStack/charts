import type {
  ChartScaleResolveContext,
  ChartValue,
  ChartScaleInput,
  ResolvedScale,
} from './types'
import { resolveScaleInput } from './scale-input'

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

  return {
    id: context.id,
    type: categorical ? 'band' : 'configured',
    domain,
    map,
    ticks: tickValues.map((value) => ({
      value,
      position: map(value),
      label:
        configuredTicks?.format?.(value) ??
        tickFormat?.(value) ??
        formatValue(value),
    })),
    bandwidth,
  }
}

function formatValue(value: ChartValue): string {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}
