import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { barX, barY } from './bar'
import {
  findContainingScenePoint,
  nearestPoint,
  nearestScenePoint,
} from './nearest'
import { createChartScene, defineChart } from './scene'
import type {
  ChartFocusAffinity,
  ChartPoint,
  ChartScene,
  ChartValue,
  SceneNode,
  SceneRect,
  StaticChartDefinition,
} from './types'

describe('scene interaction geometry', () => {
  it('selects a containing rectangle before a closer interaction anchor', () => {
    const tall = point('tall', 100, 20)
    const neighbor = point('neighbor', 140, 170)
    const scene = testScene(
      [rect(tall, 90, 20, 20, 180), anchor(neighbor)],
      [tall, neighbor],
    )

    expect(nearestScenePoint(scene, 100, 170, 48)?.key).toBe('tall')
  })

  it('applies maximum distance from the rectangle boundary', () => {
    const bar = point('bar', 100, 20)
    const scene = testScene([rect(bar, 90, 20, 20, 180)], [bar])

    expect(nearestScenePoint(scene, 119, 100, 10)?.key).toBe('bar')
    expect(nearestScenePoint(scene, 121, 100, 10)).toBeNull()
  })

  it('uses paint order when scene primitives overlap', () => {
    const lower = point('lower', 100, 100)
    const upper = point('upper', 170, 170)
    const scene = testScene(
      [rect(lower, 80, 80, 100, 100), rect(upper, 80, 80, 100, 100)],
      [lower, upper],
    )

    expect(nearestScenePoint(scene, 100, 100, 48)?.key).toBe('upper')
    expect(findContainingScenePoint(scene, 100, 100)?.point?.key).toBe('upper')
  })

  it('does not treat axis-affinity fallback as painted containment', () => {
    const xAligned = point('x-aligned', 100, 20)
    const scene = testScene([rect(xAligned, 95, 15, 10, 10, 'x')], [xAligned])

    expect(findContainingScenePoint(scene, 100, 190)).toBeNull()
    expect(nearestScenePoint(scene, 100, 190, 0)?.key).toBe('x-aligned')
  })

  it('does not fall through a containing target without a semantic point', () => {
    const lower = point('lower', 100, 100)
    const empty = {
      ...rect(lower, 80, 80, 40, 40),
      key: 'empty',
      interaction: { points: [], affinity: 'xy' as const },
    }
    const scene = testScene([rect(lower, 80, 80, 40, 40), empty], [lower])

    expect(findContainingScenePoint(scene, 100, 100)).toEqual({ point: null })
    expect(nearestScenePoint(scene, 100, 100, 48)).toBeNull()
    expect(
      findContainingScenePoint(scene, 100, 100, scene.points.slice()),
    ).toEqual({ point: null })
    expect(
      nearestScenePoint(scene, 100, 100, 48, scene.points.slice()),
    ).toBeNull()
  })

  it('falls back along the primitive affinity after missing every shape', () => {
    const xAligned = point('x-aligned', 100, 20)
    const yAligned = point('y-aligned', 250, 170)
    const xScene = testScene([rect(xAligned, 95, 15, 10, 10, 'x')], [xAligned])
    const yScene = testScene(
      [rect(yAligned, 245, 165, 10, 10, 'y')],
      [yAligned],
    )

    expect(nearestScenePoint(xScene, 109, 190, 10)?.key).toBe('x-aligned')
    expect(nearestScenePoint(xScene, 116, 20, 10)).toBeNull()
    expect(nearestScenePoint(yScene, 20, 179, 10)?.key).toBe('y-aligned')
    expect(nearestScenePoint(yScene, 250, 186, 10)).toBeNull()
  })

  it('uses geometry to break x-affinity ties between stacked segments', () => {
    const bottom = point('bottom', 100, 100)
    const middle = point('middle', 100, 60)
    const top = point('top', 100, 20)
    const scene = testScene(
      [
        rect(bottom, 90, 100, 20, 100, 'x'),
        rect(middle, 90, 60, 20, 40, 'x'),
        rect(top, 90, 20, 20, 40, 'x'),
      ],
      [bottom, middle, top],
    )

    expect(nearestScenePoint(scene, 100, 10, 48)?.key).toBe('top')
    expect(nearestScenePoint(scene, 100, 210, 48)?.key).toBe('bottom')
  })

  it('uses geometry to break y-affinity ties between stacked segments', () => {
    const left = point('left', 20, 100)
    const middle = point('middle', 60, 100)
    const right = point('right', 100, 100)
    const scene = testScene(
      [
        rect(left, 20, 90, 40, 20, 'y'),
        rect(middle, 60, 90, 40, 20, 'y'),
        rect(right, 100, 90, 100, 20, 'y'),
      ],
      [left, middle, right],
    )

    expect(nearestScenePoint(scene, 10, 100, 48)?.key).toBe('left')
    expect(nearestScenePoint(scene, 210, 100, 48)?.key).toBe('right')
  })

  it('requires containment for geometry-only areas', () => {
    const region = point('region', 100, 100)
    const scene = testScene(
      [
        {
          kind: 'area',
          key: region.key,
          points: [
            [80, 80],
            [120, 80],
            [100, 130],
          ],
          interaction: { point: region, affinity: 'geometry' },
        },
      ],
      [region],
    )

    expect(nearestScenePoint(scene, 100, 100, 48)?.key).toBe('region')
    expect(nearestScenePoint(scene, 125, 100, 48)).toBeNull()
  })

  it('uses disconnected polygon exteriors and excludes their holes', () => {
    const region = point('region', 20, 20)
    const scene = testScene(
      [
        {
          kind: 'area',
          key: region.key,
          points: [
            [200, 200],
            [210, 200],
            [200, 210],
          ],
          path: 'M200,200L210,200L200,210Z',
          polygons: [
            [
              [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
              ],
              [
                [30, 30],
                [70, 30],
                [70, 70],
                [30, 70],
              ],
            ],
            [
              [
                [140, 10],
                [180, 10],
                [180, 50],
                [140, 50],
              ],
            ],
          ],
          interaction: { point: region, affinity: 'geometry' },
        },
      ],
      [region],
    )

    expect(nearestScenePoint(scene, 20, 20, 0)?.key).toBe('region')
    expect(nearestScenePoint(scene, 160, 30, 0)?.key).toBe('region')
    expect(nearestScenePoint(scene, 50, 50, 48)).toBeNull()
    expect(nearestScenePoint(scene, 202, 202, 48)).toBeNull()
  })

  it('measures area fallback distance from every polygon ring', () => {
    const region = point('region', 20, 20)
    const scene = testScene(
      [
        {
          kind: 'area',
          key: region.key,
          points: [],
          polygons: [
            [
              [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
              ],
              [
                [30, 30],
                [70, 30],
                [70, 70],
                [30, 70],
              ],
            ],
          ],
          interaction: { point: region },
        },
      ],
      [region],
    )

    expect(nearestScenePoint(scene, 50, 68, 2)?.key).toBe('region')
    expect(nearestScenePoint(scene, 50, 67, 2)).toBeNull()
    expect(nearestScenePoint(scene, 102, 50, 2)?.key).toBe('region')
    expect(nearestScenePoint(scene, 103, 50, 2)).toBeNull()
  })

  it('uses the rendered circle radius', () => {
    const bubble = point('bubble', 100, 100)
    const neighbor = point('neighbor', 137, 100)
    const scene = testScene(
      [
        {
          kind: 'dot',
          key: bubble.key,
          x: 100,
          y: 100,
          radius: 40,
          interaction: { point: bubble, affinity: 'xy' },
        },
        anchor(neighbor),
      ],
      [bubble, neighbor],
    )

    expect(nearestScenePoint(scene, 135, 100, 48)?.key).toBe('bubble')
  })

  it('uses rendered stroke width for rules and polylines', () => {
    const rulePoint = point('rule', 100, 100)
    const linePoint = point('line', 100, 150)
    const ruleScene = testScene(
      [
        {
          kind: 'rule',
          key: rulePoint.key,
          x1: 50,
          y1: 100,
          x2: 150,
          y2: 100,
          interaction: { point: rulePoint, affinity: 'geometry' },
          style: { strokeWidth: 10 },
        },
      ],
      [rulePoint],
    )
    const lineScene = testScene(
      [
        {
          kind: 'polyline',
          key: linePoint.key,
          points: [
            [50, 150],
            [150, 150],
          ],
          interaction: { point: linePoint, affinity: 'geometry' },
          style: { strokeWidth: 6 },
        },
      ],
      [linePoint],
    )

    expect(nearestScenePoint(ruleScene, 100, 105, 0)?.key).toBe('rule')
    expect(nearestScenePoint(ruleScene, 100, 106, 48)).toBeNull()
    expect(nearestScenePoint(lineScene, 100, 153, 0)?.key).toBe('line')
    expect(nearestScenePoint(lineScene, 100, 154, 48)).toBeNull()
  })

  it('keeps one-point polylines selectable', () => {
    const linePoint = point('line', 100, 100)
    const scene = testScene(
      [
        {
          kind: 'polyline',
          key: linePoint.key,
          points: [[100, 100]],
          interaction: { point: linePoint, affinity: 'geometry' },
        },
      ],
      [linePoint],
    )

    expect(nearestScenePoint(scene, 100, 100, 0)?.key).toBe('line')
    expect(nearestScenePoint(scene, 102, 100, 0)).toBeNull()
  })

  it('respects rounded corners from the rendered rectangle', () => {
    const rounded = point('rounded', 100, 100)
    const scene = testScene(
      [
        {
          ...rect(rounded, 80, 80, 40, 40, 'geometry'),
          radius: 20,
        },
      ],
      [rounded],
    )

    expect(nearestScenePoint(scene, 82, 82, 48)).toBeNull()
    expect(nearestScenePoint(scene, 100, 82, 48)?.key).toBe('rounded')
  })

  it('measures rounded-rectangle fallback from the curved boundary', () => {
    const rounded = point('rounded', 100, 100)
    const scene = testScene(
      [
        {
          ...rect(rounded, 80, 80, 40, 40),
          radius: 20,
        },
      ],
      [rounded],
    )

    expect(nearestScenePoint(scene, 82, 82, 5)).toBeNull()
    expect(nearestScenePoint(scene, 82, 82, 6)?.key).toBe('rounded')
  })

  it('accumulates group translations before hit testing', () => {
    const translated = point('translated', 150, 120)
    const scene = testScene(
      [
        {
          kind: 'group',
          key: 'facet',
          translateX: 100,
          translateY: 70,
          children: [rect(translated, 40, 40, 20, 20)],
        },
      ],
      [translated],
    )

    expect(nearestScenePoint(scene, 150, 120, 1)?.key).toBe('translated')
    expect(nearestScenePoint(scene, 50, 50, 1)).toBeNull()
  })

  it('rejects geometry outside the effective scene clip', () => {
    const clipped = point('clipped', 100, 100)
    const hidden = point('hidden', 60, 60)
    const scene = testScene(
      [
        {
          kind: 'group',
          key: 'clipped-group',
          clip: { x: 80, y: 80, width: 40, height: 40 },
          children: [
            rect(clipped, 40, 40, 120, 120, 'geometry'),
            rect(hidden, 50, 50, 20, 20),
          ],
        },
      ],
      [clipped, hidden],
    )

    expect(nearestScenePoint(scene, 100, 100, 48)?.key).toBe('clipped')
    expect(nearestScenePoint(scene, 60, 60, 1)).toBeNull()
  })

  it('does not revive a fully clipped primitive through its point anchor', () => {
    const hidden = point('hidden', 60, 60)
    const scene = testScene(
      [
        {
          kind: 'group',
          key: 'fully-clipped-group',
          clip: { x: 80, y: 80, width: 40, height: 40 },
          children: [rect(hidden, 50, 50, 20, 20)],
        },
      ],
      [hidden],
    )

    expect(nearestScenePoint(scene, 60, 60, 1)).toBeNull()
  })

  it('preserves point-distance behavior for unattached semantic points', () => {
    const anchorPoint = point('anchor', 100, 20)

    expect(nearestPoint([anchorPoint], 100, 29, 10)?.key).toBe('anchor')
    expect(nearestPoint([anchorPoint], 100, 31, 10)).toBeNull()
  })

  it('preserves the first point when anchor distances tie', () => {
    const first = point('first', 90, 100)
    const second = point('second', 110, 100)

    expect(nearestPoint([first, second], 100, 100, 10)?.key).toBe('first')
  })

  it('supports reversed rectangle bounds', () => {
    const bar = point('bar', 100, 20)
    const scene = testScene([rect(bar, 110, 200, -20, -180)], [bar])

    expect(nearestScenePoint(scene, 119, 100, 10)?.key).toBe('bar')
    expect(nearestScenePoint(scene, 121, 100, 10)).toBeNull()
  })

  it('attaches vertical bars to their rendered primitive', () => {
    expectBarUsesScenePrimitive(
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

  it('attaches horizontal bars to their rendered primitive', () => {
    expectBarUsesScenePrimitive(
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

function point(key: string, x: number, y: number): ChartPoint {
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
    color: 'currentColor',
  }
}

function rect(
  target: ChartPoint,
  x: number,
  y: number,
  width: number,
  height: number,
  affinity: ChartFocusAffinity = 'xy',
): SceneRect {
  return {
    kind: 'rect',
    key: target.key,
    x,
    y,
    width,
    height,
    interaction: { point: target, affinity },
  }
}

function anchor(target: ChartPoint): SceneNode {
  return {
    kind: 'label',
    key: target.key,
    x: target.x,
    y: target.y,
    text: target.key,
  }
}

function testScene(nodes: readonly SceneNode[], points: readonly ChartPoint[]) {
  return { nodes, points } as ChartScene
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function expectBarUsesScenePrimitive<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  expectedAffinity: ChartFocusAffinity,
) {
  const scene = createChartScene(definition, { width: 300, height: 200 })
  const point = scene.points[0]!
  const rectNode = flatten(scene.nodes).find(
    (node) => node.kind === 'rect' && node.key === point.key,
  )

  expect(rectNode?.kind).toBe('rect')
  if (rectNode?.kind !== 'rect') throw new Error('Expected bar rectangle')
  expect(rectNode.interaction?.point).toBe(point)
  expect(rectNode.interaction?.affinity).toBe(expectedAffinity)
}
