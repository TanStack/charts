import { defineChart, dot, link } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { lollipopData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = lollipopData(input.revision)
  return {
    marks: [
      link(rows, {
        x1: 'category',
        y1: () => 0,
        x2: 'category',
        y2: 'value',
        key: 'id',
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      }),
      dot(rows, {
        x: 'category',
        y: 'value',
        key: 'id',
        fill: '#2563eb',
        r: 4,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(rows.map((row) => row.category))
        .padding(0.3),
    },
    y: {
      scale: scaleLinear().domain([0, 180]),
      grid: true,
      label: 'Total',
    },
  }
})

export const mount = tanstackMount(definition, 'Ranked lollipop chart')
