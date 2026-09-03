import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { measureSceneLabelBounds } from './guide-layout'
import { lineY } from './line'
import { createMark } from './mark'
import { createChartScene, defineChart } from './scene'
import { text } from './text'
import type {
  ChartAxisTickLabelContext,
  ChartAxisTickLabelOptions,
  ChartAxisTickLabelValue,
  ChartTextMeasurer,
  SceneLabel,
  SceneNode,
} from './types'

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
  it('keeps grid candidates when tick stubs are removed', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 2, 3])],
        scales: {
          x: {
            scale: scaleLinear().domain([0, 2]),
            grid: true,
            axis: { ticks: { count: 3, size: 0 } },
          },
          y: {
            scale: scaleLinear().domain([0, 3]),
            grid: true,
            axis: { ticks: { count: 4, size: 0 } },
          },
        },
      }),
      { width: 480, height: 260 },
      { measureText },
    )
    const keys = flatten(scene.nodes).map((node) => node.key)

    expect(keys.some((key) => key.startsWith('x-grid:'))).toBe(true)
    expect(keys.some((key) => key.startsWith('y-grid:'))).toBe(true)
    expect(keys.some((key) => key.startsWith('x-tick-rule:'))).toBe(false)
    expect(keys.some((key) => key.startsWith('y-tick-rule:'))).toBe(false)
    expect(keys.some((key) => key.startsWith('x-tick-label:'))).toBe(true)
    expect(keys.some((key) => key.startsWith('y-tick-label:'))).toBe(true)
  })

  it('thins colliding labels independently from rotation and explicit opt-out', () => {
    const categories = Array.from(
      { length: 12 },
      (_value, index) => `Long category ${index + 1}`,
    )
    const definition = defineChart({
      marks: [
        lineY(
          categories.map((category, value) => ({ category, value })),
          { x: 'category', y: 'value' },
        ),
      ],
      scales: {
        x: {
          scale: scaleBand<string>().domain(categories),
          axis: { tickLabels: { rotate: -30 } },
        },
        y: { scale: scaleLinear().domain([0, categories.length]) },
      },
    })
    const narrow = createChartScene(
      definition,
      { width: 320, height: 260 },
      { measureText },
    )
    const wide = createChartScene(
      definition,
      { width: 1_200, height: 260 },
      { measureText },
    )
    const all = createChartScene(
      {
        ...definition,
        scales: {
          ...definition.scales,
          x: {
            ...definition.scales.x,
            axis: { tickLabels: { rotate: -30, thin: false } },
          },
        },
      },
      { width: 320, height: 260 },
      { measureText },
    )
    const labels = (scene: ReturnType<typeof createChartScene>) =>
      flatten(scene.nodes).filter(
        (node): node is SceneLabel =>
          node.kind === 'label' && node.key.startsWith('x-tick-label:'),
      )

    expect(labels(narrow).length).toBeLessThan(labels(wide).length)
    expect(labels(all)).toHaveLength(categories.length)
    expect(labels(narrow).every((label) => label.rotate === -30)).toBe(true)
  })

  it('resolves typed tick-label accessors before thinning with stable candidate indices', () => {
    const categories = Array.from(
      { length: 12 },
      (_value, index) => `Long category ${index + 1}`,
    )
    const contexts: ChartAxisTickLabelContext<string>[] = []
    const dx: ChartAxisTickLabelValue<string, number> = (context) => {
      expectTypeOf(context).toEqualTypeOf<ChartAxisTickLabelContext<string>>()
      contexts.push(context)
      return context.index === 0 ? -context.bandwidth / 2 : undefined
    }
    const tickLabels = {
      anchor: ({ index }) => (index === 0 ? 'start' : undefined),
      dx,
    } satisfies ChartAxisTickLabelOptions<string>
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            categories.map((category, value) => ({ category, value })),
            { x: 'category', y: 'value' },
          ),
        ],
        margin: 0,
        scales: {
          x: {
            scale: scaleBand<string>().domain(categories),
            axis: { tickLabels },
          },
          y: {
            scale: scaleLinear().domain([0, categories.length]),
            axis: false,
          },
        },
      }),
      { width: 260, height: 180 },
      { measureText },
    )
    const labels = flatten(scene.nodes).filter(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key.startsWith('x-tick-label:'),
    )

    expect(contexts.map(({ index }) => index)).toEqual(
      categories.map((_value, index) => index),
    )
    expect(contexts.map(({ value }) => value)).toEqual(categories)
    expect(contexts.every(({ bandwidth }) => bandwidth > 0)).toBe(true)
    expect(labels.length).toBeLessThan(categories.length)
    expect(
      labels.map(({ text }) => contexts[categories.indexOf(text)]?.index),
    ).toEqual(labels.map(({ text }) => categories.indexOf(text)))
    expect(labels[0]).toMatchObject({
      x: scene.chart.x,
      anchor: 'start',
    })
  })

  it('applies tick-label typography, offsets, opacity, and axis defaults to scene labels', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([0, 1])],
        margin: 0,
        scales: {
          x: {
            scale: scaleLinear().domain([0, 1]),
            axis: {
              ticks: { values: [0, 1] },
              tickLabels: {
                rotate: -30,
                fontSize: ({ index }) => (index === 0 ? 18 : undefined),
                fontWeight: ({ index }) => (index === 0 ? 700 : undefined),
                opacity: ({ index }) => (index === 0 ? 0.4 : undefined),
                anchor: ({ index }) => (index === 0 ? 'start' : undefined),
                dx: ({ index }) => (index === 0 ? 3 : undefined),
                dy: ({ index }) => (index === 0 ? 5 : undefined),
              },
            },
          },
          y: {
            scale: scaleLinear().domain([0, 1]),
            axis: { ticks: { values: [0, 1] } },
          },
        },
      }),
      { width: 480, height: 240 },
      { measureText },
    )
    const labels = flatten(scene.nodes).filter(
      (node): node is SceneLabel => node.kind === 'label',
    )
    const xLabels = labels.filter((label) =>
      label.key.startsWith('x-tick-label:'),
    )
    const yLabels = labels.filter((label) =>
      label.key.startsWith('y-tick-label:'),
    )
    const first = xLabels[0]!
    const second = xLabels[1]!

    expect(first).toMatchObject({
      x: scene.scales.x.ticks[0]!.position + 3,
      y: scene.chart.y + scene.chart.height + 4 + 4 + 18 * 0.8 + 5,
      anchor: 'start',
      rotate: -30,
      fontSize: 18,
      fontWeight: 700,
      style: { opacity: 0.4 },
    })
    expect(second).toMatchObject({
      anchor: 'end',
      rotate: -30,
      fontSize: 11,
      style: { fillOpacity: 0.68 },
    })
    expect(second.fontWeight).toBeUndefined()
    expect(yLabels.every(({ anchor }) => anchor === 'end')).toBe(true)
  })

  it('measures accessor-resolved tick-label bounds into automatic margins', () => {
    const definition = (fontSize: number, dx: number) =>
      defineChart({
        marks: [lineY([0, 1])],
        scales: {
          x: {
            scale: scaleLinear().domain([0, 1]),
            axis: {
              ticks: { values: [0, 1] },
              tickLabels: {
                fontSize: () => fontSize,
                anchor: () => 'start' as const,
                dx: () => dx,
              },
            },
          },
          y: { scale: scaleLinear().domain([0, 1]), axis: false },
        },
      })
    const regular = createChartScene(
      definition(11, 0),
      { width: 320, height: 180 },
      { measureText },
    )
    const enlarged = createChartScene(
      definition(24, 18),
      { width: 320, height: 180 },
      { measureText },
    )

    expect(enlarged.margin.bottom).toBeGreaterThan(regular.margin.bottom)
    expect(enlarged.margin.right).toBeGreaterThan(regular.margin.right)
    for (const label of flatten(enlarged.nodes).filter(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key.startsWith('x-tick-label:'),
    )) {
      const bounds = measureSceneLabelBounds(label, measureText)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        enlarged.width + 0.001,
      )
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        enlarged.height + 0.001,
      )
    }
  })

  it('hard-keeps exact labels without adding tick stubs or grid lines', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([0, 10])],
        scales: {
          x: {
            scale: scaleLinear().domain([0, 10]),
            grid: true,
            axis: {
              ticks: { values: [0, 10], size: 0 },
              tickLabels: { thin: { keep: [5] } },
            },
          },
          y: { scale: scaleLinear().domain([0, 10]), axis: false },
        },
      }),
      { width: 320, height: 180 },
      { measureText },
    )
    const keys = flatten(scene.nodes).map((node) => node.key)

    expect(keys).toContain('x-tick-label:number:5')
    expect(keys).not.toContain('x-tick-rule:number:5')
    expect(keys).not.toContain('x-grid:number:5')
    expect(keys.filter((key) => key.startsWith('x-grid:'))).toHaveLength(2)
  })

  it('uses axis length for spacing-based semantic candidates', () => {
    const definition = defineChart({
      marks: [lineY([0, 100])],
      scales: {
        x: {
          scale: scaleLinear().domain([0, 100]),
          axis: { ticks: { spacing: 80 } },
        },
        y: { scale: scaleLinear().domain([0, 100]) },
      },
    })
    const narrow = createChartScene(definition, { width: 240, height: 180 })
    const wide = createChartScene(definition, { width: 960, height: 180 })

    expect(narrow.scales.x.ticks.length).toBeLessThan(
      wide.scales.x.ticks.length,
    )
  })

  it('rejects competing semantic tick policies', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 10])],
          scales: {
            x: {
              scale: scaleLinear().domain([0, 10]),
              axis: { ticks: { count: 3, spacing: 80 } },
            },
            y: { scale: scaleLinear().domain([0, 10]) },
          },
        }),
        { width: 320, height: 180 },
      ),
    ).toThrow(/only one candidate policy/)
  })

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
      scales: {
        x: {
          scale: scaleBand().domain(domain).padding(0.1),
          axis: { tickLabels: { rotate: -35 }, label: 'Package' },
        },
        y: {
          scale: scaleLinear().domain([0, 3]),
          axis: { label: 'Downloads' },
        },
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

  it('keeps long axis titles inside narrow surfaces', () => {
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      scales: {
        x: {
          scale: scaleLinear().domain([0, 2]),
          axis: {
            label: '← more disagree · Number of responses · more agree →',
          },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
      },
    })
    const scene = createChartScene(
      definition,
      { width: 320, height: 260 },
      { measureText },
    )
    const regular = createChartScene(
      definition,
      { width: 360, height: 260 },
      { measureText },
    )
    const title = flatten(scene.nodes).find(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key === 'x-label',
    )
    const regularTitle = flatten(regular.nodes).find(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key === 'x-label',
    )
    if (!title || !regularTitle) throw new Error('Expected x-axis titles')

    const bounds = measureSceneLabelBounds(title, measureText)
    expect(title.fontSize).toBe(10)
    expect(regularTitle.fontSize).toBe(11)
    expect(bounds.x).toBeGreaterThanOrEqual(3.99)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(scene.width - 3.99)
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
      scales: {
        x: { scale: scaleLinear().domain([0, 10]) },
        y: { scale: scaleLinear().domain([0, 10]) },
      },
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
      scales: {
        x: { scale: scaleLinear().domain([0, 2]), axis: { label: 'Index' } },
        y: {
          scale: scaleLinear().domain([0, 3]),
          axis: {
            ticks: { format: () => 'A deliberately long tick label' },
            label: 'Value',
          },
        },
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
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        },
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
      scales: {
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
      },
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
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        },
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
      scales: {
        x: {
          scale: scaleLinear().domain([0, 1]),
          axis: { label: 'Horizontal axis' },
        },
        y: {
          scale: scaleLinear().domain([0, 1]),
          axis: { label: 'Vertical axis' },
        },
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
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        },
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
      scales: {
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
      },
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
        scales: {
          x: null,
          y: null,
        },
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
      scales: {
        x: {
          scale: scaleLinear().domain([0, 2]),
          axis: { label: 'Horizontal' },
        },
        y: {
          scale: scaleLinear().domain([0, 3]),
          grid: true,
          axis: { label: 'Vertical' },
        },
      },
    })
    const sceneFor = (x: boolean, y: boolean) =>
      createChartScene(
        {
          ...definition,
          scales: {
            ...definition.scales,
            x: {
              ...definition.scales.x,
              axis: x ? definition.scales.x.axis : false,
            },
            y: {
              ...definition.scales.y,
              axis: y ? definition.scales.y.axis : false,
            },
          },
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
      true,
    )
  })
})

function sceneWithYFormat(format: (value: unknown) => string) {
  return createChartScene(
    defineChart({
      marks: [lineY([1, 2, 3])],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]), axis: { label: 'Release' } },
        y: {
          scale: scaleLinear().domain([0, 3]),
          axis: { ticks: { format }, label: 'Downloads' },
        },
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
