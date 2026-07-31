import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { format } from 'd3-format'
import { group } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { stack, stackOffsetExpand } from 'd3-shape'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

interface WideTimePoint {
  date: Date
  byIndustry: ReadonlyMap<string, IndustriesRow>
}

interface NormalizedIndustryPoint extends IndustriesRow {
  y1: number
  y2: number
}

const percent = format('.0%')
const colors = [
  '#4e79a7',
  '#f28e2c',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ab',
]

const definition = (_input: ConformanceInput) => {
  const rows = normalizedIntervals(industries)

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        color: 'industry',
        fillOpacity: 0.82,
      }),
      ruleY([0]),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear().domain([0, 1]),
      grid: true,
      axis: { ticks: { format: percent }, label: 'Share of unemployment' },
    },
    color: {
      range: colors,
      legend: colorLegend({ label: 'Industry' }),
    },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Industry share of unemployment',
)

function normalizedIntervals(
  rows: readonly IndustriesRow[],
): readonly NormalizedIndustryPoint[] {
  const industryNames = Array.from(new Set(rows.map((row) => row.industry)))
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )

  return stack<WideTimePoint, string>()
    .keys(industryNames)
    .value((row, industry) => row.byIndustry.get(industry)?.unemployed ?? 0)
    .offset(stackOffsetExpand)(wideRows)
    .flatMap((series) =>
      series.flatMap((point): readonly NormalizedIndustryPoint[] => {
        const source = point.data.byIndustry.get(series.key)
        return source ? [{ ...source, y1: point[0], y2: point[1] }] : []
      }),
    )
}

function toWideRow(rows: IndustriesRow[]): WideTimePoint {
  return {
    date: rows[0]?.date ?? new Date(0),
    byIndustry: new Map(rows.map((row) => [row.industry, row] as const)),
  }
}
