import { act, createRoot, hydrateRoot } from 'octane'
import { octane } from 'octane/compiler/vite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartPoint, ChartRendererRenderContext } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/octane-charts/canvas'
import { scaleLinear } from 'd3-scale'
import { createServer } from 'vite'
import { HydrationCanvasChart } from './CanvasChart.hydration.fixture'

interface Datum {
  id: string
  month: number
  value: number
}

const data: Datum[] = [
  { id: 'jan', month: 1, value: 8 },
  { id: 'feb', month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
  guides: false,
})
const interactiveDefinition = defineChart(definition, {
  maxFocusDistance: 1_000,
  tooltip,
})

let getContext: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => fakeCanvasContext())
})

afterEach(() => {
  getContext.mockRestore()
  vi.restoreAllMocks()
})

describe('Octane Canvas adapter client', () => {
  it(
    'hydrates the server-rendered Canvas shell in place',
    async () => {
      const target = document.createElement('div')
      target.innerHTML = await renderServerHydrationFixture()
      const host = target.querySelector('.ts-chart-host')
      const surface = target.querySelector('.ts-chart-canvas')
      const focusUnderCanvas = target.querySelector(
        '.ts-chart-canvas__focus-under',
      )
      const sceneCanvas = target.querySelector('.ts-chart-canvas__scene')
      const focusCanvas = target.querySelector('.ts-chart-canvas__focus')
      if (
        !host ||
        !surface ||
        !focusUnderCanvas ||
        !sceneCanvas ||
        !focusCanvas
      ) {
        throw new Error('Expected the server-rendered Canvas chart shell')
      }

      let root: ReturnType<typeof hydrateRoot> | undefined
      await act(() => {
        root = hydrateRoot(target, HydrationCanvasChart)
      })

      expect(target.querySelector('.ts-chart-host')).toBe(host)
      expect(target.querySelector('.ts-chart-canvas')).toBe(surface)
      expect(target.querySelector('.ts-chart-canvas__focus-under')).toBe(
        focusUnderCanvas,
      )
      expect(target.querySelector('.ts-chart-canvas__scene')).toBe(sceneCanvas)
      expect(target.querySelector('.ts-chart-canvas__focus')).toBe(focusCanvas)
      expect(target.querySelector('svg')).toBeNull()

      await act(() => root?.unmount())
      expect(target.childElementCount).toBe(0)
    },
    15_000,
  )

  it('adopts its rendered Canvas shell and preserves interaction callbacks', async () => {
    const target = document.createElement('div')
    const onFocusChange = vi.fn<(point: ChartPoint<Datum> | null) => void>()
    const onSelect = vi.fn<(point: ChartPoint<Datum> | null) => void>()
    const onRender =
      vi.fn<(context: ChartRendererRenderContext<Datum>) => void>()

    function ClientChart() {
      return (
        <Chart
          definition={interactiveDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          onFocusChange={onFocusChange}
          onSelect={onSelect}
          onRender={onRender}
        />
      )
    }

    const root = createRoot(target)
    await act(() => root.render(ClientChart))

    const surface = target.querySelector<HTMLElement>('.ts-chart-canvas')
    const sceneCanvas = target.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const focusCanvas = target.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__focus',
    )
    if (!surface || !sceneCanvas || !focusCanvas) {
      throw new Error('Expected the Canvas chart surface')
    }
    const context = onRender.mock.calls.at(-1)?.[0]
    expect(context?.surface.element).toBe(surface)
    expect(target.querySelectorAll('canvas')).toHaveLength(3)
    expect(target.querySelector('svg')).toBeNull()

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

    await act(() => {
      surface.dispatchEvent(
        new FocusEvent('focusin', {
          bubbles: true,
        }),
      )
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(target.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden).toBe(
      false,
    )

    await act(() => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
        }),
      )
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    await act(() => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'Enter',
        }),
      )
    })
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    await act(() => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'Escape',
        }),
      )
    })

    const first = context?.scene.points[0]
    if (!first) throw new Error('Expected a rendered chart point')
    await act(() => {
      surface.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: first.x,
          clientY: first.y,
        }),
      )
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(target.querySelector('.ts-chart-canvas')).toBe(surface)
    expect(target.querySelector('.ts-chart-canvas__scene')).toBe(sceneCanvas)
    expect(target.querySelector('.ts-chart-canvas__focus')).toBe(focusCanvas)

    await act(() => root.unmount())
    expect(target.childElementCount).toBe(0)
  })
})

async function renderServerHydrationFixture(): Promise<string> {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'silent',
    appType: 'custom',
    plugins: [octane({ hmr: false, ssr: true })],
    resolve: {
      extensions: ['.tsrx', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },
    server: { middlewareMode: true },
    ssr: {
      noExternal: ['@tanstack/octane-charts'],
    },
  })
  try {
    const fixture = (await server.ssrLoadModule(
      '/packages/octane-charts/src/CanvasChart.hydration.server.tsrx',
    )) as {
      renderHydrationCanvasChart(): string
    }
    return fixture.renderHydrationCanvasChart()
  } finally {
    await server.close()
  }
}

function fakeCanvasContext(): CanvasRenderingContext2D {
  const gradient = {
    addColorStop() {},
  } as CanvasGradient
  return {
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    rect() {},
    arc() {},
    arcTo() {},
    translate() {},
    rotate() {},
    clip() {},
    fill() {},
    stroke() {},
    fillText() {},
    strokeText() {},
    setLineDash() {},
    createLinearGradient: () => gradient,
    drawImage() {},
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    fontStretch: 'normal',
    letterSpacing: '0px',
    direction: 'inherit',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}
