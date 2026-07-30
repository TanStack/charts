import { alphabet } from '@charts-poc/demo-data/alphabet'
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const definition = (_input: ConformanceInput) =>
  defineChart(({ width }) => {
    return {
      marks: [
        barY(alphabet, {
          x: 'letter',
          y: 'frequency',
          fill: '#2563eb',
          inset: 1,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
        tickRotate: width < 560 ? -32 : 0,
      },
      y: {
        scale: scaleLinear,
        label: 'Frequency',
        ticks: 5,
        grid: true,
        format: (value) => percent.format(value),
      },
    }
  })

export const mount = tanstackMount(definition, 'Sorted vertical bars', {
  format: ({ datum }) =>
    `${datum.letter} · ${percent.format(datum.frequency)} frequency`,
})
