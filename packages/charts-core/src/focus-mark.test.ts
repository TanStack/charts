import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { bandX } from './band'
import { barY } from './bar'
import { whenFocused } from './focus-mark'
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
