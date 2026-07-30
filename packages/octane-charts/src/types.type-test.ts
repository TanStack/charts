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

const dynamicDefinition = defineChart(() => ({
  marks: [
    lineY(rows, {
      x: 'x',
      y: 'value',
      key: 'id',
      stroke: 'red',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 8]) },
}))
const widenedDefinition: ChartDefinition<
  (typeof rows)[number],
  number,
  number
> = rows.length > 0 ? staticDefinition : dynamicDefinition

if (false) {
  Chart<(typeof rows)[number]>({
    definition: staticDefinition,
    ariaLabel: 'Explicit static datum',
  })
  Chart<(typeof rows)[number], number, number>({
    definition: dynamicDefinition,
    ariaLabel: 'Explicit dynamic coordinates',
  })

  Chart({ definition: dynamicDefinition, ariaLabel: 'Values' })

  const focusedDynamicDefinition = defineChart(dynamicDefinition, {
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
  })
  Chart({
    definition: focusedDynamicDefinition,
    ariaLabel: 'Values',
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
    renderTooltipBody({ points, content, defaultBody, pinned, dismiss }) {
      expectTypeOf(points).items.toMatchTypeOf<{
        datum: (typeof rows)[number]
        xValue: number
        yValue: number
      }>()
      expectTypeOf(content).toMatchTypeOf<
        | string
        | {
            title?: string
            color?: string
            rows: readonly {
              label: string
              value: string
              color?: string
            }[]
          }
      >()
      expectTypeOf(defaultBody).toEqualTypeOf<unknown>()
      expectTypeOf(pinned).toEqualTypeOf<boolean>()
      expectTypeOf(dismiss).toEqualTypeOf<() => void>()
      return defaultBody
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

  Chart({ definition: widenedDefinition, ariaLabel: 'Widened definition' })
}
