import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from 'd3-scale'
import { arc, areaRadial, curveLinearClosed, lineRadial, pie } from 'd3-shape'
import * as rootExports from './index'
import {
  angleGrid,
  polar,
  radialArc,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
  radialRule,
  radialText,
} from './polar'
import { createChartScene, defineChart } from './scene'
import type { ChartDefinition, SceneNode } from './types'

interface Slice {
  id: string
  label: string
  value: number
}

const slices: readonly Slice[] = [
  { id: 'errors', label: 'Errors', value: 7 },
  { id: 'warnings', label: 'Warnings', value: 3 },
]

describe('polar marks', () => {
  it('renders responsive D3 arcs and emits centroid interaction points', () => {
    const arcs = pie<Slice>()
      .sort(null)
      .value((row) => row.value)([...slices])
    const definition = defineChart({
      marks: [
        polar({
          radiusRatio: 0.8,
          marks: [
            radialArc(arcs, {
              z: (slice) => slice.data.label,
              innerRadius: ({ radius }) => radius * 0.55,
              outerRadius: ({ radius }) => radius,
              cornerRadius: 4,
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    const small = createChartScene(definition, {
      width: 200,
      height: 160,
    })
    const large = createChartScene(definition, {
      width: 400,
      height: 320,
    })
    const smallPaths = flatten(small.nodes).filter(
      (node) => node.kind === 'area',
    )
    const largePaths = flatten(large.nodes).filter(
      (node) => node.kind === 'area',
    )
    const expectedRadius = 64
    const expectedGenerator = arc<(typeof arcs)[number]>()
      .innerRadius(expectedRadius * 0.55)
      .outerRadius(expectedRadius)
      .cornerRadius(4)

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<(typeof arcs)[number], number, number>
    >()
    expect(smallPaths[0]).toMatchObject({
      kind: 'area',
      path: expectedGenerator(arcs[0]),
    })
    expect(largePaths[0]?.kind === 'area' ? largePaths[0].path : '').not.toBe(
      smallPaths[0]?.kind === 'area' ? smallPaths[0].path : '',
    )
    const centroid = expectedGenerator.centroid(arcs[0])
    expect(small.points[0]).toMatchObject({
      key: 'polar-0:arc-0:string:Errors:string:errors',
      x: 100 + centroid[0],
      y: 80 + centroid[1],
      datum: arcs[0],
    })
  })

  it('colors radial paths independently from their z groups', () => {
    const data = [
      { id: 'a:0', series: 'Alpha', color: 'Warm', angle: 0, radius: 1 },
      { id: 'a:1', series: 'Alpha', color: 'Warm', angle: 1, radius: 2 },
      { id: 'b:0', series: 'Beta', color: 'Cool', angle: 0, radius: 2 },
      { id: 'b:1', series: 'Beta', color: 'Cool', angle: 1, radius: 1 },
    ]
    const colors = scaleOrdinal<string, string>()
      .domain(['Warm', 'Cool'])
      .range(['#dc2626', '#2563eb'])
    const scene = createChartScene(
      defineChart({
        marks: [
          polar({
            angle: { scale: scaleLinear().domain([0, 1]) },
            radius: { scale: scaleLinear().domain([0, 2]) },
            marks: [
              radialLine(data, {
                angle: 'angle',
                radius: 'radius',
                z: 'series',
                color: 'color',
                key: 'id',
              }),
            ],
          }),
        ],
        x: null,
        y: null,
        guides: false,
        color: { scale: colors },
      }),
      { width: 200, height: 200 },
    )
    const paths = flatten(scene.nodes).filter(
      (node) => node.kind === 'polyline',
    )

    expect(scene.colors.domain).toEqual(['Warm', 'Cool'])
    expect(scene.points.map((point) => point.group)).toEqual([
      'Alpha',
      'Alpha',
      'Beta',
      'Beta',
    ])
    expect(scene.points.map((point) => point.color)).toEqual([
      '#dc2626',
      '#dc2626',
      '#2563eb',
      '#2563eb',
    ])
    expect(
      paths.map((node) =>
        node.kind === 'polyline' ? node.style?.stroke : undefined,
      ),
    ).toEqual(['#dc2626', '#2563eb'])
  })

  it('uses color as the radial path group when z is omitted', () => {
    const data = [
      { id: 'a:0', series: 'Alpha', angle: 0, radius: 1 },
      { id: 'b:0', series: 'Beta', angle: 0, radius: 2 },
      { id: 'a:1', series: 'Alpha', angle: 1, radius: 2 },
      { id: 'b:1', series: 'Beta', angle: 1, radius: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          polar({
            angle: { scale: scaleLinear().domain([0, 1]) },
            radius: { scale: scaleLinear().domain([0, 2]) },
            marks: [
              radialLine(data, {
                angle: 'angle',
                radius: 'radius',
                color: 'series',
              }),
              radialArea(data, {
                angle: 'angle',
                radius: 'radius',
                color: 'series',
              }),
            ],
          }),
        ],
        x: null,
        y: null,
        guides: false,
        color: {
          scale: scaleOrdinal<string, string>()
            .domain(['Alpha', 'Beta'])
            .range(['#dc2626', '#2563eb']),
        },
      }),
      { width: 200, height: 200 },
    )
    const nodes = flatten(scene.nodes)

    expect(nodes.filter((node) => node.kind === 'polyline')).toHaveLength(2)
    expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(2)
    expect(scene.points.map((point) => point.group)).toEqual([
      'Alpha',
      'Alpha',
      'Beta',
      'Beta',
      'Alpha',
      'Alpha',
      'Beta',
      'Beta',
    ])
    expect(scene.points.map((point) => point.color)).toEqual([
      '#dc2626',
      '#dc2626',
      '#2563eb',
      '#2563eb',
      '#dc2626',
      '#dc2626',
      '#2563eb',
      '#2563eb',
    ])
  })

  it('copies D3 scales into final bounds for radial paths, dots, and guides', () => {
    const data = [
      { metric: 'Latency', score: 70 },
      { metric: 'Errors', score: 45 },
      { metric: 'Traffic', score: 90 },
    ]
    const angle = scaleBand<string>()
      .domain(data.map((row) => row.metric))
      .range([8, 9])
    const radius = scaleLinear().domain([0, 100]).range([8, 9])
    const definition = defineChart({
      marks: [
        polar({
          radiusRatio: 0.8,
          angle: { scale: angle },
          radius: { scale: radius },
          guides: [
            radialGrid({
              values: [50, 100],
              shape: 'polygon',
              labels: true,
            }),
            angleGrid(),
          ],
          marks: [
            radialArea(data, {
              angle: 'metric',
              radius: 'score',
              key: 'metric',
              curve: curveLinearClosed,
              className: 'ts-chart__radar',
            }),
            radialLine(data, {
              angle: 'metric',
              radius: 'score',
              curve: curveLinearClosed,
            }),
            radialDot(data, {
              angle: 'metric',
              radius: 'score',
              r: 3,
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    const scene = createChartScene(definition, {
      width: 300,
      height: 200,
    })
    const nodes = flatten(scene.nodes)
    const resolvedAngle = angle.copy().range([0, Math.PI * 2])
    const resolvedRadius = radius.copy().range([0, 80])
    const pathRows = data.map((row) => ({
      angle:
        (resolvedAngle(row.metric) ?? Number.NaN) +
        resolvedAngle.bandwidth() / 2,
      radius: resolvedRadius(row.score),
    }))
    const expectedArea = areaRadial<(typeof pathRows)[number]>()
      .angle((row) => row.angle)
      .innerRadius(0)
      .outerRadius((row) => row.radius)
      .curve(curveLinearClosed)(pathRows)
    const expectedLine = lineRadial<(typeof pathRows)[number]>()
      .angle((row) => row.angle)
      .radius((row) => row.radius)
      .curve(curveLinearClosed)(pathRows)

    expect(angle.range()).toEqual([8, 9])
    expect(radius.range()).toEqual([8, 9])
    expect(
      nodes.some((node) => node.className?.includes('ts-chart__radar')),
    ).toBe(true)
    expect(
      nodes.some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__radial-dot') &&
          node.className.includes('ts-chart__dot'),
      ),
    ).toBe(true)
    expect(
      nodes.some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__radial-line') &&
          node.className.includes('ts-chart__line'),
      ),
    ).toBe(true)
    expect(
      nodes.find((node) => node.kind === 'area' && node.path === expectedArea),
    ).toBeDefined()
    expect(
      nodes.find(
        (node) => node.kind === 'polyline' && node.path === expectedLine,
      ),
    ).toBeDefined()
    expect(nodes.filter((node) => node.kind === 'dot')).toHaveLength(3)
    expect(nodes.filter((node) => node.kind === 'label')).toHaveLength(5)
    expect(
      nodes.filter((node) => node.kind === 'polyline').length,
    ).toBeGreaterThanOrEqual(3)
    expect(scene.points).toHaveLength(9)
    expect(
      Math.max(...scene.points.map((point) => point.x)),
    ).toBeLessThanOrEqual(230)
    const polarGroup = nodes.find(
      (node) =>
        node.kind === 'group' && node.className?.includes('ts-chart__polar'),
    )
    expect(polarGroup?.kind).toBe('group')
    if (polarGroup?.kind === 'group') {
      const childClasses = polarGroup.children.map(
        (node) => node.className ?? '',
      )
      const profileIndex = childClasses.findIndex((className) =>
        className.includes('ts-chart__radar'),
      )
      expect(childClasses.indexOf('ts-chart__radial-grid')).toBeLessThan(
        profileIndex,
      )
      expect(childClasses.lastIndexOf('ts-chart__text')).toBeGreaterThan(
        profileIndex,
      )
    }
  })

  it('renders data-bound radial text and one radial rule per datum', () => {
    const angle = scaleLinear().domain([0, 100]).range([8, 9])
    const radius = scaleLinear().domain([0, 1]).range([8, 9])
    const labels = [
      { id: 'low', value: 25, radius: 0.75, label: 'Low' },
      { id: 'high', value: 75, radius: 0.75, label: 'High' },
    ]
    const ticks = [
      { id: 'start', value: 0, inner: 0.82, outer: 1 },
      { id: 'end', value: 100, inner: 0.82, outer: 1 },
    ]
    const definition = defineChart({
      marks: [
        polar({
          startAngle: -Math.PI / 2,
          endAngle: Math.PI / 2,
          angle: { scale: angle },
          radius: { scale: radius },
          marks: [
            radialRule(ticks, {
              angle: 'value',
              radius1: 'inner',
              radius2: 'outer',
              key: 'id',
              stroke: '#475569',
              strokeWidth: 2,
            }),
            radialText(labels, {
              angle: 'value',
              radius: 'radius',
              key: 'id',
              text: 'label',
              fill: '#0f172a',
              fontSize: 12,
              fontWeight: 600,
              anchor: ({ value }) => (value < 50 ? 'end' : 'start'),
              dx: ({ value }) => (value < 50 ? -3 : 3),
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    const scene = createChartScene(definition, {
      width: 200,
      height: 200,
    })
    const nodes = flatten(scene.nodes)
    const rules = nodes.filter((node) => node.kind === 'rule')
    const text = nodes.filter((node) => node.kind === 'label')
    const radialRuleGroup = nodes.find(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__radial-rule'),
    )
    const radialTextGroup = nodes.find(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__radial-text'),
    )

    expect(angle.range()).toEqual([8, 9])
    expect(radius.range()).toEqual([8, 9])
    expect(radialRuleGroup?.className).toContain('ts-chart__rule')
    expect(radialTextGroup?.className).toContain('ts-chart__text')
    expect(rules).toHaveLength(2)
    expect(rules[0]).toMatchObject({
      kind: 'rule',
      x1: expect.closeTo(-82, 6),
      y1: expect.closeTo(0, 6),
      x2: expect.closeTo(-100, 6),
      y2: expect.closeTo(0, 6),
      style: {
        stroke: '#475569',
        strokeWidth: 2,
        lineCap: 'round',
      },
    })
    expect(text).toHaveLength(2)
    expect(text[0]).toMatchObject({
      kind: 'label',
      text: 'Low',
      anchor: 'end',
      x: expect.closeTo(-56.033, 3),
      y: expect.closeTo(-53.033, 3),
      fontSize: 12,
      fontWeight: 600,
      style: { fill: '#0f172a' },
    })
    expect(scene.points).toHaveLength(2)
    expect(scene.points[0]).toMatchObject({
      datum: labels[0],
      xValue: 25,
      yValue: 0.75,
      x: expect.closeTo(43.967, 3),
      y: expect.closeTo(46.967, 3),
    })
  })

  it('requires polar scales only for scale-backed marks', () => {
    const arcOnly = defineChart({
      marks: [
        polar({
          marks: [radialArc([{ startAngle: 0, endAngle: Math.PI }])],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    expect(() =>
      createChartScene(arcOnly, { width: 200, height: 200 }),
    ).not.toThrow()

    const missingScale = defineChart({
      marks: [polar({ marks: [radialLine([1, 2, 3])] })],
      x: null,
      y: null,
      guides: false,
    })
    expect(() =>
      createChartScene(missingScale, { width: 200, height: 200 }),
    ).toThrow(/angle scale/)

    const missingPolygonAngle = defineChart({
      marks: [
        polar({
          radius: { scale: scaleLinear().domain([0, 1]) },
          guides: [radialGrid({ values: [1], shape: 'polygon' })],
          marks: [],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    expect(() =>
      createChartScene(missingPolygonAngle, {
        width: 200,
        height: 200,
      }),
    ).toThrow(/requires a configured angle scale/)
  })

  it('supports authored D3 arc generators with per-datum radii', () => {
    const rings = [
      {
        id: 'inner',
        start: 0,
        end: Math.PI,
        inner: 0.2,
        outer: 0.5,
      },
      {
        id: 'outer',
        start: Math.PI,
        end: Math.PI * 2,
        inner: 0.55,
        outer: 0.95,
      },
    ]
    const definition = defineChart({
      marks: [
        polar({
          marks: [
            radialArc(rings, {
              key: 'id',
              generator: ({ radius }) =>
                arc<(typeof rings)[number]>()
                  .startAngle((row) => row.start)
                  .endAngle((row) => row.end)
                  .innerRadius((row) => row.inner * radius)
                  .outerRadius((row) => row.outer * radius),
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    const scene = createChartScene(definition, {
      width: 200,
      height: 200,
    })

    expect(scene.points).toHaveLength(2)
    expect(scene.points.map((point) => point.yValue)).toEqual([35, 75])
    expect(scene.points.map((point) => point.key)).toEqual([
      'polar-0:arc-0:object:null:string:inner',
      'polar-0:arc-0:object:null:string:outer',
    ])
  })

  it('wraps a copied D3 point scale without duplicating the seam', () => {
    const data = ['north', 'east', 'south', 'west'].map((direction) => ({
      direction,
      value: 1,
    }))
    const angle = scalePoint<string>().domain(data.map((row) => row.direction))
    const radius = scaleLinear().domain([0, 1])
    const definition = defineChart({
      marks: [
        polar({
          angle: { scale: angle },
          radius: { scale: radius },
          marks: [
            radialDot(data, {
              angle: 'direction',
              radius: 'value',
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
    })
    const scene = createChartScene(definition, {
      width: 200,
      height: 200,
    })

    expect(angle.range()).toEqual([0, 1])
    expect(radius.range()).toEqual([0, 1])
    expect(
      scene.points.map((point) => [Math.round(point.x), Math.round(point.y)]),
    ).toEqual([
      [100, 0],
      [200, 100],
      [100, 200],
      [0, 100],
    ])
  })

  it('preserves partial point-scale endpoints unless wrapping is explicit', () => {
    const data = ['left', 'top', 'right'].map((direction) => ({
      direction,
      value: 1,
    }))
    const sourceAngle = scalePoint<string>().domain(
      data.map((row) => row.direction),
    )
    const sourceRadius = scaleLinear().domain([0, 1])
    const render = (wrap?: boolean) =>
      createChartScene(
        defineChart({
          marks: [
            polar({
              startAngle: -Math.PI / 2,
              endAngle: Math.PI / 2,
              angle: {
                scale: sourceAngle,
                ...(wrap === undefined ? {} : { wrap }),
              },
              radius: { scale: sourceRadius },
              marks: [
                radialDot(data, {
                  angle: 'direction',
                  radius: 'value',
                }),
              ],
            }),
          ],
          x: null,
          y: null,
          guides: false,
        }),
        { width: 200, height: 200 },
      )
    const partial = render()
    const forcedWrap = render(true)

    expect(
      partial.points.map((point) => [Math.round(point.x), Math.round(point.y)]),
    ).toEqual([
      [0, 100],
      [100, 0],
      [200, 100],
    ])
    expect(
      forcedWrap.points.map((point) => [
        Math.round(point.x),
        Math.round(point.y),
      ]),
    ).toEqual([
      [0, 100],
      [50, 13],
      [150, 13],
    ])
    expect(sourceAngle.range()).toEqual([0, 1])
    expect(sourceRadius.range()).toEqual([0, 1])
  })

  it('infers angle and radius domains from scale factories', () => {
    const data = [
      { direction: 'North', value: 20 },
      { direction: 'East', value: 40 },
      { direction: 'South', value: 30 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          polar({
            angle: { scale: scalePoint<string> },
            radius: { scale: scaleLinear, nice: true },
            marks: [
              radialDot(data, {
                angle: 'direction',
                radius: 'value',
              }),
            ],
          }),
        ],
        x: null,
        y: null,
        guides: false,
      }),
      { width: 200, height: 200 },
    )

    expect(scene.points).toHaveLength(3)
    expect(scene.points.every((point) => Number.isFinite(point.x))).toBe(true)
    expect(scene.points.every((point) => Number.isFinite(point.y))).toBe(true)
  })

  it('keeps the optional polar capability off the package root', () => {
    expect('polar' in rootExports).toBe(false)
    expect('radialArc' in rootExports).toBe(false)
    expect('radialArea' in rootExports).toBe(false)
    expect('radialRule' in rootExports).toBe(false)
    expect('radialText' in rootExports).toBe(false)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? node.focus
        ? [node]
        : [node, ...flatten(node.children)]
      : [node],
  )
}

if (false) {
  const categoricalRows = [{ category: 'A', value: 1 }]
  const categoricalDots = radialDot(categoricalRows, {
    angle: 'category',
    radius: 'value',
  })

  polar({
    angle: { scale: scaleBand<string>().domain(['A']) },
    radius: { scale: scaleLinear().domain([0, 1]) },
    marks: [categoricalDots],
  })

  polar({
    // @ts-expect-error A numeric scale cannot materialize categorical angles.
    angle: { scale: scaleLinear().domain([0, 1]) },
    radius: { scale: scaleLinear().domain([0, 1]) },
    marks: [categoricalDots],
  })

  radialDot([{ angle: 'A', enabled: true }], {
    angle: 'angle',
    // @ts-expect-error Polar radius channels are quantitative.
    radius: 'enabled',
  })
}
