import { anscombe } from '@charts-poc/demo-data/anscombe'
import { defineChart, dot, facet } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (_input: ConformanceInput) =>
  defineChart({
    marks: [
      facet(anscombe, {
        by: 'series',
        columns: 4,
        gap: 12,
        label: (series) => String(series),
        chart: (facetRows) => ({
          marks: [
            dot(facetRows, {
              x: 'x',
              y: 'y',
              r: 3.5,
              fill: '#2563eb',
            }),
          ],
          x: {
            scale: scaleLinear().domain([3, 20]),
            grid: true,
            axis: { ticks: { count: 5 } },
          },
          y: {
            scale: scaleLinear().domain([2, 14]),
            grid: true,
            axis: { ticks: { count: 4 } },
          },
        }),
      }),
    ],
    margin: 0,
  })

export const mount = tanstackMount(
  definition,
  "Anscombe's quartet small multiples",
)
