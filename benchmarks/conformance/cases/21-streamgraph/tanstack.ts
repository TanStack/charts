import { areaY, colorLegend, defineChart } from '@tanstack/charts'
import { group, min } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { stack, stackOffsetWiggle, stackOrderInsideOut } from 'd3-shape'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'
import { samplePreviewSeries } from '../../shared/preview'
import type { ConformanceInput } from '../../types'

interface WideTimePoint {
  date: Date
  byIndustry: ReadonlyMap<string, IndustriesRow>
}

interface StreamIndustryPoint extends IndustriesRow {
  y1: number
  y2: number
}

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

const definition = (input: ConformanceInput) => {
  const rows = samplePreviewSeries(
    streamIntervals(industries),
    input,
    32,
    (row) => row.industry,
  )

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        color: 'industry',
        fillOpacity: 0.85,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed (thousands)' },
    },
    color: {
      range: colors,
      ...(input.preview === true
        ? {}
        : { legend: colorLegend({ label: 'Industry' }) }),
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Unemployment by industry as a streamgraph',
  {
    format: ({ datum }) =>
      `${datum.industry} · ${datum.date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })} · ${datum.unemployed.toLocaleString('en-US')} thousand unemployed`,
  },
)

function streamIntervals(
  rows: readonly IndustriesRow[],
): readonly StreamIndustryPoint[] {
  const industryNames = Array.from(new Set(rows.map((row) => row.industry)))
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )
  const layers = stack<WideTimePoint, string>()
    .keys(industryNames)
    .value((row, industry) => row.byIndustry.get(industry)?.unemployed ?? 0)
    .order(stackOrderInsideOut)
    .offset(stackOffsetWiggle)(wideRows)
  const baseline = min(layers, (layer) => min(layer, (point) => point[0])) ?? 0

  return layers.flatMap((series) =>
    series.flatMap((point): readonly StreamIndustryPoint[] => {
      const source = point.data.byIndustry.get(series.key)
      return source
        ? [
            {
              ...source,
              y1: point[0] - baseline,
              y2: point[1] - baseline,
            },
          ]
        : []
    }),
  )
}

function toWideRow(rows: IndustriesRow[]): WideTimePoint {
  return {
    date: rows[0]?.date ?? new Date(0),
    byIndustry: new Map(rows.map((row) => [row.industry, row] as const)),
  }
}
