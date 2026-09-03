import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dot } from './dot'
import { resolveFocusScene } from './focus-layer'
import {
  focusGuideX,
  focusGuideY,
  type FocusGuideLabelFormatContext,
} from './focus-guide'
import { createChartScene, defineChart } from './scene'
import type {
  ChartFocusState,
  ChartMark,
  ChartPoint,
  ChartScene,
  SceneGroup,
  SceneNode,
} from './types'

interface Row {
  id: string
  period: string
  value: number
  series: string
}

const rows: Row[] = [
  { id: 'a', period: 'Q1', value: 24, series: 'Actual' },
  { id: 'b', period: 'Q2', value: 58, series: 'Actual' },
]

describe('focus guides', () => {
  it('infers point and formatter values from source channels', () => {
    const mark = focusGuideX(rows, {
      x: 'period',
      y: 'value',
      xLabel: {
        format(value, context) {
          expectTypeOf(value).toEqualTypeOf<string>()
          expectTypeOf(context).toEqualTypeOf<
            FocusGuideLabelFormatContext<Row, string, number>
          >()
          const { point } = context
          return `${value}:${point.datum.value}`
        },
      },
      yLabel: {
        format(value, { point }) {
          expectTypeOf(value).toEqualTypeOf<number>()
          expectTypeOf(point.xValue).toEqualTypeOf<string>()
          return String(value)
        },
      },
    })

    expectTypeOf(mark).toMatchTypeOf<ChartMark<Row, string, number>>()
  })

  it('retains raw point identity without joining scene hit testing', () => {
    const scene = guideScene(
      focusGuideX(rows, {
        id: 'cursor',
        x: 'period',
        y: 'value',
        z: 'series',
        key: 'id',
      }),
    )
    const layer = focusLayer(scene, 'cursor')

    expect(scene.points).toHaveLength(rows.length)
    expect(
      scene.points.every((point) => point.markId === 'source-points'),
    ).toBe(true)
    expect(layer.focus).toMatchObject({
      match: 'primary',
      placement: 'over',
      retarget: true,
    })
    expect(layer.children).toEqual([])
    expect(layer.focus?.points).toHaveLength(rows.length)
    expect(layer.focus?.points[0]).toMatchObject({
      markId: 'cursor',
      datumIndex: 0,
      xValue: 'Q1',
      yValue: 24,
      group: 'Actual',
    })
    expect(layer.focus?.points[0]?.datum).toBe(rows[0])
    expect(scene.points.some((point) => point.markId === 'cursor')).toBe(false)
  })

  it('builds full-plot rules, a marker, and measured label boxes', () => {
    const formatX = vi.fn(
      (
        value: string,
        { point }: FocusGuideLabelFormatContext<Row, string, number>,
      ) => {
        expect(point.datum).toBe(rows[point.datumIndex])
        return value
      },
    )
    const scene = guideScene(
      focusGuideX(rows, {
        id: 'cursor',
        x: 'period',
        y: 'value',
        key: 'id',
        xRule: { stroke: '#334155', strokeWidth: 2 },
        yRule: { strokeDasharray: '2 3' },
        marker: {
          radius: ({ value }) => value / 12,
          fill: '#f8fafc',
          stroke: ({ series }) => (series === 'Actual' ? '#0f172a' : '#fff'),
        },
        xLabel: {
          format: formatX,
          offset: 14,
          paddingX: 6,
          paddingY: 3,
        },
        yLabel: {
          format: (value) => `${value}%`,
          side: 'start',
          offset: 20,
          paddingX: 4,
          paddingY: 2,
        },
      }),
      {
        measureText: (text) => ({
          x: -text.length * 3,
          y: -5,
          width: text.length * 6,
          height: 10,
        }),
      },
    )
    const layer = focusLayer(scene, 'cursor')
    const firstPoint = layer.focus?.points[0]
    if (!firstPoint) throw new Error('Expected a guide point')
    const candidate = candidateForPoint(layer, firstPoint)
    const xRule = nodeByKey(candidate.children, 'cursor:x-rule', 'rule')
    const yRule = nodeByKey(candidate.children, 'cursor:y-rule', 'rule')
    const marker = nodeByKey(candidate.children, 'cursor:marker', 'dot')
    const xBox = nodeByKey(candidate.children, 'cursor:x-label:box', 'rect')
    const xLabel = nodeByKey(candidate.children, 'cursor:x-label:text', 'label')
    const yBox = nodeByKey(candidate.children, 'cursor:y-label:box', 'rect')
    const yLabel = nodeByKey(candidate.children, 'cursor:y-label:text', 'label')

    expect(xRule).toMatchObject({
      x1: firstPoint.x,
      x2: firstPoint.x,
      y1: scene.chart.y,
      y2: scene.chart.y + scene.chart.height,
      style: { stroke: '#334155', strokeWidth: 2 },
    })
    expect(yRule).toMatchObject({
      x1: scene.chart.x,
      x2: scene.chart.x + scene.chart.width,
      y1: firstPoint.y,
      y2: firstPoint.y,
      style: { strokeDasharray: '2 3' },
    })
    expect(marker).toMatchObject({
      x: firstPoint.x,
      y: firstPoint.y,
      radius: 2,
      style: { fill: '#f8fafc', stroke: '#0f172a' },
    })
    expect(xLabel).toMatchObject({
      x: firstPoint.x,
      y: scene.chart.y + scene.chart.height + 14,
      text: 'Q1',
    })
    expect(xBox).toMatchObject({
      x: xLabel.x - 12,
      y: xLabel.y - 8,
      width: 24,
      height: 16,
    })
    expect(yLabel).toMatchObject({
      x: scene.chart.x - 20,
      y: firstPoint.y,
      text: '24%',
    })
    expect(yBox).toMatchObject({
      x: yLabel.x - 13,
      y: yLabel.y - 7,
      width: 26,
      height: 14,
    })
    expect(
      formatX.mock.calls.some(
        ([value, { point }]) => value === 'Q1' && point.datum === rows[0],
      ),
    ).toBe(true)
  })

  it('keeps visible structural keys stable while focus geometry retargets', () => {
    const scene = guideScene(
      focusGuideX(rows, {
        id: 'cursor',
        x: 'period',
        y: 'value',
        key: 'id',
        yRule: {},
        marker: {},
        xLabel: {},
        yLabel: {},
      }),
    )
    const first = resolveFocusScene(scene, focusState(scene.points[0]!)).scene
    const second = resolveFocusScene(scene, focusState(scene.points[1]!)).scene
    const firstLayer = focusLayer(first, 'cursor')
    const secondLayer = focusLayer(second, 'cursor')
    const firstKeys = flatten(firstLayer.children).map((node) => node.key)
    const secondKeys = flatten(secondLayer.children).map((node) => node.key)
    const firstXRule = nodeByKey(firstLayer.children, 'cursor:x-rule', 'rule')
    const secondXRule = nodeByKey(secondLayer.children, 'cursor:x-rule', 'rule')

    expect(firstKeys).toEqual(secondKeys)
    expect(firstKeys).toEqual(
      expect.arrayContaining([
        'cursor:x-rule',
        'cursor:y-rule',
        'cursor:marker',
        'cursor:x-label:box',
        'cursor:x-label:text',
        'cursor:y-label:box',
        'cursor:y-label:text',
      ]),
    )
    expect(firstXRule.x1).not.toBe(secondXRule.x1)
  })

  it('keeps suffix-colliding data keys in separate candidate subtrees', () => {
    const collisionRows: Row[] = [
      { id: 'a', period: 'Q1', value: 24, series: 'Actual' },
      { id: 'a:point', period: 'Q2', value: 58, series: 'Actual' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(collisionRows, {
            id: 'source-points',
            x: 'period',
            y: 'value',
            key: 'id',
          }),
          focusGuideX(collisionRows, {
            id: 'cursor',
            x: 'period',
            y: 'value',
            key: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['Q1', 'Q2']) },
          y: { scale: scaleLinear().domain([0, 100]) },
        },
        guides: false,
        focusRing: false,
      }),
      { width: 360, height: 240 },
    )

    const first = resolveFocusScene(scene, focusState(scene.points[0]!)).scene
    const second = resolveFocusScene(scene, focusState(scene.points[1]!)).scene
    const firstLayer = focusLayer(first, 'cursor')
    const secondLayer = focusLayer(second, 'cursor')
    const selectedCandidate = (layer: SceneGroup) =>
      flatten(layer.children).filter(
        (node) =>
          node.kind === 'group' &&
          node.className === 'ts-chart__focus-guide-candidate',
      )

    expect(selectedCandidate(firstLayer)).toHaveLength(1)
    expect(selectedCandidate(secondLayer)).toHaveLength(1)
    expect(firstLayer.focus?.activePoints).toHaveLength(1)
    expect(secondLayer.focus?.activePoints).toHaveLength(1)
    expect(firstLayer.focus?.activePoints?.[0]?.datum).toBe(collisionRows[0])
    expect(secondLayer.focus?.activePoints?.[0]?.datum).toBe(collisionRows[1])
    expect(nodeByKey(firstLayer.children, 'cursor:x-rule', 'rule').x1).toBe(
      scene.points[0]?.x,
    )
    expect(nodeByKey(secondLayer.children, 'cursor:x-rule', 'rule').x1).toBe(
      scene.points[1]?.x,
    )
  })

  it('matches shared primitive data by source position for primary focus', () => {
    const values = [5, 5]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(values, {
            id: 'source-points',
            x: (_value, { index }) => index,
            y: (value) => value,
            key: (_value, { index }) => index,
          }),
          focusGuideX(values, {
            id: 'cursor',
            x: (_value, { index }) => index,
            y: (value) => value,
            key: (_value, { index }) => index,
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
        guides: false,
        focusRing: false,
      }),
      { width: 360, height: 240 },
    )
    const resolved = resolveFocusScene(
      scene,
      focusState(scene.points[1]!),
    ).scene
    const layer = focusLayer(resolved, 'cursor')

    expect(layer.focus?.activePoints).toHaveLength(1)
    expect(layer.focus?.activePoints?.[0]).toMatchObject({
      datum: 5,
      datumIndex: 1,
    })
    expect(nodeByKey(layer.children, 'cursor:x-rule', 'rule').x1).toBe(
      scene.points[1]?.x,
    )
  })

  it('uses axis-specific defaults and honors disabled optional visuals', () => {
    const defaultScene = guideScene(
      focusGuideY(rows, {
        id: 'cursor-y-default',
        x: 'period',
        y: 'value',
        key: 'id',
      }),
    )
    const defaultLayer = focusLayer(defaultScene, 'cursor-y-default')
    const defaultPoint = defaultLayer.focus?.points[0]
    if (!defaultPoint) throw new Error('Expected a default guide point')
    expect(
      flatten(candidateForPoint(defaultLayer, defaultPoint).children).map(
        (node) => node.key,
      ),
    ).toEqual(['cursor-y-default:y-rule'])

    const scene = guideScene(
      focusGuideY(
        [
          ...rows,
          {
            id: 'invalid-value',
            period: 'Q3',
            value: NaN,
            series: 'Actual',
          },
          { id: 'invalid-map', period: 'Q4', value: 36, series: 'Actual' },
        ],
        {
          id: 'cursor-y',
          x: 'period',
          y: 'value',
          key: 'id',
          yRule: false,
          xRule: {},
          match: 'x',
        },
      ),
    )
    const layer = focusLayer(scene, 'cursor-y')
    const point = layer.focus?.points[0]
    if (!point) throw new Error('Expected a valid guide point')
    const candidate = candidateForPoint(layer, point)

    expect(layer.focus?.match).toBe('x')
    expect(layer.focus?.points).toHaveLength(2)
    expect(flatten(candidate.children).map((node) => node.key)).toEqual([
      'cursor-y:x-rule',
    ])
  })
})

