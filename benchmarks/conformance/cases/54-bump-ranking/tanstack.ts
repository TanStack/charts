import { d3Curve, defineChart, dot, lineY, text } from '@tanstack/charts'
import { group, rank } from 'd3-array'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { curveBumpX } from 'd3-shape'
import { bumpData, bumpEntities } from './data'
import type { BumpValue } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface RankedBumpValue extends BumpValue {
  rank: number
}

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed', '#db2777']

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = rankWithinYear(bumpData(input.revision))
    const labels = lastByEntity(rows)

    return {
      marks: [
        lineY(rows, {
          x: 'year',
          y: 'rank',
          z: 'entity',
          key: 'id',
          curve: d3Curve(curveBumpX),
          strokeWidth: 2.25,
        }),
        dot(rows, {
          x: 'year',
          y: 'rank',
          z: 'entity',
          key: 'id',
          r: 3,
        }),
        text(labels, {
          x: 'year',
          y: 'rank',
          text: 'entity',
          z: 'entity',
          key: 'id',
          anchor: 'start',
          dx: 6,
        }),
      ],
      x: {
        scale: scaleLinear().domain([2018, 2024]),
        ticks: 7,
        format: (year) => `${year}`,
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
        scale: scaleOrdinal<BumpValue['entity'], string>()
          .domain(bumpEntities)
          .range(colors),
      },
      margin: { right: 72 },
    }
  })

export const mount = tanstackMount(definition, 'Annual product rank bump chart')

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

function lastByEntity(
  rows: readonly RankedBumpValue[],
): readonly RankedBumpValue[] {
  return Array.from(group(rows, (row) => row.entity).values())
    .map((entityRows) => entityRows.at(-1))
    .filter((row): row is RankedBumpValue => row !== undefined)
}
