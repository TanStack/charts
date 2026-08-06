import { areaY, defineChart, groupBy, lineY, quantile } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { ConformanceInput } from '../../types'

export const quantileRows = groupBy(industries, {
  by: 'date',
  outputs: {
    lower: { value: 'unemployed', reduce: quantile(0.1) },
    median: { value: 'unemployed', reduce: quantile(0.5) },
    upper: { value: 'unemployed', reduce: quantile(0.9) },
  },
})

const dateKey = ({ date }: (typeof quantileRows)[number]) => date.getTime()

function quantileRibbonChart(
  rows: readonly (typeof quantileRows)[number][],
  showAxisLabels: boolean,
) {
  return defineChart({
    marks: [
      areaY(rows, {
        id: 'quantile-ribbon',
        x: 'date',
        y1: 'lower',
        y2: 'upper',
        key: dateKey,
        fill: '#0ea5e9',
        fillOpacity: 0.22,
      }),
      lineY(rows, {
        id: 'median-line',
        x: 'date',
        y: 'median',
        key: dateKey,
        stroke: '#0369a1',
        strokeWidth: 2.25,
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: showAxisLabels ? { label: 'Month' } : {},
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: showAxisLabels
        ? { label: 'Unemployed people by industry (thousands)' }
        : {},
    },
  })
}

export const quantileRibbonDefinition = () =>
  quantileRibbonChart(quantileRows, true)

const catalogQuantileRibbonDefinition = (input: ConformanceInput) =>
  quantileRibbonChart(
    samplePreviewData(quantileRows, input, 64, [
      (row) => row.date.getTime(),
      (row) => row.lower,
      (row) => row.upper,
    ]),
    input.preview !== true,
  )

export const mount = tanstackMount(
  quantileRibbonDefinition,
  'Monthly industry unemployment distribution',
)

export const catalogCase = tanstackCase(
  catalogQuantileRibbonDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
