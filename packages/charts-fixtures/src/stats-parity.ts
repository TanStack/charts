import {
  areaY,
  barX,
  barY,
  d3Curve,
  defineChart,
  lineY,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import type { ChartKey, ChartValue } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { dateExtent, zeroExtent } from './domains'

export type StatsHistoryMode = 'line' | 'stacked' | 'share' | 'stream'
export type StatsBarOrientation = 'vertical' | 'horizontal'

export interface StatsHistoryPoint {
  id: string
  date: Date
  series: string
  downloads: number
  complete: boolean
}

export interface StatsHistoryInterval {
  id: string
  date: Date
  series: string
  downloads: number
  y1: number
  y2: number
  gradient: string
}

export interface StatsHistoryInput {
  mode: StatsHistoryMode
  points: readonly StatsHistoryPoint[]
  intervals: readonly StatsHistoryInterval[]
  zoomed: boolean
}

export interface StatsLatestPoint {
  id: string
  name: string
  seriesName: string
  downloads: number
  label: string
  gradient: string
}

export interface StatsLatestInterval {
  id: string
  groupName: string
  packageName: string
  downloads: number
  value1: number
  value2: number
  label: string
  gradient: string
}

export interface StatsLatestInput {
  orientation: StatsBarOrientation
  stacked: boolean
  domain: readonly string[]
  grouped: readonly StatsLatestPoint[]
  intervals: readonly StatsLatestInterval[]
}

const series = [
  { name: 'Query', color: '#ef4444', baseline: 7_100_000 },
  { name: 'Router', color: '#22c55e', baseline: 3_200_000 },
  { name: 'Table', color: '#3b82f6', baseline: 2_300_000 },
] as const

const seriesColor = new Map<string, string>(
  series.map((entry) => [entry.name, entry.color]),
)

const historyGradients = series.map((entry) => ({
  id: historyGradient(entry.name),
  stops: [
    { offset: 0, color: entry.color, opacity: 0.28 },
    { offset: 1, color: entry.color, opacity: 0.9 },
  ],
}))

export const createStatsHistoryChart = (input: StatsHistoryInput) =>
  defineChart(({ width }) => {
    const dates = [
      ...new Map(
        input.points.map((point) => [point.date.getTime(), point.date]),
      ).values(),
    ]
    const zoomStart = dates.at(-9)
    const zoomEnd = dates.at(-1)
    const xDomain =
      input.zoomed && zoomStart && zoomEnd
        ? ([zoomStart, zoomEnd] as const)
        : dateExtent(input.points, (point) => point.date)
    const complete = input.points.filter((point) => point.complete)
    const firstPartialIndex = input.points.findIndex((point) => !point.complete)
    const partialStart =
      firstPartialIndex < 0
        ? input.points.length
        : Math.max(0, firstPartialIndex - series.length)
    const partial = input.points.slice(partialStart)
    const stacked = input.mode !== 'line'
    const yValues = stacked
      ? input.intervals.flatMap((point) => [point.y1, point.y2])
      : input.points.map((point) => point.downloads)

    return {
      marks: stacked
        ? [
            ruleY([0], { strokeOpacity: 0.35, strokeWidth: 1.5 }),
            areaY(input.intervals, {
              id: `stats-${input.mode}-areas`,
              x: 'date',
              y1: 'y1',
              y2: 'y2',
              z: 'series',
              key: 'id',
              fill: (datum) => `url(#${datum.gradient})`,
              fillOpacity: 1,
              curve: d3Curve(curveMonotoneX),
            }),
            lineY(input.intervals, {
              id: `stats-${input.mode}-caps`,
              x: 'date',
              y: 'y2',
              z: 'series',
              key: 'id',
              stroke: (datum) =>
                seriesColor.get(datum.series) ?? 'currentColor',
              strokeWidth: 1.4,
              strokeOpacity: 0.95,
              curve: d3Curve(curveMonotoneX),
            }),
          ]
        : [
            ruleY([0], { strokeOpacity: 0.35, strokeWidth: 1.5 }),
            lineY(complete, {
              id: 'stats-history-complete',
              x: 'date',
              y: 'downloads',
              z: 'series',
              key: 'id',
              stroke: (datum) =>
                seriesColor.get(datum.series) ?? 'currentColor',
              strokeWidth: 2,
              curve: d3Curve(curveMonotoneX),
            }),
            lineY(partial, {
              id: 'stats-history-partial',
              x: 'date',
              y: 'downloads',
              z: 'series',
              key: 'id',
              stroke: (datum) =>
                seriesColor.get(datum.series) ?? 'currentColor',
              strokeWidth: 1.5,
              strokeOpacity: 0.8,
              strokeDasharray: '2 4',
              curve: d3Curve(curveMonotoneX),
            }),
          ],
      x: {
        scale: scaleUtc().domain(xDomain),
        label: 'Date',
        ticks: width < 520 ? 4 : 7,
      },
      y: {
        scale: scaleLinear().domain(zeroExtent(yValues)).nice(5),
        label:
          input.mode === 'share'
            ? 'Download Share'
            : input.mode === 'stream'
              ? 'Downloads (stream)'
              : 'Downloads',
        format: input.mode === 'share' ? formatPercent : formatCompact,
        ticks: 5,
        grid: true,
      },
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(series.map((entry) => entry.name))
          .range(series.map((entry) => entry.color)),
      },
      gradients: historyGradients,
      clip: input.zoomed,
    }
  })

