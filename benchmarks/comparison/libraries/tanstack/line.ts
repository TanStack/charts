import { colorLegend, d3Curve, defineChart, lineY } from '@tanstack/charts'
import { multiSeriesColors, visibleMultiSeriesRows } from '../tier'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import type { BenchmarkInput, BenchmarkMount } from '../../types'
import { seriesColors, visibleRows, xMaximum, xMinimum } from '../tier'
import { color, margin, mountDefinition } from './base'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_MULTI_SERIES: boolean
const seriesDomain = BENCHMARK_ADVANCED
  ? ['Series A', 'Series B']
  : ['Series A']

const definition = defineChart<BenchmarkInput>()(({ input }) => {
  const specification = {
    marks: [
      lineY(
        BENCHMARK_MULTI_SERIES
          ? visibleMultiSeriesRows(input)
          : visibleRows(input, BENCHMARK_ADVANCED),
        {
          x: 'x',
          y: 'y',
          key: 'id',
          z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
          stroke: BENCHMARK_INTERACTIVE ? undefined : color,
          curve: BENCHMARK_ADVANCED ? d3Curve(curveMonotoneX) : undefined,
        },
      ),
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
            .domain(
              BENCHMARK_MULTI_SERIES
                ? [...(input.seriesDomain ?? [])]
                : [...seriesDomain],
            )
            .range(
              BENCHMARK_MULTI_SERIES
                ? [...multiSeriesColors]
                : [...seriesColors],
            ),
          legend: BENCHMARK_MULTI_SERIES
            ? undefined
            : colorLegend({ label: 'Series' }),
        }
      : undefined,
    margin,
  }
  return BENCHMARK_STRESS
    ? { ...specification, clip: Boolean(input.xDomain) }
    : specification
})

export const mountLine: BenchmarkMount = (container, input) =>
  mountDefinition(container, input, definition, BENCHMARK_INTERACTIVE)
