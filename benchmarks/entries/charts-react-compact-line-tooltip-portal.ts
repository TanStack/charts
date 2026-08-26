import { defineChart, lineY } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from '@tanstack/charts/scales/linear'

export { Chart } from '@tanstack/charts/react'

export const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },

  tooltip: {
    use: tooltip,
    portal,
  },
})
