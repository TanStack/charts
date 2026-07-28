import { lineY } from '@observablehq/plot'
import { createPlotRenderer, definePlot } from '@plot-poc/observable'

interface Input {
  points: readonly { x: number; y: number }[]
  stroke: string
}

const definition = definePlot<Input, unknown, Input['points']>({
  prepare: (input) => input.points,
  prepareEqual: (previous, next) => previous.points === next.points,
  plot: ({ input, prepared }) => ({
    marks: [
      lineY(prepared, {
        x: 'x',
        y: 'y',
        stroke: input.stroke,
      }),
    ],
  }),
})

export const renderer = createPlotRenderer(definition)
