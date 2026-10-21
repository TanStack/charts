import { defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { cityMark } from './mark.js'
import { cityFocus } from './interaction.js'
import { REGIONS } from './engine/model.js'

/** A convenience preset; accepts the usual TanStack definition options. */
export function defineCityChart(data, { layout, ...options } = {}) {
  return defineChart({
    marks: [cityMark(data, { layout })],
    scales: {
      x: { scale: scaleLinear, axis: false },
      y: { scale: scaleLinear, axis: false },
    },
    color: {
      domain: REGIONS.map((r) => r.mask),
      range: REGIONS.map((r) => r.color),
    },
    guides: false,
    margin: 0,
    focus: cityFocus,
    ...options,
  })
}
