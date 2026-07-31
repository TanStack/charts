import { scaleLinear } from 'd3-scale'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'

export { Chart } from '@tanstack/react-native-charts'

export const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})
