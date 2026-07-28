import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
import { barX, barY } from './bar'
import type { BarYOptions } from './bar'
import { lineY } from './line'
import { rect } from './rect'
import { defineChart } from './scene'
import type { ChartMark, ChartSpec, ChartValue } from './types'

interface Row {
  id: string
  category: string
  value: number
  date: Date
  enabled: boolean
}

const rows: readonly Row[] = [
  {
    id: 'a',
    category: 'Alpha',
    value: 4,
    date: new Date('2025-01-01T00:00:00Z'),
    enabled: true,
  },
]

const categoricalMark = barY(rows, {
  x: 'category',
  y: 'value',
  key: 'id',
})
const optionalOptions: BarYOptions<Row> | undefined =
  rows.length > 0 ? { x: 'category', y: 'value' } : undefined
const optionalOptionsMark = barY(rows, optionalOptions)

const categoricalSpec: ChartSpec<readonly [typeof categoricalMark]> = {
  marks: [categoricalMark],
  x: {
    scale: scaleBand<string>().domain(['Alpha']),
    format: (value) => {
      expectTypeOf(value).toEqualTypeOf<string>()
      return value
    },
  },
  y: {
    scale: scaleLinear().domain([0, 4]),
    format: (value) => {
      expectTypeOf(value).toEqualTypeOf<number>()
      return value.toLocaleString()
    },
  },
}

interface LineRow {
  kind: 'line'
  id: string
  date: Date
  value: number
}

interface BarRow {
  kind: 'bar'
  id: string
  category: string
  value: number
}

type DynamicInput =
  | { kind: 'line'; rows: readonly LineRow[] }
  | { kind: 'bar'; rows: readonly BarRow[] }

const heterogeneousDefinition = defineChart<DynamicInput>()(({ input }) =>
  input.kind === 'line'
    ? {
        marks: [lineY(input.rows, { x: 'date', y: 'value', key: 'id' })],
        x: { scale: scaleUtc().domain(input.rows.map((row) => row.date)) },
        y: { scale: scaleLinear().domain([0, 10]) },
      }
    : {
        marks: [barX(input.rows, { x: 'value', y: 'category', key: 'id' })],
        x: { scale: scaleLinear().domain([0, 10]) },
        y: {
          scale: scaleBand<string>().domain(
            input.rows.map((row) => row.category),
          ),
        },
      },
)

if (false) {
  // @ts-expect-error A boolean field cannot feed a numeric channel.
  lineY(rows, { x: 'date', y: 'enabled' })

  // @ts-expect-error Field-name channels must exist on the datum.
  barY(rows, { x: 'missing', y: 'value' })

  const invalidCategoricalSpec: ChartSpec<readonly [typeof categoricalMark]> = {
    marks: [categoricalMark],
    // @ts-expect-error The x channel emits strings, so a numeric scale is invalid.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }
  void invalidCategoricalSpec

  // @ts-expect-error Dynamic definitions retain the mark-to-scale contract.
  defineChart<{ rows: readonly Row[] }>()(({ input }) => ({
    marks: [barY(input.rows, { x: 'category', y: 'value' })],
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  }))

  const categoricalRect = rect([{ x1: 'Alpha', x2: 'Beta', y1: 0, y2: 1 }], {
    x1: 'x1',
    x2: 'x2',
    y1: 'y1',
    y2: 'y2',
  })
  const invalidRectSpec: ChartSpec<readonly [typeof categoricalRect]> = {
    marks: [categoricalRect],
    // @ts-expect-error Rect endpoint types participate in the scale contract.
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 1]) },
  }
  void invalidRectSpec
}

describe('public type contracts', () => {
  it('preserves precise datum unions through heterogeneous definitions', () => {
    type InferredDatum = NonNullable<typeof heterogeneousDefinition.__datum>

    expectTypeOf<InferredDatum>().toEqualTypeOf<LineRow | BarRow>()
    expectTypeOf(optionalOptionsMark).toMatchTypeOf<
      ChartMark<Row, ChartValue, number>
    >()
    expect(categoricalSpec.marks).toEqual([categoricalMark])
  })
})
