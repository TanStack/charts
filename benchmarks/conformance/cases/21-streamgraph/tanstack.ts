import { areaY, colorLegend, defineChart, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
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

export const streamgraphDefinition = () =>
  defineChart({
    marks: [
      areaY(industries, {
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
      legend: colorLegend({ label: 'Industry' }),
    },
  })

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
