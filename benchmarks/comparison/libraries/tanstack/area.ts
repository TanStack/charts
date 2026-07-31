import { areaY, colorLegend, d3Curve, defineChart } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import type { BenchmarkInput, BenchmarkMount } from '../../types'
import { seriesColors, xMaximum, xMinimum } from '../tier'
import { color, margin, mountDefinition } from './base'
import { stackedRows } from './stack'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
declare const BENCHMARK_STRESS: boolean
const seriesDomain = BENCHMARK_ADVANCED
  ? ['Series A', 'Series B']
  : ['Series A']

const definition = (input: BenchmarkInput) =>
  defineChart(() => {
    return {
      marks: [
        BENCHMARK_ADVANCED
          ? areaY(stackedRows(input), {
              x: 'x',
              y1: 'y1',
              y2: 'y2',
              z: 'series',
              key: 'id',
              fillOpacity: 0.35,
              curve: d3Curve(curveMonotoneX),
            })
          : areaY(input.rows, {
              x: 'x',
              y: 'y',
              z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
              key: 'id',
              fill: BENCHMARK_INTERACTIVE ? undefined : color,
              fillOpacity: 0.25,
              stroke: BENCHMARK_INTERACTIVE ? undefined : color,
            }),
      ],
      x: {
        scale: scaleLinear().domain(
          BENCHMARK_STRESS
            ? [xMinimum(input), xMaximum(input)]
            : [0, Math.max(1, input.rows.length - 1)],
        ),
        grid: true,
        axis: { ticks: { count: 6 } },
      },
      y: {
        scale: scaleLinear().domain([0, BENCHMARK_ADVANCED ? 200 : 100]),
        grid: true,
        axis: { ticks: { count: 5 } },
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

export const mountArea: BenchmarkMount = (container, input) =>
  mountDefinition(container, input, definition, BENCHMARK_INTERACTIVE)
