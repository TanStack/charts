import { colorLegend, defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import type { BenchmarkInput, BenchmarkMount } from '../../types'
import { seriesColors, visibleRows, xMaximum, xMinimum } from '../tier'
import { color, margin, mountDefinition } from './base'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_VARIABLE_SIZE: boolean
const seriesDomain = BENCHMARK_ADVANCED
  ? ['Series A', 'Series B']
  : ['Series A']

const definition = defineChart<BenchmarkInput>()(({ input }) => ({
  marks: [
    dot(visibleRows(input, BENCHMARK_ADVANCED), {
      x: 'x',
      y: 'y',
      key: 'id',
      z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
      fill: BENCHMARK_INTERACTIVE ? undefined : color,
      r: BENCHMARK_ADVANCED || BENCHMARK_VARIABLE_SIZE ? 'size' : 2,
    }),
  ],
  x: {
    scale: scaleLinear().domain(
      BENCHMARK_STRESS
        ? [xMinimum(input), xMaximum(input)]
        : [0, Math.max(1, input.rows.length - 1)],
    ),
    ticks: 6,
    grid: true,
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
    ticks: 5,
    grid: true,
  },
  color: BENCHMARK_INTERACTIVE
    ? {
        scale: scaleOrdinal<string, string>()
          .domain([...seriesDomain])
          .range([...seriesColors]),
        legend: colorLegend({ label: 'Series' }),
      }
    : undefined,
  margin,
}))

export const mountScatter: BenchmarkMount = (container, input) =>
  mountDefinition(container, input, definition, BENCHMARK_INTERACTIVE)
