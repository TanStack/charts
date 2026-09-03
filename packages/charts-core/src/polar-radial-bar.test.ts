import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, scaleLinear, scalePoint } from 'd3-scale'
import { arc, pointRadial } from 'd3-shape'
import { nearestScenePoint } from './nearest'
import {
  polar,
  radialBarAngle,
  radialBarRadius,
  type PolarMark,
  type PolarRadiusOptions,
  type RadialBarAngleOptions,
  type RadialBarRadiusOptions,
} from './polar'
import { createChartScene, defineChart } from './scene'
import type { ChartDefinition, SceneArea, SceneNode } from './types'

interface Row {
  id: string
  category: string
  value: number
  low: number
}

const rows: readonly Row[] = [
  { id: 'a', category: 'A', value: 4, low: 1 },
  { id: 'b', category: 'B', value: 8, low: 2 },
]

describe('polar radial bars', () => {
  it('maps categorical angles and quantitative radii through responsive ranges', () => {
    const sourceAngle = scaleBand<string>()
      .domain(rows.map((row) => row.category))
      .range([7, 9])
    const sourceRadius = scaleLinear().domain([0, 8]).range([7, 9])
    const definition = defineChart({
      scales: { x: null, y: null },
      marks: [
        polar({
          radiusRatio: 0.8,
          scales: {
            angle: { scale: sourceAngle },
            radius: {
              scale: sourceRadius,
              range: [({ radius }) => radius * 0.25, ({ radius }) => radius],
            },
          },
          marks: [
            radialBarRadius(rows, {
              id: 'radius-bars',
              angle: 'category',
              radius: 'value',
              key: 'id',
              color: 'category',
            }),
          ],
        }),
      ],
      margin: 0,
    })
    const scene = createChartScene(definition, { width: 200, height: 200 })
    const areas = areaNodes(scene.nodes)
    const expectedPath = arc()({
      startAngle: 0,
      endAngle: Math.PI,
      innerRadius: 0,
      outerRadius: 50,
    })
    const endpoint = pointRadial(Math.PI / 2, 50)

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<Row, string, number>
    >()
    expect(sourceAngle.range()).toEqual([7, 9])
    expect(sourceRadius.range()).toEqual([7, 9])
    expect(areas).toHaveLength(2)
    expect(areas[0]?.path).toBe(expectedPath)
    expect(areas[0]?.interaction?.point).toBe(scene.points[0])
    expect(scene.points[0]).toMatchObject({
      key: 'radius-bars:object:null:string:1:a',
      xValue: 'A',
      yValue: 4,
      y1Value: 0,
      y2Value: 4,
      yInterval: 'difference',
      x: 100 + endpoint[0],
      y: 100 + endpoint[1],
    })
    expect(nearestScenePoint(scene, 125, 100, 0)?.datum).toBe(rows[0])
    expect(
      flatten(scene.nodes).some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__arc') &&
          node.className?.includes('ts-chart__bar') &&
          node.className.includes('ts-chart__radial-bar-radius'),
      ),
    ).toBe(true)
  })

  it('maps explicit radial baselines through the configured radius range', () => {
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleBand<string>().domain(['A', 'B']) },
              radius: {
                scale: scaleLinear().domain([0, 8]),
                range: [({ radius }) => radius * 0.25, ({ radius }) => radius],
              },
            },
            marks: [
              radialBarRadius(rows, {
                angle: 'category',
                radius: 'value',
                radius1: 'low',
                key: 'id',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const expected = arc()({
      startAngle: 0,
      endAngle: Math.PI,
      innerRadius: 34.375,
      outerRadius: 62.5,
    })

    expect(areaNodes(scene.nodes)[0]?.path).toBe(expected)
    expect(scene.points[0]).toMatchObject({
      yValue: 4,
      y1Value: 1,
      y2Value: 4,
    })
  })

  it('maps signed radius intervals when semantic zero is explicit', () => {
    const datum = { id: 'negative', category: 'A', value: -4 }
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleBand<string>().domain(['A']) },
              radius: {
                scale: scaleLinear().domain([-8, 8]),
                range: [20, 100],
              },
            },
            marks: [
              radialBarRadius([datum], {
                angle: 'category',
                radius: 'value',
                radius1: 0,
                key: 'id',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )

    expect(areaNodes(scene.nodes)[0]?.path).toBe(
      arc()({
        startAngle: 0,
        endAngle: Math.PI * 2,
        innerRadius: 60,
        outerRadius: 40,
      }),
    )
    expect(scene.points[0]).toMatchObject({
      yValue: -4,
      y1Value: 0,
      y2Value: -4,
      x: 100,
      y: 140,
    })
  })

  it('maps quantitative angles and categorical radius bands', () => {
    const radiusScale = scaleBand<string>()
      .domain(rows.map((row) => row.category))
      .paddingInner(0.38)
      .paddingOuter(0.19)
    const definition = defineChart({
      scales: { x: null, y: null },
      marks: [
        polar({
          scales: {
            angle: { scale: scaleLinear().domain([0, 8]) },
            radius: {
              scale: radiusScale,
              range: [({ radius }) => radius * 0.2, ({ radius }) => radius],
            },
          },
          marks: [
            radialBarAngle(rows, {
              id: 'angle-bars',
              angle: 'value',
              radius: 'category',
              key: 'id',
              color: 'category',
              cornerRadius: 'full',
            }),
          ],
        }),
      ],
      margin: 0,
    })
    const scene = createChartScene(definition, { width: 200, height: 200 })
    const resolvedRadius = radiusScale.copy().range([20, 100])
    const innerRadius = resolvedRadius('A')!
    const outerRadius = innerRadius + resolvedRadius.bandwidth()
    const expectedPath = arc().cornerRadius((outerRadius - innerRadius) / 2)({
      startAngle: 0,
      endAngle: Math.PI,
      innerRadius,
      outerRadius,
    })
    const endpoint = pointRadial(Math.PI, (innerRadius + outerRadius) / 2)
    const areas = areaNodes(scene.nodes)

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<Row, number, string>
    >()
    expect(areas[0]?.path).toBe(expectedPath)
    expect(areas[0]?.interaction?.point).toBe(scene.points[0])
    expect(scene.points[0]).toMatchObject({
      key: 'angle-bars:object:null:string:1:a',
      xValue: 4,
      yValue: 'A',
      x1Value: 0,
      x2Value: 4,
      xInterval: 'difference',
      x: 100 + endpoint[0],
      y: 100 + endpoint[1],
    })
    const inside = pointRadial(Math.PI / 2, (innerRadius + outerRadius) / 2)
    expect(
      nearestScenePoint(scene, 100 + inside[0], 100 + inside[1], 0)?.datum,
    ).toBe(rows[0])
    expect(
      flatten(scene.nodes).some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__arc') &&
          node.className?.includes('ts-chart__bar') &&
          node.className.includes('ts-chart__radial-bar-angle'),
      ),
    ).toBe(true)
  })

  it('maps explicit angular intervals and keeps visual callbacks paint-only', () => {
    let fills = 0
    const data = [
      { id: 'valid', ring: 'A', start: 2, end: 6 },
      { id: 'invalid', ring: 'B', start: 1, end: Number.NaN },
    ]
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleLinear().domain([0, 8]) },
              radius: {
                scale: scaleBand<string>().domain(['A', 'B']),
                range: [20, 100],
              },
            },
            marks: [
              radialBarAngle(data, {
                angle1: 'start',
                angle2: 'end',
                radius: 'ring',
                key: 'id',
                fill: () => {
                  fills += 1
                  return '#2563eb'
                },
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )

    expect(scene.points).toHaveLength(1)
    expect(fills).toBe(1)
    expect(scene.points[0]).toMatchObject({
      xValue: 6,
      x1Value: 2,
      x2Value: 6,
    })
  })

  it('uses the paint-derived rounded sector boundary for geometry focus', () => {
    const datum = { id: 'rounded', ring: 'A', value: 1 }
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleLinear().domain([0, 4]) },
              radius: {
                scale: scaleBand<string>().domain(['A']),
                range: [20, 40],
              },
            },
            marks: [
              radialBarAngle([datum], {
                angle: 'value',
                radius: 'ring',
                key: 'id',
                cornerRadius: 'full',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )

    // The unrounded sector contains this point, but the painted 10px corner
    // cuts it away.
    expect(nearestScenePoint(scene, 100.25, 60.25, 0)).toBeNull()
    expect(nearestScenePoint(scene, 120, 80, 0)?.datum).toBe(datum)
  })

  it('traces reversed angular intervals in their painted direction', () => {
    const datum = { id: 'reversed-angle', ring: 'A', start: 3, end: 1 }
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleLinear().domain([0, 4]) },
              radius: {
                scale: scaleBand<string>().domain(['A']),
                range: [20, 40],
              },
            },
            marks: [
              radialBarAngle([datum], {
                angle1: 'start',
                angle2: 'end',
                radius: 'ring',
                key: 'id',
                cornerRadius: 'full',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const expected = arc().cornerRadius(10)({
      startAngle: (Math.PI * 3) / 2,
      endAngle: Math.PI / 2,
      innerRadius: 20,
      outerRadius: 40,
    })

    expect(areaNodes(scene.nodes)[0]?.path).toBe(expected)
    expect(nearestScenePoint(scene, 100, 130, 0)?.datum).toBe(datum)
    expect(nearestScenePoint(scene, 100, 70, 0)).toBeNull()
  })

  it('requires positive categorical bandwidth and finite radius ranges', () => {
    expect(() =>
      createChartScene(
        defineChart({
          scales: { x: null, y: null },
          marks: [
            polar({
              scales: {
                angle: { scale: scalePoint<string>().domain(['A', 'B']) },
                radius: { scale: scaleLinear().domain([0, 8]) },
              },
              marks: [
                radialBarRadius(rows, {
                  angle: 'category',
                  radius: 'value',
                }),
              ],
            }),
          ],
        }),
        { width: 200, height: 200 },
      ),
    ).toThrow('requires positive angle-scale bandwidth')

    expect(() =>
      createChartScene(
        defineChart({
          scales: { x: null, y: null },
          marks: [
            polar({
              scales: {
                angle: { scale: scaleLinear().domain([0, 8]) },
                radius: { scale: scaleLinear().domain([0, 1]) },
              },
              marks: [
                radialBarAngle(
                  rows.map((row, index) => ({ ...row, ring: index })),
                  { angle: 'value', radius: 'ring' },
                ),
              ],
            }),
          ],
        }),
        { width: 200, height: 200 },
      ),
    ).toThrow('requires positive radius-scale bandwidth')

    expect(() =>
      createChartScene(
        defineChart({
          scales: { x: null, y: null },
          marks: [
            polar({
              scales: {
                angle: { scale: scaleBand<string>().domain(['A', 'B']) },
                radius: {
                  scale: scaleLinear().domain([0, 8]),
                  range: [Number.NaN, 100],
                },
              },
              marks: [
                radialBarRadius(rows, {
                  angle: 'category',
                  radius: 'value',
                }),
              ],
            }),
          ],
        }),
        { width: 200, height: 200 },
      ),
    ).toThrow('range endpoints must be nonnegative finite pixel lengths')

    expect(() =>
      createChartScene(
        defineChart({
          scales: { x: null, y: null },
          marks: [
            polar({
              scales: {
                angle: { scale: scaleBand<string>().domain(['A', 'B']) },
                radius: {
                  scale: scaleLinear().domain([0, 8]),
                  range: [] as unknown as [number, number],
                },
              },
              marks: [
                radialBarRadius(rows, {
                  angle: 'category',
                  radius: 'value',
                }),
              ],
            }),
          ],
        }),
        { width: 200, height: 200 },
      ),
    ).toThrow('range must contain exactly two endpoints')
  })

  it('re-resolves responsive ranges without mutating the source scale', () => {
    const radius = scaleLinear().domain([0, 8]).range([11, 13])
    const definition = defineChart({
      scales: { x: null, y: null },
      marks: [
        polar({
          radiusRatio: 0.8,
          scales: {
            angle: { scale: scaleBand<string>().domain(['A', 'B']) },
            radius: {
              scale: radius,
              range: [
                ({ radius: resolved }) => resolved * 0.25,
                ({ radius: resolved }) => resolved,
              ],
            },
          },
          marks: [
            radialBarRadius(rows, {
              angle: 'category',
              radius: 'value',
            }),
          ],
        }),
      ],
      margin: 0,
    })
    const small = createChartScene(definition, { width: 100, height: 100 })
    const large = createChartScene(definition, { width: 200, height: 200 })

    expect(radius.range()).toEqual([11, 13])
    expect(distanceFromCenter(small.points[1]!, 50, 50)).toBeCloseTo(40)
    expect(distanceFromCenter(large.points[1]!, 100, 100)).toBeCloseTo(80)
  })

  it('traces a full annulus with reversed radius range and endpoints', () => {
    const datum = { id: 'reversed', category: 'A', value: 6, low: 2 }
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleBand<string>().domain(['A']) },
              radius: {
                scale: scaleLinear().domain([0, 8]),
                range: [100, 20],
              },
            },
            marks: [
              radialBarRadius([datum], {
                angle: 'category',
                radius: 'value',
                radius1: 'low',
                key: 'id',
                cornerRadius: 'full',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const area = areaNodes(scene.nodes)[0]
    const expected = arc().cornerRadius(20)({
      startAngle: 0,
      endAngle: Math.PI * 2,
      innerRadius: 80,
      outerRadius: 40,
    })

    expect(area?.path).toBe(expected)
    expect(scene.points[0]).toMatchObject({
      y1Value: 2,
      y2Value: 6,
      x: 100,
      y: 140,
    })
    expect(nearestScenePoint(scene, 100, 100, 0)).toBeNull()
    expect(nearestScenePoint(scene, 160, 100, 0)?.datum).toBe(datum)
  })
})

function distanceFromCenter(
  point: { x: number; y: number },
  centerX: number,
  centerY: number,
) {
  return Math.hypot(point.x - centerX, point.y - centerY)
}

function areaNodes(nodes: readonly SceneNode[]): SceneArea[] {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' && !node.focus
      ? [node, ...flatten(node.children)]
      : [node],
  )
}

