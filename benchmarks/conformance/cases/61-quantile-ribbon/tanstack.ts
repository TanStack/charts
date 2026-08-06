import { areaY, defineChart, groupBy, lineY, quantile } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'

export const quantileRows = groupBy(industries, {
  by: 'date',
  outputs: {
    lower: { value: 'unemployed', reduce: quantile(0.1) },
    median: { value: 'unemployed', reduce: quantile(0.5) },
    upper: { value: 'unemployed', reduce: quantile(0.9) },
  },
})

const dateKey = ({ date }: (typeof quantileRows)[number]) => date.getTime()

export const quantileRibbonDefinition = () => {
  return defineChart({
    marks: [
      areaY(quantileRows, {
        id: 'quantile-ribbon',
        x: 'date',
        y1: 'lower',
        y2: 'upper',
        key: dateKey,
        fill: '#0ea5e9',
        fillOpacity: 0.22,
      }),
      lineY(quantileRows, {
        id: 'median-line',
        x: 'date',
        y: 'median',
        key: dateKey,
        stroke: '#0369a1',
        strokeWidth: 2.25,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed people by industry (thousands)' },
    },
  })
}

export const mount = tanstackMount(
  quantileRibbonDefinition,
  'Monthly industry unemployment distribution',
)
