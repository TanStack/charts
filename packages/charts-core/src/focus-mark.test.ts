import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { arrow } from './arrow'
import { bandX, bandY } from './band'
import { barX, barY } from './bar'
import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { lineY } from './line'
import { ruleX, ruleY } from './rule'
import { createChartScene, defineChart, findNearestPoint } from './scene'
import { svgChartRenderer } from './svg-surface'
import type { ChartScene, ChartValue, SceneGroup, SceneNode } from './types'

describe('focus-filtered marks', () => {
  const rows = [
    { id: 'a:query', category: 'A', series: 'Query', value: 12 },
    { id: 'a:router', category: 'A', series: 'Router', value: 8 },
    { id: 'b:query', category: 'B', series: 'Query', value: 6 },
  ]

  function scene() {
    const categories = [{ category: 'A' }, { category: 'B' }]
    return createChartScene(
      defineChart({
        marks: [
          whenFocused(
            bandX(categories, {
              x: 'category',
              key: 'category',
              fill: '#94a3b8',
              fillOpacity: 0.16,
              inset: -6,
            }),
            { match: 'x' },
          ),
          barY(rows, {
            x: 'category',
            y: 'value',
            z: 'series',
            color: 'series',
            key: 'id',
          }),
        ],
        scales: {
          x: {
            scale: scaleBand<string>().domain(['A', 'B']).padding(0.1),
          },
          y: { scale: scaleLinear().domain([0, 20]) },
        },
      }),
      { width: 480, height: 260 },
    )
  }

  it('supports fixed pixel sizes before inset on continuous and band scales', () => {
    const xScene = createChartScene(
      defineChart({
        marks: [bandX([{ x: 5 }], { x: 'x', width: 1 })],
        scales: {
          x: { scale: scaleLinear().domain([0, 10]) },
          y: null,
        },
      }),
      { width: 240, height: 160 },
    )
    const yScene = createChartScene(
      defineChart({
        marks: [bandY([{ y: 5 }], { y: 'y', height: 2 })],
        scales: {
          x: null,
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 240, height: 160 },
    )
    const categorical = createChartScene(
      defineChart({
        marks: [
          bandX([{ category: 'A' }], {
            x: 'category',
            width: 10,
            inset: 2,
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A']) },
          y: null,
        },
      }),
      { width: 240, height: 160 },
    )
    const zero = createChartScene(
      defineChart({
        marks: [bandY([{ y: 5 }], { y: 'y', height: 0 })],
        scales: {
          x: null,
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 240, height: 160 },
    )

    const xRect = findFirstRect(xScene.nodes)
    const yRect = findFirstRect(yScene.nodes)
    expect(xRect?.width).toBe(1)
    expect(yRect?.height).toBe(2)
    expect(findFirstRect(categorical.nodes)?.width).toBe(6)
    expect(findFirstRect(zero.nodes)?.height).toBe(0)
  })

  it('uses presented viewport points for focus, state, and interaction refs', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(bandX(history, { x: 'x', key: 'id', width: 1 }), {
            match: 'x',
          }),
          dot(history, {
            x: 'x',
            y: 'y',
            key: 'id',
            states: [
              {
                when: { focus: 'primary' },
                style: { r: 6 },
              },
            ],
          }),
        ],
        scales: {
          x: {
            scale: scaleLinear().domain([0, 3]),
            viewport: { domain: [1, 2], translate: 25 },
          },
          y: { scale: scaleLinear().domain([0, 3]) },
        },
        guides: false,
        clip: true,
      }),
      { width: 360, height: 220 },
    )
    const nodes = flattenNodes(resolved.nodes)
    const content = nodes.find(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__viewport-content'),
    )
    const focusLayer = nodes.find(
      (node) => node.kind === 'group' && node.focus !== undefined,
    )
    const stateLayer = nodes.find(
      (node) => node.kind === 'group' && node.states !== undefined,
    )
    const firstDot = nodes.find((node) => node.kind === 'dot')
    if (
      content?.kind !== 'group' ||
      focusLayer?.kind !== 'group' ||
      stateLayer?.kind !== 'group' ||
      firstDot?.kind !== 'dot' ||
      !firstDot.interaction?.point
    ) {
      throw new Error('Expected viewport focus and state geometry')
    }

    expect(focusLayer.focus?.points.map((point) => point.x)).toEqual(
      resolved.points.map((point) => point.x),
    )
    expect(stateLayer.states?.points).toEqual(resolved.points)
    expect(firstDot.interaction.point).toBe(resolved.points[0])
    expect(firstDot.x + (content.translateX ?? 0)).toBe(resolved.points[0]?.x)
  })

  it('keeps focus effects out of hit testing and preserves mark order', () => {
    const resolved = scene()
    const marks = resolved.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected mark group')
    const focus = marks.children[0]
    if (focus?.kind !== 'group' || !focus.focus) {
      throw new Error('Expected focus layer')
    }

    expect(focus.focus).toMatchObject({ match: 'x', placement: 'under' })
    expect(focus.focus.anchors).toHaveLength(2)
    expect(resolved.points).toHaveLength(rows.length)
    expect(
      resolved.points.every((point) => point.markId.startsWith('bar-y')),
    ).toBe(true)
    expect(
      resolved.nodes.some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('focus-layer--default'),
      ),
    ).toBe(true)
  })

  it('shows only ordinary mark geometry matching the focused x value', () => {
    const resolved = scene()
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Focused bars' })

    const primary = resolved.points[0]!
    const group = resolved.points.filter(
      (point) => point.xValue === primary.xValue,
    )
    surface.paintFocus({
      primary,
      group,
      source: 'pointer',
      pinned: false,
    })

    const layer = container.querySelector<SVGGElement>(
      '.ts-chart__marks [data-ts-focus-layer]',
    )
    expect(layer?.getAttribute('visibility')).toBe('visible')
    const visibleRects = [...(layer?.querySelectorAll('rect') ?? [])].filter(
      (rect) => rect.getAttribute('visibility') === 'visible',
    )
    expect(visibleRects).toHaveLength(1)
    expect(
      visibleRects.every((rect) => Number(rect.getAttribute('height')) > 0),
    ).toBe(true)

    const defaultLayer = container.querySelector<SVGGElement>(
      '.ts-chart__focus-layer--default',
    )
    expect(defaultLayer?.getAttribute('visibility')).toBe('visible')
    expect(
      defaultLayer?.querySelectorAll('circle[visibility="visible"]'),
    ).toHaveLength(1)

    surface.paintFocus(null)
    expect(layer?.getAttribute('visibility')).toBe('hidden')
    expect(defaultLayer?.getAttribute('visibility')).toBe('hidden')
    surface.destroy()
  })

  it('keeps rule focus anchors separate from pointer hit-test points', () => {
    const data = [
      { id: 'a', x: 1, y: 10 },
      { id: 'b', x: 2, y: 20 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(ruleX(data, { id: 'cursor-x', x: 'x' }), {
            match: 'x',
          }),
          whenFocused(ruleY(data, { id: 'cursor-y', y: 'y' }), {
            match: 'y',
          }),
          dot(data, { id: 'points', x: 'x', y: 'y', key: 'id' }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 3]) },
          y: { scale: scaleLinear().domain([0, 30]) },
        },
      }),
      { width: 360, height: 220 },
    )
    const marks = resolved.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected mark group')
    const xLayer = marks.children[0]
    const yLayer = marks.children[1]
    if (xLayer?.kind !== 'group' || !xLayer.focus) {
      throw new Error('Expected x focus layer')
    }
    if (yLayer?.kind !== 'group' || !yLayer.focus) {
      throw new Error('Expected y focus layer')
    }

    const xAnchors = xLayer.focus.anchors ?? xLayer.focus.points
    const yAnchors = yLayer.focus.anchors ?? yLayer.focus.points
    expect(xAnchors).toEqual([
      expect.objectContaining({
        key: expect.stringContaining('cursor-x'),
        markId: 'cursor-x',
        datum: data[0],
        datumIndex: 0,
        xValue: 1,
      }),
      expect.objectContaining({
        key: expect.stringContaining('cursor-x'),
        markId: 'cursor-x',
        datum: data[1],
        datumIndex: 1,
        xValue: 2,
      }),
    ])
    expect(xAnchors.every((anchor) => !('yValue' in anchor))).toBe(true)
    expect(yAnchors.map((anchor) => anchor.yValue)).toEqual([10, 20])
    expect(yAnchors.every((anchor) => !('xValue' in anchor))).toBe(true)
    expect(xLayer.focus.points).toEqual([])
    expect(yLayer.focus.points).toEqual([])
    expect(resolved.points).toHaveLength(data.length)
    expect(resolved.points.every((point) => point.markId === 'points')).toBe(
      true,
    )

    const rulesOnly = createChartScene(
      defineChart({
        marks: [ruleX([1, 2]), ruleY([10, 20])],
        scales: {
          x: { scale: scaleLinear().domain([0, 3]) },
          y: { scale: scaleLinear().domain([0, 30]) },
        },
        focusRing: false,
      }),
      { width: 360, height: 220 },
    )
    expect(rulesOnly.points).toEqual([])
    expect(findNearestPoint(rulesOnly, 180, 110)).toBeNull()
  })

  it('filters x and y rules by the focused semantic value', () => {
    const data = [
      { id: 'a', x: 1, y: 10 },
      { id: 'b', x: 2, y: 20 },
      { id: 'c', x: 3, y: 20 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(ruleX(data, { id: 'cursor-x', x: 'x' }), {
            match: 'x',
          }),
          whenFocused(ruleY(data, { id: 'cursor-y', y: 'y' }), {
            match: 'y',
          }),
          dot(data, { id: 'points', x: 'x', y: 'y', key: 'id' }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 4]) },
          y: { scale: scaleLinear().domain([0, 30]) },
        },
      }),
      { width: 360, height: 220 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Focused rules' })
    const primary = resolved.points[1]!
    surface.paintFocus({
      primary,
      group: resolved.points.filter((point) => point.xValue === primary.xValue),
      source: 'pointer',
      pinned: false,
    })

    const xRules = [
      ...container.querySelectorAll<SVGLineElement>(
        '.ts-chart__rule-x line[visibility="visible"]',
      ),
    ]
    const yRules = [
      ...container.querySelectorAll<SVGLineElement>(
        '.ts-chart__rule-y line[visibility="visible"]',
      ),
    ]
    expect(xRules).toHaveLength(1)
    expect(xRules[0]?.getAttribute('x1')).toBe(xRules[0]?.getAttribute('x2'))
    expect(yRules).toHaveLength(2)
    expect(yRules[0]?.getAttribute('y1')).toBe(yRules[0]?.getAttribute('y2'))
    expect(yRules[1]?.getAttribute('y1')).toBe(yRules[1]?.getAttribute('y2'))
    surface.destroy()
  })

  it('matches focused rules by a categorical color series', () => {
    const data = [
      { id: 'a-1', series: 'A', x: 1, y: 10 },
      { id: 'b-1', series: 'B', x: 2, y: 20 },
      { id: 'a-2', series: 'A', x: 3, y: 15 },
      { id: 'b-2', series: 'B', x: 4, y: 25 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(
            ruleX(data, {
              id: 'series-rules',
              x: 'x',
              color: 'series',
            }),
            { match: 'series' },
          ),
          dot(data, {
            id: 'series-points',
            x: 'x',
            y: 'y',
            z: 'series',
            color: 'series',
            key: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 5]) },
          y: { scale: scaleLinear().domain([0, 30]) },
        },
      }),
      { width: 360, height: 220 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Focused series rules' })
    const primary = resolved.points.find((point) => point.group === 'B')!
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'pointer',
      pinned: false,
    })

    expect(
      container.querySelectorAll(
        '.ts-chart__rule-x line[visibility="visible"]',
      ),
    ).toHaveLength(2)
    surface.destroy()
  })

  it('supports identity matching without inventing values for a missing axis', () => {
    const data = [
      { id: 'zero', x: 0, y: 0 },
      { id: 'one', x: 1, y: 1 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(ruleX(data, { id: 'primary-x', x: 'x' }), {
            match: 'primary',
          }),
          whenFocused(ruleY(data, { id: 'primary-y', y: 'y' }), {
            match: 'primary',
          }),
          whenFocused(ruleX(data, { id: 'wrong-y', x: 'x' }), {
            match: 'y',
          }),
          whenFocused(ruleY(data, { id: 'wrong-x', y: 'y' }), {
            match: 'x',
          }),
          dot(data, { id: 'points', x: 'x', y: 'y', key: 'id' }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        },
      }),
      { width: 320, height: 200 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Rule match semantics' })
    const primary = resolved.points[0]!
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'keyboard',
      pinned: false,
    })

    expect(
      container.querySelectorAll(
        '.ts-chart__rule-x line[visibility="visible"]',
      ),
    ).toHaveLength(1)
    expect(
      container.querySelectorAll(
        '.ts-chart__rule-y line[visibility="visible"]',
      ),
    ).toHaveLength(1)
    const wrongY = container.querySelector<SVGGElement>(
      '[data-ts-key="wrong-y"]',
    )
    const wrongX = container.querySelector<SVGGElement>(
      '[data-ts-key="wrong-x"]',
    )
    expect(wrongY?.getAttribute('visibility')).toBe('hidden')
    expect(wrongX?.getAttribute('visibility')).toBe('hidden')
    surface.destroy()
  })

  it('allows the built-in primary-point ring to be disabled explicitly', () => {
    const rows = [{ category: 'A', value: 12 }]
    const resolved = createChartScene(
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value' })],
        scales: {
          x: { scale: scaleBand<string>().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 20]) },
        },
        focusRing: false,
      }),
      { width: 240, height: 160 },
    )

    expect(
      resolved.nodes.some(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('focus-layer--default'),
      ),
    ).toBe(false)
  })

  it('resolves only the active retarget candidate under stable scene keys', () => {
    const guides = [
      { id: 'guide-a', category: 'A' },
      { id: 'guide-b', category: 'B' },
    ]
    const values = [
      { id: 'value-a', category: 'A', value: 12 },
      { id: 'value-b', category: 'B', value: 8 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(
            bandX(guides, {
              id: 'active-band',
              x: 'category',
              key: 'id',
            }),
            { match: 'x', retarget: true },
          ),
          barY(values, {
            x: 'category',
            y: 'value',
            key: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 20]) },
        },
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const marks = resolved.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected marks')
    const layer = marks.children[0]
    if (layer?.kind !== 'group' || !layer.focus) {
      throw new Error('Expected focus layer')
    }
    expect(layer.children).toEqual([])
    expect(layer.focus.candidates).toHaveLength(1)
    expect(resolved.points).toHaveLength(values.length)

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Retargeted band' })
    expect(container.querySelector('[data-ts-focus-retarget] rect')).toBeNull()

    const first = resolved.points[0]!
    const firstScene = surface.paintFocus({
      primary: first,
      group: [first],
      source: 'pointer',
      pinned: false,
    })
    const firstRect = container.querySelector<SVGRectElement>(
      '[data-ts-focus-retarget] rect',
    )
    expect(firstRect).not.toBeNull()
    expect(firstRect?.dataset.tsKey).toBe('focus:active-band:selection:0')
    const firstX = Number(firstRect?.getAttribute('x'))
    expect(firstScene && firstScene !== resolved).toBe(true)
    const activeLayer = firstScene
      ? findFocusLayer(firstScene, 'focus:active-band')
      : undefined
    expect(activeLayer?.focus?.activePoints?.[0]?.datum).toBe(guides[0])

    const second = resolved.points[1]!
    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'pointer',
      pinned: false,
    })
    const secondRect = container.querySelector<SVGRectElement>(
      '[data-ts-focus-retarget] rect',
    )
    expect(secondRect).toBe(firstRect)
    expect(Number(secondRect?.getAttribute('x'))).toBeGreaterThan(firstX)

    surface.paintFocus(null)
    expect(container.querySelector('[data-ts-focus-retarget] rect')).toBeNull()
    expect(
      container
        .querySelector('[data-ts-focus-retarget]')
        ?.getAttribute('visibility'),
    ).toBe('hidden')
    surface.destroy()
  })

  it('preserves one stable retarget slot per grouped focus candidate', () => {
    const guides = [
      { id: 'a-one', category: 'A', series: 'one' },
      { id: 'a-two', category: 'A', series: 'two' },
      { id: 'b-one', category: 'B', series: 'one' },
      { id: 'b-two', category: 'B', series: 'two' },
    ]
    const values = guides.map((row, index) => ({
      ...row,
      value: index + 1,
    }))
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(
            bandX(guides, {
              id: 'group-band',
              x: 'category',
              z: 'series',
              key: 'id',
            }),
            { match: 'x', retarget: true },
          ),
          barY(values, {
            x: 'category',
            y: 'value',
            z: 'series',
            key: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 5]) },
        },
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Grouped retarget' })
    const focusAt = (point: (typeof resolved.points)[number]) =>
      surface.paintFocus({
        primary: point,
        group: resolved.points.filter(
          (candidate) => candidate.xValue === point.xValue,
        ),
        source: 'pointer',
        pinned: false,
      })

    focusAt(resolved.points[0]!)
    const firstKeys = [
      ...container.querySelectorAll<SVGRectElement>(
        '[data-ts-focus-retarget] rect',
      ),
    ].map((node) => node.dataset.tsKey)
    focusAt(resolved.points[2]!)
    const secondKeys = [
      ...container.querySelectorAll<SVGRectElement>(
        '[data-ts-focus-retarget] rect',
      ),
    ].map((node) => node.dataset.tsKey)

    expect(firstKeys).toEqual([
      'focus:group-band:selection:0',
      'focus:group-band:selection:1',
    ])
    expect(secondKeys).toEqual(firstKeys)
    surface.destroy()
  })

  it('does not infer candidate ownership from colon-prefixed keys', () => {
    const values = [
      { id: 'a', category: 'A', value: 12 },
      { id: 'a:point', category: 'B', value: 8 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(
            bandX(values, {
              id: 'active-band',
              x: 'category',
              key: 'id',
            }),
            { retarget: true },
          ),
          barY(values, {
            x: 'category',
            y: 'value',
            key: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 20]) },
        },
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Collision-safe retarget' })

    for (const point of resolved.points) {
      surface.paintFocus({
        primary: point,
        group: [point],
        source: 'pointer',
        pinned: false,
      })
      expect(
        container.querySelectorAll('[data-ts-focus-retarget] rect'),
      ).toHaveLength(1)
    }

    surface.destroy()
  })

  it('does not confuse one focused arrow with another arrow fragment key', () => {
    const values = [
      { id: 'a', x1: 0, y1: 0, x2: 1, y2: 1 },
      { id: 'a:shaft', x1: 1, y1: 0, x2: 2, y2: 1 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          whenFocused(
            arrow(values, {
              id: 'focused-arrow',
              x1: 'x1',
              y1: 'y1',
              x2: 'x2',
              y2: 'y2',
              key: 'id',
            }),
          ),
        ],
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
        guides: false,
        focusRing: false,
      }),
      { width: 320, height: 180 },
    )
    const layer = findFocusLayer(resolved, 'focus:focused-arrow')
    const selected = layer?.focus?.points[1]
    if (!selected) throw new Error('Expected focused arrow points')

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Collision-safe arrows' })
    surface.paintFocus({
      primary: selected,
      group: [selected],
      source: 'pointer',
      pinned: false,
    })

    const visibleLines = [
      ...container.querySelectorAll('[data-ts-focus-layer] line'),
    ].filter((line) => line.getAttribute('visibility') === 'visible')
    expect(visibleLines).toHaveLength(3)
    surface.destroy()
  })
})

