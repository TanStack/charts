import * as React from 'react'
import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { CanvasChart } from './CanvasChart'

const data = [
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

const dynamicDefinition = defineChart<{
  data: typeof data
  stroke: string
}>()(({ input }) => ({
  marks: [
    lineY(input.data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: input.stroke,
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
  guides: false,
}))

if (false) {
  const inferredCallbacks = (
    <CanvasChart
      definition={dynamicDefinition}
      input={{ data, stroke: '#2563eb' }}
      ariaLabel="Revenue"
      onFocusChange={(point) => {
        expectTypeOf(point?.datum).toEqualTypeOf<
          (typeof data)[number] | undefined
        >()
        expectTypeOf(point?.xValue).toEqualTypeOf<number | undefined>()
        expectTypeOf(point?.yValue).toEqualTypeOf<number | undefined>()
      }}
      onRender={({ scene, surface }) => {
        expectTypeOf(scene.points).items.toMatchTypeOf<{
          datum: (typeof data)[number]
          xValue: number
          yValue: number
        }>()
        expectTypeOf(surface.element).toEqualTypeOf<Element>()
      }}
    />
  )
  const missingInput = (
    // @ts-expect-error Dynamic Canvas chart props require input.
    <CanvasChart definition={dynamicDefinition} ariaLabel="Revenue" />
  )
  const staticInput = (
    // @ts-expect-error Static Canvas chart props do not accept input.
    <CanvasChart definition={definition} input={{}} ariaLabel="Revenue" />
  )
  void [inferredCallbacks, missingInput, staticInput]
}

describe('React Canvas adapter', () => {
  it('server-renders an accessible Canvas shell without using Canvas APIs', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')

    const html = renderToString(
      <CanvasChart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
        ariaDescription="Monthly revenue"
        tabIndex={4}
      />,
    )

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('class="ts-chart ts-chart-canvas"')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('aria-description="Monthly revenue"')
    expect(html).toContain('tabindex="4"')
    expect(html).toContain('ts-chart-canvas__scene')
    expect(html).toContain('ts-chart-canvas__focus')
    expect(html).not.toContain('<svg')
    expect(getContext).not.toHaveBeenCalled()
    getContext.mockRestore()
  })

  it('hydrates the prerendered surface and keeps pointer and keyboard callbacks', async () => {
    const getContext = mockCanvasContexts()
    const target = document.createElement('div')
    target.innerHTML = renderToString(
      <CanvasChart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
    )
    const serverSurface = target.querySelector<HTMLElement>('.ts-chart-canvas')
    const serverSceneCanvas = target.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__scene',
    )
    const serverFocusCanvas = target.querySelector<HTMLCanvasElement>(
      '.ts-chart-canvas__focus',
    )
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const onRender = vi.fn()
    let root!: ReturnType<typeof hydrateRoot>

    await act(async () => {
      root = hydrateRoot(
        target,
        <CanvasChart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          maxFocusDistance={1_000}
          tooltip
          onFocusChange={onFocusChange}
          onSelect={onSelect}
          onRender={onRender}
        />,
      )
    })

    const surface = target.querySelector<HTMLElement>('.ts-chart-canvas')
    if (!surface) throw new Error('Expected a Canvas chart surface')
    expect(surface).toBe(serverSurface)
    expect(target.querySelector('.ts-chart-canvas__scene')).toBe(
      serverSceneCanvas,
    )
    expect(target.querySelector('.ts-chart-canvas__focus')).toBe(
      serverFocusCanvas,
    )
    expect(onRender).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: expect.objectContaining({ element: surface }),
      }),
    )

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

    await act(async () => {
      surface.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(target.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden).toBe(
      false,
    )

    await act(async () => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
        }),
      )
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    await act(async () => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
      )
    })
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    const first = onRender.mock.calls.at(-1)?.[0]?.scene.points[0]
    if (!first) throw new Error('Expected a rendered point')
    await act(async () => {
      surface.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: first.x,
          clientY: first.y,
        }),
      )
    })
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])

    await act(async () => root.unmount())
    expect(target.childElementCount).toBe(0)
    getContext.mockRestore()
  })

  it('mounts directly without an SVG fallback', async () => {
    const getContext = mockCanvasContexts()
    const target = document.createElement('div')
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <CanvasChart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })

    expect(target.querySelector('.ts-chart-canvas')).not.toBeNull()
    expect(target.querySelectorAll('canvas')).toHaveLength(2)
    expect(target.querySelector('svg')).toBeNull()

    await act(async () => root.unmount())
    getContext.mockRestore()
  })
})

function mockCanvasContexts() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => fakeCanvasContext())
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
