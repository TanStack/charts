import { cars } from '@tanstack/charts-data/cars'
import { downloads } from '@tanstack/charts-data/downloads'
import { industries } from '@tanstack/charts-data/industries'
import { penguins } from '@tanstack/charts-data/penguins'
import {
  areaY,
  barX,
  barY,
  colorGradientLegend,
  colorLegend,
  d3Curve,
  defineChart,
  group as groupBars,
  lineY,
  rect,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import { bin, group, min } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import {
  curveMonotoneX,
  stack,
  stackOffsetExpand,
  stackOffsetWiggle,
  stackOrderInsideOut,
} from 'd3-shape'
import type { CarsRow } from '@tanstack/charts-data/cars'
import type { DownloadsRow } from '@tanstack/charts-data/downloads'
import type { IndustriesRow } from '@tanstack/charts-data/industries'
import type { Bin } from 'd3-array'

export type IndustryHistoryMode = 'line' | 'stacked' | 'share' | 'stream'
export type BarOrientation = 'vertical' | 'horizontal'
export type HorsepowerBin = Bin<CarsRow, number>
export type { DownloadsRow, IndustriesRow }

export interface IndustryInterval extends IndustriesRow {
  readonly lower: number
  readonly upper: number
}

export interface PenguinCount {
  readonly species: string
  readonly sex: PenguinSex
  readonly penguins: number
  readonly countStart: number
  readonly countEnd: number
}

interface WideIndustryMonth {
  readonly date: Date
  readonly byIndustry: ReadonlyMap<string, IndustriesRow>
}

interface RankedCar extends CarsRow {
  readonly 'economy (mpg)': number
  readonly 'power (hp)': number
}

type PenguinSex = 'FEMALE' | 'MALE'
type RankingMetric = 'economy (mpg)' | 'power (hp)'

const trackedIndustries = [
  'Wholesale and Retail Trade',
  'Manufacturing',
  'Construction',
] as const
const industryColors = ['#ef4444', '#22c55e', '#3b82f6']
const industryWindowStarts = [0, 30, 60, 90]
const industryWindowMonths = 30
const industryDates = Array.from(
  new Map(industries.map((row) => [row.date.getTime(), row.date])).values(),
)

const penguinSexes: readonly PenguinSex[] = ['FEMALE', 'MALE']
const penguinColors = ['#2563eb', '#f97316']
const penguinSpecies = Array.from(new Set(penguins.map((row) => row.species)))

export const industryWindowCount = industryWindowStarts.length

export function industryWindowLabel(windowIndex: number) {
  const rows = selectIndustryWindow(windowIndex)
  const first = rows[0]?.date
  const last = rows.at(-1)?.date
  if (!first || !last) return 'No observations'
  return `${monthYear.format(first)}–${monthYear.format(last)}`
}

export function createIndustryHistoryChart(
  mode: IndustryHistoryMode,
  windowIndex: number,
  zoomed: boolean,
) {
  const observations = selectIndustryWindow(windowIndex)
  const intervals = mode === 'line' ? [] : stackIndustries(observations, mode)
  const dates = Array.from(
    new Map(observations.map((row) => [row.date.getTime(), row.date])).values(),
  )
  const zoomStart = dates.at(-10)
  const zoomEnd = dates.at(-1)

  return defineChart(({ width }) => ({
    marks:
      mode === 'line'
        ? [
            ruleY([0], { strokeOpacity: 0.3 }),
            lineY(observations, {
              id: 'industry unemployment',
              x: 'date',
              y: 'unemployed',
              color: 'industry',
              strokeWidth: 2,
              curve: d3Curve(curveMonotoneX),
            }),
          ]
        : [
            ruleY([0], { strokeOpacity: 0.3 }),
            areaY(intervals, {
              id: `industry unemployment ${mode}`,
              x: 'date',
              y1: 'lower',
              y2: 'upper',
              color: 'industry',
              fillOpacity: 0.82,
              curve: d3Curve(curveMonotoneX),
            }),
          ],
    scales: {
      x: {
        scale:
          zoomed && zoomStart && zoomEnd
            ? scaleUtc().domain([zoomStart, zoomEnd])
            : scaleUtc,
        axis: { ticks: { count: width < 520 ? 4 : 7 }, label: 'Month' },
      },
      y: {
        scale:
          mode === 'share' ? scaleLinear().domain([0, 1]).nice(5) : scaleLinear,
        nice: 5,
        grid: true,
        axis: {
          ticks: {
            count: 5,
            format: mode === 'share' ? formatPercent : formatNumber,
          },
          label:
            mode === 'share'
              ? 'Share of selected industries'
              : 'Unemployed (thousands)',
        },
      },
    },

    color: {
      scale: scaleOrdinal<string, string>()
        .domain([...trackedIndustries])
        .range(industryColors),
      legend: colorLegend({ label: 'Industry', itemWidth: 180 }),
    },
    clip: zoomed,
  }))
}

export function createPenguinChart(
  orientation: BarOrientation,
  stacked: boolean,
) {
  const rows = penguinCounts()
  const vertical = orientation === 'vertical'
  const categoryScale = scaleBand<string>()
    .domain(penguinSpecies)
    .paddingInner(0.14)
    .paddingOuter(0.06)
  const groupScale = scaleBand<string>()
    .domain([...penguinSexes])
    .paddingInner(0.08)

  return defineChart(({ width }) => ({
    marks: vertical
      ? [
          ruleY([0], { strokeOpacity: 0.3 }),
          barY(rows, {
            id: stacked ? 'penguins stacked' : 'penguins grouped',
            x: 'species',
            ...(stacked
              ? { y1: 'countStart', y2: 'countEnd' }
              : { y: 'penguins', layout: groupBars({ scale: groupScale }) }),
            color: 'sex',
            inset: 1,
            radius: stacked ? 0 : 2,
          }),
        ]
      : [
          ruleX([0], { strokeOpacity: 0.3 }),
          barX(rows, {
            id: stacked ? 'penguins stacked' : 'penguins grouped',
            y: 'species',
            ...(stacked
              ? { x1: 'countStart', x2: 'countEnd' }
              : { x: 'penguins', layout: groupBars({ scale: groupScale }) }),
            color: 'sex',
            inset: 1,
            radius: stacked ? 0 : 2,
          }),
        ],
    scales: {
      x: vertical
        ? {
            scale: categoryScale,
            axis: { tickLabels: { rotate: width < 620 ? -28 : 0 } },
          }
        : {
            scale: scaleLinear,
            nice: 5,
            grid: true,
            axis: { ticks: { count: 5 }, label: 'Penguins' },
          },
      y: vertical
        ? {
            scale: scaleLinear,
            nice: 5,
            grid: true,
            axis: { ticks: { count: 5 }, label: 'Penguins' },
          }
        : {
            scale: categoryScale,
          },
    },

    color: {
      scale: scaleOrdinal<string, string>()
        .domain([...penguinSexes])
        .range(penguinColors),
      legend: colorLegend({ label: 'Sex' }),
    },
  }))
}

export const downloadsChart = defineChart({
  marks: [
    lineY(downloads, {
      id: '@observablehq/cars downloads',
      x: 'date',
      y: 'downloads',
      curve: d3Curve(curveMonotoneX),
      stroke: 'var(--ts-chart-1, #2563eb)',
    }),
  ],
  scales: {
    x: { scale: scaleUtc, axis: { ticks: { count: 6 } } },
    y: {
      scale: scaleLinear,
      nice: 5,
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Daily downloads' },
    },
  },
})

export const downloadAreaChart = defineChart({
  marks: [
    areaY(downloads, {
      id: '@observablehq/cars download area',
      x: 'date',
      y: 'downloads',
      fill: 'var(--ts-chart-4, #8b5cf6)',
      fillOpacity: 0.16,
      curve: d3Curve(curveMonotoneX),
    }),
    ruleY([0], { strokeOpacity: 0.2 }),
    lineY(downloads, {
      id: '@observablehq/cars downloads',
      x: 'date',
      y: 'downloads',
      curve: d3Curve(curveMonotoneX),
      stroke: 'var(--ts-chart-4, #8b5cf6)',
    }),
  ],
  scales: {
    x: { scale: scaleUtc, nice: 7, axis: { ticks: { count: 7 } } },
    y: {
      scale: scaleLinear,
      nice: 5,
      axis: { ticks: { count: 5 }, label: 'Daily downloads' },
    },
  },
})

const horsepowerRows = cars.filter((car) => car['power (hp)'] !== null)

export const horsepowerBins = bin<CarsRow, number>()
  .value((car) => car['power (hp)'] ?? Number.NaN)
  .thresholds(14)(horsepowerRows)

export const horsepowerChart = defineChart({
  marks: [
    rect(horsepowerBins, {
      id: 'horsepower',
      x: (entries) => ((entries.x0 ?? 0) + (entries.x1 ?? 0)) / 2,
      x1: (entries) => entries.x0 ?? 0,
      x2: (entries) => entries.x1 ?? entries.x0 ?? 0,
      y1: () => 0,
      y2: (entries) => entries.length,
      color: (entries) => entries.length,
      inset: 1,
      radius: 2,
    }),
  ],
  scales: {
    x: { scale: scaleLinear, nice: 7, axis: { label: 'Power (hp)' } },
    y: {
      scale: scaleLinear,
      nice: 5,
      axis: { ticks: { count: 5 }, label: 'Cars' },
    },
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

export const carRankingData = cars
  .filter(
    (car): car is RankedCar =>
      car['economy (mpg)'] !== null && car['power (hp)'] !== null,
  )
  .sort((left, right) => right['power (hp)'] - left['power (hp)'])
  .slice(0, 8)

export function createRankingChart(metric: RankingMetric, accent: string) {
  const ranked = [...carRankingData].sort(
    (left, right) => right[metric] - left[metric],
  )

  return defineChart(({ width }) => {
    const ticks = width < 420 ? 4 : 6
    return {
      marks: [
        ruleX([0], { strokeOpacity: 0.2 }),
        barX(ranked, {
          id: 'car ranking',
          x: metric,
          y: 'name',
          fill: accent,
          radius: 4,
          inset: width < 420 ? 2 : 3,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          nice: ticks,
          grid: true,
          axis: {
            label:
              width < 420
                ? undefined
                : metric === 'economy (mpg)'
                  ? 'Fuel economy (mpg)'
                  : 'Power (hp)',
          },
        },
        y: {
          scale: () =>
            scaleBand<string>().paddingInner(0.24).paddingOuter(0.12),
        },
      },
    }
  })
}

function selectIndustryWindow(windowIndex: number) {
  const normalized =
    ((windowIndex % industryWindowCount) + industryWindowCount) %
    industryWindowCount
  const start = industryWindowStarts[normalized] ?? 0
  const selectedDates = new Set(
    industryDates
      .slice(start, start + industryWindowMonths)
      .map((date) => date.getTime()),
  )

  return industries.filter(
    (row) =>
      selectedDates.has(row.date.getTime()) && isTrackedIndustry(row.industry),
  )
}

function stackIndustries(
  rows: readonly IndustriesRow[],
  mode: Exclude<IndustryHistoryMode, 'line'>,
): readonly IndustryInterval[] {
  const wideMonths = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    (monthRows): WideIndustryMonth => ({
      date: monthRows[0]?.date ?? new Date(0),
      byIndustry: new Map(monthRows.map((row) => [row.industry, row] as const)),
    }),
  )
  const layout = stack<WideIndustryMonth, string>()
    .keys([...trackedIndustries])
    .value((month, industry) => month.byIndustry.get(industry)?.unemployed ?? 0)

  if (mode === 'share') layout.offset(stackOffsetExpand)
  if (mode === 'stream') {
    layout.order(stackOrderInsideOut).offset(stackOffsetWiggle)
  }

  const layers = layout(wideMonths)
  const baseline =
    mode === 'stream'
      ? (min(layers, (layer) => min(layer, (point) => point[0])) ?? 0)
      : 0

  return layers.flatMap((series) =>
    series.flatMap((point): readonly IndustryInterval[] => {
      const source = point.data.byIndustry.get(series.key)
      return source
        ? [
            {
              ...source,
              lower: point[0] - baseline,
              upper: point[1] - baseline,
            },
          ]
        : []
    }),
  )
}

function penguinCounts(): readonly PenguinCount[] {
  const counts = new Map<string, number>()
  for (const row of penguins) {
    if (!isPenguinSex(row.sex)) continue
    const key = `${row.species}\u0000${row.sex}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return penguinSpecies.flatMap((species) => {
    let countStart = 0
    return penguinSexes.map((sex): PenguinCount => {
      const penguinCount = counts.get(`${species}\u0000${sex}`) ?? 0
      const point = {
        species,
        sex,
        penguins: penguinCount,
        countStart,
        countEnd: countStart + penguinCount,
      }
      countStart = point.countEnd
      return point
    })
  })
}

function isTrackedIndustry(
  industry: string,
): industry is (typeof trackedIndustries)[number] {
  return trackedIndustries.some((candidate) => candidate === industry)
}

function isPenguinSex(sex: string | null): sex is PenguinSex {
  return sex === 'FEMALE' || sex === 'MALE'
}

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
}).format
const formatPercent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
}).format
