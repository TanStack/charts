import {
  areaY,
  barX,
  colorGradientLegend,
  colorLegend,
  d3Curve,
  defineChart,
  lineY,
  ruleX,
  ruleY,
  rect,
} from '@tanstack/charts'
import { bin as d3Bin, max } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { dateExtent, numberExtent, zeroExtent } from './domains'

export interface BinDatum<TDatum> {
  x: number
  x1: number
  x2: number
  value: number
  data: readonly TDatum[]
}

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

export interface DownloadPoint {
  id: string
  date: Date
  package: 'Query' | 'Router' | 'Table'
  downloads: number
}

const packages = ['Query', 'Router', 'Table'] as const
const baselines = {
  Query: 6_800_000,
  Router: 2_400_000,
  Table: 1_700_000,
} as const

export const downloadData: DownloadPoint[] = Array.from(
  { length: 26 },
  (_, week) =>
    packages.map((packageName, packageIndex) => {
      const trend = 1 + week * (0.026 + packageIndex * 0.004)
      const seasonality =
        1 + Math.sin((week + packageIndex * 1.7) / 2.6) * 0.075
      const releaseLift =
        week >= 12 + packageIndex * 2 ? 1.08 + packageIndex * 0.025 : 1
      const date = new Date(Date.UTC(2026, 0, 5 + week * 7))

      return {
        id: `${packageName}:${date.toISOString()}`,
        date,
        package: packageName,
        downloads: Math.round(
          baselines[packageName] * trend * seasonality * releaseLift,
        ),
      }
    }),
).flat()

export const downloadsChart = defineChart({
  marks: [
    lineY(downloadData, {
      id: 'downloads',
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: 'id',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: {
    scale: scaleUtc().domain(dateExtent(downloadData, (point) => point.date)),
    ticks: 6,
  },
  y: {
    scale: scaleLinear()
      .domain(numberExtent(downloadData, (point) => point.downloads))
      .nice(5),
    label: 'Weekly downloads',
    ticks: 5,
    grid: true,
  },
  color: {
    legend: colorLegend({ label: 'Package' }),
  },
})

export const activityData = [
  18, 21, 19, 25, 28, 31, 29, 37, 42, 40, 48, 53, 51, 59,
]

export const activityChart = defineChart({
  marks: [
    areaY(activityData, {
      id: 'activity-area',
      fill: 'var(--ts-chart-4, #8b5cf6)',
      fillOpacity: 0.16,
      curve: d3Curve(curveMonotoneX),
    }),
    ruleY([0], { strokeOpacity: 0.2 }),
    lineY(activityData, {
      id: 'activity',
      points: true,
      curve: d3Curve(curveMonotoneX),
      stroke: 'var(--ts-chart-4, #8b5cf6)',
    }),
  ],
  x: {
    scale: scaleLinear()
      .domain(activityData.length > 1 ? [0, activityData.length - 1] : [0, 1])
      .nice(7),
    label: 'Release',
    ticks: 7,
  },
  y: {
    scale: scaleLinear().domain(zeroExtent(activityData)).nice(5),
    label: 'Activity',
    ticks: 5,
  },
})

export const latencyData = Array.from({ length: 180 }, (_value, index) => {
  const primary = 42 + Math.sin(index * 1.73) * 13 + (index % 11) * 1.7
  const slowTail = index % 17 === 0 ? 46 + (index % 5) * 7 : 0
  return Math.max(8, Math.round(primary + slowTail))
})

export const latencyBins: BinDatum<number>[] = d3Bin<number, number>()
  .value((value) => value)
  .thresholds(14)(latencyData)
  .map((entries) => {
    const x1 = entries.x0 ?? 0
    const x2 = entries.x1 ?? x1
    return {
      x: (x1 + x2) / 2,
      x1,
      x2,
      value: entries.length,
      data: [...entries],
    }
  })

const latencyXDomain = numberExtent(
  latencyBins.flatMap((entry) => [entry.x1, entry.x2]),
  (value) => value,
)
const latencyYMaximum = max(latencyBins, (entry) => entry.value) ?? 1
const latencyColorDomain = numberExtent(latencyBins, (entry) => entry.value)
const latencyColorMiddle = (latencyColorDomain[0] + latencyColorDomain[1]) / 2

export const latencyChart = defineChart({
  marks: [
    rect(latencyBins, {
      id: 'latency',
      x: 'x',
      x1: 'x1',
      x2: 'x2',
      y1: () => 0,
      y2: 'value',
      z: 'value',
      key: (entry) => entry.x1,
      inset: 1,
      radius: 2,
    }),
  ],
  x: {
    scale: scaleLinear().domain(latencyXDomain).nice(7),
    label: 'Latency (ms)',
    grid: false,
  },
  y: {
    scale: scaleLinear().domain([0, latencyYMaximum]).nice(5),
    label: 'Requests',
    ticks: 5,
  },
  color: {
    scale: scaleLinear<string>()
      .domain([
        latencyColorDomain[0],
        latencyColorMiddle,
        latencyColorDomain[1],
      ])
      .range(['#d1fae5', '#10b981', '#064e3b'])
      .clamp(true),
    legend: colorGradientLegend({
      label: 'Requests per bin',
      steps: 24,
      format: (value) => String(Math.round(value)),
    }),
  },
})

export interface RankingPoint {
  package: string
  score: number
}

export interface RankingInput {
  data: readonly RankingPoint[]
  accent: string
}

const rankingPackages = [
  ['Query', 92],
  ['Router', 84],
  ['Table', 73],
  ['Form', 61],
  ['Start', 56],
  ['Virtual', 42],
] as const

export function createRankingData(round: number): RankingPoint[] {
  return rankingPackages.map(([packageName, baseline], index) => ({
    package: packageName,
    score: Math.max(
      8,
      baseline +
        Math.round(Math.sin(round * 1.17 + index * 2.41) * (8 + index * 1.4)),
    ),
  }))
}

export const createRankingChart = (input: RankingInput) =>
  defineChart(({ width }) => {
    const ranked = [...input.data].sort((a, b) => b.score - a.score)
    const xTicks = width < 420 ? 4 : 6
    const maximum = Math.max(1, max(ranked, (point) => point.score) ?? 1)

    return {
      marks: [
        ruleX([0], { strokeOpacity: 0.2 }),
        barX(ranked, {
          id: 'ranking',
          x: 'score',
          y: 'package',
          key: 'package',
          fill: input.accent,
          radius: 4,
          inset: width < 420 ? 2 : 3,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, maximum]).nice(xTicks),
        label: width < 420 ? undefined : 'Momentum score',
        grid: true,
        ticks: xTicks,
      },
      y: {
        scale: scaleBand<string>()
          .domain(ranked.map((point) => point.package))
          .paddingInner(0.24)
          .paddingOuter(0.12),
        grid: false,
      },
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(['ranking'])
          .range([input.accent]),
      },
    }
  })
