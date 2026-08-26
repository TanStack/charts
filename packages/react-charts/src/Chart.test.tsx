import * as React from 'react'
import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { areaY, defineChart, dot, lineY } from '@tanstack/charts'
import type {
  ChartDefinition,
  ChartInteractionController,
} from '@tanstack/charts'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { canvasChartRenderer } from '@tanstack/charts/canvas'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal as tooltipPortal } from '@tanstack/charts/tooltip/portal'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'
import {
  Chart as TooltipChart,
  RendererChart as TooltipRendererChart,
} from './tooltip'

const data = [
  { id: 'jan', month: 1, value: 8 },
  { id: 'feb', month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      id: 'revenue',
      x: 'month',
      y: 'value',
      key: 'id',
      points: true,
    }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([1, 2]) },
    y: { scale: scaleLinear().domain([8, 12]) },
  },
})
const mixedDefinition = defineChart({
  marks: [
    lineY(data, {
      id: 'canvas-revenue',
      x: 'month',
      y: 'value',
      renderer: canvasChartRenderer,
    }),
    dot(data, { id: 'svg-points', x: 'month', y: 'value' }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([1, 2]) },
    y: { scale: scaleLinear().domain([8, 12]) },
  },
})

const typedDynamicDefinition = defineChart(() => ({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: 'red',
    }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([1, 2]) },
    y: { scale: scaleLinear().domain([8, 12]) },
  },
}))
const widenedDefinition: ChartDefinition<
  (typeof data)[number],
  number,
  number
> = data.length > 0 ? definition : typedDynamicDefinition
const broadFocusDefinition = defineChart(definition, {
  maxFocusDistance: 1_000,
})
const focusDisabledDefinition = defineChart(definition, { focus: false })

if (false) {
  const legacyStaticArity = (
    <Chart<(typeof data)[number]>
      definition={definition}
      ariaLabel="Explicit static datum"
    />
  )
  const explicitDynamicArity = (
    <Chart<(typeof data)[number], number, number>
      definition={typedDynamicDefinition}
      ariaLabel="Explicit dynamic coordinates"
    />
  )
  void legacyStaticArity
  void explicitDynamicArity

  const focusedDynamicDefinition = defineChart(typedDynamicDefinition, {
    focus: {
      resolve(points) {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: (typeof data)[number]
          xValue: number
          yValue: number
        }>()
        return points
      },
      group(_points, { point }) {
        expectTypeOf(point.xValue).toEqualTypeOf<number>()
        return [point]
      },
      navigation: (points) => points,
    },
  })
  const inferredCallback = (
    <TooltipChart
      definition={focusedDynamicDefinition}
      ariaLabel="Revenue"
      renderSvg={(scene) => {
        expectTypeOf(scene.points).items.toMatchTypeOf<{
          datum: (typeof data)[number]
          xValue: number
          yValue: number
        }>()
        return ''
      }}
      onFocusChange={(point) => {
        expectTypeOf(point?.datum).toEqualTypeOf<
          (typeof data)[number] | undefined
        >()
        expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
        expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
      }}
      onFocusGroupChange={(points) => {
        const point = points[0]
        if (!point) return
        expectTypeOf(point.xValue).toEqualTypeOf<number>()
        expectTypeOf(point.yValue).toEqualTypeOf<number>()
      }}
      onSelect={(point) => {
        expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
        expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
      }}
      renderTooltipBody={({
        points,
        content,
        defaultBody,
        pinned,
        dismiss,
      }) => {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: (typeof data)[number]
          xValue: number
          yValue: number
        }>()
        expectTypeOf(content).toEqualTypeOf<
          | string
          | {
              title?: string
              color?: string
              rows: readonly {
                label: string
                value: string
                color?: string
              }[]
            }
        >()
        expectTypeOf(defaultBody).toEqualTypeOf<React.ReactNode>()
        expectTypeOf(pinned).toEqualTypeOf<boolean>()
        expectTypeOf(dismiss).toEqualTypeOf<() => void>()
        return defaultBody
      }}
    />
  )
  const inferredStaticCallback = (
    <Chart
      definition={definition}
      ariaLabel="Static revenue"
      onFocusChange={(point) => {
        expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
        expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
      }}
      onSelect={(point) => {
        expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
        expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
      }}
      onRender={({ interaction }) => {
        const resolved = interaction.resolvePointer(0, 0)
        expectTypeOf(resolved?.point.datum).toEqualTypeOf<
          (typeof data)[number] | undefined
        >()
        expectTypeOf(resolved?.point.xValue).toEqualTypeOf<number | undefined>()
        interaction.setControlledFocus(resolved, { source: 'pointer' })
        interaction.setControlledFocus(resolved?.point ?? null)
      }}
    />
  )
  const inferredMotionRenderer = (
    <TooltipRendererChart
      definition={definition}
      renderer={motion({ transition: { type: 'spring' } })}
      ariaLabel="Animated revenue"
    />
  )
  const widened = (
    <Chart
      // @ts-expect-error DOM hosts require a definition refined to the DOM tooltip host.
      definition={widenedDefinition}
      ariaLabel="Widened definition"
    />
  )
  void [
    inferredCallback,
    inferredStaticCallback,
    inferredMotionRenderer,
    widened,
  ]
}

