import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { pie } from 'd3-shape'
import { selectPieData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'

const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(({ frequency }) => frequency)
const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})

const definition = (input: ConformanceInput) => {
  const arcs = pieLayout([...selectPieData(alphabet, input.revision)])

  return defineChart({
    marks: [
      polar({
        inset: 0,
        radiusRatio: 0.8,
        marks: [
          radialArc(arcs, {
            startAngle: 'startAngle',
            endAngle: 'endAngle',
            padAngle: 'padAngle',
            color: ({ data }) => data.letter,
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(definition, 'English letter frequency pie', {
  format: ({ datum }) =>
    `${datum.data.letter} · ${percentage.format(datum.data.frequency)}`,
})
