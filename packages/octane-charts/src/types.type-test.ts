import { expectTypeOf } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart.tsrx'

const rows = [
  { id: 'a', x: 0, value: 4 },
  { id: 'b', x: 1, value: 8 },
]

const staticDefinition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'value', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 8]) },
})

const dynamicDefinition = defineChart<{
  rows: typeof rows
  stroke: string
}>()(({ input }) => ({
  marks: [
    lineY(input.rows, {
      x: 'x',
      y: 'value',
      key: 'id',
      stroke: input.stroke,
    }),
  ],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 8]) },
}))

if (false) {
  // @ts-expect-error Dynamic chart props require input.
  Chart({ definition: dynamicDefinition, ariaLabel: 'Values' })

  // @ts-expect-error Static chart props do not accept input.
  Chart({ definition: staticDefinition, input: {}, ariaLabel: 'Values' })

  const invalidDynamicProps = {
    definition: dynamicDefinition,
    input: { rows, stroke: 42 },
    ariaLabel: 'Values',
  }
  // @ts-expect-error Dynamic chart input is inferred from the definition.
  Chart(invalidDynamicProps)

  Chart({
    definition: dynamicDefinition,
    input: { rows, stroke: 'red' },
    ariaLabel: 'Values',
    onFocusChange(point) {
      expectTypeOf(point?.datum).toEqualTypeOf<
        (typeof rows)[number] | undefined
      >()
    },
  })
}
