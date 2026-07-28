import { extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import type { ChartColorScale, ChartKey, ResolvedColorScale } from './types'

export interface LinearColorScaleOptions {
  clamp?: boolean
  interpolate?: (ratio: number, range: readonly string[]) => string
}

const defaultSequentialRange = ['#eff6ff', '#60a5fa', '#1d4ed8', '#172554']

export function scaleColorLinear(
  options: LinearColorScaleOptions = {},
): ChartColorScale {
  return {
    id: 'linear',
    resolve(context): ResolvedColorScale {
      const values = context.values.filter(isNumber)
      const requested = context.domain?.filter(isNumber)
      const domain = resolveDomain(requested?.length ? requested : values)
      const range =
        context.range && context.range.length >= 2
          ? context.range
          : defaultSequentialRange
      const ratio = scaleLinear()
        .domain(domain)
        .range([0, 1])
        .clamp(options.clamp !== false)
      const stopDomain = range.map(
        (_color, index) =>
          domain[0] +
          ((domain[1] - domain[0]) * index) / Math.max(1, range.length - 1),
      )
      const color = scaleLinear<string>()
        .domain(stopDomain)
        .range([...range])
        .clamp(options.clamp !== false)

      return {
        type: 'linear',
        domain,
        range,
        map(value: ChartKey | null | undefined) {
          if (!isNumber(value)) return range[0] as string
          return options.interpolate
            ? options.interpolate(ratio(value), range)
            : normalizeRgb(color(value))
        },
      }
    },
  }
}

function resolveDomain(values: readonly number[]): [number, number] {
  const [minimum, maximum] = extent(values)
  if (minimum === undefined || maximum === undefined) return [0, 1]
  if (minimum !== maximum) return [minimum, maximum]
  const offset = Math.abs(minimum) * 0.05 || 1
  return [minimum - offset, maximum + offset]
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeRgb(value: string): string {
  return value.replace(
    /^rgba?\(([^,]+),\s*([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\)$/,
    (_match, red: string, green: string, blue: string, alpha?: string) =>
      alpha === undefined
        ? `rgb(${red} ${green} ${blue})`
        : `rgb(${red} ${green} ${blue} / ${alpha})`,
  )
}
