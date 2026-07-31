import {
  d3Curve,
  defineChart,
  dot,
  lineY,
  rank,
  select,
  text,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed', '#db2777']
const includedIndustries = [
  'Wholesale and Retail Trade',
  'Manufacturing',
  'Leisure and hospitality',
  'Business services',
  'Construction',
] as const
const includedIndustrySet: ReadonlySet<string> = new Set(includedIndustries)
const observations = industries.filter(
  (row) =>
    row.date.getUTCMonth() === 0 &&
    row.date.getUTCFullYear() >= 2004 &&
    includedIndustrySet.has(row.industry),
)

const definition = () => {
  const rows = rank(observations, {
    by: 'date',
    value: 'unemployed',
    order: 'descending',
    ties: 'competition',
  })
  const labels = select(rows, { by: 'industry', select: 'last' })

  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'rank',
        color: 'industry',
        curve: d3Curve(curveBumpX),
        strokeWidth: 2.25,
      }),
      dot(rows, {
        x: 'date',
        y: 'rank',
        color: 'industry',
        r: 3,
      }),
      text(labels, {
        x: 'date',
        y: 'rank',
        text: 'industry',
        color: 'industry',
        anchor: 'start',
        dx: 6,
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: {
        ticks: { count: 7, format: (date) => `${date.getUTCFullYear()}` },
        label: 'Year',
      },
    },
    y: {
      scale: scaleLinear().domain([5.2, 0.8]),
      grid: true,
      axis: {
        ticks: { count: 5, format: (value) => `#${value}` },
        label: 'Rank',
      },
    },
    color: {
      domain: includedIndustries,
      range: colors,
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Annual unemployment rank by industry',
)
