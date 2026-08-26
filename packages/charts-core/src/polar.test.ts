import { describe, expect, expectTypeOf, it } from 'vitest'
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from 'd3-scale'
import {
  arc,
  areaRadial,
  curveLinearClosed,
  lineRadial,
  pointRadial,
} from 'd3-shape'
import * as rootExports from './index'
import { resolveChartPointerFocus } from './interaction'
import {
  angleGrid,
  focusGroupAngle,
  pie,
  polar,
  radialArc,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
  radialRule,
  radialText,
} from './polar'
import { createChartScene, defineChart, findNearestPoint } from './scene'
import type {
  ChartDefinition,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTiming,
  SceneNode,
} from './types'
import type { RadialRuleOptions, RadialTextOptions } from './polar'

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
    const arcs = pie(slices, { value: 'value' })
    const definition = defineChart({
      marks: [
        polar({
          radiusRatio: 0.8,
          scales: { angle: null, radius: null },
          marks: [
            radialArc(arcs, {
              key: 'id',
              z: 'label',
              innerRadius: ({ radius }) => radius * 0.55,
              outerRadius: ({ radius }) => radius,
              cornerRadius: 4,
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
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
      key: 'polar-0:arc-0:string:6:Errors:string:6:errors',
      x: 100 + centroid[0],
      y: 80 + centroid[1],
      datum: arcs[0],
    })
    expect(small.points[0]?.datum).not.toHaveProperty('data')
    expect(
      smallPaths[0]?.kind === 'area' ? smallPaths[0].interaction : null,
    ).toMatchObject({ point: small.points[0], affinity: 'geometry' })
    const interior = pointRadial(
      (arcs[0]!.startAngle + arcs[0]!.endAngle) / 2,
      expectedRadius * 0.8,
    )
    expect(
      findNearestPoint(small, 100 + interior[0], 80 + interior[1], 0),
    ).toBe(small.points[0])
    expect(findNearestPoint(small, 100, 80, 0)).toBeNull()
  })

  it('renders materialized pie gaps without applying arc padding twice', () => {
    const gapAngle = 0.2
    const arcs = pie(slices, { value: 'value', gapAngle })
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: { angle: null, radius: null },
            marks: [radialArc(arcs, { id: 'gapped-arcs', key: 'id' })],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const areas = flatten(scene.nodes).filter((node) => node.kind === 'area')
    const expected = arc<(typeof arcs)[number]>()
      .innerRadius(0)
      .outerRadius(100)
    const paddedAgain = arc<(typeof arcs)[number]>()
      .innerRadius(0)
      .outerRadius(100)
      .padAngle(gapAngle)
    const centroid = expected.centroid(arcs[0]!)

    expect(areas[0]?.kind === 'area' ? areas[0].path : '').toBe(
      expected(arcs[0]!),
    )
    expect(areas[0]?.kind === 'area' ? areas[0].path : '').not.toBe(
      paddedAgain(arcs[0]!),
    )
    expect(scene.points[0]).toMatchObject({
      key: 'gapped-arcs:object:null:string:6:errors',
      datum: arcs[0],
      x: 100 + centroid[0],
      y: 100 + centroid[1],
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
            scales: {
              angle: { scale: scaleLinear().domain([0, 1]) },
              radius: { scale: scaleLinear().domain([0, 2]) },
            },
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
        scales: { x: null, y: null },
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
            scales: {
              angle: { scale: scaleLinear().domain([0, 1]) },
              radius: { scale: scaleLinear().domain([0, 2]) },
            },
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
        scales: { x: null, y: null },
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
          scales: {
            angle: { scale: angle },
            radius: { scale: radius },
          },
          guides: [
            radialGrid({
              values: [50, 100],
              shape: 'polygon',
              labels: true,
              fill: '#dbeafe',
              fillOpacity: 0.2,
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
      scales: { x: null, y: null },
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
    expect(
      nodes.find(
        (node) => node.kind === 'polyline' && node.style?.fill === '#dbeafe',
      ),
    ).toMatchObject({ style: { fillOpacity: 0.2 } })
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
          scales: {
            angle: { scale: angle },
            radius: { scale: radius },
          },
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
      scales: { x: null, y: null },
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

  it('applies signed per-datum radial offsets after semantic radius mapping', () => {
    const rows = [
      {
        id: 'valid',
        angle: Math.PI / 2,
        radius1: 0.5,
        radius2: 1,
        innerOffset: -5,
        outerOffset: 20,
        dx: 3,
        dy: -4,
      },
      {
        id: 'invalid',
        angle: Math.PI,
        radius1: 0.5,
        radius2: 1,
        innerOffset: 0,
        outerOffset: Number.NaN,
        dx: 0,
        dy: 0,
      },
    ] as const
    const fillCalls: string[] = []
    const anchorCalls: string[] = []
    const textMark = radialText(rows, {
      id: 'offset-labels',
      angle: 'angle',
      radius: 'radius2',
      key: 'id',
      text: 'id',
      radiusOffset: (row) => row.outerOffset,
      dx: (row) => row.dx,
      dy: (row) => row.dy,
      fill: (row) => {
        fillCalls.push(row.id)
        return '#2563eb'
      },
      anchor: (row) => {
        anchorCalls.push(row.id)
        return 'outside'
      },
    })
    const ruleMark = radialRule(rows, {
      id: 'offset-leaders',
      angle: 'angle',
      radius1: 'radius1',
      radius2: 'radius2',
      radius1Offset: (row) => row.innerOffset,
      radius2Offset: (row) => row.outerOffset,
      key: 'id',
    })
    const definition = defineChart({
      scales: { x: null, y: null },
      marks: [
        polar({
          scales: {
            angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
            radius: { scale: scaleLinear().domain([0, 1]) },
          },
          marks: [ruleMark, textMark],
        }),
      ],
      margin: 0,
    })
    const small = createChartScene(definition, { width: 200, height: 200 })
    const large = createChartScene(definition, { width: 320, height: 320 })
    const smallNodes = flatten(small.nodes)
    const largeNodes = flatten(large.nodes)
    const smallLabel = smallNodes.find(
      (node) => node.kind === 'label' && node.text === 'valid',
    )
    const largeLabel = largeNodes.find(
      (node) => node.kind === 'label' && node.text === 'valid',
    )
    const smallRule = smallNodes.find(
      (node) => node.kind === 'rule' && node.key.includes('valid'),
    )
    const largeRule = largeNodes.find(
      (node) => node.kind === 'rule' && node.key.includes('valid'),
    )

    expect(
      textMark.initialize({ markIndex: 0, parentId: 'test' }).radiusValues,
    ).toEqual([1, 1])
    expect(
      ruleMark.initialize({ markIndex: 0, parentId: 'test' }).radiusValues,
    ).toEqual([0.5, 0.5, 1, 1])
    expect(smallLabel).toMatchObject({
      kind: 'label',
      x: expect.closeTo(123, 8),
      y: expect.closeTo(-4, 8),
      anchor: 'start',
    })
    expect(largeLabel).toMatchObject({
      kind: 'label',
      x: expect.closeTo(183, 8),
      y: expect.closeTo(-4, 8),
      anchor: 'start',
    })
    expect(smallRule).toMatchObject({
      kind: 'rule',
      x1: expect.closeTo(45, 8),
      y1: expect.closeTo(0, 8),
      x2: expect.closeTo(120, 8),
      y2: expect.closeTo(0, 8),
    })
    expect(largeRule).toMatchObject({
      kind: 'rule',
      x1: expect.closeTo(75, 8),
      y1: expect.closeTo(0, 8),
      x2: expect.closeTo(180, 8),
      y2: expect.closeTo(0, 8),
    })
    expect(
      smallNodes.filter(
        (node) =>
          (node.kind === 'label' || node.kind === 'rule') &&
          node.key.includes('invalid'),
      ),
    ).toHaveLength(0)
    expect(small.points).toHaveLength(1)
    expect(small.points[0]).toMatchObject({
      key: 'offset-labels:object:null:string:5:valid',
      datum: rows[0],
      xValue: Math.PI / 2,
      yValue: 1,
      x: expect.closeTo(223, 8),
      y: expect.closeTo(96, 8),
      color: '#2563eb',
    })
    expect(fillCalls).toEqual(['valid', 'valid'])
    expect(anchorCalls).toEqual(['valid', 'valid'])
  })

  it('shares outside radial anchors with angle-grid labels', () => {
    const tau = Math.PI * 2
    const values = [
      0,
      5e-7,
      2e-6,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      (Math.PI * 5) / 4,
      (Math.PI * 3) / 2,
      tau - 2e-6,
      tau,
    ]
    const expected = [
      'middle',
      'middle',
      'start',
      'start',
      'start',
      'middle',
      'end',
      'end',
      'end',
      'middle',
    ]
    const rows = values.map((angle, index) => ({
      id: String(index),
      angle,
      radius: 1,
    }))
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleLinear().domain([0, tau]) },
              radius: { scale: scaleLinear().domain([0, 1]) },
            },
            guides: [
              angleGrid({ values }),
              angleGrid({
                id: 'authored-anchor',
                values: [Math.PI / 2],
                labelAnchor: 'end',
              }),
            ],
            marks: [
              radialText(rows, {
                id: 'outside-labels',
                angle: 'angle',
                radius: 'radius',
                text: 'id',
                key: 'id',
                radiusOffset: 8,
                anchor: 'outside',
              }),
            ],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const labels = flatten(scene.nodes).filter((node) => node.kind === 'label')
    const textAnchors = rows.map((row) =>
      labels.find((node) =>
        node.key.endsWith(`string:${row.id.length}:${row.id}`),
      ),
    )
    const gridAnchors = values.map((value) =>
      labels.find((node) => node.key === `angle-label:number:${value}`),
    )

    expect(textAnchors.map((node) => node?.anchor)).toEqual(expected)
    expect(gridAnchors.map((node) => node?.anchor)).toEqual(expected)
    expect(
      labels.find(
        (node) =>
          node.key === `angle-label:number:${Math.PI / 2}` &&
          node.anchor === 'end',
      ),
    ).toBeDefined()
    expect(labels.every((node) => node.anchor !== ('outside' as never))).toBe(
      true,
    )
  })

  it('omits every nonfinite radial offset before paint callbacks', () => {
    const textRows = [
      { id: 'valid', angle: 0, radius: 1, offset: 4 },
      { id: 'nan', angle: 0, radius: 1, offset: Number.NaN },
      { id: 'positive', angle: 0, radius: 1, offset: Number.POSITIVE_INFINITY },
      { id: 'negative', angle: 0, radius: 1, offset: Number.NEGATIVE_INFINITY },
      { id: 'semantic', angle: Number.NaN, radius: 1, offset: 4 },
    ]
    const ruleRows = [
      { id: 'valid', angle: 0, inner: 0, outer: 1, offset1: 0, offset2: 4 },
      {
        id: 'r1-nan',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: Number.NaN,
        offset2: 0,
      },
      {
        id: 'r1-positive',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: Number.POSITIVE_INFINITY,
        offset2: 0,
      },
      {
        id: 'r1-negative',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: Number.NEGATIVE_INFINITY,
        offset2: 0,
      },
      {
        id: 'r2-nan',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: 0,
        offset2: Number.NaN,
      },
      {
        id: 'r2-positive',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: 0,
        offset2: Number.POSITIVE_INFINITY,
      },
      {
        id: 'r2-negative',
        angle: 0,
        inner: 0,
        outer: 1,
        offset1: 0,
        offset2: Number.NEGATIVE_INFINITY,
      },
      {
        id: 'semantic',
        angle: Number.NaN,
        inner: 0,
        outer: 1,
        offset1: 0,
        offset2: 4,
      },
    ]
    const textOffsetCalls: string[] = []
    const textPaintCalls: string[] = []
    const textAnchorCalls: string[] = []
    const radius1OffsetCalls: string[] = []
    const radius2OffsetCalls: string[] = []
    const rulePaintCalls: string[] = []
    const textMark = radialText(textRows, {
      id: 'finite-text',
      angle: 'angle',
      radius: 'radius',
      key: 'id',
      text: 'id',
      radiusOffset: (row) => {
        textOffsetCalls.push(row.id)
        return row.offset
      },
      fill: (row) => {
        textPaintCalls.push(row.id)
        return '#2563eb'
      },
      anchor: (row) => {
        textAnchorCalls.push(row.id)
        return 'outside'
      },
    })
    const ruleMark = radialRule(ruleRows, {
      id: 'finite-rule',
      angle: 'angle',
      radius1: 'inner',
      radius2: 'outer',
      key: 'id',
      radius1Offset: (row) => {
        radius1OffsetCalls.push(row.id)
        return row.offset1
      },
      radius2Offset: (row) => {
        radius2OffsetCalls.push(row.id)
        return row.offset2
      },
      stroke: (row) => {
        rulePaintCalls.push(row.id)
        return '#94a3b8'
      },
    })
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
              radius: { scale: scaleLinear().domain([0, 1]) },
            },
            marks: [ruleMark, textMark],
          }),
        ],
        margin: 0,
      }),
      { width: 200, height: 200 },
    )
    const nodes = flatten(scene.nodes)

    expect(nodes.filter((node) => node.kind === 'label')).toHaveLength(1)
    expect(nodes.filter((node) => node.kind === 'rule')).toHaveLength(1)
    expect(scene.points).toHaveLength(1)
    expect(textOffsetCalls).toEqual(['valid', 'nan', 'positive', 'negative'])
    expect(textPaintCalls).toEqual(['valid'])
    expect(textAnchorCalls).toEqual(['valid'])
    expect(radius1OffsetCalls).toEqual(
      ruleRows.slice(0, -1).map(({ id }) => id),
    )
    expect(radius2OffsetCalls).toEqual(
      ruleRows.slice(0, -1).map(({ id }) => id),
    )
    expect(rulePaintCalls).toEqual(['valid'])
    expect(
      textMark.initialize({ markIndex: 0, parentId: 'test' }).radiusValues,
    ).toEqual([1, 1, 1, 1, 1])
    expect(
      ruleMark.initialize({ markIndex: 0, parentId: 'test' }).radiusValues,
    ).toEqual([
      ...ruleRows.map(({ inner }) => inner),
      ...ruleRows.map(({ outer }) => outer),
    ])
  })

  it('requires polar scales only for scale-backed marks', () => {
    const arcOnly = defineChart({
      marks: [
        polar({
          scales: { angle: null, radius: null },
          marks: [radialArc([{ startAngle: 0, endAngle: Math.PI }])],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    expect(() =>
      createChartScene(arcOnly, { width: 200, height: 200 }),
    ).not.toThrow()

    const missingScale = defineChart({
      marks: [
        polar({
          scales: { angle: null, radius: null },
          marks: [radialLine([1, 2, 3])],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })
    expect(() =>
      createChartScene(missingScale, { width: 200, height: 200 }),
    ).toThrow(/angle scale/)

    const missingPolygonAngle = defineChart({
      marks: [
        polar({
          scales: {
            angle: null,
            radius: { scale: scaleLinear().domain([0, 1]) },
          },
          guides: [radialGrid({ values: [1], shape: 'polygon' })],
          marks: [],
        }),
      ],
      scales: { x: null, y: null },
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
          scales: { angle: null, radius: null },
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
      scales: { x: null, y: null },
      guides: false,
    })
    const scene = createChartScene(definition, {
      width: 200,
      height: 200,
    })

    expect(scene.points).toHaveLength(2)
    expect(scene.points.map((point) => point.yValue)).toEqual([35, 75])
    expect(scene.points.map((point) => point.key)).toEqual([
      'polar-0:arc-0:object:null:string:5:inner',
      'polar-0:arc-0:object:null:string:5:outer',
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
          scales: {
            angle: { scale: angle },
            radius: { scale: radius },
          },
          marks: [
            radialDot(data, {
              angle: 'direction',
              radius: 'value',
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
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

  it('groups radial series by the nearest angular ray', () => {
    const rows = [
      { id: 'a', direction: 'east', series: 'A', value: 0.3 },
      { id: 'b', direction: 'east', series: 'B', value: 0.8 },
    ]
    const scene = createChartScene(
      defineChart({
        scales: { x: null, y: null },
        marks: [
          polar({
            scales: {
              angle: {
                scale: scalePoint<string>().domain([
                  'north',
                  'east',
                  'south',
                  'west',
                ]),
              },
              radius: { scale: scaleLinear().domain([0, 1]) },
            },
            marks: [
              radialLine(rows, {
                angle: 'direction',
                radius: 'value',
                z: 'series',
                key: 'id',
              }),
            ],
          }),
        ],
        margin: 0,
        focus: focusGroupAngle,
      }),
      { width: 200, height: 200 },
    )

    expect(
      resolveChartPointerFocus(scene, focusGroupAngle, 165, 100, 1),
    ).toEqual([scene.points[1], scene.points[0]])
    expect(focusGroupAngle.navigation(scene.points)).toEqual([scene.points[0]])
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
              scales: {
                angle: {
                  scale: sourceAngle,
                  ...(wrap === undefined ? {} : { wrap }),
                },
                radius: { scale: sourceRadius },
              },
              marks: [
                radialDot(data, {
                  angle: 'direction',
                  radius: 'value',
                }),
              ],
            }),
          ],
          scales: { x: null, y: null },
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
            scales: {
              angle: { scale: scalePoint<string> },
              radius: { scale: scaleLinear, nice: true },
            },
            marks: [
              radialDot(data, {
                angle: 'direction',
                radius: 'value',
              }),
            ],
          }),
        ],
        scales: { x: null, y: null },
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
    expect('radialBarAngle' in rootExports).toBe(false)
    expect('radialBarRadius' in rootExports).toBe(false)
    expect('radialRule' in rootExports).toBe(false)
    expect('radialText' in rootExports).toBe(false)
  })

  it('snapshots child motion for each reused polar initialization', () => {
    const mark = polar({
      scales: {
        angle: { scale: scaleLinear },
        radius: { scale: scaleLinear },
      },
      motion: {
        delay: 5,
        transition: { type: 'tween', duration: 100 },
      },
      marks: [
        {
          ...radialDot([{ angle: 0, radius: 1 }]),
          // Structural custom marks may keep motion on the mark only.
          motion: {
            delay: 25,
            transition: { type: 'tween', easing: 'linear' },
          },
        },
      ],
    })
    const first = mark.initialize({ markIndex: 0 })
    const second = mark.initialize({ markIndex: 1 })

    expect(
      resolveAuthoredMotion(
        first.motion,
        authoredMotionContext('polar-0:radial-dot-0'),
      ),
    ).toEqual({
      delay: 25,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    expect(
      resolveAuthoredMotion(
        second.motion,
        authoredMotionContext('polar-1:radial-dot-0'),
      ),
    ).toEqual({
      delay: 25,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
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

function authoredMotionContext(markId: string): ChartMotionContext {
  return {
    phase: 'enter',
    role: 'dot',
    key: `${markId}:input`,
    markId,
    seriesKey: '',
    seriesIndex: 0,
    datumIndex: 0,
    datumCount: 1,
    datum: undefined,
    point: undefined,
  }
}

function resolveAuthoredMotion(
  motion: ChartMotionDefinition<any> | undefined,
  context: ChartMotionContext,
): false | ChartMotionTiming | undefined {
  return typeof motion === 'function' ? motion(context) : motion
}

if (false) {
  const categoricalRows = [{ category: 'A', value: 1 }]
  const categoricalDots = radialDot(categoricalRows, {
    angle: 'category',
    radius: 'value',
  })

  polar({
    scales: {
      angle: { scale: scaleBand<string>().domain(['A']) },
      radius: { scale: scaleLinear().domain([0, 1]) },
    },
    marks: [categoricalDots],
  })

  polar({
    scales: {
      // @ts-expect-error A numeric scale cannot materialize categorical angles.
      angle: { scale: scaleLinear().domain([0, 1]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
    },
    marks: [categoricalDots],
  })

  radialDot([{ angle: 'A', enabled: true }], {
    angle: 'angle',
    // @ts-expect-error Polar radius channels are quantitative.
    radius: 'enabled',
  })

  const offsetRows = [{ angle: 0, radius: 1, offset: 8, label: 'A' }] as const
  const textOptions: RadialTextOptions<(typeof offsetRows)[number]> = {
    angle: 'angle',
    radius: 'radius',
    text: 'label',
    radiusOffset: (row, { index, data }) => row.offset + index + data.length,
    anchor: 'outside',
  }
  const ruleOptions: RadialRuleOptions<(typeof offsetRows)[number]> = {
    angle: 'angle',
    radius1: 0,
    radius2: 'radius',
    radius1Offset: -2,
    radius2Offset: (row) => row.offset,
  }
  radialText(offsetRows, textOptions)
  radialRule(offsetRows, ruleOptions)

  radialText(offsetRows, {
    angle: 'angle',
    radius: 'radius',
    // @ts-expect-error Radial pixel offsets are numeric visual channels.
    radiusOffset: 'offset',
  })
  radialText(offsetRows, {
    angle: 'angle',
    radius: 'radius',
    // @ts-expect-error Outside is the only automatic radial anchor mode.
    anchor: 'left',
  })
  radialRule(offsetRows, {
    angle: 'angle',
    radius2: 'radius',
    // @ts-expect-error Radial pixel offsets are numeric visual channels.
    radius2Offset: 'offset',
  })
}
