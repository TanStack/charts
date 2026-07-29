import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { mountChart } from './dom'
import { lineY } from './line'
import { colorLegend } from './legend'
import { createMark } from './mark'
import { createChartScene, defineChart, findNearestPoint } from './scene'
import { renderChartSvg } from './svg'
import { linearAxes, utcXAxes } from './test-scales'
import type { ChartDefinition, ChartPoint, SceneNode } from './types'

describe('native mark and channel scene', () => {
  it('groups one flat arbitrary dataset through a z channel', () => {
    const data = [
      { id: 'a:1', series: 'a', at: new Date('2026-01-01'), value: 10 },
      { id: 'b:1', series: 'b', at: new Date('2026-01-01'), value: 14 },
      { id: 'a:2', series: 'a', at: new Date('2026-01-02'), value: 12 },
      { id: 'b:2', series: 'b', at: new Date('2026-01-02'), value: 18 },
    ]
    const definition = defineChart({
      marks: [
        lineY(data, {
          id: 'requests',
          x: 'at',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
      ],
      color: { legend: colorLegend() },
      ...utcXAxes([new Date('2026-01-01'), new Date('2026-01-02')], [10, 18]),
    })
    const scene = createChartScene(definition, { width: 600, height: 300 })
    const polylines = flatten(scene.nodes).filter(
      (node) => node.kind === 'polyline',
    )

    expect(scene.margin.top).toBe(37)
    expect(scene.chart.width).toBeGreaterThan(0)
    expect(scene.chart.height).toBeGreaterThan(0)
    expect(scene.colors.domain).toEqual(['a', 'b'])
    expect(
      flatten(scene.nodes).filter((node) => node.key.startsWith('legend-dot:')),
    ).toHaveLength(2)
    expect(polylines).toHaveLength(2)
    expect(scene.points).toHaveLength(4)
    expect(new Set(scene.points.map((point) => point.groupLabel))).toEqual(
      new Set(['a', 'b']),
    )
  })

  it('keeps explicit datum keys stable when input order changes', () => {
    const data = [
      { id: 'first', x: 0, y: 10 },
      { id: 'second', x: 1, y: 20 },
    ]
    const makeScene = (rows: typeof data) =>
      createChartScene(
        defineChart({
          marks: [
            lineY(rows, {
              id: 'stable',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          ...linearAxes([0, 1], [0, 20]),
        }),
        { width: 400, height: 240 },
      )

    const before = makeScene(data)
    const after = makeScene([...data].reverse())

    expect(new Set(before.points.map((point) => point.key))).toEqual(
      new Set(after.points.map((point) => point.key)),
    )
  })

  it('supports raw numeric data with implicit x and y channels', () => {
    const values = [4, 9, 7]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(values, { points: true })],
        ...linearAxes([0, 2], [0, 9]),
      }),
      { width: 480, height: 260 },
    )

    expect(scene.points.map((point) => point.datum)).toEqual(values)
    expect(scene.points.map((point) => point.xValue)).toEqual([0, 1, 2])
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'dot'),
    ).toHaveLength(3)
  })

  it('uses the public custom-mark protocol for extension', () => {
    const threshold = createMark<{ limit: number }>(() => ({
      id: 'threshold',
      channels: {
        y: { scale: 'y', values: [15] },
      },
      render: ({ chart, scales, theme }) => ({
        nodes: [
          {
            kind: 'rule',
            key: 'threshold:15',
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: scales.y.map(15),
            y2: scales.y.map(15),
            style: {
              stroke: theme.foreground,
              strokeOpacity: 0.5,
            },
          },
        ],
      }),
    }))
    const definition = defineChart({
      marks: [
        lineY(
          [
            { x: 0, y: 10 },
            { x: 1, y: 20 },
          ],
          { x: 'x', y: 'y' },
        ),
        threshold,
      ],
      ...linearAxes([0, 1], [0, 20]),
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<{ x: number; y: number } | { limit: number }>
    >()
    expect(
      flatten(scene.nodes).some((node) => node.key === 'threshold:15'),
    ).toBe(true)
  })

  it('collects dense channels and interaction points without argument spreading', () => {
    const count = 200_000
    const values = Array<number>(count).fill(0)
    const point: ChartPoint<number> = {
      key: 'dense',
      markId: 'dense',
      group: null,
      groupLabel: 'dense',
      datum: 0,
      datumIndex: 0,
      xValue: 0,
      yValue: 0,
      x: 0,
      y: 0,
      color: '#2563eb',
    }
    const points = Array<ChartPoint<number>>(count).fill(point)
    const dense = createMark<number>(() => ({
      id: 'dense',
      channels: {
        x: { scale: 'x', values },
      },
      render: () => ({ nodes: [], points }),
    }))

    const scene = createChartScene(
      defineChart({
        marks: [dense],
        ...linearAxes([0, 1], [0, 1]),
        guides: false,
      }),
      { width: 100, height: 60 },
    )

    expect(scene.points).toHaveLength(count)
  })

  it('finds the nearest original datum', () => {
    const datum = { at: new Date('2026-01-01T00:00:00Z'), value: 12 }
    const scene = createChartScene(
      defineChart({
        marks: [lineY([datum], { x: 'at', y: 'value' })],
        ...utcXAxes(
          [new Date('2025-12-31T00:00:00Z'), new Date('2026-01-02T00:00:00Z')],
          [0, 12],
        ),
      }),
      { width: 400, height: 240 },
    )
    const point = scene.points[0]

    expect(findNearestPoint(scene, point.x + 2, point.y + 1, 8)?.datum).toBe(
      datum,
    )
    expect(findNearestPoint(scene, 0, 0, 8)).toBeNull()
  })

  it('renders escaped, complete SVG without a DOM', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        ...linearAxes([0, 2], [0, 3]),
      }),
      {
        width: 480,
        height: 260,
      },
    )
    const svg = renderChartSvg(scene, {
      ariaLabel: 'Revenue <trend>',
      ariaDescription: 'A & B',
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
    expect(svg).toContain('aria-label="Revenue &lt;trend&gt;"')
    expect(svg).toContain('<desc>A &amp; B</desc>')
    expect(svg).toContain('data-ts-chart-focus')
  })

  it('inherits shared grid presentation attributes from one group', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 3, 2])],
        x: { ...linearAxes([0, 2], [0, 3]).x, grid: true },
        y: { ...linearAxes([0, 2], [0, 3]).y, grid: true },
      }),
      { width: 480, height: 260 },
    )
    const grid = scene.nodes.find(
      (node) => node.kind === 'group' && node.key === 'grid',
    )
    if (!grid || grid.kind !== 'group') throw new Error('Expected grid group')

    expect(grid.style).toEqual({
      stroke: 'currentColor',
      strokeOpacity: 0.11,
      strokeWidth: 1,
    })
    expect(grid.children.length).toBeGreaterThan(0)
    expect(grid.children.every((node) => node.style === undefined)).toBe(true)

    const container = document.createElement('div')
    container.innerHTML = renderChartSvg(scene, { ariaLabel: 'Grid' })
    const renderedGrid = container.querySelector('[data-ts-key="grid"]')
    const renderedRules = renderedGrid?.querySelectorAll('line')
    expect(renderedGrid?.getAttribute('stroke')).toBe('currentColor')
    expect(renderedGrid?.getAttribute('stroke-opacity')).toBe('0.11')
    expect(renderedGrid?.getAttribute('stroke-width')).toBe('1')
    expect(renderedRules?.length).toBeGreaterThan(0)
    for (const rule of renderedRules ?? []) {
      expect(rule.hasAttribute('stroke')).toBe(false)
      expect(rule.hasAttribute('stroke-opacity')).toBe(false)
      expect(rule.hasAttribute('stroke-width')).toBe(false)
    }
  })

  it('mounts, updates, interacts, and destroys through vanilla TypeScript', () => {
    const firstDatum = { id: 'a', x: 0, y: 10 }
    const definition = defineChart({
      marks: [
        lineY([firstDatum], {
          x: 'x',
          y: 'y',
          key: 'id',
          points: true,
        }),
      ],
      ...linearAxes([0, 1], [0, 10]),
    })
    const onFocusChange = vi.fn()
    const container = document.createElement('div')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      maxFocusDistance: 1_000,
      onFocusChange,
    }
    const host = mountChart(container, options)
    const point = host.getScene().points[0]
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: point.x,
        clientY: point.y,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(firstDatum)

    host.update({
      ...options,
      ariaLabel: 'Updated revenue',
    })
    expect(container.innerHTML).toContain('Updated revenue')
    expect(
      container
        .querySelector('[data-ts-chart-focus]')
        ?.getAttribute('visibility'),
    ).toBe('visible')
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(firstDatum)

    host.destroy()
    expect(container.childNodes).toHaveLength(0)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
