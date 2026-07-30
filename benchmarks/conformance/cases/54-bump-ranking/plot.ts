import * as Plot from '@observablehq/plot'
import { group, rank } from 'd3-array'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

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

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = rankWithinDate(observations)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Annual unemployment rank by industry',
      marginRight: 160,
      x: {
        ticks: 7,
        tickFormat: (date) => `${date.getUTCFullYear()}`,
        label: 'Year',
      },
      y: {
        domain: [5.2, 0.8],
        ticks: 5,
        tickFormat: (value) => `#${value}`,
        grid: true,
        label: 'Rank',
      },
      color: { domain: includedIndustries, range: colors },
      marks: [
        Plot.line(rows, {
          x: 'date',
          y: 'rank',
          z: 'industry',
          stroke: 'industry',
          curve: 'bump-x',
          strokeWidth: 2.25,
        }),
        Plot.dot(rows, {
          x: 'date',
          y: 'rank',
          fill: 'industry',
          r: 3,
        }),
        Plot.text(
          rows,
          Plot.selectLast({
            x: 'date',
            y: 'rank',
            z: 'industry',
            text: 'industry',
            fill: 'industry',
            textAnchor: 'start',
            dx: 6,
          }),
        ),
      ],
    })
  })

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
