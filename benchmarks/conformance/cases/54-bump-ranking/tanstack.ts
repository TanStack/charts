import { d3Curve, defineChart, dot, lineY, text } from '@tanstack/charts'
import { group, rank } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { tanstackMount } from '../../shared/mount'

interface RankedIndustry extends IndustriesRow {
  rank: number
}

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
  const rows = rankWithinDate(observations)
  const labels = lastByIndustry(rows)

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
      ticks: 7,
      format: (date) => `${date.getUTCFullYear()}`,
      label: 'Year',
    },
    y: {
      scale: scaleLinear().domain([5.2, 0.8]),
      ticks: 5,
      format: (value) => `#${value}`,
      grid: true,
      label: 'Rank',
    },
    color: {
      domain: includedIndustries,
      range: colors,
    },
    margin: { right: 160 },
  })
}

export const mount = tanstackMount(
  definition,
  'Annual unemployment rank by industry',
)

function rankWithinDate(
  rows: readonly IndustriesRow[],
): readonly RankedIndustry[] {
  const output: RankedIndustry[] = []

  for (const dateRows of group(rows, (row) => row.date.getTime()).values()) {
    const ranks = rank(dateRows, (row: IndustriesRow) => -row.unemployed)

    dateRows.forEach((row, index) => {
      const rowRank = ranks[index]
      if (rowRank === undefined || !Number.isFinite(rowRank)) return
      output.push({ ...row, rank: rowRank + 1 })
    })
  }

  return output
}

function lastByIndustry(
  rows: readonly RankedIndustry[],
): readonly RankedIndustry[] {
  return Array.from(group(rows, (row) => row.industry).values())
    .map((industryRows) => industryRows.at(-1))
    .filter((row): row is RankedIndustry => row !== undefined)
}
