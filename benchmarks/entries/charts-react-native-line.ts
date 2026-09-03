import { scaleLinear } from 'd3-scale'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'

export { Chart } from '@tanstack/charts/react-native'

export const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
})
