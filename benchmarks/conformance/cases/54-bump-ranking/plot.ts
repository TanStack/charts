import * as Plot from '@observablehq/plot'
import { group, rank } from 'd3-array'
import { bumpData, bumpEntities } from './data'
import type { BumpValue } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

interface RankedBumpValue extends BumpValue {
  rank: number
}

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed', '#db2777']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = rankWithinYear(bumpData(nextInput.revision))

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Annual product rank bump chart',
      marginRight: 72,
      x: {
        domain: [2018, 2024],
        ticks: 7,
        tickFormat: (year) => `${year}`,
        label: 'Year',
      },
      y: {
        domain: [5.2, 0.8],
        ticks: 5,
        tickFormat: (value) => `#${value}`,
        grid: true,
        label: 'Rank',
      },
      color: { domain: bumpEntities, range: colors },
      marks: [
        Plot.line(rows, {
          x: 'year',
          y: 'rank',
          z: 'entity',
          stroke: 'entity',
          curve: 'bump-x',
          strokeWidth: 2.25,
        }),
        Plot.dot(rows, {
          x: 'year',
          y: 'rank',
          fill: 'entity',
          r: 3,
        }),
        Plot.text(
          rows,
          Plot.selectLast({
            x: 'year',
            y: 'rank',
            z: 'entity',
            text: 'entity',
            fill: 'entity',
            textAnchor: 'start',
            dx: 6,
          }),
        ),
      ],
    })
  })

function rankWithinYear(
  rows: readonly BumpValue[],
): readonly RankedBumpValue[] {
  const output: RankedBumpValue[] = []

  for (const yearRows of group(rows, (row) => row.year).values()) {
    const ranks = rank(yearRows, (row: BumpValue) => -row.value)

    yearRows.forEach((row, index) => {
      const rowRank = ranks[index]
      if (rowRank === undefined || !Number.isFinite(rowRank)) return
      output.push({ ...row, rank: rowRank + 1 })
    })
  }

  return output
}
