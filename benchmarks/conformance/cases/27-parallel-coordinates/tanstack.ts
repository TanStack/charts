import { colorLegend, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { parallelData, parallelMetrics, parallelModels } from './data'
import type { ParallelPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = [
  '#2563eb',
  '#ea580c',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#0891b2',
]

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = parallelData(input.revision)

  return {
    marks: [
      lineY(rows, {
        x: 'metric',
        y: 'score',
        z: 'model',
        key: 'id',
        strokeWidth: 1.75,
      }),
      dot(rows, {
        x: 'metric',
        y: 'score',
        z: 'model',
        key: 'id',
        r: 2.75,
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(parallelMetrics).padding(0.1),
    },
    y: {
      scale: scaleLinear().domain([0, 100]),
      grid: true,
      label: 'Normalized score',
    },
    color: {
      scale: scaleOrdinal<ParallelPoint['model'], string>()
        .domain(parallelModels)
        .range(colors),
      legend: colorLegend({ label: 'Model' }),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Parallel coordinates model comparison',
)
