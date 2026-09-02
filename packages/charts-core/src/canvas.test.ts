import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { areaY } from './area'
import { createChartRendererAdapter } from './adapter-renderer'
import { barY } from './bar'
import {
  canvasChartRenderer,
  createCanvasChartRenderer,
  mountCanvasChart,
  type CanvasChartHost,
} from './canvas'
import { crosshair } from './crosshair'
import { controlledSignal } from './interaction-signal'
import {
  continuousCursor,
  type ContinuousCursorChange,
  type ContinuousCursorPosition,
} from './interaction-cursor'
import { handleX, type HandleXChange } from './interaction-handle'
import { zoomX, type ZoomXChange, type ZoomXWindow } from './interaction-zoom'
import { interactiveColorLegend } from './interactive-legend'
import { dot } from './dot'
import { facet } from './facet'
import { lineX, lineY } from './line'
import { mountChart } from './dom'
import { pie, polar, radialArc, radialDot, radialLine } from './polar'
import { resolveCrosshairGuide } from './crosshair-resolver'
import { createChartScene, defineChart } from './scene'
import { createSvgChartRenderer } from './svg-surface'
import { renderChartSvgWithResources } from './svg-resources'
import { text } from './text'
import { tooltip } from './tooltip'
import { composeViews, fill, inset, layer } from './view'
import type { ChartSurfaceRenderOptions } from './dom-types'
import type { ChartScene, SceneNode } from './types'

interface FakeCanvasContext {
  operations: string[]
  gradientStops: Array<[number, string]>
  textPaints: Array<{
    text: string
    globalAlpha: number
    font: string
    direction: CanvasDirection
    textAlign: CanvasTextAlign
  }>
  context: CanvasRenderingContext2D
}

const contexts = new Map<HTMLCanvasElement, FakeCanvasContext>()
let getContextSpy: ReturnType<typeof vi.spyOn>
let originalPath: typeof Path2D | undefined

beforeEach(() => {
  contexts.clear()
  originalPath = window.Path2D
  Object.defineProperty(window, 'Path2D', {
    configurable: true,
    value: class {
      constructor(data?: string) {
        void data
      }
    },
  })
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function (this: HTMLCanvasElement) {
      let value = contexts.get(this)
      if (!value) {
        value = fakeContext()
        contexts.set(this, value)
      }
      return value.context
    })
})

afterEach(() => {
  getContextSpy.mockRestore()
  Object.defineProperty(window, 'Path2D', {
    configurable: true,
    value: originalPath,
  })
  vi.restoreAllMocks()
})

