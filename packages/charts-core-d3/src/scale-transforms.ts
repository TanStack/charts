import {
  scaleLog as d3ScaleLog,
  scaleSqrt as d3ScaleSqrt,
  scaleSymlog as d3ScaleSymlog,
} from 'd3-scale'
import type { ChartScaleTransform } from './types'

export interface LogScaleOptions {
  base?: number
}

export interface SymlogScaleOptions {
  constant?: number
}

export function scaleLog(options: LogScaleOptions = {}): ChartScaleTransform {
  const base = options.base && options.base > 1 ? options.base : 10
  const divisor = Math.log(base)
  const transform = d3ScaleLog().base(base).domain([1, base]).range([0, 1])

  return {
    id: 'log',
    defaultDomain: [1, base],
    filter: (value) => value > 0,
    validate(domain) {
      if (domain[0] <= 0 || domain[1] <= 0) {
        throw new RangeError('Log scales require a strictly positive domain')
      }
    },
    forward: (value) => transform(value),
    inverse: (value) => transform.invert(value),
    resolve: ({ domain, range, clamp, tickCount }) => {
      const scale = d3ScaleLog()
        .base(base)
        .domain([...domain])
        .range([...range])
        .clamp(clamp)
      const majorTicks = scale.ticks(tickCount).filter((value) => {
        const exponent = Math.log(value) / divisor
        return Math.abs(exponent - Math.round(exponent)) < 1e-10
      })
      return {
        map: (value) => scale(value),
        ticks: majorTicks.length ? majorTicks : scale.ticks(tickCount),
      }
    },
  }
}

export function scaleSymlog(
  options: SymlogScaleOptions = {},
): ChartScaleTransform {
  const constant =
    options.constant && options.constant > 0 ? options.constant : 1
  return {
    id: 'symlog',
    forward: (value) =>
      Math.sign(value) * Math.log1p(Math.abs(value) / constant),
    inverse: (value) =>
      Math.sign(value) * Math.expm1(Math.abs(value)) * constant,
    resolve: ({ domain, range, clamp, tickCount }) => {
      const scale = d3ScaleSymlog()
        .constant(constant)
        .domain([...domain])
        .range([...range])
        .clamp(clamp)
      return {
        map: (value) => scale(value),
        ticks: scale.ticks(tickCount),
      }
    },
  }
}

export function scaleSqrt(): ChartScaleTransform {
  return {
    id: 'sqrt',
    forward: (value) => Math.sign(value) * Math.sqrt(Math.abs(value)),
    inverse: (value) => Math.sign(value) * value * value,
    resolve: ({ domain, range, clamp, tickCount }) => {
      const scale = d3ScaleSqrt()
        .domain([...domain])
        .range([...range])
        .clamp(clamp)
      return {
        map: (value) => scale(value),
        ticks: scale.ticks(tickCount),
      }
    },
  }
}
