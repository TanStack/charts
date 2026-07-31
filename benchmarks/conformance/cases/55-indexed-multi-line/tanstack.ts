import { defineChart, lineY, ruleY, text } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'

interface IndexedPoint extends IndustriesRow {
  indexed: number
}

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed']
const formatIndex = (value: number) => `${Math.round((value - 1) * 100)}%`
const includedIndustries = new Set([
  'Construction',
  'Finance',
  'Government',
  'Manufacturing',
])
const observations = industries.filter(
  (row) =>
    row.date >= new Date(Date.UTC(2008, 0, 1)) &&
    includedIndustries.has(row.industry),
)

const definition = () => {
  const rows = indexFromFirst(observations)
  const labels = lastByIndustry(rows)

  return defineChart({
    marks: [
      ruleY([1], { strokeOpacity: 0.65 }),
      lineY(rows, {
        x: 'date',
        y: 'indexed',
        color: 'industry',
        strokeWidth: 2.25,
      }),
      text(labels, {
        x: 'date',
        y: 'indexed',
        text: 'industry',
        color: 'industry',
        anchor: 'start',
        dx: 5,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Month' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: {
        ticks: { format: formatIndex },
        label: 'Change from January 2008',
      },
    },
    color: {
      range: colors,
    },
    margin: { right: 108 },
  })
}

export const mount = tanstackMount(
  definition,
  'Indexed U.S. industry unemployment',
  {
    format: ({ datum }) =>
      `${datum.industry} · ${datum.date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })} · ${formatIndex(datum.indexed)} from start`,
  },
)

function indexFromFirst(
  rows: readonly IndustriesRow[],
): readonly IndexedPoint[] {
  const output: IndexedPoint[] = []

  for (const industryRows of group(rows, (row) => row.industry).values()) {
    const first = industryRows[0]
    if (first === undefined || first.unemployed === 0) continue

    for (const row of industryRows) {
      output.push({ ...row, indexed: row.unemployed / first.unemployed })
    }
  }

  return output
}

function lastByIndustry(
  rows: readonly IndexedPoint[],
): readonly IndexedPoint[] {
  return Array.from(group(rows, (row) => row.industry).values())
    .map((industryRows) => industryRows.at(-1))
    .filter((row): row is IndexedPoint => row !== undefined)
}
