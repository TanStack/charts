import { areaY, colorLegend, defineChart, ruleY, stack } from '@tanstack/charts'
import { format } from 'd3-format'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'

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

const definition = (_input: ConformanceInput) =>
  defineChart({
    marks: [
      areaY(industries, {
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        fillOpacity: 0.82,
        layout: stack({ offset: 'normalize' }),
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

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Industry share of unemployment',
)
