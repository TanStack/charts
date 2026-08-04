import { describe, expect, it } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, barY } from './bar'
import { crosshair } from './crosshair'
import { dot } from './dot'
import { facet } from './facet'
import { resolveFocusPresentation } from './focus-presentation'
import { group } from './group'
import { createChartScene, defineChart } from './scene'
import { linearAxes } from './test-scales'
import type {
  ChartFocusState,
  ChartPoint,
  SceneGroup,
  SceneLabel,
  SceneNode,
  SceneRect,
  SceneRule,
} from './types'

describe('crosshair', () => {
  it('compiles as a data-less guide and resolves one stable rule per axis', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(
            [
              { x: 0, y: 1 },
              { x: 2, y: 3 },
            ],
            { x: 'x', y: 'y' },
          ),
          crosshair(),
        ],
        ...linearAxes([0, 2], [0, 4]),
      }),
      { width: 320, height: 180 },
    )

    expect(scene.points).toHaveLength(2)
    expect(scene.scales.x?.domain).toEqual([0, 2])
    expect(scene.scales.y?.domain).toEqual([0, 4])
    expect(scene.focusGuides).toHaveLength(1)
    expect(findNode(scene.nodes, 'crosshair-1')).toBeUndefined()

    const first = resolveFocusPresentation(scene, focus(scene.points[0]!))
    const second = resolveFocusPresentation(scene, focus(scene.points[1]!))
    const firstGuide = findNode(first.over, 'crosshair-1') as SceneGroup
    const secondGuide = findNode(second.over, 'crosshair-1') as SceneGroup
    const firstRules = nodesOfKind(firstGuide.children, 'rule')
    const secondRules = nodesOfKind(secondGuide.children, 'rule')

    expect(firstRules.map((rule) => rule.key)).toEqual([
      'crosshair-1:x-rule',
      'crosshair-1:y-rule',
    ])
    expect(secondRules.map((rule) => rule.key)).toEqual(
      firstRules.map((rule) => rule.key),
    )
    expect(firstRules).toHaveLength(2)
    expect(
      (findNode(firstGuide.children, 'crosshair-1:plot') as SceneGroup).clip,
    ).toEqual(scene.chart)
    expect(first.over.some((node) => node.key === 'default-focus')).toBe(true)
    expect(resolveFocusPresentation(scene, null)).toEqual({
      under: [],
      over: [],
    })
  })

  it('resolves a categorical cursor band with exact inset geometry', () => {
    const rows = [
      { id: 'a', category: 'A', value: 40 },
      { id: 'b', category: 'B', value: 70 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          crosshair({
            id: 'band-cursor',
            x: {
              band: {
                inset: 2,
                radius: 3,
                fill: '#64748b',
                fillOpacity: 0.24,
              },
            },
            y: false,
          }),
          barY(rows, {
            x: 'category',
            y: 'value',
            key: 'id',
            inset: 4,
          }),
        ],
        x: { scale: scaleBand<string>().domain(['A', 'B']).padding(0.18) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const point = scene.points[0]!
    const presentation = resolveFocusPresentation(scene, focus(point))
    const band = findNode(presentation.under, 'band-cursor:x-band') as SceneRect
    const bar = findNode(scene.nodes, point.key) as SceneRect

    expect(band.kind).toBe('rect')
    expect(band.x).toBeCloseTo(bar.x - 2)
    expect(band.width).toBeCloseTo(bar.width + 4)
    expect(band.x + band.width / 2).toBeCloseTo(bar.x + bar.width / 2)
    expect(band.y).toBe(scene.chart.y)
    expect(band.height).toBe(scene.chart.height)
    expect(band.radius).toBe(3)
    expect(band.style).toMatchObject({
      fill: '#64748b',
      fillOpacity: 0.24,
    })
    expect(presentation.over).toEqual([])

    const continuous = createChartScene(
      defineChart({
        marks: [
          crosshair({ x: { band: true }, y: false }),
          dot([{ x: 1, y: 2 }], { x: 'x', y: 'y' }),
        ],
        ...linearAxes([0, 2], [0, 4]),
        guides: false,
        focusRing: false,
      }),
      { width: 160, height: 100 },
    )
    expect(
      resolveFocusPresentation(continuous, focus(continuous.points[0]!)),
    ).toEqual({ under: [], over: [] })
  })

  it('centers categorical bands on parent scales for grouped bars', () => {
    const rows = [
      { id: 'query', category: 'A', series: 'Query', value: 40 },
      { id: 'router', category: 'A', series: 'Router', value: 70 },
    ]
    const vertical = createChartScene(
      defineChart({
        marks: [
          crosshair({ id: 'x-band', x: { band: true }, y: false }),
          barY(rows, {
            x: 'category',
            y: 'value',
            z: 'series',
            key: 'id',
            layout: group(),
          }),
        ],
        x: { scale: scaleBand<string>().domain(['A']).padding(0.18) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          crosshair({ id: 'y-band', x: false, y: { band: true } }),
          barX(rows, {
            x: 'value',
            y: 'category',
            z: 'series',
            key: 'id',
            layout: group(),
          }),
        ],
        x: { scale: scaleLinear().domain([0, 100]) },
        y: { scale: scaleBand<string>().domain(['A']).padding(0.18) },
        guides: false,
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )

    const verticalPoint = vertical.points[1]!
    const xBand = findNode(
      resolveFocusPresentation(vertical, focus(verticalPoint)).under,
      'x-band:x-band',
    ) as SceneRect
    const horizontalPoint = horizontal.points[1]!
    const yBand = findNode(
      resolveFocusPresentation(horizontal, focus(horizontalPoint)).under,
      'y-band:y-band',
    ) as SceneRect

    expect(verticalPoint.x).not.toBeCloseTo(vertical.scales.x.map('A'))
    expect(xBand.x + xBand.width / 2).toBeCloseTo(vertical.scales.x.map('A'))
    expect(xBand.width).toBeCloseTo(vertical.scales.x.bandwidth)
    expect(horizontalPoint.y).not.toBeCloseTo(horizontal.scales.y.map('A'))
    expect(yBand.y + yBand.height / 2).toBeCloseTo(horizontal.scales.y.map('A'))
    expect(yBand.height).toBeCloseTo(horizontal.scales.y.bandwidth)
  })

  it('uses mark order, axis overrides, labels, marker, and surface clamping', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          crosshair({
            stroke: '#64748b',
            strokeWidth: 2,
            x: {
              stroke: '#ef4444',
              label: { format: (value) => `x=${String(value)}`, fontSize: 12 },
            },
            y: false,
            marker: true,
          }),
          dot([{ x: 0, y: 1 }], { x: 'x', y: 'y' }),
        ],
        ...linearAxes([0, 2], [0, 4]),
      }),
      { width: 160, height: 100 },
    )
    const presentation = resolveFocusPresentation(
      scene,
      focus(scene.points[0]!),
      { x: 1, y: 2 },
    )
    const guide = findNode(presentation.under, 'crosshair-0') as SceneGroup
    const rules = nodesOfKind(guide.children, 'rule')
    const labels = nodesOfKind(guide.children, 'label')
    const label = labels[0] as SceneLabel

    expect(rules).toHaveLength(1)
    expect((rules[0] as SceneRule).style).toMatchObject({
      stroke: '#ef4444',
      strokeWidth: 2,
    })
    expect(label.text).toBe('x=0')
    expect(labels.map((node) => node.key)).toEqual([
      'crosshair-0:x-label:halo',
      'crosshair-0:x-label:text',
    ])
    expect(label.x).toBeGreaterThanOrEqual(2)
    expect(label.y).toBeLessThanOrEqual(98)
    expect(nodesOfKind(guide.children, 'dot')).toHaveLength(1)
    expect(presentation.over.some((node) => node.key === 'default-focus')).toBe(
      true,
    )
  })

  it('offsets and scopes guides to their focused facet cell', () => {
    const rows = [
      { facet: 'A', x: 0, y: 1 },
      { facet: 'B', x: 0, y: 2 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          facet(rows, {
            by: 'facet',
            axes: 'cell',
            columns: 2,
            chart: (data) => ({
              marks: [crosshair({ y: false }), dot(data, { x: 'x', y: 'y' })],
              ...linearAxes([0, 1], [0, 3]),
            }),
          }),
        ],
        x: null,
        y: null,
      }),
      { width: 420, height: 180 },
    )

    expect(scene.focusGuides).toHaveLength(2)
    expect(
      scene.focusGuides?.every((guide) => guide.placement === 'under'),
    ).toBe(true)
    expect(new Set(scene.focusGuides?.map((guide) => guide.scope)).size).toBe(2)
    const presentation = resolveFocusPresentation(
      scene,
      focus(scene.points[0]!),
    )
    const guides = [...presentation.under, ...presentation.over].flatMap(
      crosshairNodes,
    )
    expect(guides).toHaveLength(1)
    expect(guides[0]?.key.startsWith(scene.focusGuides![0]!.scope!)).toBe(true)
  })

  it('uses controlled axes first and local focus for missing axes', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          dot([{ x: 1, y: 3 }], { x: 'x', y: 'y' }),
          crosshair({ marker: true }),
        ],
        ...linearAxes([0, 2], [0, 4]),
      }),
      { width: 240, height: 160 },
    )
    const point = scene.points[0]!
    const controlledX = scene.scales.x!.map(2)
    const presentation = resolveFocusPresentation(scene, focus(point), null, {
      state: {
        anchor: 'value',
        value: { x: 2 },
        source: 'programmatic',
        pinned: false,
      },
      axes: 'x',
      x: { position: controlledX, normalized: 1, value: 2 },
    })
    const guide = findNode(presentation.over, 'crosshair-1') as SceneGroup
    const xRule = findNode(guide.children, 'crosshair-1:x-rule') as SceneRule
    const yRule = findNode(guide.children, 'crosshair-1:y-rule') as SceneRule
    const marker = nodesOfKind(guide.children, 'dot')[0]
    expect(xRule.x1).toBe(controlledX)
    expect(yRule.y1).toBe(point.y)
    expect(marker).toMatchObject({ x: controlledX, y: point.y })
  })

  it('projects semantic cursors per facet and keeps each cell tick formatter', () => {
    const rows = [
      { facet: 'A', x: 0, y: 1 },
      { facet: 'B', x: 0, y: 2 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          facet(rows, {
            by: 'facet',
            axes: 'cell',
            columns: 2,
            chart: (data) => ({
              marks: [
                dot(data, { x: 'x', y: 'y' }),
                crosshair<number, number>({
                  x: { label: true },
                  y: false,
                }),
              ],
              x: {
                scale: scaleLinear().domain([0, 1]),
                axis: {
                  ticks: {
                    count: 2,
                    format: (value) => `${data[0]!.facet}:${value}`,
                  },
                },
              },
              y: { scale: scaleLinear().domain([0, 3]) },
            }),
          }),
        ],
        x: null,
        y: null,
      }),
      { width: 420, height: 180 },
    )

    const cursor = {
      state: {
        anchor: 'value' as const,
        value: { x: 0 },
        source: 'programmatic' as const,
        pinned: true,
      },
      axes: 'x' as const,
    }
    const semantic = resolveFocusPresentation(
      scene,
      focus(scene.points[1]!),
      null,
      cursor,
    )
    const semanticGuides = [...semantic.under, ...semantic.over].flatMap(
      crosshairNodes,
    )
    expect(semanticGuides).toHaveLength(2)
    expect(
      semanticGuides.flatMap((guide) =>
        nodesOfKind(guide.children, 'label').map((label) => label.text),
      ),
    ).toEqual(['A:0', 'A:0', 'B:0', 'B:0'])

    const rejected = resolveFocusPresentation(
      {
        ...scene,
        focusGuides: scene.focusGuides?.map((guide) => ({
          ...guide,
          projectX: () => undefined,
        })),
      },
      null,
      null,
      {
        ...cursor,
        x: {
          position: scene.focusGuides![0]!.chart.x,
          normalized: 0,
          value: 0,
        },
      },
    )
    expect([...rejected.under, ...rejected.over]).toEqual([])

    const firstGuide = scene.focusGuides![0]!
    const x = firstGuide.chart.x + firstGuide.chart.width / 2
    const y = firstGuide.chart.y + firstGuide.chart.height / 2
    const positioned = resolveFocusPresentation(scene, null, null, {
      state: {
        anchor: 'scene',
        scene: { x, y },
        source: 'programmatic',
        pinned: false,
      },
      axes: 'xy',
      x: { position: x, normalized: 0.25 },
      y: { position: y, normalized: 0.5 },
    })
    expect(
      [...positioned.under, ...positioned.over].flatMap(crosshairNodes),
    ).toHaveLength(1)
  })
})

