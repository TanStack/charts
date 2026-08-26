import { describe, expect, expectTypeOf, it } from 'vitest'
import { areaY } from './area'
import { areaX } from './area-x'
import { arrow } from './arrow'
import { bandX, bandY } from './band'
import { barX, barY } from './bar'
import { boxX, boxY } from './box'
import { crosshair } from './crosshair'
import { differenceX, differenceY } from './difference'
import { dot } from './dot'
import { focusGuideX } from './focus-guide'
import { whenFocused } from './focus-mark'
import { hexagon } from './hexagon'
import { lineX, lineY } from './line'
import { link } from './link'
import { compositeMark } from './mark-composite'
import { decorative } from './mark-decorative'
import { createMark } from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { rect } from './rect'
import { linearRegressionX, linearRegressionY } from './regression'
import { ridgelineX, ridgelineY } from './ridgeline'
import { ruleX, ruleY } from './rule'
import { whenSelected } from './selection'
import type { KeyedSelection } from './selection'
import { delaunayLink } from './spatial-delaunay'
import { densityContour } from './spatial-density'
import { hexbin } from './spatial-hexbin'
import { voronoi } from './spatial-voronoi'
import { text } from './text'
import { tickX, tickY } from './tick'
import { vector } from './vector'
import { violinX, violinY } from './violin'
import type { ChartMark } from './types'

type ScaleIds<TMark> =
  TMark extends ChartMark<
    any,
    any,
    any,
    any,
    any,
    infer TXScaleId,
    infer TYScaleId
  >
    ? readonly [TXScaleId, TYScaleId]
    : never

interface Row {
  id: string
  category: string
  x: number
  y: number
  x2: number
  y2: number
  height: number
  width: number
}

const rows: readonly Row[] = []

if (false) {
  const twoAxisMarks = [
    areaY(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    areaX(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    arrow(rows, {
      x1: 'x',
      y1: 'y',
      x2: 'x2',
      y2: 'y2',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    barY(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    barX(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    boxY(rows, {
      x: 'category',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    boxX(rows, {
      x: 'x',
      y: 'category',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    crosshair({ xScale: 'namedX', yScale: 'namedY' }),
    differenceY(rows, {
      x: 'x',
      y1: 'y',
      y2: 'y2',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    differenceX(rows, {
      x1: 'x',
      x2: 'x2',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    dot(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    focusGuideX(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    hexagon(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    lineY(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    lineX(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    link(rows, {
      x1: 'x',
      y1: 'y',
      x2: 'x2',
      y2: 'y2',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    rect(rows, {
      x1: 'x',
      y1: 'y',
      x2: 'x2',
      y2: 'y2',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    linearRegressionY(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    linearRegressionX(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    ridgelineY(rows, {
      x: 'x',
      y: 'category',
      height: 'height',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    ridgelineX(rows, {
      x: 'category',
      y: 'y',
      height: 'height',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    delaunayLink(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    densityContour(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    hexbin(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    voronoi(rows, {
      x: 'x',
      y: 'y',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    text(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    tickX(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    tickY(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    vector(rows, { x: 'x', y: 'y', xScale: 'namedX', yScale: 'namedY' }),
    violinY(rows, {
      x: 'category',
      y: 'y',
      width: 'width',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
    violinX(rows, {
      x: 'x',
      y: 'category',
      width: 'width',
      xScale: 'namedX',
      yScale: 'namedY',
    }),
  ] as const

  twoAxisMarks.forEach((mark) => {
    expectTypeOf<ScaleIds<typeof mark>>().toEqualTypeOf<
      readonly ['namedX', 'namedY']
    >()
  })

  const namedBandX = bandX(rows, { x: 'x', xScale: 'namedX' })
  const namedBandY = bandY(rows, { y: 'y', yScale: 'namedY' })
  const namedRuleX = ruleX(rows, { x: 'x', xScale: 'namedX' })
  const namedRuleY = ruleY(rows, { y: 'y', yScale: 'namedY' })

  expectTypeOf<ScaleIds<typeof namedBandX>>().toEqualTypeOf<
    readonly ['namedX', 'y']
  >()
  expectTypeOf<ScaleIds<typeof namedRuleX>>().toEqualTypeOf<
    readonly ['namedX', 'y']
  >()
  expectTypeOf<ScaleIds<typeof namedBandY>>().toEqualTypeOf<
    readonly ['x', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof namedRuleY>>().toEqualTypeOf<
    readonly ['x', 'namedY']
  >()

  const custom = createMark<Row, number, number, 'namedX', 'namedY'>(() => ({
    id: 'custom',
    channels: {
      x: { scale: 'namedX', values: [] },
      y: { scale: 'namedY', values: [] },
    },
    render: () => ({ nodes: [] }),
  }))
  const customWithScaleValues = createMarkWithScaleValues<
    Row,
    number,
    number,
    number,
    number,
    'namedX',
    'namedY'
  >(() => ({
    id: 'custom-with-scale-values',
    channels: {
      x: { scale: 'namedX', values: [] },
      y: { scale: 'namedY', values: [] },
    },
    render: () => ({ nodes: [] }),
  }))
  const namedLine = lineY(rows, {
    x: 'x',
    y: 'y',
    xScale: 'namedX',
    yScale: 'namedY',
  })
  const decorated = decorative(namedLine)
  const focused = whenFocused(namedLine)
  const selected = whenSelected(
    namedLine,
    null as unknown as KeyedSelection<Row, string, number, number>,
  )
  const composite = compositeMark([namedLine] as const)

  expectTypeOf<ScaleIds<typeof custom>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof customWithScaleValues>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof decorated>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof focused>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof selected>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()
  expectTypeOf<ScaleIds<typeof composite>>().toEqualTypeOf<
    readonly ['namedX', 'namedY']
  >()

  const explicitUndefined = lineY(rows, {
    x: 'x',
    y: 'y',
    xScale: undefined,
    yScale: undefined,
  })
  expectTypeOf<ScaleIds<typeof explicitUndefined>>().toEqualTypeOf<
    readonly ['x', 'y']
  >()
}

describe('Cartesian scale ID types', () => {
  it('typechecks every positional built-in and custom factory', () => {
    expect(true).toBe(true)
  })
})
