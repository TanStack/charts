import { flare } from '@charts-poc/demo-data/flare'
import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleLog } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'

type SizedFlareRow = FlareRow & { readonly size: number }

const definition = (input: ConformanceInput) => {
  const rows = flare
    .filter((row): row is SizedFlareRow => row.size !== null)
    .slice(input.revision * 8, input.revision * 8 + 200)

  return defineChart({
    marks: [
      dot(rows, {
        x: 'size',
        y: (row) => row.name.split('.').length - 1,
        r: 3.5,
        fill: '#f97316',
        stroke: '#9a3412',
        strokeWidth: 0.75,
      }),
    ],
    margin: {
      top: 16,
      right: 20,
      bottom: 40,
      left: 50,
    },
    x: {
      scale: scaleLog().domain([200, 30_000]),
      grid: true,
      label: 'Class size',
    },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Hierarchy depth',
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Flare class size on a logarithmic scale',
)
