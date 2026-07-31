import { alphabet } from '@charts-poc/demo-data/alphabet'
import { defineChart, dot, link } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const definition = (_input: ConformanceInput) => {
  return defineChart({
    marks: [
      link(alphabet, {
        x1: 'letter',
        y1: () => 0,
        x2: 'letter',
        y2: 'frequency',
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      }),
      dot(alphabet, {
        x: 'letter',
        y: 'frequency',
        fill: '#2563eb',
        r: 4,
      }),
    ],
    x: {
      scale: () => scaleBand<string>().padding(0.3),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: {
        ticks: { format: (value) => percent.format(value) },
        label: 'Frequency',
      },
    },
  })
}

export const mount = tanstackMount(definition, 'Ranked lollipop chart', {
  format: ({ datum }) =>
    `${datum.letter} · ${percent.format(datum.frequency)} frequency`,
})