function guideScene(
  guide: ChartMark<Row, string, number>,
  layout: Parameters<typeof createChartScene>[2] = {},
): ChartScene<Row, string, number> {
  return createChartScene(
    defineChart({
      marks: [
        dot(rows, {
          id: 'source-points',
          x: 'period',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
        guide,
      ],
      scales: {
        x: { scale: scaleBand<string>().domain(['Q1', 'Q2', 'Q3']) },
        y: { scale: scaleLinear().domain([0, 100]) },
      },
      guides: false,
      focusRing: false,
      margin: { top: 28, right: 48, bottom: 42, left: 52 },
    }),
    { width: 360, height: 240 },
    layout,
  )
}

function focusLayer(scene: ChartScene, id: string): SceneGroup {
  const marks = scene.nodes.find((node) => node.key === 'marks')
  if (marks?.kind !== 'group') throw new Error('Expected marks group')
  const layer = marks.children.find((node) => node.key === `focus:${id}`)
  if (layer?.kind !== 'group' || !layer.focus) {
    throw new Error(`Expected focus layer for ${id}`)
  }
  return layer
}

function candidateForPoint(layer: SceneGroup, point: ChartPoint): SceneGroup {
  const root = layer.focus?.candidates?.[0]
  if (root?.kind !== 'group') throw new Error('Expected guide candidate root')
  const pointIndex = layer.focus?.points.indexOf(point)
  const candidate = root.children.find(
    (node) => node.kind === 'group' && node.focusCandidateIndex === pointIndex,
  )
  if (candidate?.kind !== 'group') throw new Error('Expected guide candidate')
  return candidate
}

function focusState(point: ChartPoint): ChartFocusState {
  return {
    primary: point,
    group: [point],
    source: 'pointer',
    pinned: false,
  }
}

function nodeByKey<TKind extends Exclude<SceneNode['kind'], 'group'>>(
  nodes: readonly SceneNode[],
  key: string,
  kind: TKind,
): Extract<SceneNode, { kind: TKind }> {
  const node = flatten(nodes).find((candidate) => candidate.key === key)
  if (!node || node.kind !== kind) throw new Error(`Expected ${kind} ${key}`)
  return node as Extract<SceneNode, { kind: TKind }>
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
