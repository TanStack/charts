import { citywages } from '@charts-poc/demo-data/citywages'
import { barX, defineChart, ruleX } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) => {
  const rows = citywages
    .slice(input.revision * 4, input.revision * 4 + 8)
    .sort((left, right) => right.POP_2015 - left.POP_2015)

  return defineChart({
    marks: [
      barX(rows, {
        x: 'POP_2015',
        y: 'Metro',
        fill: '#7c3aed',
        inset: 1,
      }),
      ruleX([0]),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 5 }, label: '2015 population' },
    },
    y: {
      scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Horizontal ranking with long labels',
)
