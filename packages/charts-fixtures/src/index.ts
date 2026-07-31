import {
  areaY,
  barX,
  colorGradientLegend,
  d3Curve,
  defineChart,
  lineY,
  ruleX,
  ruleY,
  rect,
} from '@tanstack/charts'
import { cars } from '@charts-poc/demo-data/cars'
import { downloads } from '@charts-poc/demo-data/downloads'
import { bin as d3Bin } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { DownloadsRow } from '@charts-poc/demo-data/downloads'
import type { Bin } from 'd3-array'

export type HorsepowerBin = Bin<CarsRow, number>
export type { CarsRow, DownloadsRow }

export {
  createStatsHistoryChart,
  createStatsHistoryInput,
  createStatsLatestChart,
  createStatsLatestInput,
} from './stats-parity'
export type {
  StatsBarOrientation,
  StatsHistoryInput,
  StatsHistoryInterval,
  StatsHistoryMode,
  StatsHistoryPoint,
  StatsLatestInput,
  StatsLatestInterval,
  StatsLatestPoint,
} from './stats-parity'

export const downloadData = downloads

export const downloadsChart = defineChart({
  marks: [
    lineY(downloadData, {
      id: '@observablehq/cars downloads',
      x: 'date',
      y: 'downloads',
      curve: d3Curve(curveMonotoneX),
      stroke: 'var(--ts-chart-1, #2563eb)',
    }),
  ],
  x: { scale: scaleUtc, axis: { ticks: { count: 6 } } },
  y: {
    scale: scaleLinear,
    nice: 5,
    grid: true,
    axis: { ticks: { count: 5 }, label: 'Daily downloads' },
  },
})

export const downloadAreaChart = defineChart({
  marks: [
    areaY(downloadData, {
      id: '@observablehq/cars download area',
      x: 'date',
      y: 'downloads',
      fill: 'var(--ts-chart-4, #8b5cf6)',
      fillOpacity: 0.16,
      curve: d3Curve(curveMonotoneX),
    }),
    ruleY([0], { strokeOpacity: 0.2 }),
    lineY(downloadData, {
      id: '@observablehq/cars downloads',
      x: 'date',
      y: 'downloads',
      curve: d3Curve(curveMonotoneX),
      stroke: 'var(--ts-chart-4, #8b5cf6)',
    }),
  ],
  x: { scale: scaleUtc, nice: 7, axis: { ticks: { count: 7 } } },
  y: {
    scale: scaleLinear,
    nice: 5,
    axis: { ticks: { count: 5 }, label: 'Daily downloads' },
  },
})

export const horsepowerData = cars.filter((car) => car['power (hp)'] !== null)

export const horsepowerBins = d3Bin<CarsRow, number>()
  .value((car) => car['power (hp)'] ?? Number.NaN)
  .thresholds(14)(horsepowerData)

export const horsepowerChart = defineChart({
  marks: [
    rect(horsepowerBins, {
      id: 'horsepower',
      x: (bin) => ((bin.x0 ?? 0) + (bin.x1 ?? 0)) / 2,
      x1: (bin) => bin.x0 ?? 0,
      x2: (bin) => bin.x1 ?? bin.x0 ?? 0,
      y1: () => 0,
      y2: (bin) => bin.length,
      z: (bin) => bin.length,
      inset: 1,
      radius: 2,
    }),
  ],
  x: {
    scale: scaleLinear,
    nice: 7,
    grid: false,
    axis: { label: 'Power (hp)' },
  },
  y: {
    scale: scaleLinear,
    nice: 5,
    axis: { ticks: { count: 5 }, label: 'Cars' },
  },
  color: {
    scale: () =>
      scaleLinear<string>()
        .range(['#d1fae5', '#10b981', '#064e3b'])
        .clamp(true),
    legend: colorGradientLegend({
      label: 'Cars per bin',
      steps: 24,
      format: (value) => String(Math.round(value)),
    }),
  },
})

export interface RankedCar extends CarsRow {
  readonly 'economy (mpg)': number
  readonly 'power (hp)': number
}

export interface RankingInput {
  data: readonly RankedCar[]
  metric: 'economy (mpg)' | 'power (hp)'
  accent: string
}

export const carRankingData = cars
  .filter(
    (car): car is RankedCar =>
      car['economy (mpg)'] !== null && car['power (hp)'] !== null,
  )
  .sort((a, b) => b['power (hp)'] - a['power (hp)'])
  .slice(0, 8)

export const createRankingChart = (input: RankingInput) =>
  defineChart(({ width }) => {
    const ranked = [...input.data].sort(
      (a, b) => b[input.metric] - a[input.metric],
    )
    const xTicks = width < 420 ? 4 : 6

    return {
      marks: [
        ruleX([0], { strokeOpacity: 0.2 }),
        barX(ranked, {
          id: 'car ranking',
          x: input.metric,
          y: 'name',
          fill: input.accent,
          radius: 4,
          inset: width < 420 ? 2 : 3,
        }),
      ],
      x: {
        scale: scaleLinear,
        nice: xTicks,
        grid: true,
        axis: {
          ticks: { count: xTicks },
          label:
            width < 420
              ? undefined
              : input.metric === 'economy (mpg)'
                ? 'Fuel economy (mpg)'
                : 'Power (hp)',
        },
      },
      y: {
        scale: () => scaleBand<string>().paddingInner(0.24).paddingOuter(0.12),
        grid: false,
      },
      color: {
        scale: () => scaleOrdinal<string, string>().range([input.accent]),
      },
    }
  })