describe('React adapter', () => {
  it('server-renders the complete shared SVG renderer output', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
        ariaDescription="Monthly revenue"
      />,
    )

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('class="ts-chart"')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('<desc>Monthly revenue</desc>')
    expect(html).toContain('<path')
  })

  it('server-renders Canvas marks between SVG layers when a mark opts in', () => {
    const html = renderToString(
      <Chart
        definition={mixedDefinition}
        width={480}
        height={260}
        ariaLabel="Mixed revenue"
      />,
    )

    expect(html).toContain('class="ts-chart ts-chart-layers"')
    expect(html).toContain('ts-chart-canvas__scene')
    expect(html).toContain('data-ts-key="svg-points"')
    expect(html).not.toContain('data-ts-key="canvas-revenue"')
  })

  it('server-renders a deterministic proportional size', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        initialWidth={480}
        aspectRatio={2}
        ariaLabel="Revenue"
      />,
    )

    expect(html).toContain('viewBox="0 0 480 240"')
    expect(html).toContain('aspect-ratio:2')
    expect(html).not.toContain('aspect-ratio:2px')
  })

  it('derives proportional initial geometry from an explicit width', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={900}
        initialWidth={480}
        aspectRatio={3}
        ariaLabel="Revenue"
      />,
    )

    expect(html).toContain('viewBox="0 0 900 300"')
    expect(html).toContain('width:900px')
    expect(html).toContain('aspect-ratio:3')
    expect(html).not.toContain('aspect-ratio:3px')
  })

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back consistently for an invalid aspect ratio (%s)',
    (aspectRatio) => {
      const html = renderToString(
        <Chart
          definition={definition}
          width={480}
          aspectRatio={aspectRatio}
          ariaLabel="Revenue"
        />,
      )

      expect(html).toContain('viewBox="0 0 480 320"')
      expect(html).toContain('height:320px')
      expect(html).not.toContain('aspect-ratio')
    },
  )

  it('server-renders an explicit SVG tab index', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
        tabIndex={4}
      />,
    )

    expect(html).toContain('tabindex="4"')
  })

  it('server-renders focus-disabled markup and hydrates it without replacing the SVG', async () => {
    const chart = (
      <Chart
        definition={focusDisabledDefinition}
        width={480}
        height={260}
        ariaLabel="Static revenue"
        tabIndex={4}
      />
    )
    const html = renderToString(chart)
    const target = document.createElement('div')
    target.innerHTML = html
    const serverSvg = target.querySelector('svg')
    let root!: ReturnType<typeof hydrateRoot>

    expect(serverSvg?.getAttribute('tabindex')).toBe('-1')
    expect(serverSvg?.querySelector('[data-ts-focus-layer]')).toBeNull()

    await act(async () => {
      root = hydrateRoot(target, chart)
    })

    expect(target.querySelector('svg')).toBe(serverSvg)
    expect(serverSvg?.getAttribute('tabindex')).toBe('-1')
    expect(serverSvg?.querySelector('[data-ts-focus-layer]')).toBeNull()
    await act(async () => root.unmount())
  })

  it('server-renders unique scoped resource IDs for sibling charts', () => {
    const gradientDefinition = defineChart({
      marks: [areaY([1, 3, 2], { fill: 'url(#fill)' })],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 3]) },
      },

      gradients: [
        {
          id: 'fill',
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        },
      ],
    })
    const html = renderToString(
      <>
        <Chart
          definition={gradientDefinition}
          renderSvg={renderChartSvgWithResources}
          width={480}
          height={260}
          ariaLabel="First"
        />
        <Chart
          definition={gradientDefinition}
          renderSvg={renderChartSvgWithResources}
          width={480}
          height={260}
          ariaLabel="Second"
        />
      </>,
    )
    const ids = [...html.matchAll(/<linearGradient[^>]+id="([^"]+)"/g)].map(
      (match) => match[1],
    )

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(html).toContain(`fill="url(#${ids[0]})"`)
    expect(html).toContain(`fill="url(#${ids[1]})"`)
  })

  it('bridges pointer focus to the original datum', async () => {
    const target = document.createElement('div')
    const onFocusChange = vi.fn()
    const root = createRoot(target)

    function StatefulChart() {
      const [, setFocused] = React.useState<unknown>(null)
      return (
        <Chart
          definition={broadFocusDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          onFocusChange={(point) => {
            onFocusChange(point)
            setFocused(point)
          }}
        />
      )
    }

    await act(async () => {
      root.render(<StatefulChart />)
    })

    const svg = target.querySelector('svg')
    if (!svg) throw new Error('Expected an SVG chart')
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

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(onFocusChange).toHaveBeenCalled()
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(
      target.querySelector('[data-ts-focus-layer]')?.getAttribute('visibility'),
    ).toBe('visible')

    await act(async () => root.unmount())
  })

  it('exposes controlled focus through the SVG render context', async () => {
    const controlledDefinition = defineChart(definition, {
      pointer: false,
      focus: 'nearest-x',
      maxFocusDistance: 1_000,
    })
    const target = document.createElement('div')
    const onFocusChange = vi.fn()
    const root = createRoot(target)
    let interaction:
      | ChartInteractionController<(typeof data)[number], number, number>
      | undefined

    await act(async () => {
      root.render(
        <Chart
          definition={controlledDefinition}
          width={480}
          height={260}
          ariaLabel="Controlled revenue"
          onFocusChange={onFocusChange}
          onRender={(context) => {
            interaction = context.interaction
          }}
        />,
      )
    })

    const svg = target.querySelector('svg')
    if (!svg || !interaction) {
      throw new Error('Expected a controlled SVG chart')
    }
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

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })
    expect(onFocusChange).not.toHaveBeenCalled()

    const resolved = interaction.resolvePointer(52, 200)
    expect(resolved?.point.datum).toBe(data[0])
    await act(async () => {
      interaction?.setControlledFocus(resolved, { source: 'pointer' })
    })

    expect(onFocusChange).toHaveBeenLastCalledWith(resolved?.point)
    expect(
      target.querySelector('[data-ts-focus-layer]')?.getAttribute('visibility'),
    ).toBe('visible')

    await act(async () => {
      interaction?.setControlledFocus(null)
    })
    expect(onFocusChange).toHaveBeenLastCalledWith(null)
    expect(
      target.querySelector('[data-ts-focus-layer]')?.getAttribute('visibility'),
    ).toBe('hidden')

    await act(async () => root.unmount())
  })

  it('composes a custom tooltip with the default body and dismisses a pinned portal', async () => {
    const tooltipDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        content: () => ({
          title: 'January',
          color: '#2563eb',
          rows: [
            {
              label: 'Revenue',
              value: '$8',
              color: '#2563eb',
            },
          ],
        }),
      },
    })
    const target = document.createElement('div')
    document.body.append(target)
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <TooltipChart
          definition={tooltipDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
            <div data-testid="rich-tooltip">
              {defaultBody}
              <span data-testid="tooltip-point">{points[0]?.datum.id}</span>
              <span data-testid="tooltip-pinned">{String(pinned)}</span>
              <Chart
                definition={definition}
                width={120}
                height={80}
                ariaLabel="January trend"
              />
              <button type="button" onClick={dismiss}>
                Close
              </button>
            </div>
          )}
        />,
      )
    })

    const svg = target.querySelector('svg')
    if (!svg) throw new Error('Expected an SVG chart')
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

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    expect(portal).not.toBeNull()
    expect(target.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).not.toBeNull()
    expect(body?.querySelector('.ts-chart-tooltip__title')?.textContent).toBe(
      'January',
    )
    expect(body?.querySelector('.ts-chart-tooltip__row')?.textContent).toBe(
      'Revenue$8',
    )
    expect(
      body?.querySelector<HTMLElement>('.ts-chart-tooltip__swatch')?.style
        .background,
    ).toBe('rgb(37, 99, 235)')
    expect(
      body?.querySelector('[data-testid="tooltip-point"]')?.textContent,
    ).toBe('jan')
    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('false')
    expect(
      body?.querySelector('svg[aria-label="January trend"]'),
    ).not.toBeNull()
    expect(body?.hasAttribute('inert')).toBe(true)
    expect(portal?.getAttribute('role')).toBe('status')

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('true')
    expect(portal?.dataset.sticky).toBe('true')
    expect(body?.hasAttribute('inert')).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(portal?.querySelector('.ts-chart-tooltip__body')).toBe(body)

    await act(async () => {
      body
        ?.querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="January trend"]')).toBeNull()

    await act(async () => root.unmount())
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    target.remove()
  })

  it('mounts a pin-only tooltip body only for the pinned lifecycle', async () => {
    const tooltipDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        visibility: 'pinned',
        content: ([point]) => ({
          title: point?.datum.id ?? 'Revenue',
          rows: [],
        }),
      },
    })
    const target = document.createElement('div')
    document.body.append(target)
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <TooltipChart
          definition={tooltipDefinition}
          width={480}
          height={260}
          ariaLabel="Pin-only revenue details"
          renderTooltipBody={({ pinned }) => (
            <div data-testid="pin-only-tooltip-body">{String(pinned)}</div>
          )}
        />,
      )
    })

    const svg = target.querySelector('svg')
    if (!svg) throw new Error('Expected an SVG chart')
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

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    expect(
      document.querySelector('[data-testid="pin-only-tooltip-body"]'),
    ).toBeNull()

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    expect(portal?.hidden).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(
      portal?.querySelector('[data-testid="pin-only-tooltip-body"]')
        ?.textContent,
    ).toBe('true')

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(portal?.hidden).toBe(true)
    expect(
      portal?.querySelector('[data-testid="pin-only-tooltip-body"]'),
    ).toBeNull()

    await act(async () => root.unmount())
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    target.remove()
  })

  it('preserves the chart DOM when the definition is stable', async () => {
    const dynamicDefinition = defineChart(() => ({
      marks: [
        lineY(data, {
          x: 'month',
          y: 'value',
          key: 'id',
          stroke: 'red',
        }),
      ],
      scales: {
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      },
    }))
    const target = document.createElement('div')
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <Chart
          definition={dynamicDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })
    const initialSvg = target.querySelector('svg')

    await act(async () => {
      root.render(
        <Chart
          definition={dynamicDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })

    expect(target.querySelector('svg')).toBe(initialSvg)
    await act(async () => root.unmount())
  })

  it('mounts mixed marks without breaking the SVG render callback', async () => {
    const getContext = mockCanvasContexts()
    const target = document.createElement('div')
    const root = createRoot(target)
    const onRender = vi.fn()

    try {
      await act(async () => {
        root.render(
          <Chart
            definition={mixedDefinition}
            width={480}
            height={260}
            ariaLabel="Mixed revenue"
            onRender={onRender}
          />,
        )
      })

      const context = onRender.mock.calls.at(-1)?.[0]
      expect(context.surface.element).toBe(
        target.querySelector('.ts-chart-layers'),
      )
      expect(context.surface.layers).toHaveLength(3)
      expect(context.svg).toBe(target.querySelectorAll('svg').item(1))
      expect(
        context.svg.querySelector('[data-ts-key="svg-points"]'),
      ).not.toBeNull()
    } finally {
      await act(async () => root.unmount())
      getContext.mockRestore()
    }
  })

  it('hydrates mixed server markup without replacing its layers', async () => {
    const getContext = mockCanvasContexts()
    const target = document.createElement('div')
    target.innerHTML = renderToString(
      <Chart
        definition={mixedDefinition}
        width={480}
        height={260}
        ariaLabel="Mixed revenue"
      />,
    )
    const serverRoot = target.querySelector('.ts-chart-layers')
    const serverLayers = [...target.querySelectorAll('.ts-chart-layer')]
    const serverCanvases = [...target.querySelectorAll('canvas')]
    let root!: ReturnType<typeof hydrateRoot>

    try {
      await act(async () => {
        root = hydrateRoot(
          target,
          <Chart
            definition={mixedDefinition}
            width={480}
            height={260}
            ariaLabel="Mixed revenue"
          />,
        )
      })

      expect(target.querySelector('.ts-chart-layers')).toBe(serverRoot)
      expect([...target.querySelectorAll('.ts-chart-layer')]).toEqual(
        serverLayers,
      )
      expect([...target.querySelectorAll('canvas')]).toEqual(serverCanvases)
    } finally {
      await act(async () => root.unmount())
      getContext.mockRestore()
    }
  })

  it('hydrates complete server markup without replacing the SVG', async () => {
    const target = document.createElement('div')
    target.innerHTML = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
    )
    const serverSvg = target.querySelector('svg')
    let root!: ReturnType<typeof hydrateRoot>

    await act(async () => {
      root = hydrateRoot(
        target,
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })

    expect(target.querySelector('svg')).toBe(serverSvg)
    await act(async () => root.unmount())
  })
})

function mockCanvasContexts() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => fakeCanvasContext())
}

function fakeCanvasContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} } as CanvasGradient
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
