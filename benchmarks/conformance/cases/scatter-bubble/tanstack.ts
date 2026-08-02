import { colorLegend, defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import { bubbleRows } from './model'

const groupRange = ['#2563eb', '#f97316', '#10b981']

const definition = (input: ConformanceInput) => {
  const rows = bubbleRows(input.revision)

  return defineChart({
    marks: [
      dot(rows, {
        x: 'culmen_length_mm',
        y: 'culmen_depth_mm',
        color: 'species',
        r: 'body_mass_g',
        rScale: {
          scale: () => scaleSqrt().range([3, 11]),
        },
        fillOpacity: 0.78,
        stroke: 'currentColor',
        strokeOpacity: 0.28,
        strokeWidth: 0.75,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Bill length (mm)' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Bill depth (mm)' } },
    color: {
      range: groupRange,
      legend: colorLegend({ label: 'Species' }),
    },
  })
}

export const mount = tanstackMount(definition, 'Bubble scatterplot')
