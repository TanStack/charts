import { flare } from '@charts-poc/demo-data/flare'
import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleLog } from 'd3-scale'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { ConformanceInput } from '../../types'

type SizedFlareRow = FlareRow & { readonly size: number }

function logScaleRows(input: ConformanceInput) {
  return flare
    .filter((row): row is SizedFlareRow => row.size !== null && row.size > 0)
    .slice(input.revision * 8, input.revision * 8 + 200)
}

function logScaleChart(rows: readonly SizedFlareRow[]) {
  return defineChart({
    marks: [
      dot(rows, {
        id: 'class-size-points',
        x: 'size',
        y: (row) => row.name.split('.').length - 1,
        key: 'name',
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
      axis: { label: 'Class size' },
    },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Hierarchy depth' } },
  })
}

export const logScaleScatterDefinition = (input: ConformanceInput) =>
  logScaleChart(logScaleRows(input))

const catalogLogScaleDefinition = (input: ConformanceInput) => {
  const rows = logScaleRows(input)
  return logScaleChart(
    samplePreviewData(rows, input, 80, [
      (row) => row.size,
      (row) => row.name.split('.').length - 1,
    ]),
  )
}

export const mount = tanstackMount(
  logScaleScatterDefinition,
  'Flare class size on a logarithmic scale',
)

export const catalogCase = tanstackCase(
  catalogLogScaleDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
