import { defineChart, lineY, ruleY, text } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { indexedData, indexedDateDomain, indexedSeries } from './data'
import type { IndexedValue } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface IndexedPoint extends IndexedValue {
  indexed: number
}

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed']
const formatIndex = (value: number) => `${Math.round((value - 1) * 100)}%`

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = indexFromFirst(indexedData(input.revision))
  const labels = lastBySeries(rows)

  return {
    marks: [
      ruleY([1], { strokeOpacity: 0.65 }),
      lineY(rows, {
        x: 'date',
        y: 'indexed',
        z: 'series',
        key: 'id',
        strokeWidth: 2.25,
      }),
      text(labels, {
        x: 'date',
        y: 'indexed',
        text: 'series',
        z: 'series',
        key: 'id',
        anchor: 'start',
        dx: 5,
      }),
    ],
    x: {
      scale: scaleUtc().domain(indexedDateDomain),
      label: 'Month',
    },
    y: {
      scale: scaleLinear().domain([0.72, 1.65]),
      grid: true,
      format: formatIndex,
      label: 'Change from first observation',
    },
    color: {
      scale: scaleOrdinal<IndexedValue['series'], string>()
        .domain(indexedSeries)
        .range(colors),
    },
    margin: { right: 68 },
  }
})

export const mount = tanstackMount(
  definition,
  'Indexed performance from first observation',
)

function indexFromFirst(
  rows: readonly IndexedValue[],
): readonly IndexedPoint[] {
  const output: IndexedPoint[] = []

  for (const seriesRows of group(rows, (row) => row.series).values()) {
    const first = seriesRows[0]
    if (first === undefined || first.value === 0) continue

    for (const row of seriesRows) {
      output.push({ ...row, indexed: row.value / first.value })
    }
  }

  return output
}

function lastBySeries(rows: readonly IndexedPoint[]): readonly IndexedPoint[] {
  return Array.from(group(rows, (row) => row.series).values())
    .map((seriesRows) => seriesRows.at(-1))
    .filter((row): row is IndexedPoint => row !== undefined)
}
