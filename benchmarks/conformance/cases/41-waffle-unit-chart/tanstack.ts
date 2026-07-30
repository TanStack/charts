import { cell, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand } from 'd3-scale'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import { tanstackMount } from '../../shared/mount'

interface WaffleCell extends AlphabetRow {
  unit: number
  column: number
  row: number
}

const unitFrequency = 0.01
const colors = [
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#f97316',
  '#2563eb',
  '#06b6d4',
]
const letters = alphabet.map((row) => row.letter)
const total = Math.round(
  alphabet.reduce((sum, row) => sum + row.frequency, 0) / unitFrequency,
)

const definition = () => {
  return defineChart(({ width, height }) => {
    const columns = Math.max(
      1,
      Math.floor(Math.sqrt((total * width) / Math.max(1, height))),
    )
    const cells = layoutWaffleCells(alphabet, columns)

    return {
      marks: [
        cell(cells, {
          x: 'column',
          y: 'row',
          color: 'letter',
          inset: 1,
          radius: 2,
        }),
      ],
      x: {
        scale: () => scaleBand<number>(),
      },
      y: {
        scale: () => scaleBand<number>(),
        reverse: true,
      },
      guides: false,
      color: {
        domain: letters,
        range: colors,
        legend: colorLegend({ label: 'Letter' }),
      },
    }
  })
}

export const mount = tanstackMount(
  definition,
  'English letter frequency waffle chart',
)

function layoutWaffleCells(
  rows: readonly AlphabetRow[],
  columns: number,
): readonly WaffleCell[] {
  const cells: WaffleCell[] = []
  let cumulativeFrequency = 0

  for (const row of rows) {
    const start = Math.round(cumulativeFrequency / unitFrequency)
    cumulativeFrequency += row.frequency
    const end = Math.round(cumulativeFrequency / unitFrequency)

    for (let unit = start; unit < end; unit += 1) {
      cells.push({
        ...row,
        unit,
        column: unit % columns,
        row: Math.floor(unit / columns),
      })
    }
  }

  return cells
}