if (false) {
  crosshair<Date, number>({
    x: { label: { format: (value) => value.toISOString() } },
    y: { label: { format: (value) => value.toFixed(2) } },
  })
  crosshair({
    x: { label: { format: (value: Date) => value.toISOString() } },
  })
  crosshair<number, number>({
    x: {
      label: {
        // @ts-expect-error An x label formatter must accept the configured x value type.
        format: (value: string) => value,
      },
    },
  })
}

function focus(point: ChartPoint): ChartFocusState {
  return { primary: point, group: [point], source: 'pointer', pinned: false }
}

function findNode(
  nodes: readonly SceneNode[],
  key: string,
): SceneNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.kind === 'group') {
      const child = findNode(node.children, key)
      if (child) return child
    }
  }
  return undefined
}

function nodesOfKind<TKind extends SceneNode['kind']>(
  nodes: readonly SceneNode[],
  kind: TKind,
): Extract<SceneNode, { kind: TKind }>[] {
  return nodes.flatMap((node): Extract<SceneNode, { kind: TKind }>[] => [
    ...(node.kind === kind
      ? [node as Extract<SceneNode, { kind: TKind }>]
      : []),
    ...(node.kind === 'group' ? nodesOfKind(node.children, kind) : []),
  ])
}

function crosshairNodes(node: SceneNode): SceneGroup[] {
  if (node.kind !== 'group') return []
  return [
    ...(node.className === 'ts-chart__crosshair' ? [node] : []),
    ...node.children.flatMap(crosshairNodes),
  ]
}
