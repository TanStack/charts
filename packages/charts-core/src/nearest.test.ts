import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { barX, barY } from './bar'
import { nearestPoint } from './nearest'
import { createChartScene, defineChart } from './scene'
import type {
  ChartPoint,
  ChartFocusAffinity,
  ChartValue,
  SceneNode,
  StaticChartDefinition,
} from './types'

describe('nearest point hit regions', () => {
  it('selects a containing rectangle before a closer interaction anchor', () => {
    const tallBar = point('tall', 100, 20, {
      kind: 'rect',
      x: 90,
      y: 20,
      width: 20,
      height: 180,
    })
    const neighboringPoint = point('neighbor', 140, 170)

    expect(nearestPoint([tallBar, neighboringPoint], 100, 170, 48)?.key).toBe(
      'tall',
    )
  })

  it('applies maximum distance from the rectangle boundary', () => {
    const bar = point('bar', 100, 20, {
      kind: 'rect',
      x: 90,
      y: 20,
      width: 20,
      height: 180,
    })

    expect(nearestPoint([bar], 119, 100, 10)?.key).toBe('bar')
    expect(nearestPoint([bar], 121, 100, 10)).toBeNull()
  })

  it('uses exact containment before a competing axis fallback', () => {
    const containing = point('containing', 100, 20, {
      kind: 'rect',
      x: 90,
      y: 20,
      width: 20,
      height: 180,
    })
    const sameX = point('same-x', 100, 170, undefined, 'x')

    expect(nearestPoint([containing, sameX], 100, 170, 48)?.key).toBe(
      'containing',
    )
  })

  it('uses paint order when hit regions overlap', () => {
    const lower = point('lower', 100, 100, {
      kind: 'rect',
      x: 80,
      y: 80,
      width: 100,
      height: 100,
    })
    const upper = point('upper', 170, 170, {
      kind: 'rect',
      x: 80,
      y: 80,
      width: 100,
      height: 100,
    })

    expect(nearestPoint([lower, upper], 100, 100, 48)?.key).toBe('upper')
  })

  it('falls back along the mark affinity after missing every region', () => {
    const xAligned = point('x-aligned', 100, 20, undefined, 'x')
    const yAligned = point('y-aligned', 250, 170, undefined, 'y')

    expect(nearestPoint([xAligned], 109, 190, 10)?.key).toBe('x-aligned')
    expect(nearestPoint([xAligned], 111, 20, 10)).toBeNull()
    expect(nearestPoint([yAligned], 20, 179, 10)?.key).toBe('y-aligned')
    expect(nearestPoint([yAligned], 250, 181, 10)).toBeNull()
  })

  it('uses geometry to break x-affinity ties between stacked segments', () => {
    const bottom = point(
      'bottom',
      100,
      100,
      { kind: 'rect', x: 90, y: 100, width: 20, height: 100 },
      'x',
    )
    const middle = point(
      'middle',
      100,
      60,
      { kind: 'rect', x: 90, y: 60, width: 20, height: 40 },
      'x',
    )
    const top = point(
      'top',
      100,
      20,
      { kind: 'rect', x: 90, y: 20, width: 20, height: 40 },
      'x',
    )

    expect(nearestPoint([bottom, middle, top], 100, 10, 48)?.key).toBe('top')
    expect(nearestPoint([bottom, middle, top], 100, 210, 48)?.key).toBe(
      'bottom',
    )
  })

  it('uses geometry to break y-affinity ties between stacked segments', () => {
    const left = point(
      'left',
      20,
      100,
      { kind: 'rect', x: 20, y: 90, width: 40, height: 20 },
      'y',
    )
    const middle = point(
      'middle',
      60,
      100,
      { kind: 'rect', x: 60, y: 90, width: 40, height: 20 },
      'y',
    )
    const right = point(
      'right',
      100,
      100,
      { kind: 'rect', x: 100, y: 90, width: 100, height: 20 },
      'y',
    )

    expect(nearestPoint([left, middle, right], 10, 100, 48)?.key).toBe('left')
    expect(nearestPoint([left, middle, right], 210, 100, 48)?.key).toBe('right')
  })

  it('requires containment for geometry-only marks', () => {
    const region = point(
      'region',
      100,
      100,
      {
        kind: 'polygon',
        points: [
          [80, 80],
          [120, 80],
          [100, 130],
        ],
      },
      'geometry',
    )

    expect(nearestPoint([region], 100, 100, 48)?.key).toBe('region')
    expect(nearestPoint([region], 125, 100, 48)).toBeNull()
  })

  it('supports circular painted geometry', () => {
    const bubble = point('bubble', 100, 100, {
      kind: 'circle',
      x: 100,
      y: 100,
      radius: 40,
    })
    const neighbor = point('neighbor', 137, 100)

    expect(nearestPoint([bubble, neighbor], 135, 100, 48)?.key).toBe('bubble')
  })

  it('preserves point-distance behavior without a hit region', () => {
    const anchor = point('anchor', 100, 20)

    expect(nearestPoint([anchor], 100, 29, 10)?.key).toBe('anchor')
    expect(nearestPoint([anchor], 100, 31, 10)).toBeNull()
  })

  it('preserves the first point when anchor distances tie', () => {
    const first = point('first', 90, 100)
    const second = point('second', 110, 100)

    expect(nearestPoint([first, second], 100, 100, 10)?.key).toBe('first')
  })

  it('supports reversed rectangle bounds', () => {
    const bar = point('bar', 100, 20, {
      kind: 'rect',
      x: 110,
      y: 200,
      width: -20,
      height: -180,
    })

    expect(nearestPoint([bar], 119, 100, 10)?.key).toBe('bar')
    expect(nearestPoint([bar], 121, 100, 10)).toBeNull()
  })

  it('uses the painted vertical bar rectangle as its hit region', () => {
    expectBarUsesPaintedRect(
      defineChart({
        marks: [
          barY([{ category: 'A', value: 80 }], {
            x: 'category',
            y: 'value',
          }),
        ],
        x: { scale: scaleBand<string>().domain(['A']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        margin: 0,
      }),
      'x',
    )
  })

  it('uses the painted horizontal bar rectangle as its hit region', () => {
    expectBarUsesPaintedRect(
      defineChart({
        marks: [
          barX([{ category: 'A', value: 80 }], {
            x: 'value',
            y: 'category',
          }),
        ],
        x: { scale: scaleLinear().domain([0, 100]) },
        y: { scale: scaleBand<string>().domain(['A']) },
        guides: false,
        margin: 0,
      }),
      'y',
    )
  })
})

function point(
  key: string,
  x: number,
  y: number,
  hitRegion?: ChartPoint['hitRegion'],
  focusAffinity?: ChartFocusAffinity,
): ChartPoint {
  return {
    key,
    markId: 'test',
    group: null,
    groupLabel: 'test',
    datum: key,
    datumIndex: 0,
    xValue: x,
    yValue: y,
    x,
    y,
    hitRegion,
    focusAffinity,
    color: 'currentColor',
  }
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function expectBarUsesPaintedRect<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  expectedAffinity: ChartFocusAffinity,
) {
  const scene = createChartScene(definition, { width: 300, height: 200 })
  const point = scene.points[0]!
  const rect = flatten(scene.nodes).find(
    (node) => node.kind === 'rect' && node.key === point.key,
  )

  expect(rect?.kind).toBe('rect')
  if (rect?.kind !== 'rect') throw new Error('Expected bar rectangle')
  expect(point.hitRegion).toEqual({
    kind: 'rect',
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  })
  expect(point.focusAffinity).toBe(expectedAffinity)
}
