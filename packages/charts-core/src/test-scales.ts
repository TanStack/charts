import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
import type { ChartAxisOptions } from './types'

type Axes<
  TX extends number | string | Date,
  TY extends number | string | Date,
> = {
  scales: {
    x: ChartAxisOptions<TX>
    y: ChartAxisOptions<TY>
  }
}

export function linearAxes(
  xDomain: readonly [number, number] = [0, 1],
  yDomain: readonly [number, number] = [0, 1],
): Axes<number, number> {
  return {
    scales: {
      x: { scale: scaleLinear().domain(xDomain) },
      y: { scale: scaleLinear().domain(yDomain) },
    },
  }
}

export function bandXAxes(
  xDomain: readonly string[],
  yDomain: readonly [number, number],
): Axes<string, number> {
  return {
    scales: {
      x: { scale: scaleBand().domain(xDomain).padding(0.1) },
      y: { scale: scaleLinear().domain(yDomain) },
    },
  }
}

export function bandYAxes(
  xDomain: readonly [number, number],
  yDomain: readonly string[],
): Axes<number, string> {
  return {
    scales: {
      x: { scale: scaleLinear().domain(xDomain) },
      y: { scale: scaleBand().domain(yDomain).padding(0.1) },
    },
  }
}

export function bandAxes(
  xDomain: readonly string[],
  yDomain: readonly string[],
): Axes<string, string> {
  return {
    scales: {
      x: { scale: scaleBand().domain(xDomain).padding(0.1) },
      y: { scale: scaleBand().domain(yDomain).padding(0.1) },
    },
  }
}

export function utcXAxes(
  xDomain: readonly [Date, Date],
  yDomain: readonly [number, number],
): Axes<Date, number> {
  return {
    scales: {
      x: { scale: scaleUtc().domain(xDomain) },
      y: { scale: scaleLinear().domain(yDomain) },
    },
  }
}
