import { scaleLinear, scaleUtc } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dot } from './dot'
import { mountChart } from './dom'
import { brushX, type BrushRange, type BrushXChange } from './interaction-brush'
import {
  controlledSignal,
  type ControlledSignalChangeContext,
} from './interaction-signal'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type { ChartHost } from './dom-types'

const dates = [
  new Date('2024-01-01T00:00:00.000Z'),
  new Date('2024-02-01T00:00:00.000Z'),
  new Date('2024-03-01T00:00:00.000Z'),
] as const
const rows = dates.map((date, value) => ({ date, value }))

describe('brushX', () => {
  it('resolves against final chart bounds with a static fallback', () => {
    const scene = createChartScene(
      definition(range(dates[0], dates[2]), () => {}),
      {
        width: 480,
        height: 240,
      },
    )
    const fallback = scene.nodes.find(
      (node) => node.key === 'behavior:window:fallback',
    )

    expect(fallback).toMatchObject({
      kind: 'group',
      className: 'ts-chart__brush-x-fallback',
    })
    expect(scene.controls).toHaveLength(1)
    expect(renderChartSvg(scene, { ariaLabel: 'Date range' })).toContain(
      'ts-chart__brush-x-fallback',
    )
  })

  it('mounts a host-owned brush and emits semantic keyboard commits', () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition: definition(range(dates[0], dates[2]), onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Date range',
    })

    expect(container.querySelector('.ts-chart__brush-x-fallback')).toBeNull()
    const root = container.querySelector<SVGSVGElement>(
      '[data-chart-brush="window"]',
    )
    const selection = root?.querySelector('.selection')
    const start = root?.querySelector<SVGRectElement>(
      '[data-chart-brush-handle="start"]',
    )
    expect(root?.getAttribute('aria-label')).toBe('Visible date range')
    expect(selection).not.toBeNull()
    expect(start?.getAttribute('role')).toBe('slider')
    expect(start?.getAttribute('aria-valuetext')).toBe('Jan 2024')
    expect(start?.getAttribute('aria-keyshortcuts')).toBe(
      'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
    )

    start?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )

    expect(onChange).toHaveBeenCalledOnce()
    const [next, reason] = onChange.mock.calls[0] as [
      BrushRange<Date>,
      BrushXChange<Date>,
    ]
    expect(next).toEqual(range(dates[1], dates[2]))
    expect(reason).toMatchObject({
      type: 'commit',
      source: 'keyboard',
      target: 'start',
      value: range(dates[1], dates[2]),
      origin: range(dates[0], dates[2]),
    })
    expect(next.start).not.toBe(dates[1])

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('keeps semantic handles constrained and supports a reversed x scale', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition: definition(range(dates[0], dates[1]), () => {}, dates, true),
      width: 480,
      height: 240,
      ariaLabel: 'Reversed date range',
    })
    const root = container.querySelector<SVGSVGElement>(
      '[data-chart-brush="window"]',
    )
    const selection = root?.querySelector<SVGRectElement>('.selection')
    const west = root?.querySelector<SVGRectElement>('.handle--w')
    const east = root?.querySelector<SVGRectElement>('.handle--e')
    const start = root?.querySelector<SVGRectElement>(
      '[data-chart-brush-handle="start"]',
    )
    const end = root?.querySelector<SVGRectElement>(
      '[data-chart-brush-handle="end"]',
    )

    expect(host.getScene().scales.x.map(dates[0])).toBeGreaterThan(
      host.getScene().scales.x.map(dates[2]),
    )
    expect(Number(selection?.getAttribute('width'))).toBeGreaterThan(0)
    expect(west?.dataset.chartBrushHandle).toBe('end')
    expect(east?.dataset.chartBrushHandle).toBe('start')
    expect(start?.getAttribute('aria-valuemin')).toBe('0')
    expect(start?.getAttribute('aria-valuemax')).toBe('1')
    expect(end?.getAttribute('aria-valuemin')).toBe('0')
    expect(end?.getAttribute('aria-valuemax')).toBe('2')

    host.destroy()
    container.remove()
  })

  it('lets a synchronous controlled rejection win over keyboard paint', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const value = range(dates[0], dates[2])
    const chartOptions = () => ({
      definition: definition(value, reject),
      width: 480,
      height: 240,
      ariaLabel: 'Controlled date range',
    })
    let host: ChartHost<(typeof rows)[number], Date, number>
    const onChange = vi.fn()
    function reject(next: BrushRange<Date>, reason: BrushXChange<Date>) {
      onChange(next, reason)
      host.update(chartOptions())
    }
    host = mountChart(container, chartOptions())
    const start = container.querySelector<SVGRectElement>(
      '[data-chart-brush-handle="start"]',
    )

    start?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )

    expect(onChange).toHaveBeenCalledOnce()
    expect(start?.getAttribute('aria-valuenow')).toBe('0')
    expect(start?.getAttribute('aria-valuetext')).toBe('Jan 2024')

    host.destroy()
    container.remove()
  })

  it('ends D3 mouse ownership on Escape and destroy', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const onChange = vi.fn()
    const firstContainer = document.createElement('div')
    document.body.append(firstContainer)
    const firstHost = mountChart(firstContainer, {
      definition: definition(range(dates[0], dates[2]), onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Cancelable date range',
    })
    beginMouseBrush(firstContainer)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0]?.[1]).toMatchObject({
      type: 'cancel',
      source: 'keyboard',
    })
    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['mousemove', 'mouseup']),
    )
    firstHost.destroy()
    firstContainer.remove()

    removed.mockClear()
    const secondContainer = document.createElement('div')
    document.body.append(secondContainer)
    const secondHost = mountChart(secondContainer, {
      definition: definition(range(dates[0], dates[2]), () => {}),
      width: 480,
      height: 240,
      ariaLabel: 'Destroyed date range',
    })
    beginMouseBrush(secondContainer)

    secondHost.destroy()

    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['mousemove', 'mouseup']),
    )
    secondContainer.remove()
  })

  it('restores a canceled touch through its native terminal event', async () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition: definition(range(dates[0], dates[2]), onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Touch date range',
    })
    const scene = host.getScene()
    const overlay = container.querySelector<SVGRectElement>(
      '[data-chart-brush="window"] .overlay',
    )!
    const selection = container.querySelector<SVGRectElement>(
      '[data-chart-brush="window"] .selection',
    )!
    const startX = scene.scales.x.map(dates[0])
    const middleX = scene.scales.x.map(dates[1])
    const endX = scene.scales.x.map(dates[2])
    const y = scene.chart.y + scene.chart.height / 2
    const initialGeometry = rectGeometry(selection)
    const touch = touchPoint(1, startX, y, overlay)

    dispatchTouch(overlay, 'touchstart', [touch], [touch])
    const moved = touchPoint(1, middleX, y, overlay)
    dispatchTouch(overlay, 'touchmove', [moved], [moved])
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    const movedAgain = touchPoint(1, endX, y, overlay)
    dispatchTouch(overlay, 'touchmove', [movedAgain], [movedAgain])
    await Promise.resolve()

    expect(rectGeometry(selection)).toEqual(initialGeometry)
    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({
      type: 'cancel',
      source: 'keyboard',
    })

    host.update({
      definition: definition(range(dates[1], dates[2]), onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Externally updated touch date range',
    })
    const externalGeometry = rectGeometry(selection)
    dispatchTouch(overlay, 'touchmove', [movedAgain], [movedAgain])
    await Promise.resolve()
    expect(rectGeometry(selection)).toEqual(externalGeometry)

    dispatchTouch(overlay, 'touchend', [], [movedAgain])
    expect(rectGeometry(selection)).toEqual(externalGeometry)

    const nextTouch = touchPoint(2, startX, y, overlay)
    dispatchTouch(overlay, 'touchstart', [nextTouch], [nextTouch])
    const nextMoved = touchPoint(2, middleX, y, overlay)
    dispatchTouch(overlay, 'touchmove', [nextMoved], [nextMoved])
    dispatchTouch(overlay, 'touchend', [], [nextMoved])
    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({ type: 'commit' })

    host.destroy()
    container.remove()
  })

  it('rejects duplicate and nonmonotone authored values at scene resolution', () => {
    const value = range(dates[0], dates[2])
    expect(() =>
      createChartScene(
        definition(value, () => {}, [dates[0], dates[0]]),
        {
          width: 480,
          height: 240,
        },
      ),
    ).toThrow(/must be unique/)
    expect(() =>
      createChartScene(
        definition(value, () => {}, [dates[0], dates[2], dates[1]]),
        { width: 480, height: 240 },
      ),
    ).toThrow(/strictly monotone/)
  })

  it('preserves literal range and change types', () => {
    type Month = 'jan' | 'feb' | 'mar'
    const signal = controlledSignal<BrushRange<Month>, BrushXChange<Month>>(
      { start: 'jan', end: 'mar' },
      () => {},
    )
    const behavior = brushX({
      range: signal,
      values: ['jan', 'feb', 'mar'],
    })

    expectTypeOf(signal.onChange)
      .parameter(0)
      .toEqualTypeOf<BrushRange<Month>>()
    expectTypeOf(signal.onChange)
      .parameter(1)
      .toEqualTypeOf<ControlledSignalChangeContext<BrushXChange<Month>>>()
    expectTypeOf(behavior.__xValue).toEqualTypeOf<Month | undefined>()
  })
})