export const createStatsLatestChart = (input: StatsLatestInput) =>
  defineChart(({ width }) => {
    const vertical = input.orientation === 'vertical'
    const categoricalScale = scaleBand<string>()
      .domain([...input.domain])
      .paddingInner(0.1)
      .paddingOuter(0.05)
    const numericValues = input.stacked
      ? input.intervals.flatMap((point) => [point.value1, point.value2])
      : input.grouped.map((point) => point.downloads)
    const numericScale = scaleLinear().domain(zeroExtent(numericValues)).nice(7)
    const colorDomain = input.stacked
      ? unique(input.intervals.map((point) => point.packageName))
      : [...input.domain]
    const colorRange = input.stacked
      ? colorDomain.map(packageColor)
      : colorDomain.map(groupColor)
    const marks = input.stacked
      ? vertical
        ? [
            ruleY([0], { strokeOpacity: 0.5, strokeWidth: 1.5 }),
            barY(input.intervals, {
              id: 'stats-latest-stacked-y',
              x: 'groupName',
              y1: 'value1',
              y2: 'value2',
              z: 'packageName',
              key: 'id',
              fill: (datum) => `url(#${datum.gradient})`,
              fillOpacity: 1,
              inset: 1,
            }),
          ]
        : [
            ruleX([0], { strokeOpacity: 0.5, strokeWidth: 1.5 }),
            barX(input.intervals, {
              id: 'stats-latest-stacked-x',
              y: 'groupName',
              x1: 'value1',
              x2: 'value2',
              z: 'packageName',
              key: 'id',
              fill: (datum) => `url(#${datum.gradient})`,
              fillOpacity: 1,
              inset: 1,
            }),
          ]
      : vertical
        ? [
            ruleY([0], { strokeOpacity: 0.5, strokeWidth: 1.5 }),
            barY(input.grouped, {
              id: 'stats-latest-grouped-y',
              x: 'name',
              y: 'downloads',
              color: 'seriesName',
              key: 'id',
              fill: (datum) => `url(#${datum.gradient})`,
              fillOpacity: 1,
              inset: 2,
              radius: 2,
            }),
          ]
        : [
            ruleX([0], { strokeOpacity: 0.5, strokeWidth: 1.5 }),
            barX(input.grouped, {
              id: 'stats-latest-grouped-x',
              x: 'downloads',
              y: 'name',
              color: 'seriesName',
              key: 'id',
              fill: (datum) => `url(#${datum.gradient})`,
              fillOpacity: 1,
              inset: 2,
              radius: 2,
            }),
          ]

    return {
      marks,
      x: vertical
        ? {
            scale: categoricalScale,
            tickRotate: width < 680 ? -28 : 0,
            grid: false,
          }
        : {
            scale: numericScale,
            label: 'Downloads',
            format: formatCompact,
            grid: true,
          },
      y: vertical
        ? {
            scale: numericScale,
            label: 'Downloads',
            format: formatCompact,
            grid: true,
          }
        : {
            scale: categoricalScale,
            grid: false,
          },
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(colorDomain)
          .range(colorRange),
      },
      gradients: createLatestGradients(input),
    }
  })

export function createStatsHistoryInput(
  mode: StatsHistoryMode,
  round = 0,
  zoomed = false,
): StatsHistoryInput {
  const points = createHistoryPoints(round)
  return {
    mode,
    points,
    intervals: createHistoryIntervals(points, mode),
    zoomed,
  }
}

