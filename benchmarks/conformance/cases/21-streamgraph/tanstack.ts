import { areaY, colorLegend, defineChart, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import { samplePreviewSeries } from '../../shared/preview'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ConformanceInput } from '../../types'

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

function streamgraphChart(rows: readonly IndustriesRow[], showLegend: boolean) {
  return defineChart({
    marks: [
      areaY(rows, {
        x: 'date',
        y: 'unemployed',
        z: 'industry',
        color: 'industry',
        layout: stack({ offset: 'wiggle', order: 'inside-out' }),
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
      ...(showLegend ? { legend: colorLegend({ label: 'Industry' }) } : {}),
    },
  })
}

export const streamgraphDefinition = () => streamgraphChart(industries, true)

const catalogStreamgraphDefinition = (input: ConformanceInput) =>
  streamgraphChart(
    samplePreviewSeries(industries, input, 24, (row) => row.industry),
    input.preview !== true,
  )

export const mount = tanstackMount(
  streamgraphDefinition,
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

export const catalogCase = tanstackCase(
  catalogStreamgraphDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
