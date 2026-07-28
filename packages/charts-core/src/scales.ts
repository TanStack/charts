import { scaleOrdinal } from 'd3-scale'
import type {
  ChartColorOptions,
  ChartKey,
  ChartTheme,
  ResolvedColorScale,
} from './types'

export function createColorScale(
  values: readonly unknown[],
  options: ChartColorOptions | undefined,
  theme: ChartTheme,
): ResolvedColorScale {
  if (options?.scale) {
    const scale = options.scale.copy()
    const domain = scale.domain?.() ?? options.domain ?? []
    const range = (scale.range?.() ?? options.range ?? theme.palette).map(
      String,
    )
    return {
      type: 'configured',
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
  const ordinal = scaleOrdinal<ChartKey, string>()
    .domain(
      (options?.domain ?? values).filter(
        (value): value is ChartKey =>
          typeof value === 'string' || typeof value === 'number',
      ),
    )
    .range(range)
  const domain = ordinal.domain()
  const map = (value: ChartKey | null | undefined) => {
    if (value == null) return range[0] ?? 'currentColor'
    return ordinal(value)
  }
  return { type: 'ordinal', domain, range, map }
}

export function valueKey(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}