export function createStatsLatestInput(
  orientation: StatsBarOrientation,
  stacked: boolean,
  round = 0,
): StatsLatestInput {
  const groups = [
    {
      name: 'TanStack Query',
      packages: [
        ['@tanstack/query-core', 0.58],
        ['@tanstack/react-query', 0.42],
      ],
      baseline: 13_400_000,
    },
    {
      name: 'TanStack Router',
      packages: [
        ['@tanstack/router-core', 0.36],
        ['@tanstack/react-router', 0.64],
      ],
      baseline: 4_900_000,
    },
    {
      name: 'TanStack Table',
      packages: [
        ['@tanstack/table-core', 0.31],
        ['@tanstack/react-table', 0.69],
      ],
      baseline: 3_700_000,
    },
    {
      name: 'TanStack Start',
      packages: [
        ['@tanstack/start-client-core', 0.44],
        ['@tanstack/react-start', 0.56],
      ],
      baseline: 1_800_000,
    },
    {
      name: 'TanStack Form',
      packages: [
        ['@tanstack/form-core', 0.46],
        ['@tanstack/react-form', 0.54],
      ],
      baseline: 1_200_000,
    },
  ] as const
  const ranked = groups
    .map((group, groupIndex) => {
      const downloads = Math.round(
        group.baseline * (1 + Math.sin(round * 1.1 + groupIndex * 1.7) * 0.13),
      )
      return { ...group, downloads }
    })
    .sort((left, right) => right.downloads - left.downloads)
  const grouped = ranked.map((group): StatsLatestPoint => ({
    id: group.name,
    name: group.name,
    seriesName: group.name,
    downloads: group.downloads,
    label: `${group.name}: ${formatCompact(group.downloads)}`,
    gradient: latestGradient(group.name),
  }))
  const intervals = ranked.flatMap((group) => {
    let value1 = 0
    return group.packages.map(
      ([packageName, share], packageIndex): StatsLatestInterval => {
        const downloads =
          packageIndex === group.packages.length - 1
            ? group.downloads - value1
            : Math.round(group.downloads * share)
        const point = {
          id: `${group.name}:${packageName}`,
          groupName: group.name,
          packageName,
          downloads,
          value1,
          value2: value1 + downloads,
          label: `${packageName}: ${formatCompact(downloads)}`,
          gradient: latestGradient(packageName),
        }
        value1 += downloads
        return point
      },
    )
  })

  return {
    orientation,
    stacked,
    domain: ranked.map((group) => group.name),
    grouped,
    intervals,
  }
}

function createHistoryPoints(round: number): StatsHistoryPoint[] {
  return Array.from({ length: 18 }, (_value, week) =>
    series.map((entry, seriesIndex) => {
      const date = new Date(Date.UTC(2026, 1, 2 + week * 7))
      const trend = 1 + week * (0.024 + seriesIndex * 0.003)
      const wave =
        1 +
        Math.sin(week * 0.82 + seriesIndex * 1.4 + round * 0.7) *
          (0.055 + seriesIndex * 0.01)
      return {
        id: `${entry.name}:${date.toISOString()}`,
        date,
        series: entry.name,
        downloads: Math.round(entry.baseline * trend * wave),
        complete: week < 17,
      }
    }),
  ).flat()
}

function createHistoryIntervals(
  points: readonly StatsHistoryPoint[],
  mode: StatsHistoryMode,
): StatsHistoryInterval[] {
  const byDate = new Map<number, Map<string, StatsHistoryPoint>>()
  for (const point of points) {
    const date = point.date.getTime()
    const row = byDate.get(date) ?? new Map<string, StatsHistoryPoint>()
    row.set(point.series, point)
    byDate.set(date, row)
  }
  const output: StatsHistoryInterval[] = []
  for (const [date, row] of byDate) {
    const total = [...row.values()].reduce(
      (sum, point) => sum + point.downloads,
      0,
    )
    let baseline = mode === 'stream' ? -total / 2 : 0
    for (const entry of series) {
      const point = row.get(entry.name)
      if (!point) continue
      const value =
        mode === 'share' && total > 0
          ? point.downloads / total
          : point.downloads
      output.push({
        id: `${mode}:${point.id}`,
        date: new Date(date),
        series: point.series,
        downloads: point.downloads,
        y1: baseline,
        y2: baseline + value,
        gradient: historyGradient(point.series),
      })
      baseline += value
    }
  }
  return output
}

function createLatestGradients(input: StatsLatestInput) {
  const names = input.stacked
    ? unique(input.intervals.map((point) => point.packageName))
    : input.domain
  return names.map((name) => {
    const color = input.stacked ? packageColor(name) : groupColor(name)
    return {
      id: latestGradient(name),
      stops: [
        { offset: 0, color, opacity: 0.7 },
        { offset: 1, color, opacity: 1 },
      ],
    }
  })
}

function unique<TValue extends ChartKey>(values: readonly TValue[]): TValue[] {
  return [...new Set(values)]
}

function historyGradient(name: string) {
  return `stats-history-${slug(name)}`
}

function latestGradient(name: string) {
  return `stats-latest-${slug(name)}`
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
}

function groupColor(name: string) {
  const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6']
  return colors[hash(name) % colors.length] ?? '#64748b'
}

function packageColor(name: string) {
  const colors = [
    '#f43f5e',
    '#fb7185',
    '#10b981',
    '#34d399',
    '#3b82f6',
    '#60a5fa',
    '#f59e0b',
    '#fbbf24',
    '#8b5cf6',
    '#a78bfa',
  ]
  return colors[hash(name) % colors.length] ?? '#64748b'
}

function hash(value: string) {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

function formatPercent(value: ChartValue) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 0,
      }).format(value)
    : String(value)
}

function formatCompact(value: ChartValue) {
  if (typeof value !== 'number') return String(value)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
