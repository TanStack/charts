import { d3Curve, defineChart, lineY } from '@tanstack/charts'
import { rank } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { curveStepAfter } from 'd3-shape'
import { distributionData } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface EmpiricalPoint {
  id: number
  value: number
  probability: number
}

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const source = [...distributionData(input.revision)].sort(
    (left, right) => left.value - right.value,
  )
  const ranks = rank(source.map((row) => row.value))
  const rows: readonly EmpiricalPoint[] = source.map((row, index) => ({
    id: row.id,
    value: row.value,
    probability: ((ranks[index] ?? 0) + 1) / source.length,
  }))

  return {
    marks: [
      lineY(rows, {
        x: 'value',
        y: 'probability',
        key: 'id',
        curve: d3Curve(curveStepAfter),
        stroke: '#2563eb',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleLinear().domain([20, 90]),
      grid: true,
      label: 'Observed value',
    },
    y: {
      scale: scaleLinear().domain([0, 1]),
      grid: true,
      label: 'Cumulative proportion',
      format: (value) => percent.format(value),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Empirical cumulative distribution',
)
