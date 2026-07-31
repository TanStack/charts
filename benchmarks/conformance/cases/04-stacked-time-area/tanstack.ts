import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { stack } from 'd3-shape'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'

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

interface WideTimePoint {
  date: Date
  byIndustry: ReadonlyMap<string, IndustriesRow>
}

interface StackedIndustryPoint extends IndustriesRow {
  y1: number
  y2: number
}

const definition = (_input: ConformanceInput) => {
  const rows = stackRows(industries)

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        color: 'industry',
        fillOpacity: 0.78,
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc,
      label: 'Month',
    },
    y: {
      scale: scaleLinear,
      label: 'Unemployed (thousands)',
      grid: true,
    },
    color: {
      range: colors,
      legend: colorLegend({ label: 'Industry' }),
    },
  })
}

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Unemployment by industry as stacked areas',
  {
    format: ({ datum }) =>
      `${datum.industry} · ${datum.date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })} · ${datum.unemployed.toLocaleString('en-US')} thousand unemployed`,
  },
)

function stackRows(
  rows: readonly IndustriesRow[],
): readonly StackedIndustryPoint[] {
  const industryNames = Array.from(new Set(rows.map((row) => row.industry)))
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )

  return stack<WideTimePoint, string>()
    .keys(industryNames)
    .value((row, industry) => row.byIndustry.get(industry)?.unemployed ?? 0)(
      wideRows,
    )
    .flatMap((series) =>
      series.flatMap((point): readonly StackedIndustryPoint[] => {
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
