import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import {
  canvasChartRenderer,
  createCanvasChartRenderer,
  mountCanvasChart,
} from './canvas'
import { lineY } from './line'
import { defineChart } from './scene'
import type { ChartScene, ChartSurfaceRenderOptions, SceneNode } from './types'

interface FakeCanvasContext {
  operations: string[]
  gradientStops: Array<[number, string]>
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
    expect(markup).toContain('ts-chart-canvas__scene')
    expect(markup).toContain('ts-chart-canvas__focus')
    expect(getContextSpy).not.toHaveBeenCalled()
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
    if (!canvas) throw new Error('Expected scene canvas')
    const fake = contexts.get(canvas)
    if (!fake) throw new Error('Expected scene context')

    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(120)
    expect(fake.operations).toContain('setTransform:2,0,0,2,0,0')
    expect(fake.operations).toContain('fillRect:0,0,100,60')
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
    expect(fake.operations).toContain('arc:50,30,5')
    expect(fake.operations).toContain('arcTo')
    expect(fake.operations).toContain('fillText:Canvas,0,0')
    expect(fake.gradientStops).toHaveLength(2)
    expect(surface.element).toBe(container.querySelector('.ts-chart-canvas'))
    surface.destroy()
  })

  it('uses a separate focus overlay without repainting the base scene', () => {
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
            points: [point],
            placement: 'over',
          },
        },
      ]),
      renderOptions(),
    )
    const base = contexts.get(surface.canvas)
    const focus = contexts.get(surface.focusCanvas)
    if (!base || !focus) throw new Error('Expected both contexts')
    const baseOperations = [...base.operations]

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
    expect(focus.operations).toContain('clearRect:0,0,100,60')
    expect(focus.operations).toContain('arc:50,30,5')
    expect(focus.operations).toEqual(
      expect.arrayContaining([expect.stringMatching(/^stroke:.*:2\.5:1$/)]),
    )
    surface.destroy()
  })

  it('paints leading focus marks below the cached base scene', () => {
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
      ]),
      renderOptions(),
    )
    const base = contexts.get(surface.canvas)
    const under = contexts.get(surface.focusUnderCanvas)
    if (!base || !under) throw new Error('Expected base and underlay contexts')
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

    const fake = contexts.get(surface.canvas)
    if (!fake) throw new Error('Expected scene context')
    expect(
      fake.operations.filter((operation) => operation.startsWith('arc:')),
    ).toHaveLength(250)
    expect(
      fake.operations.filter((operation) => operation === 'fill:current'),
    ).toHaveLength(1)
    surface.destroy()
  })

  it('crossfades animated scene updates and cancels pending frames', () => {
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
    const dotScene = (x: number) =>
      scene([
        {
          kind: 'dot',
          key: 'dot',
          x,
          y: 20,
          radius: 3,
          style: { fill: '#2563eb' },
        },
      ])
    surface.render(dotScene(10), renderOptions())
    const base = contexts.get(surface.canvas)
    if (!base) throw new Error('Expected scene context')

    surface.render(dotScene(20), {
      ...renderOptions(),
      animation: { duration: 100 },
    })
    callbacks.shift()?.(0)

    expect(
      base.operations.filter((operation) => operation === 'drawImage'),
    ).toHaveLength(2)
    surface.render(dotScene(30), renderOptions())
    expect(cancelFrame).toHaveBeenCalled()
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
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 8]) },
    })
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const host = mountCanvasChart(container, {
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip: true,
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
    fill: (path?: Path2D) =>
      operations.push(path ? 'fill:path' : 'fill:current'),
    stroke: (path?: Path2D) => {
      operations.push(path ? 'stroke:path' : 'stroke:current')
      operations.push(
        `stroke:${String(strokeStyle)}:${lineWidth}:${globalAlpha}`,
      )
    },
    fillText: (text: string, x: number, y: number) =>
      operations.push(`fillText:${text},${x},${y}`),
    strokeText: (text: string, x: number, y: number) =>
      operations.push(`strokeText:${text},${x},${y}`),
    setLineDash: (values: number[]) =>
      operations.push(`setLineDash:${values.join(',')}`),
    createLinearGradient: () => gradient,
    drawImage: () => operations.push('drawImage'),
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
  return { operations, gradientStops, context }
}
