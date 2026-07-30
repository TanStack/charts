import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { measureSceneLabelBounds } from './guide-layout'
import { lineY } from './line'
import { createMark } from './mark'
import { createChartScene, defineChart } from './scene'
import { text } from './text'
import type { ChartTextMeasurer, SceneLabel, SceneNode } from './types'

const measureText: ChartTextMeasurer = (text, options) => {
  const width = text.length * options.fontSize * 0.6
  const height = options.fontSize
  return {
    x:
      options.anchor === 'middle'
        ? -width / 2
        : options.anchor === 'end'
          ? -width
          : 0,
    y:
      options.baseline === 'middle'
        ? -height / 2
        : options.baseline === 'hanging'
          ? 0
          : -height * 0.8,
    width,
    height,
  }
}

describe('automatic scene guide layout', () => {
  it('grows with guide content and stacks titles outside tick labels', () => {
    const short = sceneWithYFormat((value) => String(value))
    const long = sceneWithYFormat(
      (value) => `Approximately ${String(value)} million downloads`,
    )

    expect(long.margin.left).toBeGreaterThan(short.margin.left)

    const labels = flatten(long.nodes).filter(
      (node): node is SceneLabel => node.kind === 'label',
    )
    const yTicks = labels.filter((node) => node.key.startsWith('y-tick-label:'))
    const yTitle = labels.find((node) => node.key === 'y-label')
    const xTicks = labels.filter((node) => node.key.startsWith('x-tick-label:'))
    const xTitle = labels.find((node) => node.key === 'x-label')
    if (!yTitle || !xTitle) throw new Error('Expected axis titles')

    const yTitleBounds = measureSceneLabelBounds(yTitle, measureText)
    const leftmostTick = Math.min(
      ...yTicks.map((label) => measureSceneLabelBounds(label, measureText).x),
    )
    expect(yTitleBounds.x + yTitleBounds.width).toBeLessThan(leftmostTick)

    const xTitleBounds = measureSceneLabelBounds(xTitle, measureText)
    const lowestTick = Math.max(
      ...xTicks.map((label) => {
        const bounds = measureSceneLabelBounds(label, measureText)
        return bounds.y + bounds.height
      }),
    )
    expect(xTitleBounds.y).toBeGreaterThan(lowestTick)
  })

  it('contains long rotated endpoint labels and reclaims space when wide', () => {
    const domain = [
      'A very long first category',
      'Middle',
      'A very long final category',
    ]
    const definition = defineChart({
      marks: [
        lineY(
          domain.map((category, index) => ({ category, value: index + 1 })),
          { x: 'category', y: 'value' },
        ),
      ],
      x: {
        scale: scaleBand().domain(domain).padding(0.1),
        tickRotate: -35,
        label: 'Package',
      },
      y: {
        scale: scaleLinear().domain([0, 3]),
        label: 'Downloads',
      },
    })
    const narrow = createChartScene(
      definition,
      { width: 280, height: 260 },
      { measureText },
    )
    const wide = createChartScene(
      definition,
      { width: 900, height: 260 },
      { measureText },
    )

    for (const scene of [narrow, wide]) {
      const labels = flatten(scene.nodes).filter(
        (node): node is SceneLabel =>
          node.kind === 'label' &&
          (node.key.startsWith('x-tick-label:') ||
            node.key === 'x-label' ||
            node.key.startsWith('y-tick-label:') ||
            node.key === 'y-label'),
      )
      for (const label of labels) {
        const bounds = measureSceneLabelBounds(label, measureText)
        expect(bounds.x).toBeGreaterThanOrEqual(-0.001)
        expect(bounds.y).toBeGreaterThanOrEqual(-0.001)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(scene.width + 0.001)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(
          scene.height + 0.001,
        )
      }
    }

    expect(wide.margin.left + wide.margin.right).toBeLessThan(
      narrow.margin.left + narrow.margin.right,
    )
  })

  it('contains text-mark labels with unlocked margins', () => {
    const rows = [
      { id: 'top-right', x: 10, y: 10, label: 'Top right' },
      { id: 'bottom-left', x: 0, y: 0, label: 'Bottom left' },
    ]
    const definition = defineChart({
      marks: [
        text(rows, {
          x: 'x',
          y: 'y',
          text: 'label',
          anchor: (row) => (row.x === 0 ? 'end' : 'start'),
          dx: (row) => (row.x === 0 ? -6 : 6),
          dy: (row) => (row.y === 0 ? 13 : -13),
        }),
      ],
      x: { scale: scaleLinear().domain([0, 10]) },
      y: { scale: scaleLinear().domain([0, 10]) },
    })
    const automatic = createChartScene(
      definition,
      { width: 480, height: 260 },
      { measureText },
    )
    const locked = createChartScene(
      { ...definition, margin: 0 },
      { width: 480, height: 260 },
      { measureText },
    )

    const markLabels = (nodes: readonly SceneNode[]) =>
      flatten(nodes).filter(
        (node): node is SceneLabel =>
          node.kind === 'label' && node.key.startsWith('text-0:'),
      )

    for (const label of markLabels(automatic.nodes)) {
      const bounds = measureSceneLabelBounds(label, measureText)
      expect(bounds.x).toBeGreaterThanOrEqual(3.99)
      expect(bounds.y).toBeGreaterThanOrEqual(3.99)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        automatic.width - 3.99,
      )
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        automatic.height - 3.99,
      )
    }

    expect(
      markLabels(locked.nodes).some((label) => {
        const bounds = measureSceneLabelBounds(label, measureText)
        return (
          bounds.x < 0 ||
          bounds.y < 0 ||
          bounds.x + bounds.width > locked.width ||
          bounds.y + bounds.height > locked.height
        )
      }),
    ).toBe(true)
  })

  it('treats numeric margin sides as locks', () => {
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      x: { scale: scaleLinear().domain([0, 2]), label: 'Index' },
      y: {
        scale: scaleLinear().domain([0, 3]),
        label: 'Value',
        format: () => 'A deliberately long tick label',
      },
      margin: { left: 7 },
    })
    const partial = createChartScene(
      definition,
      { width: 480, height: 260 },
      { measureText },
    )
    const locked = createChartScene(
      { ...definition, margin: 0 },
      { width: 480, height: 260 },
      { measureText },
    )

    expect(partial.margin.left).toBe(7)
    expect(partial.margin.bottom).toBeGreaterThan(0)
    expect(locked.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('grows unlocked sides around text marks without overriding locks', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          text([{ x: 1, y: 1, label: 'Endpoint' }], {
            x: 'x',
            y: 'y',
            text: 'label',
            anchor: 'start',
            dx: 8,
            dy: -8,
          }),
        ],
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
        margin: { right: 7 },
      }),
      { width: 480, height: 260 },
      { measureText },
    )

    expect(scene.margin.right).toBe(7)
    expect(scene.margin.top).toBeGreaterThan(7)
  })

  it('does not grow text-mark margins when margins are locked or marks clip', () => {
    const marks = [
      text([{ x: 0.5, y: 1, label: 'Endpoint' }], {
        x: 'x',
        y: 'y',
        text: 'label',
        dy: -8,
      }),
    ]
    const axes = {
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 1]) },
    }
    const locked = createChartScene(
      defineChart({
        marks,
        ...axes,
        guides: false,
        margin: 0,
      }),
      { width: 480, height: 260 },
      { measureText },
    )
    const clipped = createChartScene(
      defineChart({
        marks,
        ...axes,
        guides: false,
        clip: true,
      }),
      { width: 480, height: 260 },
      { measureText },
    )

    expect(locked.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(clipped.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('uses content-only margins for text marks when guides are disabled', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          text([{ x: 0.5, y: 1, label: 'Endpoint' }], {
            x: 'x',
            y: 'y',
            text: 'label',
            dy: -8,
          }),
        ],
        guides: false,
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
      }),
      { width: 480, height: 260 },
      { measureText },
    )

    expect(scene.margin.top).toBeGreaterThan(0)
    expect(scene.margin.right).toBe(0)
    expect(scene.margin.bottom).toBe(0)
    expect(scene.margin.left).toBe(0)
  })

  it('does not render marks during guide-only layout passes', () => {
    const render = vi.fn(() => ({ nodes: [] }))
    const initialize = vi.fn(() => ({
      id: 'probe',
      channels: {},
      render,
    }))
    const definition = defineChart({
      marks: [createMark(initialize)],
      x: {
        scale: scaleLinear().domain([0, 1]),
        label: 'Horizontal axis',
      },
      y: {
        scale: scaleLinear().domain([0, 1]),
        label: 'Vertical axis',
      },
    })

    createChartScene(definition, { width: 480, height: 260 }, { measureText })

    expect(initialize).toHaveBeenCalledOnce()
    expect(render).toHaveBeenCalledOnce()
  })

  it('materializes text geometry accessors once and renders the mark once', () => {
    const rows = [
      { id: 'a', x: 0.25, y: 1, label: 'Alpha' },
      { id: 'b', x: 0.75, y: 1, label: 'Beta' },
    ]
    const anchor = vi.fn(() => 'middle' as const)
    const dx = vi.fn(() => 0)
    const dy = vi.fn(() => -8)
    const rotate = vi.fn(() => 0)
    const fill = vi.fn(() => '#2563eb')
    const base = text(rows, {
      x: 'x',
      y: 'y',
      text: 'label',
      key: 'id',
      anchor,
      dx,
      dy,
      rotate,
      fill,
    })
    const render = vi.fn()
    const mark = createMark((context) => {
      const initialized = base.initialize(context)
      return {
        ...initialized,
        render: (renderContext) => {
          render()
          return initialized.render(renderContext)
        },
      }
    })

    createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
      }),
      { width: 480, height: 260 },
      { measureText },
    )

    expect(anchor).toHaveBeenCalledTimes(rows.length)
    expect(dx).toHaveBeenCalledTimes(rows.length)
    expect(dy).toHaveBeenCalledTimes(rows.length)
    expect(rotate).toHaveBeenCalledTimes(rows.length)
    expect(fill).toHaveBeenCalledTimes(rows.length)
    expect(render).toHaveBeenCalledOnce()
  })

  it('uses the injected text measurer for text-mark margins', () => {
    const definition = defineChart({
      marks: [
        text([{ x: 0.5, y: 1, label: 'Endpoint' }], {
          x: 'x',
          y: 'y',
          text: 'label',
        }),
      ],
      guides: false,
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 1]) },
    })
    const measuredScene = (height: number) =>
      createChartScene(
        definition,
        { width: 480, height: 260 },
        {
          measureText: (label, options) => ({
            x: -(label.length * options.fontSize * 0.3),
            y: -height / 2,
            width: label.length * options.fontSize * 0.6,
            height,
          }),
        },
      )

    expect(measuredScene(40).margin.top).toBeGreaterThan(
      measuredScene(8).margin.top,
    )
  })

  it('uses no implicit inset when guides are disabled', () => {
    const scene = createChartScene(
      defineChart({
        marks: [],
        guides: false,
        x: null,
        y: null,
      }),
      { width: 480, height: 260 },
      { measureText },
    )

    expect(scene.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(scene.chart).toEqual({ x: 0, y: 0, width: 480, height: 260 })
  })

  it('controls x and y guide visibility independently', () => {
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      x: {
        scale: scaleLinear().domain([0, 2]),
        label: 'Horizontal',
      },
      y: {
        scale: scaleLinear().domain([0, 3]),
        label: 'Vertical',
        grid: true,
      },
    })
    const sceneFor = (x: boolean, y: boolean) =>
      createChartScene(
        {
          ...definition,
          x: { ...definition.x, guide: x },
          y: { ...definition.y, guide: y },
        },
        { width: 480, height: 260 },
        { measureText },
      )
    const keysFor = (x: boolean, y: boolean) =>
      flatten(sceneFor(x, y).nodes).map((node) => node.key)

    expect(keysFor(true, true)).toEqual(
      expect.arrayContaining(['x-axis', 'x-label', 'y-label']),
    )
    expect(keysFor(true, false)).toEqual(
      expect.arrayContaining(['x-axis', 'x-label']),
    )
    expect(keysFor(true, false)).not.toEqual(
      expect.arrayContaining(['y-label']),
    )
    expect(keysFor(false, true)).not.toEqual(
      expect.arrayContaining(['x-axis', 'x-label']),
    )
    expect(keysFor(false, true)).toEqual(expect.arrayContaining(['y-label']))

    const neither = sceneFor(false, false)
    expect(neither.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(flatten(neither.nodes).some((node) => node.key === 'axes')).toBe(
      false,
    )
    expect(flatten(neither.nodes).some((node) => node.key === 'grid')).toBe(
      false,
    )
  })
})

function sceneWithYFormat(format: (value: unknown) => string) {
  return createChartScene(
    defineChart({
      marks: [lineY([1, 2, 3])],
      x: {
        scale: scaleLinear().domain([0, 2]),
        label: 'Release',
      },
      y: {
        scale: scaleLinear().domain([0, 3]),
        label: 'Downloads',
        format,
      },
    }),
    { width: 640, height: 320 },
    { measureText },
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
