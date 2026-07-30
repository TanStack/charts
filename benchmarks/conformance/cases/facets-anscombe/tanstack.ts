import { defineChart, dot, facet } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { quartetData } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (_input: ConformanceInput) =>
  defineChart(() => {
    const rows = quartetData()

    return {
      marks: [
        facet(rows, {
          by: 'set',
          columns: 4,
          gap: 12,
          label: (set) => String(set),
          chart: (facetRows) => ({
            marks: [
              dot(facetRows, {
                x: 'x',
                y: 'y',
                key: 'id',
                r: 3.5,
                fill: '#2563eb',
              }),
            ],
            x: {
              scale: scaleLinear().domain([3, 20]),
              grid: true,
              ticks: 5,
            },
            y: {
              scale: scaleLinear().domain([2, 14]),
              grid: true,
              ticks: 4,
            },
          }),
        }),
      ],
      guides: false,
      margin: 0,
      x: null,
      y: null,
    }
  })

export const mount = tanstackMount(
  definition,
  "Anscombe's quartet small multiples",
)