function findFocusLayer(scene: ChartScene, key: string) {
  const visit = (nodes: ChartScene['nodes']): SceneGroup | undefined => {
    for (const node of nodes) {
      if (node.kind !== 'group') continue
      if (node.key === key) return node
      const nested = visit(node.children)
      if (nested) return nested
    }
    return undefined
  }
  return visit(scene.nodes)
}

function flattenNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flattenNodes(node.children)] : [node],
  )
}

function findFirstRect(
  nodes: readonly SceneNode[],
): Extract<SceneNode, { kind: 'rect' }> | undefined {
  for (const node of nodes) {
    if (node.kind === 'rect') return node
    if (node.kind === 'group') {
      const nested = findFirstRect(node.children)
      if (nested) return nested
    }
  }
  return undefined
}

describe('inline mark states', () => {
  const rows = [
    { id: 'a', x: 1, y: 4, color: '#2563eb' },
    { id: 'b', x: 2, y: 7, color: '#10b981' },
  ]

  function scene() {
    return createChartScene(
      defineChart({
        marks: [
          dot(rows, {
            x: 'x',
            y: 'y',
            key: 'id',
            fill: '#64748b',
            states: [
              {
                when: { focus: 'primary' },
                style: { r: 7, fill: '#ef4444' },
              },
              {
                when: ({ matches }) => matches('primary'),
                style: {
                  r: ({ datum, index, data, point, focus, pointer }) => {
                    expect(datum).toBe(rows[index])
                    expect(data).toBe(rows)
                    expect(point).toBe(focus.primary)
                    expect(pointer).toEqual({ x: 22, y: 18 })
                    return 9
                  },
                  fill: ({ datum }) => datum.color,
                },
                transition: { type: 'tween', duration: 0 },
              },
              {
                when: { focus: 'unmatched' },
                style: { opacity: 0.2 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 3]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 360, height: 220 },
    )
  }

  it('resolves object-bag callbacks, ordered styles, and restoration in SVG', () => {
    const resolved = scene()
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Stateful dots' })
    const [primary, unmatched] = resolved.points
    if (!primary || !unmatched) throw new Error('Expected two points')

    surface.paintFocus(
      {
        primary,
        group: [primary],
        source: 'pointer',
        pinned: false,
      },
      { x: 22, y: 18 },
    )

    const circles = [...container.querySelectorAll<SVGCircleElement>('circle')]
    const active = circles.find(
      (circle) => circle.dataset.tsKey === primary.key,
    )
    const inactive = circles.find(
      (circle) => circle.dataset.tsKey === unmatched.key,
    )
    expect(active?.getAttribute('r')).toBe('9')
    expect(active?.getAttribute('fill')).toBe(rows[0]!.color)
    expect(inactive?.getAttribute('opacity')).toBe('0.2')

    surface.paintFocus(null)
    expect(active?.getAttribute('r')).toBe('3.5')
    expect(active?.getAttribute('fill')).toBe('#64748b')
    expect(inactive?.hasAttribute('opacity')).toBe(false)
    surface.destroy()
  })

  it('applies bar inset states only along the categorical axis', () => {
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY([{ id: 'vertical', category: 'A', value: 8 }], {
            x: 'category',
            y: 'value',
            key: 'id',
            inset: 12,
            states: [
              {
                when: { focus: 'primary' },
                style: { inset: 2 },
                transition: { type: 'tween', duration: 0 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 240, height: 180 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX([{ id: 'horizontal', category: 'A', value: 8 }], {
            x: 'value',
            y: 'category',
            key: 'id',
            inset: 12,
            states: [
              {
                when: { focus: 'primary' },
                style: { inset: 2 },
                transition: { type: 'tween', duration: 0 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 10]) },
          y: { scale: scaleBand<string>().domain(['A']) },
        },
      }),
      { width: 240, height: 180 },
    )

    const inspect = <
      TDatum,
      TXValue extends ChartValue,
      TYValue extends ChartValue,
    >(
      resolved: ChartScene<TDatum, TXValue, TYValue>,
    ) => {
      const primary = resolved.points[0]
      if (!primary) throw new Error('Expected a bar point')
      const container = document.createElement('div')
      const surface = svgChartRenderer.mount(container, () => {})
      surface.render(resolved, { ariaLabel: 'Stateful bar' })
      const read = () => {
        const rect = [
          ...container.querySelectorAll<SVGRectElement>('rect'),
        ].find((candidate) => candidate.dataset.tsKey === primary.key)
        if (!rect) throw new Error('Expected a bar rectangle')
        return {
          x: Number(rect.getAttribute('x')),
          y: Number(rect.getAttribute('y')),
          width: Number(rect.getAttribute('width')),
          height: Number(rect.getAttribute('height')),
        }
      }
      const before = read()
      surface.paintFocus({
        primary,
        group: [primary],
        source: 'pointer',
        pinned: false,
      })
      const after = read()
      surface.destroy()
      return { before, after }
    }

    const cappedVertical = createChartScene(
      defineChart({
        marks: [
          barY([{ id: 'capped-vertical', category: 'A', value: 8 }], {
            x: 'category',
            y: 'value',
            key: 'id',
            maxThickness: 20,
            states: [
              {
                when: { focus: 'primary' },
                style: { inset: 0 },
                transition: { type: 'tween', duration: 0 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 240, height: 180 },
    )
    const cappedHorizontal = createChartScene(
      defineChart({
        marks: [
          barX([{ id: 'capped-horizontal', category: 'A', value: 8 }], {
            x: 'value',
            y: 'category',
            key: 'id',
            maxThickness: 20,
            states: [
              {
                when: { focus: 'primary' },
                style: { inset: 0 },
                transition: { type: 'tween', duration: 0 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 10]) },
          y: { scale: scaleBand<string>().domain(['A']) },
        },
      }),
      { width: 240, height: 180 },
    )

    const verticalState = inspect(vertical)
    expect(verticalState.after.x).toBe(verticalState.before.x - 10)
    expect(verticalState.after.width).toBe(verticalState.before.width + 20)
    expect(verticalState.after.y).toBe(verticalState.before.y)
    expect(verticalState.after.height).toBe(verticalState.before.height)

    const horizontalState = inspect(horizontal)
    expect(horizontalState.after.x).toBe(horizontalState.before.x)
    expect(horizontalState.after.width).toBe(horizontalState.before.width)
    expect(horizontalState.after.y).toBe(horizontalState.before.y - 10)
    expect(horizontalState.after.height).toBe(
      horizontalState.before.height + 20,
    )

    const cappedVerticalState = inspect(cappedVertical)
    expect(cappedVerticalState.before.width).toBe(20)
    expect(cappedVerticalState.after.x).toBe(cappedVerticalState.before.x)
    expect(cappedVerticalState.after.width).toBe(20)

    const cappedHorizontalState = inspect(cappedHorizontal)
    expect(cappedHorizontalState.before.height).toBe(20)
    expect(cappedHorizontalState.after.y).toBe(cappedHorizontalState.before.y)
    expect(cappedHorizontalState.after.height).toBe(20)
  })

  it('applies series states to line geometry through the point index', () => {
    const seriesRows = [
      { id: 'a:1', series: 'A', x: 1, y: 2 },
      { id: 'a:2', series: 'A', x: 2, y: 3 },
      { id: 'b:1', series: 'B', x: 1, y: 6 },
      { id: 'b:2', series: 'B', x: 2, y: 7 },
    ]
    const resolved = createChartScene(
      defineChart({
        marks: [
          lineY(seriesRows, {
            x: 'x',
            y: 'y',
            z: 'series',
            key: 'id',
            states: [
              {
                when: { focus: 'series' },
                style: { strokeWidth: 5 },
              },
              {
                when: { focus: 'unmatched' },
                style: { opacity: 0.2 },
              },
            ],
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 3]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
      }),
      { width: 360, height: 220 },
    )
    const primary = resolved.points[0]
    if (!primary) throw new Error('Expected a line point')
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(resolved, { ariaLabel: 'Stateful lines' })
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'keyboard',
      pinned: false,
    })

    const lines = [
      ...container.querySelectorAll<SVGPathElement>('g.ts-chart__line path'),
    ]
    expect(lines).toHaveLength(2)
    expect(lines[0]?.getAttribute('stroke-width')).toBe('5')
    expect(lines[1]?.getAttribute('opacity')).toBe('0.2')
    surface.destroy()
  })
})
