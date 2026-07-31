import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { bandX } from './band'
import { barY } from './bar'
import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { svgChartRenderer } from './svg-surface'

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
        x: {
          scale: scaleBand<string>().domain(['A', 'B']).padding(0.1),
        },
        y: { scale: scaleLinear().domain([0, 20]) },
      }),
      { width: 480, height: 260 },
    )
  }

  it('keeps focus effects out of hit testing and preserves mark order', () => {
    const resolved = scene()
    const marks = resolved.nodes.find((node) => node.key === 'marks')
    if (marks?.kind !== 'group') throw new Error('Expected mark group')
    const focus = marks.children[0]
    if (focus?.kind !== 'group' || !focus.focus) {
      throw new Error('Expected focus layer')
    }

    expect(focus.focus).toMatchObject({ match: 'x', placement: 'under' })
    expect(focus.focus.points).toHaveLength(2)
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
    ).toBe(false)
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

    const layer = container.querySelector<SVGGElement>('[data-ts-focus-layer]')
    expect(layer?.getAttribute('visibility')).toBe('visible')
    const visibleRects = [...(layer?.querySelectorAll('rect') ?? [])].filter(
      (rect) => rect.getAttribute('visibility') === 'visible',
    )
    expect(visibleRects).toHaveLength(1)
    expect(
      visibleRects.every((rect) => Number(rect.getAttribute('height')) > 0),
    ).toBe(true)

    surface.paintFocus(null)
    expect(layer?.getAttribute('visibility')).toBe('hidden')
    surface.destroy()
  })
})

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
                transition: { duration: 0 },
              },
              {
                when: { focus: 'unmatched' },
                style: { opacity: 0.2 },
              },
            ],
          }),
        ],
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) },
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
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) },
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
