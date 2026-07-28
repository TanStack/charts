import { expectTypeOf } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartDefinition } from '@tanstack/charts'
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
const undefinedInputDefinition = defineChart<undefined>()(
  () => staticDefinition,
)
const voidInputDefinition = defineChart<void>()(() => staticDefinition)
const widenedDefinition: ChartDefinition<(typeof rows)[number], undefined> =
  rows.length > 0 ? staticDefinition : undefinedInputDefinition

if (false) {
  Chart<(typeof rows)[number]>({
    definition: staticDefinition,
    ariaLabel: 'Explicit static datum',
  })
  Chart<(typeof rows)[number], { rows: typeof rows; stroke: string }>({
    definition: dynamicDefinition,
    input: { rows, stroke: 'red' },
    ariaLabel: 'Explicit dynamic datum and input',
  })

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
    focus: {
      resolve(points) {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: (typeof rows)[number]
          xValue: number
          yValue: number
        }>()
        return points
      },
      group(_points, point) {
        expectTypeOf(point.xValue).toEqualTypeOf<number>()
        return [point]
      },
      navigation: (points) => points,
    },
    renderSvg(scene) {
      expectTypeOf(scene.points).items.toMatchTypeOf<{
        datum: (typeof rows)[number]
        xValue: number
        yValue: number
      }>()
      return ''
    },
    onFocusChange(point) {
      expectTypeOf(point?.datum).toEqualTypeOf<
        (typeof rows)[number] | undefined
      >()
      expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
      expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
    },
    onFocusGroupChange(points) {
      const point = points[0]
      if (!point) return
      expectTypeOf(point.xValue).toEqualTypeOf<number>()
      expectTypeOf(point.yValue).toEqualTypeOf<number>()
    },
    onSelect(point) {
      expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
      expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
    },
  })

  Chart({
    definition: staticDefinition,
    ariaLabel: 'Static values',
    onFocusChange(point) {
      expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
      expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
    },
    onSelect(point) {
      expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
      expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
    },
  })

  Chart({
    definition: undefinedInputDefinition,
    input: undefined,
    ariaLabel: 'Undefined input',
    onFocusChange(point) {
      expectTypeOf(point?.datum).toEqualTypeOf<
        (typeof rows)[number] | undefined
      >()
    },
  })

  Chart({
    definition: voidInputDefinition,
    input: undefined,
    ariaLabel: 'Void input',
  })

  // @ts-expect-error Dynamic TSRX props require an explicit input property even when its value is undefined.
  Chart({ definition: undefinedInputDefinition, ariaLabel: 'Undefined input' })

  // @ts-expect-error Dynamic TSRX props require an explicit input property even when its value is void.
  Chart({ definition: voidInputDefinition, ariaLabel: 'Void input' })

  Chart({
    definition: staticDefinition,
    input: undefined,
    ariaLabel: 'Explicit static undefined',
  })

  // @ts-expect-error A widened static-or-dynamic TSRX definition must be narrowed before rendering.
  Chart({ definition: widenedDefinition, ariaLabel: 'Widened definition' })

  Chart({
    // @ts-expect-error Supplying input does not resolve a widened TSRX definition.
    definition: widenedDefinition,
    input: undefined,
    ariaLabel: 'Widened definition',
  })
}
