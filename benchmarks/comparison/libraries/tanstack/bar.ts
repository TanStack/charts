import { barY, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import type { BenchmarkInput, BenchmarkMount } from '../../types'
import { seriesColors } from '../tier'
import { color, margin, mountDefinition } from './base'
import { stackedRows } from './stack'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
const seriesDomain = BENCHMARK_ADVANCED
  ? ['Series A', 'Series B']
  : ['Series A']

const definition = defineChart<BenchmarkInput>()(({ input }) => {
  const stacked = BENCHMARK_ADVANCED ? stackedRows(input) : []
  return {
    marks: [
      BENCHMARK_ADVANCED
        ? barY(stacked, {
            x: 'category',
            y1: 'y1',
            y2: 'y2',
            z: 'series',
            key: 'id',
          })
        : barY(input.rows, {
            x: 'category',
            y: 'y',
            z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
            key: 'id',
            fill: BENCHMARK_INTERACTIVE ? undefined : color,
          }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(input.rows.map((row) => row.category))
        .padding(0.1),
      grid: true,
    },
    y: {
      scale: scaleLinear().domain([0, BENCHMARK_ADVANCED ? 200 : 100]),
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
  }
})

export const mountBar: BenchmarkMount = (container, input) =>
  mountDefinition(container, input, definition, BENCHMARK_INTERACTIVE)