if (false) {
  const radiusOptions = {
    angle: 'category',
    radius: 'value',
    radius1: 'low',
    cornerRadius: 'full',
  } as const satisfies RadialBarRadiusOptions<Row>
  const angleOptions = {
    angle: 'value',
    radius: 'category',
    angle1: 0,
  } as const satisfies RadialBarAngleOptions<Row>
  const polarRadiusOptions: PolarRadiusOptions<number> = {
    scale: scaleLinear(),
    range: [0, ({ radius }) => radius * 0.8],
  }
  const radiusMark: PolarMark<Row, string, number> = radialBarRadius(
    rows,
    radiusOptions,
  )
  const angleMark: PolarMark<Row, number, string> = radialBarAngle(
    rows,
    angleOptions,
  )
  void [polarRadiusOptions, radiusMark, angleMark]

  radialBarRadius([{ category: 'A', label: 'not numeric' }], {
    angle: 'category',
    // @ts-expect-error Radial bar radius values must be numeric or nullish.
    radius: 'label',
  })
  radialBarAngle([{ category: true, value: 1 }], {
    angle: 'value',
    // @ts-expect-error Radial bar radius categories must be chart values.
    radius: 'category',
  })
  radialBarAngle(rows, {
    angle: 'value',
    radius: 'category',
    // @ts-expect-error Full is the only named corner-radius mode.
    cornerRadius: 'rounded',
  })
}
