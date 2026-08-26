import { cars } from '@tanstack/charts-data/cars'
import { industries } from '@tanstack/charts-data/industries'
import {
  areaY,
  barX,
  colorLegend,
  d3Curve,
  defineChart,
  lineY,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import { group, min } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import {
  curveMonotoneX,
  stack,
  stackOffsetExpand,
  stackOffsetWiggle,
  stackOrderInsideOut,
} from 'd3-shape'
import type { CarsRow } from '@tanstack/charts-data/cars'
import type { IndustriesRow } from '@tanstack/charts-data/industries'

export type IndustryHistoryMode = 'line' | 'stacked' | 'share' | 'stream'
export type { IndustriesRow }

export interface IndustryInterval extends IndustriesRow {
  readonly lower: number
  readonly upper: number
}

interface WideIndustryMonth {
  readonly date: Date
  readonly byIndustry: ReadonlyMap<string, IndustriesRow>
}

interface RankedCar extends CarsRow {
  readonly 'economy (mpg)': number
  readonly 'power (hp)': number
}

type RankingMetric = 'economy (mpg)' | 'power (hp)'

const trackedIndustries = [
  'Wholesale and Retail Trade',
  'Manufacturing',
  'Construction',
] as const
const industryColors = ['#ff6a3d', '#a8ec62', '#72a7ff']
const industryWindowStarts = [0, 30, 60, 90]
const industryWindowMonths = 30
const industryDates = Array.from(
  new Map(industries.map((row) => [row.date.getTime(), row.date])).values(),
)

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
              fillOpacity: 0.84,
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

const carRankingData = cars
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

function isTrackedIndustry(
  industry: string,
): industry is (typeof trackedIndustries)[number] {
  return trackedIndustries.some((candidate) => candidate === industry)
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