describe('Canvas renderer', () => {
  it('paints authored caps and joins for both line directions', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY([4, 9], { lineCap: 'butt', lineJoin: 'bevel' }),
          lineX([4, 9], { lineCap: 'square', lineJoin: 'miter' }),
        ],
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
        guides: false,
      }),
      { width: 300, height: 180 },
    )
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})

    surface.render(scene, renderOptions())

    const canvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const painted = canvas ? contexts.get(canvas) : undefined
    if (!painted) throw new Error('Expected a painted scene canvas')
    expect(painted.operations).toEqual(
      expect.arrayContaining([
        'lineCap:butt',
        'lineJoin:bevel',
        'lineCap:square',
        'lineJoin:miter',
      ]),
    )

    surface.destroy()
  })

  it('paints round caps and joins by default for both line directions', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([4, 9]), lineX([4, 9])],
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        },
        guides: false,
      }),
      { width: 300, height: 180 },
    )
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})

    surface.render(scene, renderOptions())

    const canvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const painted = canvas ? contexts.get(canvas) : undefined
    if (!painted) throw new Error('Expected a painted scene canvas')
    expect(
      painted.operations.filter((operation) =>
        operation.startsWith('lineCap:'),
      ),
    ).toEqual(['lineCap:round', 'lineCap:round'])
    expect(
      painted.operations.filter((operation) =>
        operation.startsWith('lineJoin:'),
      ),
    ).toEqual(['lineJoin:round', 'lineJoin:round'])

    surface.destroy()
  })

  it('composes renderer-tagged marks in source order', () => {
    const data = [
      { id: 'a', category: 'A', value: 3 },
      { id: 'b', category: 'B', value: 7 },
      { id: 'c', category: 'C', value: 5 },
    ]
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          areaY(data, {
            id: 'canvas-area',
            x: 'category',
            y: 'value',
            renderer: canvasChartRenderer,
          }),
          barY(data, {
            id: 'svg-bars',
            x: 'category',
            y: 'value',
            key: 'id',
          }),
          lineY(data, {
            id: 'canvas-line',
            x: 'category',
            y: 'value',
            key: 'id',
            renderer: canvasChartRenderer,
          }),
          dot(data, {
            id: 'svg-dots',
            x: 'category',
            y: 'value',
            key: 'id',
          }),
          text(data, {
            id: 'svg-labels',
            x: 'category',
            y: 'value',
            text: 'id',
          }),
        ],
        scales: {
          x: { scale: scaleBand<string>().domain(['A', 'B', 'C']) },
          y: { scale: scaleLinear().domain([0, 8]) },
        },
      }),
      width: 400,
      height: 240,
      ariaLabel: 'Mixed renderer chart',
    })

    const root = container.querySelector<HTMLElement>('.ts-chart-layers')
    expect(root?.getAttribute('aria-label')).toBe('Mixed renderer chart')
    const layers = [
      ...container.querySelectorAll<HTMLElement>('.ts-chart-layer'),
    ]
    expect(layers).toHaveLength(5)
    expect(
      layers.map((layer) => layer.querySelector('canvas') !== null),
    ).toEqual([false, true, false, true, false])
    expect(container.querySelectorAll('canvas')).toHaveLength(10)
    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelector('[data-ts-key="svg-bars"]')).not.toBeNull()
    expect(container.querySelector('[data-ts-key="svg-dots"]')).not.toBeNull()
    expect(container.querySelector('[data-ts-key="svg-labels"]')).not.toBeNull()
    expect(container.querySelector('[data-ts-key="canvas-area"]')).toBeNull()
    expect(container.querySelector('[data-ts-key="canvas-line"]')).toBeNull()
    expect(
      [...contexts.values()].flatMap((context) => context.operations),
    ).toEqual(expect.arrayContaining(['fill:current', 'stroke:current']))

    host.destroy()
  })

  it('preserves mixed-layer geometry after painting focus', () => {
    const arcs = pie(
      [
        { id: 'first', value: 1 },
        { id: 'second', value: 1 },
      ],
      { value: 'value' },
    )
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          polar({
            radiusRatio: 0.9,
            scales: { angle: null, radius: null },
            marks: [
              radialArc(arcs, {
                key: 'id',
                innerRadius: ({ radius }) => radius * 0.4,
                renderer: canvasChartRenderer,
              }),
            ],
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
        margin: 0,
        maxFocusDistance: 1,
      }),
      width: 400,
      height: 400,
      ariaLabel: 'Mixed renderer geometry',
    })
    const surface = container.querySelector<HTMLElement>('.ts-chart-layers')
    if (!surface) throw new Error('Expected a mixed renderer surface')
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 400,
      bottom: 400,
      left: 0,
      width: 400,
      height: 400,
      toJSON: () => ({}),
    })

    const angle = arcs[0]!.startAngle + 0.1
    const radius = 162
    const clientX = 200 + Math.sin(angle) * radius
    const clientY = 200 - Math.cos(angle) * radius
    const first = host.interaction.resolvePointer(clientX, clientY)
    if (!first) throw new Error('Expected the first arc to resolve')
    expect(first.point.datum).toBe(arcs[0])

    host.interaction.setControlledFocus(first)

    expect(host.interaction.resolvePointer(clientX, clientY)?.point.datum).toBe(
      arcs[0],
    )
    host.destroy()
  })

  it('finds renderer-tagged marks inside facet and polar groups', () => {
    const rows = [
      { id: 'a', panel: 'First', metric: 'A', value: 3 },
      { id: 'b', panel: 'First', metric: 'B', value: 7 },
      { id: 'c', panel: 'Second', metric: 'A', value: 5 },
      { id: 'd', panel: 'Second', metric: 'B', value: 6 },
    ]
    const definitions = [
      defineChart({
        marks: [
          facet(rows, {
            id: 'facets',
            by: 'panel',
            axes: 'cell',
            chart: (data) => ({
              marks: [
                lineY(data, {
                  id: 'facet-lines',
                  x: 'metric',
                  y: 'value',
                  renderer: canvasChartRenderer,
                }),
                dot(data, { id: 'facet-dots', x: 'metric', y: 'value' }),
              ],
              scales: {
                x: { scale: scaleBand<string>().domain(['A', 'B']) },
                y: { scale: scaleLinear().domain([0, 8]) },
              },
            }),
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
      }),
      defineChart({
        marks: [
          polar({
            scales: {
              angle: { scale: scaleBand<string>().domain(['A', 'B']) },
              radius: { scale: scaleLinear().domain([0, 8]) },
            },
            marks: [
              radialLine(rows.slice(0, 2), {
                id: 'radial-line',
                angle: 'metric',
                radius: 'value',
                renderer: canvasChartRenderer,
              }),
              radialDot(rows.slice(0, 2), {
                id: 'radial-dots',
                angle: 'metric',
                radius: 'value',
              }),
            ],
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
      }),
    ]

    for (const [index, definition] of definitions.entries()) {
      const container = document.createElement('div')
      const host = mountChart(container, {
        definition,
        width: 400,
        height: 240,
        ariaLabel: index === 0 ? 'Mixed facets' : 'Mixed polar',
      })

      expect(container.querySelector('.ts-chart-layers')).not.toBeNull()
      expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()
      expect(container.querySelector('svg')).not.toBeNull()
      expect(
        [...contexts.values()].flatMap((context) => context.operations),
      ).toContain(index === 0 ? 'stroke:current' : 'stroke:path')
      expect(
        container.querySelector(
          index === 0
            ? '[data-ts-key*="facet-dots"]'
            : '[data-ts-key="radial-dots"]',
        ),
      ).not.toBeNull()
      host.destroy()
    }
  })

  it('prerenders and adopts the same mixed layer shell', () => {
    const definition = defineChart({
      marks: [
        lineY([2, 6, 4], {
          id: 'canvas-line',
          renderer: canvasChartRenderer,
        }),
        dot([2, 6, 4], { id: 'svg-dots' }),
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 6]) },
      },
    })
    const adapter = createChartRendererAdapter({
      definition,
      renderer: createSvgChartRenderer<number, number, number>(),
      initialWidth: 320,
      height: 180,
      ariaLabel: 'Mixed server chart',
    })

    const markup = adapter.prerender()

    expect(markup).toContain('class="ts-chart ts-chart-layers"')
    expect(markup).toContain('aria-label="Mixed server chart"')
    expect(markup).toContain('ts-chart-canvas__scene')
    expect(markup).toContain('data-ts-key="svg-dots"')
    expect(markup).not.toContain('data-ts-key="canvas-line"')
    expect(markup.match(/class="ts-chart-layer"/g)).toHaveLength(3)
    const container = document.createElement('div')
    container.innerHTML = markup
    const roots = [...container.querySelectorAll('.ts-chart-layer')]
    adapter.mount(container)
    expect([...container.querySelectorAll('.ts-chart-layer')]).toEqual(roots)
    expect(container.querySelectorAll('canvas')).toHaveLength(5)
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    adapter.destroy()
  })

  it('keeps the default SVG callback and exposes every composed surface', () => {
    const onRender = vi.fn()
    const definition = defineChart({
      marks: [
        lineY([2, 6, 4], {
          id: 'canvas-line',
          renderer: canvasChartRenderer,
        }),
        dot([2, 6, 4], { id: 'svg-dots' }),
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 6]) },
      },
    })
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition,
      width: 320,
      height: 180,
      ariaLabel: 'Mixed callback chart',
      onRender,
    })

    const context = onRender.mock.calls[0]?.[0]
    expect(context.surface.element).toBe(
      container.querySelector('.ts-chart-layers'),
    )
    expect(context.surface.layers).toHaveLength(3)
    expect(context.svg).toBe(container.querySelectorAll('svg').item(1))
    expect(context.svg.querySelector('[data-ts-key="svg-dots"]')).not.toBeNull()

    host.destroy()
  })

  it('scopes SVG resources independently in each composed layer', () => {
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          areaY([2, 6, 4], { id: 'svg-area', fill: 'url(#fill)' }),
          lineY([2, 6, 4], {
            id: 'canvas-line',
            renderer: canvasChartRenderer,
          }),
          dot([2, 6, 4], { id: 'svg-dots', fill: 'url(#fill)' }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 6]) },
        },
        gradients: [
          {
            id: 'fill',
            stops: [
              { offset: 0, color: '#2563eb' },
              { offset: 1, color: '#60a5fa' },
            ],
          },
        ],
      }),
      renderSvg: renderChartSvgWithResources,
      width: 320,
      height: 180,
      idPrefix: 'mixed-resources',
      ariaLabel: 'Mixed resources',
    })
    const ids = [...container.querySelectorAll('linearGradient')].map(
      (gradient) => gradient.id,
    )

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every((id) => id.startsWith('mixed-resources-layer-'))).toBe(
      true,
    )
    for (const svg of container.querySelectorAll('svg')) {
      const gradient = svg.querySelector('linearGradient')
      expect(gradient).not.toBeNull()
      expect(svg.querySelector(`[fill="url(#${gradient!.id})"]`)).not.toBeNull()
    }

    host.destroy()
  })

  it('reuses mixed layers across updates and removes them when marks return to SVG', () => {
    const mixedDefinition = (values: readonly number[]) =>
      defineChart({
        marks: [
          lineY(values, {
            id: 'canvas-line',
            renderer: canvasChartRenderer,
          }),
          dot(values, { id: 'svg-dots' }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 8]) },
        },
      })
    const options = {
      definition: mixedDefinition([2, 6, 4]),
      width: 320,
      height: 180,
      ariaLabel: 'Updated mixed chart',
    }
    const container = document.createElement('div')
    const host = mountChart(container, options)
    const root = container.querySelector('.ts-chart-layers')
    const layers = [...container.querySelectorAll('.ts-chart-layer')]
    const canvas = container.querySelector('.ts-chart-canvas')

    host.update({ ...options, definition: mixedDefinition([3, 7, 5]) })

    expect(container.querySelector('.ts-chart-layers')).toBe(root)
    expect([...container.querySelectorAll('.ts-chart-layer')]).toEqual(layers)
    expect(container.querySelector('.ts-chart-canvas')).toBe(canvas)

    host.update({
      ...options,
      definition: defineChart({
        marks: [dot([4, 8, 6], { id: 'svg-only' })],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 8]) },
        },
      }),
    })

    expect(container.querySelector('.ts-chart-layers')).toBeNull()
    expect(container.querySelector('.ts-chart-canvas')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    host.destroy()
  })

  it('does not request another render for unchanged layered root attributes', async () => {
    const container = document.createElement('div')
    const requestRender = vi.fn()
    const surface = canvasChartRenderer
      .compose(createSvgChartRenderer())
      .mount(container, requestRender)
    const chart = scene([
      {
        kind: 'dot',
        key: 'canvas-dot',
        x: 30,
        y: 30,
        radius: 5,
        renderer: canvasChartRenderer,
        style: { fill: '#2563eb' },
      },
      {
        kind: 'dot',
        key: 'svg-dot',
        x: 70,
        y: 30,
        radius: 5,
        style: { fill: '#111111' },
      },
    ])

    surface.render(chart, renderOptions())
    await new Promise((resolve) => setTimeout(resolve, 0))
    requestRender.mockClear()

    surface.render(chart, renderOptions())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(requestRender).not.toHaveBeenCalled()
    surface.destroy()
  })

  it('paints a renderer-tagged crosshair in its own composed focus layer', () => {
    const chart = createChartScene(
      defineChart({
        marks: [
          dot([{ id: 'a', x: 2, y: 7 }], {
            id: 'svg-dot',
            x: 'x',
            y: 'y',
            key: 'id',
          }),
          crosshair({
            id: 'canvas-crosshair',
            renderer: canvasChartRenderer,
            x: true,
            y: false,
          }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 4]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
        guides: false,
        margin: 20,
      }),
      { width: 320, height: 180 },
    )
    const point = chart.points[0]
    if (!point) throw new Error('Expected one focus point')
    const container = document.createElement('div')
    const surface = canvasChartRenderer
      .compose(createSvgChartRenderer())
      .mount(container, () => {})

    surface.render(chart, renderOptions())

    const layers = [
      ...container.querySelectorAll<HTMLElement>('.ts-chart-layer'),
    ]
    expect(
      layers.map((layer) => layer.querySelector('canvas') !== null),
    ).toEqual([false, true, false])
    const focusCanvas = layers[1]?.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__focus',
    )
    const focusContext = focusCanvas ? contexts.get(focusCanvas) : undefined
    if (!focusContext) throw new Error('Expected a Canvas focus layer')
    const paintStart = focusContext.operations.length

    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })

    expect(focusContext.operations.slice(paintStart)).toEqual(
      expect.arrayContaining([
        `moveTo:${point.x},${chart.chart.y}`,
        `lineTo:${point.x},${chart.chart.y + chart.chart.height}`,
      ]),
    )
    surface.destroy()
  })

  it('prerenders an accessible shell without accessing Canvas APIs', () => {
    const markup = canvasChartRenderer.prerender(scene([]), {
      ariaLabel: 'Dense scatter',
      ariaDescription: 'One point per request',
      tabIndex: 3,
    })

    expect(markup).toContain('class="ts-chart ts-chart-canvas"')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Dense scatter"')
    expect(markup).toContain('aria-description="One point per request"')
    expect(markup).toContain('tabindex="3"')
    expect(markup).toContain('ts-chart-canvas__background')
    expect(markup).toContain('ts-chart-canvas__scene')
    expect(markup).toContain('ts-chart-canvas__focus')
    expect(markup).toContain('ts-chart-canvas__base')
    expect(getContextSpy).not.toHaveBeenCalled()
  })

  it('paints translated and clipped heterogeneous composed views', () => {
    const observations = [
      { id: 'first', x: 1, y: 2 },
      { id: 'second', x: 2, y: 8 },
    ]
    const arcs = pie(
      [
        { id: 'complete', value: 7 },
        { id: 'remaining', value: 3 },
      ],
      { value: 'value' },
    )
    const definition = composeViews({
      id: 'canvas-dashboard',
      views: {
        main: defineChart({
          marks: [
            dot(observations, {
              id: 'observations',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          scales: {
            x: { scale: scaleLinear().domain([1, 2]) },
            y: { scale: scaleLinear().domain([0, 10]) },
          },
          guides: false,
          margin: 0,
        }),
        summary: defineChart({
          marks: [
            polar({
              marks: [
                radialArc(arcs, {
                  id: 'summary-arcs',
                  key: 'id',
                  innerRadius: ({ radius }) => radius * 0.55,
                }),
              ],
              scales: { angle: null, radius: null },
            }),
          ],
          scales: {
            x: null,
            y: null,
          },
          guides: false,
          margin: 0,
        }),
      },
      layout: layer(
        fill('main'),
        inset('summary', {
          relativeTo: 'main',
          anchor: 'top-right',
          width: 160,
          height: 160,
          offset: 12,
        }),
      ),
    })
    const composedScene = createChartScene(definition, {
      width: 600,
      height: 400,
    })
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})

    try {
      surface.render(composedScene, renderOptions())
      const painted = contexts.get(surface.sceneCanvas)
      if (!painted) throw new Error('Expected a painted scene canvas')

      expect(painted.operations).toContain('translate:428,12')
      expect(painted.operations).toContain('rect:0,0,600,400')
      expect(painted.operations).toContain('rect:0,0,160,160')
      expect(
        painted.operations.filter((operation) => operation === 'clip'),
      ).toHaveLength(2)
      expect(
        painted.operations.some((operation) => operation.startsWith('arc:')),
      ).toBe(true)
      expect(painted.operations).toContain('fill:path')
    } finally {
      surface.destroy()
    }
  })

  it('paints every scene primitive with DPR, nested clipping, and inherited styles', () => {
    const container = document.createElement('div')
    const renderer = createCanvasChartRenderer({ pixelRatio: 2 })
    const surface = renderer.mount(container, () => {})
    const nodes: SceneNode[] = [
      {
        kind: 'group',
        key: 'translated-grid',
        translateX: 10,
        translateY: 12,
        clip: { x: 0, y: 0, width: 80, height: 60 },
        style: {
          stroke: '#123456',
          strokeOpacity: 0.4,
          strokeWidth: 3,
          strokeDasharray: '2 4',
        },
        children: [
          {
            kind: 'rule',
            key: 'rule',
            x1: 0,
            y1: 0,
            x2: 30,
            y2: 30,
          },
        ],
      },
      {
        kind: 'polyline',
        key: 'line',
        points: [
          [2, 4],
          [20, 30],
        ],
        style: { fill: 'none', stroke: '#abcdef', lineJoin: 'arcs' },
      },
      {
        kind: 'polyline',
        key: 'curved-line',
        points: [],
        path: 'M0,0C10,20,20,20,30,0',
        style: {
          fill: 'none',
          stroke: '#334455',
          lineJoin: 'miter-clip',
        },
      },
      {
        kind: 'area',
        key: 'area',
        points: [
          [0, 20],
          [20, 0],
          [40, 20],
        ],
        style: { fill: 'url(#fill)' },
      },
      {
        kind: 'area',
        key: 'curved-area',
        points: [
          [0, 20],
          [30, 0],
        ],
        path: 'M0,20C10,0,20,0,30,0L30,20Z',
        style: { fill: '#778899' },
      },
      {
        kind: 'area',
        key: 'multi-area',
        points: [[99, 99]],
        path: 'M99,99Z',
        polygons: [
          [
            [
              [2, 2],
              [18, 2],
              [18, 18],
              [2, 18],
            ],
            [
              [6, 6],
              [14, 6],
              [14, 14],
              [6, 14],
            ],
          ],
          [
            [
              [24, 2],
              [30, 2],
              [30, 8],
              [24, 8],
            ],
          ],
        ],
        style: { fill: '#112233', stroke: '#445566' },
      },
      {
        kind: 'dot',
        key: 'dot',
        x: 50,
        y: 30,
        radius: 5,
        style: { fill: '#ff0000' },
      },
      {
        kind: 'rect',
        key: 'rect',
        x: 60,
        y: 10,
        width: 20,
        height: 30,
        radius: 4,
        style: { fill: '#00ff00' },
      },
      {
        kind: 'label',
        key: 'label',
        x: 40,
        y: 50,
        text: 'Canvas',
        anchor: 'middle',
        baseline: 'middle',
        rotate: -30,
        fontSize: 12,
        fontWeight: 600,
        style: { fill: '#111111' },
      },
    ]
    const chart = scene(
      nodes,
      [
        {
          id: 'fill',
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0, color: '#2563eb', opacity: 0.2 },
            { offset: 1, color: '#2563eb' },
          ],
        },
      ],
      '#f8fafc',
    )

    surface.render(chart, renderOptions())

    const canvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const backgroundCanvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__background',
    )
    if (!canvas || !backgroundCanvas) {
      throw new Error('Expected background and scene canvases')
    }
    const fake = contexts.get(canvas)
    const background = contexts.get(backgroundCanvas)
    const base = contexts.get(surface.canvas)
    if (!fake || !background || !base) {
      throw new Error('Expected background, scene, and base contexts')
    }

    expect(surface.backgroundCanvas).toBe(backgroundCanvas)
    expect(surface.sceneCanvas).toBe(canvas)
    expect(surface.canvas.className).toBe('ts-chart-canvas__base')
    expect(surface.canvas.style.display).toBe('none')
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(120)
    expect(fake.operations).toContain('setTransform:2,0,0,2,0,0')
    expect(background.operations).toContain('fillRect:0,0,100,60')
    expect(fake.operations).not.toContain('fillRect:0,0,100,60')
    expect(base.operations).toContain('drawImage:ts-chart-canvas__background')
    expect(base.operations).toContain('drawImage:ts-chart-canvas__scene')
    expect(
      base.operations.indexOf('drawImage:ts-chart-canvas__background'),
    ).toBeLessThan(base.operations.indexOf('drawImage:ts-chart-canvas__scene'))
    expect(fake.operations).toContain('translate:10,12')
    expect(fake.operations).toContain('clip')
    expect(fake.operations).toContain('setLineDash:2,4')
    expect(fake.operations).toContain('lineJoin:round')
    expect(fake.operations).toContain('lineJoin:miter')
    expect(fake.operations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^stroke:.*:3:0\.4$/)]),
    )
    expect(fake.operations).toContain('fill:path')
    expect(fake.operations).toContain('stroke:path')
    expect(fake.operations).toContain('fill:evenodd')
    expect(fake.operations).toContain('moveTo:2,2')
    expect(fake.operations).toContain('moveTo:6,6')
    expect(fake.operations).toContain('moveTo:24,2')
    expect(fake.operations).toContain('arc:50,30,5')
    expect(fake.operations).toContain('arcTo')
    expect(fake.operations).toContain('fillText:Canvas,0,0')
    expect(fake.gradientStops).toHaveLength(2)
    expect(surface.element).toBe(container.querySelector('.ts-chart-canvas'))
    surface.destroy()
  })

  it('keeps the public canvas as a focus-free base bitmap', () => {
    const container = document.createElement('div')
    const renderer = createCanvasChartRenderer({ pixelRatio: 2 })
    const surface = renderer.mount(container, () => {})
    const point = {
      key: 'focus:dot',
      markId: 'focus',
      group: null,
      groupLabel: 'focus',
      datum: { id: 'dot' },
      datumIndex: 0,
      xValue: 1,
      yValue: 2,
      x: 50,
      y: 30,
      color: '#ff0000',
    }
    surface.render(
      scene([
        {
          kind: 'dot',
          key: 'dot',
          x: 50,
          y: 30,
          radius: 5,
          style: { fill: '#ff0000' },
        },
        {
          kind: 'group',
          key: 'focus',
          children: [
            {
              kind: 'dot',
              key: point.key,
              x: 50,
              y: 30,
              radius: 5,
              style: {
                fill: 'Canvas',
                stroke: '#ff0000',
                strokeWidth: 2.5,
              },
            },
          ],
          focus: {
            match: 'primary',
            anchors: [point],
            points: [point],
            placement: 'over',
          },
        },
      ]),
      renderOptions(),
    )
    const base = contexts.get(surface.canvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    const focus = contexts.get(surface.focusCanvas)
    if (!base || !liveScene || !focus) {
      throw new Error('Expected base, scene, and focus contexts')
    }
    const baseOperations = [...base.operations]
    const liveSceneOperations = [...liveScene.operations]
    expect(base.operations).toEqual(
      expect.arrayContaining([
        'drawImage:ts-chart-canvas__background',
        'drawImage:ts-chart-canvas__scene',
      ]),
    )

    surface.paintFocus({
      primary: {
        key: 'dot',
        markId: 'dots',
        group: null,
        groupLabel: 'dots',
        datum: point.datum,
        datumIndex: 0,
        xValue: 1,
        yValue: 2,
        x: 50,
        y: 30,
        color: '#ff0000',
      },
      group: [],
      source: 'pointer',
      pinned: false,
    })

    expect(base.operations).toEqual(baseOperations)
    expect(liveScene.operations).toEqual(liveSceneOperations)
    expect(focus.operations).toContain('clearRect:0,0,100,60')
    expect(focus.operations).toContain('arc:50,30,5')
    expect(focus.operations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^stroke:.*:2\.5:1$/)]),
    )
    surface.destroy()
  })

  it('paints Cartesian axis-title typography and paint', () => {
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]), axis: false },
        y: {
          scale: scaleLinear().domain([0, 3]),
          axis: {
            ticks: false,
            label: {
              text: 'Revenue',
              fontSize: 17,
              fontWeight: 650,
              fill: '#0f766e',
              opacity: 0.6,
            },
          },
        },
      },
    })
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const generated = createChartScene(definition, {
      width: 480,
      height: 260,
    })
    const title = generated.nodes
      .flatMap((node) => (node.kind === 'group' ? node.children : [node]))
      .find((node) => node.key === 'y-label')

    expect(title?.style?.fill).toBe('#0f766e')
    surface.render(generated, { ariaLabel: 'Revenue chart' })

    const painted = contexts
      .get(surface.sceneCanvas)
      ?.textPaints.find(({ text }) => text === 'Revenue')
    expect(painted).toMatchObject({
      globalAlpha: 0.6,
    })
    expect(painted?.font).toMatch(/650 17px/)
    surface.destroy()
  })

  it('paints start and end as logical anchors in right-to-left hosts', () => {
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    surface.element.style.direction = 'rtl'
    surface.render(
      scene([
        {
          kind: 'label',
          key: 'start',
          x: 20,
          y: 20,
          text: 'Start',
          anchor: 'start',
        },
        {
          kind: 'label',
          key: 'end',
          x: 80,
          y: 40,
          text: 'End',
          anchor: 'end',
        },
      ]),
      renderOptions(),
    )

    expect(contexts.get(surface.sceneCanvas)?.textPaints).toMatchObject([
      { text: 'Start', direction: 'rtl', textAlign: 'start' },
      { text: 'End', direction: 'rtl', textAlign: 'end' },
    ])
    surface.destroy()
  })

  it('paints configured focus-ring geometry and paint on Canvas', () => {
    const chart = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 2 }], { x: 'x', y: 'y' })],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 4]) },
        },
        guides: false,
        focusRing: {
          radius: 4,
          strokeWidth: 1.5,
          fill: '#ffffff',
          stroke: '#0f172a',
        },
      }),
      { width: 200, height: 120 },
    )
    const point = chart.points[0]
    if (!point) throw new Error('Expected a focus point')
    const container = document.createElement('div')
    document.body.append(container)
    const surface = createCanvasChartRenderer().mount(container, () => {})
    surface.render(chart, renderOptions())
    const focus = contexts.get(surface.focusCanvas)
    if (!focus) throw new Error('Expected a Canvas focus layer')

    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })

    expect(focus.operations).toContain(`arc:${point.x},${point.y},4`)
    expect(focus.operations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^stroke:.*:1\.5:1$/)]),
    )
    expect(focus.operations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^fill:.*(?:ffffff|255)/)]),
    )
    surface.destroy()
    container.remove()
  })

  it('snaps retargeting focus candidates without adding interaction points', () => {
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})
    const datumA = { id: 'a' }
    const datumB = { id: 'b' }
    const pointA = {
      key: 'guide:a',
      markId: 'guide',
      group: null,
      groupLabel: 'guide',
      datum: datumA,
      datumIndex: 0,
      xValue: 1,
      yValue: 0,
      x: 20,
      y: 30,
      color: '#2563eb',
    }
    const pointB = {
      ...pointA,
      key: 'guide:b',
      datum: datumB,
      datumIndex: 1,
      xValue: 2,
      x: 80,
    }
    const candidates: SceneNode[] = [
      {
        kind: 'group',
        key: 'guide',
        children: [
          {
            kind: 'rule',
            key: pointA.key,
            x1: 20,
            x2: 20,
            y1: 0,
            y2: 60,
            style: { stroke: '#2563eb' },
          },
          {
            kind: 'rule',
            key: pointB.key,
            x1: 80,
            x2: 80,
            y1: 0,
            y2: 60,
            style: { stroke: '#2563eb' },
          },
        ],
      },
    ]
    const resolved = scene([
      {
        kind: 'group',
        key: 'focus:guide',
        className: 'ts-chart__focus-layer',
        children: [],
        focus: {
          match: 'primary',
          points: [pointA, pointB],
          placement: 'over',
          retarget: true,
          candidates,
        },
      },
    ])
    surface.render(resolved, renderOptions())
    const base = contexts.get(surface.canvas)
    const focus = contexts.get(surface.focusCanvas)
    if (!base || !focus) throw new Error('Expected Canvas contexts')
    const baseOperations = [...base.operations]

    const firstStart = focus.operations.length
    const firstScene = surface.paintFocus({
      primary: pointA,
      group: [pointA],
      source: 'pointer',
      pinned: false,
    })
    expect(focus.operations.slice(firstStart)).toContain('moveTo:20,0')
    expect(firstScene?.points).toEqual([])

    const secondStart = focus.operations.length
    surface.paintFocus({
      primary: pointB,
      group: [pointB],
      source: 'pointer',
      pinned: false,
    })
    const secondPaint = focus.operations.slice(secondStart)
    expect(secondPaint).toContain('moveTo:80,0')
    expect(secondPaint).not.toContain('moveTo:20,0')

    const clearStart = focus.operations.length
    surface.paintFocus(null)
    const clearPaint = focus.operations.slice(clearStart)
    expect(clearPaint).toContain('clearRect:0,0,100,60')
    expect(
      clearPaint.some((operation) => operation.startsWith('moveTo:')),
    ).toBe(false)
    expect(base.operations).toEqual(baseOperations)
    surface.destroy()
  })

  it('repaints inline mark states only on the live scene layer', () => {
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const point = {
      key: 'dots:null:a',
      markId: 'dots',
      group: null,
      groupLabel: 'dots',
      datum: { id: 'a' },
      datumIndex: 0,
      xValue: 1,
      yValue: 2,
      x: 50,
      y: 30,
      color: '#2563eb',
    }
    surface.render(
      scene([
        {
          kind: 'group',
          key: 'states:dots',
          states: {
            data: [point.datum],
            points: [point],
            definitions: [
              {
                when: { focus: 'primary' },
                style: { r: 9, fill: '#f97316' },
                transition: { type: 'tween', duration: 0 },
              },
            ],
          },
          children: [
            {
              kind: 'dot',
              key: point.key,
              x: 50,
              y: 30,
              radius: 5,
              style: { fill: '#2563eb' },
            },
          ],
        },
      ]),
      renderOptions(),
    )
    const base = contexts.get(surface.canvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    if (!base || !liveScene) throw new Error('Expected base and scene contexts')
    const baseOperations = [...base.operations]

    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })
    expect(liveScene.operations).toContain('arc:50,30,9')
    expect(base.operations).toEqual(baseOperations)

    const restoreStart = liveScene.operations.length
    surface.paintFocus(null)
    const restored = liveScene.operations.slice(restoreStart)
    expect(restored).toContain('arc:50,30,5')
    expect(base.operations).toEqual(baseOperations)
    surface.destroy()
  })

  it('restores a no-transition pinned mark state when focus clears', () => {
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const point = {
      key: 'dots:null:a',
      markId: 'dots',
      group: null,
      groupLabel: 'dots',
      datum: { id: 'a' },
      datumIndex: 0,
      xValue: 1,
      yValue: 2,
      x: 50,
      y: 30,
      color: '#2563eb',
    }
    surface.render(
      scene([
        {
          kind: 'group',
          key: 'states:dots',
          states: {
            data: [point.datum],
            points: [point],
            definitions: [
              {
                when: { focus: 'primary', pinned: true },
                style: { r: 9, fill: '#f97316' },
              },
            ],
          },
          children: [
            {
              kind: 'dot',
              key: point.key,
              x: 50,
              y: 30,
              radius: 5,
              style: { fill: '#2563eb' },
            },
          ],
        },
      ]),
      renderOptions(),
    )
    const fake = contexts.get(surface.sceneCanvas)
    if (!fake) throw new Error('Expected scene context')

    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: true,
    })
    expect(fake.operations).toContain('arc:50,30,9')

    const restoreStart = fake.operations.length
    surface.paintFocus(null)
    expect(fake.operations.slice(restoreStart)).toContain('arc:50,30,5')
    surface.destroy()
  })

  it('composes authored focus underlays with the default indicator', () => {
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})
    const datum = { id: 'band' }
    const point = {
      key: 'focus:band',
      markId: 'focus',
      group: null,
      groupLabel: 'focus',
      datum,
      datumIndex: 0,
      xValue: 'A',
      yValue: 0,
      x: 25,
      y: 30,
      color: '#94a3b8',
    }
    surface.render(
      scene([
        {
          kind: 'group',
          key: 'focus',
          children: [
            {
              kind: 'rect',
              key: point.key,
              x: 10,
              y: 0,
              width: 30,
              height: 60,
              style: { fill: '#94a3b8', fillOpacity: 0.16 },
            },
          ],
          focus: {
            match: 'x',
            anchors: [point],
            points: [point],
            placement: 'under',
          },
        },
        {
          kind: 'dot',
          key: 'dot',
          x: 25,
          y: 30,
          radius: 5,
          style: { fill: '#ff0000' },
        },
        {
          kind: 'group',
          key: 'default-focus',
          children: [
            {
              kind: 'dot',
              key: 'dot',
              x: 25,
              y: 30,
              radius: 5,
              style: { stroke: '#ff0000', strokeWidth: 2.5 },
            },
          ],
          focus: {
            match: 'primary',
            anchors: [{ ...point, key: 'dot', markId: 'dots' }],
            points: [{ ...point, key: 'dot', markId: 'dots' }],
            placement: 'over',
          },
        },
      ]),
      renderOptions(),
    )
    const base = contexts.get(surface.canvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    const under = contexts.get(surface.focusUnderCanvas)
    const over = contexts.get(surface.focusCanvas)
    if (!base || !under || !over) {
      throw new Error('Expected base and focus contexts')
    }
    const baseOperations = [...base.operations]

    surface.paintFocus({
      primary: {
        ...point,
        key: 'dot',
        markId: 'dots',
      },
      group: [],
      source: 'pointer',
      pinned: false,
    })

    expect(base.operations).toEqual(baseOperations)
    expect(under.operations).toContain('rect:10,0,30,60')
    expect(over.operations).toContain('arc:25,30,5')
    surface.destroy()
  })

  it('paints renderer-native crosshair guides in their under and over layers', () => {
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer({ pixelRatio: 2 }).mount(
      container,
      () => {},
    )
    const datum = { id: 'cursor' }
    const point = {
      key: 'dots:null:cursor',
      markId: 'dots',
      group: null,
      groupLabel: 'dots',
      datum,
      datumIndex: 0,
      xValue: 2,
      yValue: 7,
      x: 40,
      y: 25,
      color: '#dc2626',
    }
    const chart: ChartScene = {
      ...scene(
        [
          {
            kind: 'dot',
            key: point.key,
            x: point.x,
            y: point.y,
            radius: 3,
            style: { fill: point.color },
          },
        ],
        [],
        '#f8fafc',
      ),
      focusGuides: [
        {
          key: 'crosshair-under',
          markId: 'crosshair-under',
          chart: { x: 10, y: 5, width: 80, height: 45 },
          surface: { x: 0, y: 0, width: 100, height: 60 },
          placement: 'under',
          resolve: resolveCrosshairGuide,
          x: {
            style: {
              stroke: '#475569',
              strokeWidth: 2,
              strokeDasharray: '3 2',
            },
            band: {
              bandwidth: 24,
              inset: 2,
              style: { fill: '#facc15', fillOpacity: 0.24 },
            },
            label: {
              format: (value) => `x=${String(value)}`,
              offset: 4,
              fontSize: 10,
              fontWeight: 600,
              style: {
                fill: '#0f172a',
                stroke: '#ffffff',
                strokeWidth: 3,
              },
            },
          },
        },
        {
          key: 'crosshair-over',
          markId: 'crosshair-over',
          chart: { x: 10, y: 5, width: 80, height: 45 },
          surface: { x: 0, y: 0, width: 100, height: 60 },
          placement: 'over',
          resolve: resolveCrosshairGuide,
          y: {
            style: { stroke: '#64748b', strokeWidth: 1 },
            label: {
              format: (value) => `y=${String(value)}`,
              offset: 4,
              fontSize: 10,
              style: {
                fill: '#0f172a',
                stroke: '#ffffff',
                strokeWidth: 3,
              },
            },
          },
          marker: {
            radius: 5,
            style: { fill: '#ffffff', strokeWidth: 2 },
          },
        },
      ],
    }

    surface.render(chart, renderOptions())
    const backgroundCanvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__background',
    )
    const base = contexts.get(surface.canvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    const under = contexts.get(surface.focusUnderCanvas)
    const over = contexts.get(surface.focusCanvas)
    const background = backgroundCanvas
      ? contexts.get(backgroundCanvas)
      : undefined
    if (
      !backgroundCanvas ||
      !background ||
      !base ||
      !liveScene ||
      !under ||
      !over
    ) {
      throw new Error('Expected background, base, scene, and focus contexts')
    }
    expect(
      [...surface.element.querySelectorAll('canvas')].map(
        (layer) => layer.className,
      ),
    ).toEqual([
      'ts-chart-canvas__background',
      'ts-chart-canvas__focus-under',
      'ts-chart-canvas__scene',
      'ts-chart-canvas__focus',
      'ts-chart-canvas__base',
    ])
    expect(surface.canvas.style.display).toBe('none')
    expect(background.operations).toContain('fillRect:0,0,100,60')
    expect(base.operations).toEqual(
      expect.arrayContaining([
        'drawImage:ts-chart-canvas__background',
        'drawImage:ts-chart-canvas__scene',
      ]),
    )
    expect(liveScene.operations).not.toContain('fillRect:0,0,100,60')
    const backgroundOperations = [...background.operations]
    const baseOperations = [...base.operations]
    const liveSceneOperations = [...liveScene.operations]
    const underStart = under.operations.length
    const overStart = over.operations.length

    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })

    const underPaint = under.operations.slice(underStart)
    const overPaint = over.operations.slice(overStart)
    expect(background.operations).toEqual(backgroundOperations)
    expect(base.operations).toEqual(baseOperations)
    expect(liveScene.operations).toEqual(liveSceneOperations)
    expect(underPaint).toEqual(
      expect.arrayContaining([
        'clearRect:0,0,100,60',
        'rect:10,5,80,45',
        'clip',
        'rect:30,5,20,45',
        'fill:current',
        'strokeText:x=2,0,0',
        'fillText:x=2,0,0',
      ]),
    )
    expect(overPaint).toEqual(
      expect.arrayContaining([
        'clearRect:0,0,100,60',
        'rect:10,5,80,45',
        'clip',
        'moveTo:10,25',
        'lineTo:90,25',
        'arc:40,25,5',
        'strokeText:y=7,0,0',
        'fillText:y=7,0,0',
      ]),
    )
    expect(underPaint.indexOf('strokeText:x=2,0,0')).toBeLessThan(
      underPaint.indexOf('fillText:x=2,0,0'),
    )
    expect(overPaint.indexOf('strokeText:y=7,0,0')).toBeLessThan(
      overPaint.indexOf('fillText:y=7,0,0'),
    )
    expect(overPaint).toEqual(
      expect.arrayContaining([expect.stringMatching(/^stroke:.*:2:1$/)]),
    )

    const underClearStart = under.operations.length
    const overClearStart = over.operations.length
    surface.paintFocus(null)
    expect(under.operations.slice(underClearStart)).toEqual([
      'setTransform:2,0,0,2,0,0',
      'setLineDash:',
      'clearRect:0,0,100,60',
    ])
    expect(over.operations.slice(overClearStart)).toEqual([
      'setTransform:2,0,0,2,0,0',
      'setLineDash:',
      'clearRect:0,0,100,60',
    ])
    expect(background.operations).toEqual(backgroundOperations)
    expect(base.operations).toEqual(baseOperations)
    expect(liveScene.operations).toEqual(liveSceneOperations)
    surface.destroy()
  })

  it('paints a controlled cursor without requiring datum focus', () => {
    const container = document.createElement('div')
    const surface = createCanvasChartRenderer().mount(container, () => {})
    const chart: ChartScene = {
      ...scene([
        {
          kind: 'rule',
          key: 'base-rule',
          x1: 0,
          x2: 100,
          y1: 30,
          y2: 30,
          style: { stroke: '#cbd5e1' },
        },
      ]),
      focusGuides: [
        {
          key: 'free-cursor',
          markId: 'free-cursor',
          chart: { x: 10, y: 5, width: 80, height: 45 },
          surface: { x: 0, y: 0, width: 100, height: 60 },
          placement: 'over',
          resolve: resolveCrosshairGuide,
          x: {
            style: { stroke: '#334155' },
            label: {
              offset: 4,
              fontSize: 10,
              style: { fill: '#0f172a' },
            },
          },
          y: {
            style: { stroke: '#334155' },
            label: {
              offset: 4,
              fontSize: 10,
              style: { fill: '#0f172a' },
            },
          },
          marker: { radius: 3, style: { fill: '#ffffff' } },
        },
      ],
    }
    surface.render(chart, renderOptions())
    const base = contexts.get(surface.canvas)
    const over = contexts.get(surface.focusCanvas)
    if (!base || !over) throw new Error('Expected base and focus contexts')
    const baseOperations = [...base.operations]
    const paintStart = over.operations.length

    surface.paintFocus(null, null, {
      state: {
        anchor: 'value',
        value: { x: 12, y: 34 },
        source: 'programmatic',
        pinned: true,
      },
      axes: 'xy',
      x: { position: 65, normalized: 0.6875, value: 12 },
      y: { position: 20, normalized: 1 / 3, value: 34 },
    })

    const paint = over.operations.slice(paintStart)
    expect(base.operations).toEqual(baseOperations)
    expect(paint).toEqual(
      expect.arrayContaining([
        'moveTo:65,5',
        'lineTo:65,50',
        'moveTo:10,20',
        'lineTo:90,20',
        'arc:65,20,3',
        'fillText:12,0,0',
        'fillText:34,0,0',
      ]),
    )
    surface.destroy()
  })

  it('batches adjacent dots with the same paint into one Canvas path', () => {
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const dots: SceneNode[] = Array.from({ length: 250 }, (_, index) => ({
      kind: 'dot',
      key: `dot-${index}`,
      x: index % 50,
      y: Math.floor(index / 50),
      radius: 1,
      style: { fill: '#2563eb' },
    }))

    surface.render(
      scene([
        {
          kind: 'group',
          key: 'dots',
          children: dots,
        },
      ]),
      renderOptions(),
    )

    const fake = contexts.get(surface.sceneCanvas)
    if (!fake) throw new Error('Expected scene context')
    expect(
      fake.operations.filter((operation) => operation.startsWith('arc:')),
    ).toHaveLength(250)
    expect(
      fake.operations.filter((operation) => operation === 'fill:current'),
    ).toHaveLength(1)
    surface.destroy()
  })

  it('crossfades opaque backgrounds and scene marks on one cancelable frame', () => {
    const callbacks: FrameRequestCallback[] = []
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callbacks.push(callback)
        return callbacks.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const dotScene = (x: number, background: string) =>
      scene(
        [
          {
            kind: 'dot',
            key: 'dot',
            x,
            y: 20,
            radius: 3,
            style: { fill: '#2563eb' },
          },
        ],
        [],
        background,
      )
    surface.render(dotScene(10, '#ffffff'), renderOptions())
    const background = contexts.get(surface.backgroundCanvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    if (!background || !liveScene) {
      throw new Error('Expected background and live scene contexts')
    }
    const backgroundBefore = [...background.operations]
    const sceneBefore = [...liveScene.operations]

    surface.render(dotScene(20, '#111827'), {
      ...renderOptions(),
      animation: { duration: 100 },
    })
    expect(callbacks).toHaveLength(1)
    expect(background.operations).toEqual(backgroundBefore)
    expect(liveScene.operations).toEqual(sceneBefore)
    callbacks.shift()?.(0)

    expect(
      background.operations.filter((operation) => operation === 'drawImage'),
    ).toHaveLength(2)
    expect(
      liveScene.operations.filter((operation) => operation === 'drawImage'),
    ).toHaveLength(2)
    expect(callbacks).toHaveLength(1)
    surface.render(dotScene(30, '#f8fafc'), renderOptions())
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    surface.destroy()
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('retargets an active background crossfade when focus reapplies mark state', () => {
    const callbacks: FrameRequestCallback[] = []
    let nextFrameId = 1
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callbacks.push(callback)
        return nextFrameId++
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})
    const stateScene = (x: number, background: string) => {
      const point = {
        key: 'dots:null:a',
        markId: 'dots',
        group: null,
        groupLabel: 'dots',
        datum: { id: 'a' },
        datumIndex: 0,
        xValue: x,
        yValue: 20,
        x,
        y: 20,
        color: '#2563eb',
      }
      return {
        chart: {
          ...scene(
            [
              {
                kind: 'group' as const,
                key: 'states:dots',
                states: {
                  data: [point.datum],
                  points: [point],
                  definitions: [
                    {
                      when: { focus: 'primary' as const },
                      style: { r: 9, fill: '#f97316' },
                      transition: { type: 'tween' as const, duration: 100 },
                    },
                  ],
                },
                children: [
                  {
                    kind: 'dot' as const,
                    key: point.key,
                    x,
                    y: 20,
                    radius: 5,
                    style: { fill: '#2563eb' },
                  },
                ],
              },
            ],
            [],
            background,
          ),
          points: [point],
        } satisfies ChartScene,
        point,
      }
    }
    const initial = stateScene(10, '#ffffff')
    const updated = stateScene(20, '#111827')
    surface.render(initial.chart, renderOptions())
    const background = contexts.get(surface.backgroundCanvas)
    const liveScene = contexts.get(surface.sceneCanvas)
    const base = contexts.get(surface.canvas)
    if (!background || !liveScene || !base) {
      throw new Error('Expected background, scene, and base contexts')
    }

    surface.render(updated.chart, {
      ...renderOptions(),
      animation: { duration: 100 },
    })
    expect(callbacks).toHaveLength(1)
    const backgroundBeforeFocus = [...background.operations]
    const sceneBeforeFocus = [...liveScene.operations]
    const baseAfterRender = [...base.operations]

    surface.paintFocus({
      primary: updated.point,
      group: [updated.point],
      source: 'restored',
      pinned: false,
    })

    expect(cancelFrame).toHaveBeenCalledTimes(1)
    expect(callbacks).toHaveLength(2)
    expect(background.operations).toEqual(backgroundBeforeFocus)
    expect(liveScene.operations).toEqual(sceneBeforeFocus)
    expect(base.operations).toEqual(baseAfterRender)
    expect(
      [...contexts.values()].some(({ operations }) =>
        operations.includes('arc:20,20,9'),
      ),
    ).toBe(true)

    callbacks.shift()?.(0)
    expect(background.operations).toEqual(backgroundBeforeFocus)
    expect(liveScene.operations).toEqual(sceneBeforeFocus)

    callbacks.shift()?.(0)
    expect(background.operations.slice(backgroundBeforeFocus.length)).toEqual(
      expect.arrayContaining(['drawImage', 'drawImage']),
    )
    expect(liveScene.operations.slice(sceneBeforeFocus.length)).toEqual(
      expect.arrayContaining(['drawImage', 'drawImage']),
    )
    expect(callbacks).toHaveLength(1)

    callbacks.shift()?.(100)
    expect(
      background.operations.filter((operation) => operation === 'drawImage'),
    ).toHaveLength(4)
    expect(
      liveScene.operations.filter((operation) => operation === 'drawImage'),
    ).toHaveLength(4)
    expect(callbacks).toHaveLength(0)
    expect(base.operations).toEqual(baseAfterRender)
    surface.destroy()
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('shares pointer, keyboard, tooltip, and selection behavior with SVG', () => {
    const data = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const definition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
      scales: {
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 8]) },
      },
    })
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const host = mountCanvasChart(container, {
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip,
      },
      width: 480,
      height: 260,
      ariaLabel: 'Interactive Canvas chart',
      onFocusChange,
      onSelect,
    })
    const surface = container.querySelector<HTMLElement>('.ts-chart-canvas')
    if (!surface) throw new Error('Expected Canvas surface')
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
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

    surface.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)

    surface.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    surface.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    surface.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )

    const first = host.getScene().points[0]
    if (!first) throw new Error('Expected chart point')
    surface.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    host.destroy()
    expect(container.childElementCount).toBe(0)
  })

  it('hosts interactive legend controls beside the Canvas surface', () => {
    const data = [
      { x: 0, y: 4, series: 'a' as const },
      { x: 1, y: 8, series: 'a' as const },
      { x: 0, y: 6, series: 'b' as const },
      { x: 1, y: 3, series: 'b' as const },
    ]
    type Series = (typeof data)[number]['series']
    let visible: readonly Series[] = ['a', 'b']
    let host!: CanvasChartHost<(typeof data)[number], number, number>
    const options = () => ({
      definition: defineChart({
        marks: [lineY(data, { x: 'x', y: 'y', color: 'series' })],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 8]) },
        },
        color: {
          domain: ['a', 'b'] as const,
          range: ['#2563eb', '#f97316'],
          legend: interactiveColorLegend({
            visible: controlledSignal(visible, (next) => {
              visible = next
              host.update(options())
            }),
          }),
        },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Interactive Canvas chart',
    })
    const container = document.createElement('div')
    document.body.append(container)
    host = mountCanvasChart(container, options())

    const button = container.querySelector<HTMLButtonElement>(
      '.ts-chart__interactive-legend [data-series-id="a"]',
    )
    if (!button) throw new Error('Expected interactive legend button')
    button.focus()
    button.click()

    expect(visible).toEqual(['b'])
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(button)
    expect(new Set(host.getScene().points.map((point) => point.group))).toEqual(
      new Set(['b']),
    )
    expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()
    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('hosts a continuous cursor over the Canvas surface', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    const onChange = vi.fn()
    const definition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y' })],
      scales: {
        x: { scale: scaleLinear().domain([0, 10]) },
        y: { scale: scaleLinear().domain([0, 10]) },
      },
      controls: [
        continuousCursor({
          id: 'canvas-cursor',
          position: controlledSignal<
            ContinuousCursorPosition<number, number> | null,
            ContinuousCursorChange<number, number>
          >(null, onChange),
        }),
      ],
      keyboard: false,
    })
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountCanvasChart(container, {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Canvas free cursor',
    })
    const surface = container.querySelector<HTMLElement>('.ts-chart-canvas')!
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
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
    const overlay = container.querySelector<SVGSVGElement>(
      '[data-chart-cursor="canvas-cursor"]',
    )!
    const scene = host.getScene()
    const event = new MouseEvent('pointermove', {
      bubbles: true,
      clientX: scene.chart.x + scene.chart.width / 2,
      clientY: scene.chart.y + scene.chart.height / 2,
    })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })

    overlay.dispatchEvent(event)

    const [value, { reason: change }] = onChange.mock.calls.at(-1)!
    expect(value.x).toBeCloseTo(5)
    expect(value.y).toBeCloseTo(5)
    expect(change).toMatchObject({ type: 'preview', cause: 'move' })
    expect(
      overlay.querySelector('.ts-chart__continuous-cursor-marker'),
    ).not.toBeNull()
    expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('hosts a scale handle over Canvas and removes it with its behavior', () => {
    const onChange = vi.fn()
    const data = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    const chart = (withHandle: boolean) =>
      defineChart({
        marks: [lineY(data, { x: 'x', y: 'y' })],
        scales: {
          x: { scale: scaleLinear().domain([0, 10]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
        controls: withHandle
          ? [
              handleX({
                id: 'canvas-handle',
                value: controlledSignal<number, HandleXChange<number>>(
                  0,
                  onChange,
                ),
                values: [0, 5, 10],
                cross: { edge: 'bottom', offset: 8 },
              }),
            ]
          : [],
        keyboard: false,
      })
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountCanvasChart(container, {
      definition: chart(true),
      width: 480,
      height: 260,
      ariaLabel: 'Canvas handle',
    })
    const target = container.querySelector<SVGRectElement>(
      '[data-chart-handle-surface="canvas-handle"]',
    )!

    target.focus()
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      }),
    )

    expect(onChange).toHaveBeenLastCalledWith(
      10,
      expect.objectContaining({
        reason: expect.objectContaining({
          type: 'commit',
          source: 'keyboard',
        }),
      }),
    )
    // The host proposed the last candidate, but the controlled signal still
    // accepts the first. Paint and accessibility must reflect accepted state.
    expect(target.getAttribute('aria-valuenow')).toBe('0')
    expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()

    host.update({
      definition: chart(false),
      width: 480,
      height: 260,
      ariaLabel: 'Canvas without handle',
    })
    expect(target.isConnected).toBe(false)
    expect(
      container.querySelector('[data-chart-handle-surface="canvas-handle"]'),
    ).toBeNull()

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('hosts horizontal zoom controls over Canvas and tears them down with their owner', () => {
    const onChange = vi.fn()
    const acceptedWindow = { start: 2.5, end: 7.5 }
    const data = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    const definition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y' })],
      scales: {
        x: {
          scale: scaleLinear().domain([
            acceptedWindow.start,
            acceptedWindow.end,
          ]),
        },
        y: { scale: scaleLinear().domain([0, 10]) },
      },
      controls: [
        zoomX({
          id: 'canvas-zoom',
          window: controlledSignal<ZoomXWindow<number>, ZoomXChange<number>>(
            acceptedWindow,
            onChange,
          ),
          extent: [0, 10],
          scaleExtent: [1, 8],
        }),
      ],
      keyboard: false,
    })
    const withoutZoom = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y' })],
      scales: {
        x: { scale: scaleLinear().domain([0, 10]) },
        y: { scale: scaleLinear().domain([0, 10]) },
      },
      keyboard: false,
    })
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountCanvasChart(container, {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Canvas zoom',
    })
    const target = container.querySelector<SVGElement>(
      '[data-chart-zoom-surface="canvas-zoom"]',
    )!

    target.focus()
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '+',
        bubbles: true,
        cancelable: true,
      }),
    )

    const [value, { reason: change }] = onChange.mock.calls.at(-1)!
    expect(value.start).toBeCloseTo(3.75)
    expect(value.end).toBeCloseTo(6.25)
    expect(change).toMatchObject({
      type: 'commit',
      source: 'keyboard',
      action: 'zoom',
    })
    expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()

    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
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
    const scene = host.getScene()
    const x = scene.chart.x + scene.chart.width / 2
    const y = scene.chart.y + scene.chart.height / 2
    const pointerEvent = (
      type: 'mousedown' | 'mousemove' | 'mouseup',
      clientX: number,
      buttons = 0,
    ) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons,
        clientX,
        clientY: y,
      })
      Object.defineProperty(event, 'view', { value: window })
      return event
    }
    target.dispatchEvent(pointerEvent('mousedown', x))
    window.dispatchEvent(pointerEvent('mousemove', x + 30, 1))
    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({
      reason: { type: 'preview' },
    })

    const callCount = onChange.mock.calls.length
    host.update({
      definition: withoutZoom,
      width: 480,
      height: 260,
      ariaLabel: 'Canvas without zoom',
    })
    expect(target.isConnected).toBe(false)
    expect(
      container.querySelector('[data-chart-zoom-surface="canvas-zoom"]'),
    ).toBeNull()
    window.dispatchEvent(pointerEvent('mousemove', x + 60, 1))
    window.dispatchEvent(pointerEvent('mouseup', x + 60))
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '+',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(onChange).toHaveBeenCalledTimes(callCount)
    expect(container.querySelector('.ts-chart-canvas')).not.toBeNull()

    host.update({
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Canvas zoom restored',
    })
    const restoredTarget = container.querySelector(
      '[data-chart-zoom-surface="canvas-zoom"]',
    )
    expect(restoredTarget).not.toBe(target)

    host.destroy()
    expect(restoredTarget?.isConnected).toBe(false)
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('paints lineX through the shared Canvas polyline scene', () => {
    const container = document.createElement('div')
    const host = mountCanvasChart(container, {
      definition: defineChart({
        marks: [lineX([2, 6, 4])],
        scales: {
          x: { scale: scaleLinear().domain([0, 6]) },
          y: { scale: scaleLinear().domain([0, 2]) },
        },
        guides: false,
      }),
      width: 300,
      height: 180,
      ariaLabel: 'Horizontal line',
    })
    const canvas = container.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const painted = canvas ? contexts.get(canvas) : undefined

    expect(host.getScene().points.map((point) => point.xValue)).toEqual([
      2, 6, 4,
    ])
    expect(
      painted?.operations.some(
        (operation) =>
          operation.startsWith('stroke:') && operation.endsWith(':2.25:1'),
      ),
    ).toBe(true)
    expect(
      painted?.operations.filter((operation) =>
        operation.startsWith('lineTo:'),
      ),
    ).toHaveLength(2)
    host.destroy()
  })

  it('adopts prerendered Canvas markup instead of replacing its root', () => {
    const container = document.createElement('div')
    container.innerHTML = canvasChartRenderer.prerender(scene([]), {
      ariaLabel: 'Hydrated Canvas chart',
    })
    const root = container.querySelector('.ts-chart-canvas')
    const surface = canvasChartRenderer.mount(container, () => {})

    surface.render(scene([]), renderOptions())

    expect(surface.element).toBe(root)
    surface.destroy()
  })

  it('paints structured polygons without requiring Path2D', () => {
    Object.defineProperty(window, 'Path2D', {
      configurable: true,
      value: undefined,
    })
    const container = document.createElement('div')
    const surface = canvasChartRenderer.mount(container, () => {})

    expect(() =>
      surface.render(
        scene([
          {
            kind: 'area',
            key: 'contour',
            points: [[99, 99]],
            path: 'M99,99Z',
            polygons: [
              [
                [
                  [0, 0],
                  [20, 0],
                  [20, 20],
                  [0, 20],
                ],
                [
                  [5, 5],
                  [15, 5],
                  [15, 15],
                  [5, 15],
                ],
              ],
            ],
            style: { fill: '#2563eb' },
          },
        ]),
        renderOptions(),
      ),
    ).not.toThrow()

    const fake = contexts.get(surface.sceneCanvas)
    expect(fake?.operations).toContain('fill:evenodd')
    expect(fake?.operations).toContain('moveTo:0,0')
    expect(fake?.operations).not.toContain('moveTo:99,99')
    surface.destroy()
  })

  it('fails clearly when required browser Canvas APIs are unavailable', () => {
    const noContextContainer = document.createElement('div')
    const noContextSurface = canvasChartRenderer.mount(
      noContextContainer,
      () => {},
    )
    getContextSpy.mockReturnValue(null)
    expect(() => noContextSurface.render(scene([]), renderOptions())).toThrow(
      'Canvas 2D context',
    )
    noContextSurface.destroy()

    getContextSpy.mockImplementation(function (this: HTMLCanvasElement) {
      let value = contexts.get(this)
      if (!value) {
        value = fakeContext()
        contexts.set(this, value)
      }
      return value.context
    })
    Object.defineProperty(window, 'Path2D', {
      configurable: true,
      value: undefined,
    })
    const noPathContainer = document.createElement('div')
    const noPathSurface = canvasChartRenderer.mount(noPathContainer, () => {})
    expect(() =>
      noPathSurface.render(
        scene([
          {
            kind: 'polyline',
            key: 'curve',
            points: [],
            path: 'M0,0C10,20,20,20,30,0',
            style: { fill: 'none', stroke: '#2563eb' },
          },
        ]),
        renderOptions(),
      ),
    ).toThrow('requires Path2D')
    noPathSurface.destroy()
  })
})