function definition(
  value: BrushRange<Date>,
  onChange: (value: BrushRange<Date>, reason: BrushXChange<Date>) => void,
  values: readonly Date[] = dates,
  reverse = false,
) {
  return defineChart({
    marks: [dot(rows, { x: 'date', y: 'value' })],
    x: { scale: scaleUtc().domain(dates), reverse },
    y: { scale: scaleLinear },
    behaviors: [
      brushX({
        id: 'window',
        range: controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
          value,
          (next, { reason }) => onChange(next, reason),
        ),
        values,
        ariaLabel: 'Visible date range',
        format: (date) =>
          date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }),
      }),
    ],
  })
}

function range(start: Date, end: Date): BrushRange<Date> {
  return { start, end }
}

function beginMouseBrush(container: HTMLElement) {
  const overlay = container.querySelector<SVGRectElement>(
    '[data-chart-brush="window"] .overlay',
  )!
  const event = new MouseEvent('mousedown', {
    bubbles: true,
    clientX: 120,
    clientY: 100,
  })
  Object.defineProperty(event, 'view', { value: window })
  overlay.dispatchEvent(event)
}

interface TestTouch {
  readonly identifier: number
  readonly clientX: number
  readonly clientY: number
  readonly target: EventTarget
}

function touchPoint(
  identifier: number,
  clientX: number,
  clientY: number,
  target: EventTarget,
): TestTouch {
  return { identifier, clientX, clientY, target }
}

function dispatchTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: readonly TestTouch[],
  changedTouches: readonly TestTouch[],
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
    view: { value: window },
  })
  target.dispatchEvent(event)
}

function rectGeometry(element: SVGRectElement) {
  return {
    x: element.getAttribute('x'),
    width: element.getAttribute('width'),
  }
}
