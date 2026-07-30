import { defineChart } from '@tanstack/charts'
import { polar, radialArc, radialText } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleLinear } from 'd3-scale'
import { pie } from 'd3-shape'
import { selectCenterDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { AlphabetRow } from '@charts-poc/demo-data/alphabet'
import type { ConformanceInput } from '../../types'

const tau = Math.PI * 2
const pieLayout = pie<AlphabetRow>()
  .sort(null)
  .value(({ frequency }) => frequency)
const colors = ['#0ea5e9', '#6366f1', '#a855f7']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const definition = (input: ConformanceInput) => {
  const data = selectCenterDonutData(alphabet, input.revision)
  const arcs = pieLayout([...data])
  const total = data.reduce((sum, row) => sum + row.frequency, 0)
  const center = [
    { id: 'total', angle: 0, radius: 0, text: percentage.format(total) },
  ]

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.8,
        angle: { scale: scaleLinear().domain([0, tau]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(arcs, {
            innerRadius: ({ radius }) => radius * 0.62,
            color: ({ data }) => data.letter,
          }),
          radialText(center, {
            angle: 'angle',
            radius: 'radius',
            text: 'text',
            fill: '#0f172a',
            fontSize: 20,
            fontWeight: 700,
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export const mount = tanstackMount(
  definition,
  'Letter frequency donut with total',
  {
    format: ({ datum }) =>
      'data' in datum
        ? `${datum.data.letter} · ${percentage.format(datum.data.frequency)}`
        : `Total · ${datum.text}`,
  },
)