function scene(
  nodes: SceneNode[],
  gradients: ChartScene['gradients'] = [],
  background = 'transparent',
): ChartScene {
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes,
    points: [],
    scales: {},
    colors: {
      type: 'ordinal',
      domain: [],
      range: [],
      map: () => '#2563eb',
    },
    gradients,
    theme: {
      foreground: '#111111',
      muted: '#666666',
      grid: '#999999',
      background,
      palette: ['#2563eb'],
    },
  }
}

function renderOptions(): ChartSurfaceRenderOptions {
  return {
    ariaLabel: 'Canvas chart',
    tabIndex: 0,
  }
}

function fakeContext(): FakeCanvasContext {
  const operations: string[] = []
  const gradientStops: Array<[number, string]> = []
  const textPaints: FakeCanvasContext['textPaints'] = []
  let fillStyle: string | CanvasGradient = '#000000'
  let strokeStyle: string | CanvasGradient = '#000000'
  let lineWidth = 1
  let globalAlpha = 1
  let lineCap: CanvasLineCap = 'butt'
  let lineJoin: CanvasLineJoin = 'miter'
  const gradient = {
    addColorStop(offset: number, color: string) {
      gradientStops.push([offset, color])
    },
  } as CanvasGradient
  const context = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    setTransform: (...values: number[]) =>
      operations.push(`setTransform:${values.join(',')}`),
    clearRect: (...values: number[]) =>
      operations.push(`clearRect:${values.join(',')}`),
    fillRect: (...values: number[]) =>
      operations.push(`fillRect:${values.join(',')}`),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    moveTo: (...values: number[]) =>
      operations.push(`moveTo:${values.join(',')}`),
    lineTo: (...values: number[]) =>
      operations.push(`lineTo:${values.join(',')}`),
    rect: (...values: number[]) => operations.push(`rect:${values.join(',')}`),
    arc: (x: number, y: number, radius: number) =>
      operations.push(`arc:${x},${y},${radius}`),
    arcTo: () => operations.push('arcTo'),
    translate: (...values: number[]) =>
      operations.push(`translate:${values.join(',')}`),
    rotate: (value: number) => operations.push(`rotate:${value}`),
    clip: () => operations.push('clip'),
    fill: (pathOrRule?: Path2D | CanvasFillRule) => {
      operations.push(
        pathOrRule === 'evenodd'
          ? 'fill:evenodd'
          : pathOrRule
            ? 'fill:path'
            : 'fill:current',
      )
      operations.push(`fill:${String(fillStyle)}:${globalAlpha}`)
    },
    stroke: (path?: Path2D) => {
      operations.push(path ? 'stroke:path' : 'stroke:current')
      operations.push(
        `stroke:${String(strokeStyle)}:${lineWidth}:${globalAlpha}`,
      )
    },
    fillText: (text: string, x: number, y: number) => {
      operations.push(`fillText:${text},${x},${y}`)
      textPaints.push({
        text,
        globalAlpha,
        font: context.font,
        direction: context.direction,
        textAlign: context.textAlign,
      })
    },
    strokeText: (text: string, x: number, y: number) =>
      operations.push(`strokeText:${text},${x},${y}`),
    setLineDash: (values: number[]) =>
      operations.push(`setLineDash:${values.join(',')}`),
    createLinearGradient: () => gradient,
    drawImage: (source: CanvasImageSource) => {
      const className =
        source instanceof HTMLCanvasElement ? source.className : ''
      operations.push(className ? `drawImage:${className}` : 'drawImage')
    },
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value) {
      fillStyle = value
    },
    get strokeStyle() {
      return strokeStyle
    },
    set strokeStyle(value) {
      strokeStyle = value
    },
    get lineWidth() {
      return lineWidth
    },
    set lineWidth(value) {
      lineWidth = value
    },
    get globalAlpha() {
      return globalAlpha
    },
    set globalAlpha(value) {
      globalAlpha = value
    },
    get lineCap() {
      return lineCap
    },
    set lineCap(value) {
      lineCap = value
      operations.push(`lineCap:${value}`)
    },
    get lineJoin() {
      return lineJoin
    },
    set lineJoin(value) {
      lineJoin = value
      operations.push(`lineJoin:${value}`)
    },
    font: '',
    fontStretch: 'normal',
    letterSpacing: '0px',
    direction: 'inherit',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
  return { operations, gradientStops, textPaints, context }
}
