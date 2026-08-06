import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleLinear } from 'd3-scale'
import { selectCenterDonutData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const tau = Math.PI * 2
const colors = ['#0ea5e9', '#6366f1', '#a855f7']
const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export const centerDonutDefinition = (input: ConformanceInput) => {
  const data = selectCenterDonutData(alphabet, input.revision)
  const arcs = pie(data, { value: 'frequency' })
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
            id: 'letter-slices',
            key: 'letter',
            innerRadius: ({ radius }) => radius * 0.62,
            color: 'letter',
          }),
          radialText(center, {
            id: 'center-total',
            angle: 'angle',
            radius: 'radius',
            key: 'id',
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
  centerDonutDefinition,
  'Letter frequency donut with total',
  {
    format: ({ datum }) =>
      'letter' in datum
        ? `${datum.letter} · ${percentage.format(datum.frequency)}`
        : `Total · ${datum.text}`,
  },
)
