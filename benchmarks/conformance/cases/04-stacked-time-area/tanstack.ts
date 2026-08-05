import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { ConformanceInput } from '../../types'
import { tanstackMount } from '../../shared/mount'
import { samplePreviewSeries } from '../../shared/preview'

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

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      areaY(
        samplePreviewSeries(industries, input, 32, (row) => row.industry),
        {
          x: 'date',
          y: 'unemployed',
          color: 'industry',
          fillOpacity: 0.78,
        },
      ),
      ruleY([0]),
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

export const mount = tanstackMount(
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
