import { scaleTime as d3ScaleTime, scaleUtc as d3ScaleUtc } from 'd3-scale'
import type { ChartScaleTransform } from './types'

const identity = (value: number) => value

export function scaleTime(): ChartScaleTransform {
  return {
    id: 'time',
    forward: identity,
    inverse: identity,
  }
}

export function scaleUtc(): ChartScaleTransform {
  return {
    id: 'utc',
    forward: identity,
    inverse: identity,
  }
}

export function timeTicks(
  domain: readonly [number, number],
  count: number,
  utc: boolean,
): number[] {
  const scale = utc ? d3ScaleUtc() : d3ScaleTime()
  return scale
    .domain([new Date(domain[0]), new Date(domain[1])])
    .ticks(count)
    .map((value) => value.getTime())
}
