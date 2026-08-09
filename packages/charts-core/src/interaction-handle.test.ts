import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dot } from './dot'
import { mountChart } from './dom'
import {
  handleX,
  type HandleXChange,
  type HandleXCross,
} from './interaction-handle'
import {
  controlledSignal,
  type ControlledSignalChangeContext,
} from './interaction-signal'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type { ChartHost } from './dom-types'
import type { SceneGroup } from './types'

const dates = [
  new Date('2024-01-01T00:00:00.000Z'),
  new Date('2024-02-01T00:00:00.000Z'),
  new Date('2024-04-01T00:00:00.000Z'),
] as const
const rows = dates.map((date, value) => ({ date, value }))

describe('handleX', () => {
  it('renders a scale-bound edge fallback from the first to last candidate', () => {
    const scene = createChartScene(
      edgeDefinition(dates[1], () => {}),
      {
        width: 480,
        height: 260,
      },
    )
    const fallback = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.key === 'behavior:date:fallback',
    )
    const [rule, track, handle] = fallback?.children ?? []
    const cross = scene.chart.y + scene.chart.height + 18

    expect(fallback).toMatchObject({
      className: 'ts-chart__handle-x-fallback',
      ariaHidden: true,
    })
    expect(rule).toMatchObject({
      kind: 'rect',
      x: scene.scales.x.map(dates[1]) - 1,
      y: scene.chart.y,
      width: 2,
      height: cross - scene.chart.y,
    })
    expect(track).toMatchObject({
      kind: 'rect',
      x: scene.scales.x.map(dates[0]),
      width: scene.scales.x.map(dates[2]) - scene.scales.x.map(dates[0]),
      y: cross - 2,
      height: 4,
    })
    expect(handle).toMatchObject({
      kind: 'dot',
      x: scene.scales.x.map(dates[1]),
      y: cross,
      radius: 9,
    })
    expect(scene.controls).toHaveLength(1)
    expect(renderChartSvg(scene, { ariaLabel: 'Date handle' })).toContain(
      'ts-chart__handle-x-fallback',
    )
  })

  it('supports a typed semantic cross and can omit the playhead rule', () => {
    const teams = ['Engineering', 'Design'] as const
    const definition = defineChart({
      marks: [
        dot(
          teams.map((team, index) => ({ date: dates[index]!, team })),
          { x: 'date', y: 'team' },
        ),
      ],
      x: { scale: scaleUtc().domain(dates) },
      y: { scale: scaleBand().domain(teams) },
      controls: [
        handleX({
          value: controlledSignal<Date, HandleXChange<Date>>(
            dates[0],
            () => {},
          ),
          values: dates,
          cross: { value: 'Engineering' as const },
          ruleStyle: false,
          trackStyle: { fill: '#334155' },
          handleStyle: { fill: '#f97316' },
        }),
      ],
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })
    const fallback = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.key === 'behavior:handle-x:fallback',
    )
    const [track, handle] = fallback?.children ?? []

    expect(fallback?.children).toHaveLength(2)
    expect(track).toMatchObject({
      kind: 'rect',
      y: scene.scales.y.map('Engineering') - 2,
      style: { fill: '#334155' },
    })
    expect(handle).toMatchObject({
      kind: 'dot',
      y: scene.scales.y.map('Engineering'),
      style: { fill: '#f97316' },
    })
    expectTypeOf(definition).toMatchTypeOf<{
      controls?: readonly { readonly __yValue?: 'Engineering' | undefined }[]
    }>()
  })

  it('rejects invalid candidates, controlled values, cross positions, and options', () => {
    expect(() => edgeDefinition(dates[0], () => {}, { hitSize: 0 })).toThrow(
      /hitSize must be a positive finite number/,
    )
    expect(() =>
      createChartScene(
        edgeDefinition(dates[0], () => {}, {
          values: [dates[0], dates[0]],
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/must be unique/)
    expect(() =>
      createChartScene(
        edgeDefinition(dates[0], () => {}, {
          values: [dates[0], dates[2], dates[1]],
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/strictly monotone/)
    expect(() =>
      createChartScene(
        edgeDefinition(new Date('2024-03-01T00:00:00.000Z'), () => {}),
        { width: 480, height: 260 },
      ),
    ).toThrow(/controlled value must be one of/)
    expect(() =>
      createChartScene(
        edgeDefinition(dates[0], () => {}, {
          cross: { edge: 'bottom', offset: Number.NaN },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/cross offset must be finite/)
    expect(() => edgeDefinition(dates[0], () => {}, { id: '   ' })).toThrow(
      /id cannot be empty/,
    )
  })

  it('restores accepted slider paint after unaccepted keyboard commits', () => {
    const onChange = vi.fn()
    const { container, host } = mount(edgeDefinition(dates[1], onChange))
    const target = handleSurface(container)
    const track = container.querySelector('[data-chart-handle-track="date"]')
    const rule = container.querySelector('[data-chart-handle-rule="date"]')
    const handle = container.querySelector<SVGCircleElement>(
      '[data-chart-handle="date"]',
    )

    expect(container.querySelector('.ts-chart__handle-x-fallback')).toBeNull()
    expect(track?.getAttribute('data-chart-handle-role')).toBe('track')
    expect(rule?.getAttribute('data-chart-handle-role')).toBe('rule')
    expect(handle?.getAttribute('data-chart-handle-role')).toBe('handle')
    expect(target.getAttribute('role')).toBe('slider')
    expect(target.getAttribute('height')).toBe('44')
    expect(target.getAttribute('aria-valuemin')).toBe('0')
    expect(target.getAttribute('aria-valuemax')).toBe('2')
    expect(target.getAttribute('aria-valuenow')).toBe('1')
    expect(target.getAttribute('aria-valuetext')).toBe('Feb 2024')
    expect(target.getAttribute('aria-keyshortcuts')).toContain('Home End')

    target.focus()
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        }),
      )
    }

    expect(document.activeElement).toBe(target)
    expect(onChange.mock.calls.map(([next]) => next)).toEqual([
      dates[0],
      dates[2],
      dates[0],
      dates[2],
    ])
    const [next, reason] = onChange.mock.calls.at(-1) as [
      Date,
      HandleXChange<Date>,
    ]
    expect(next).toEqual(dates[2])
    expect(next).not.toBe(dates[2])
    expect(reason).toMatchObject({
      type: 'commit',
      value: dates[2],
      origin: dates[1],
      source: 'keyboard',
    })
    expect(reason.value).not.toBe(next)
    expect(target.getAttribute('aria-valuenow')).toBe('1')

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('snaps pointer and touch input with preview, commit, and capture', () => {
    const onChange = vi.fn()
    const { container, host } = mount(edgeDefinition(dates[0], onChange))
    const scene = host.getScene()
    const target = handleSurface(container)
    const capture = vi.fn()
    const release = vi.fn()
    Object.defineProperties(target, {
      setPointerCapture: { configurable: true, value: capture },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: release },
    })
    mockBounds(container.querySelector('svg.ts-chart')!, 480, 260)
    const x = scene.scales.x.map(dates[1]) + 2
    const y = scene.chart.y + scene.chart.height

    target.dispatchEvent(pointer('pointerdown', x, y, 'touch', 7))
    target.dispatchEvent(pointer('pointerup', x, y, 'touch', 7))

    expect(capture).toHaveBeenCalledWith(7)
    expect(release).toHaveBeenCalledWith(7)
    expect(onChange.mock.calls.map((call) => call[1].type)).toEqual([
      'preview',
      'commit',
    ])
    expect(onChange.mock.calls[0]?.[1]).toMatchObject({
      source: 'touch',
      value: dates[1],
      origin: dates[0],
    })
    expect(onChange.mock.calls[1]?.[1]).toMatchObject({
      source: 'touch',
      value: dates[1],
      origin: dates[0],
    })
    expect(onChange.mock.calls[0]?.[0]).not.toBe(dates[1])
    expect(target.getAttribute('aria-valuenow')).toBe('0')

    host.destroy()
    container.remove()
  })

  it('rolls back pointer cancellation and Escape to the gesture origin', () => {
    const onChange = vi.fn()
    const { container, host } = mount(edgeDefinition(dates[0], onChange))
    const scene = host.getScene()
    const target = handleSurface(container)
    mockBounds(container.querySelector('svg.ts-chart')!, 480, 260)
    const x = scene.scales.x.map(dates[1])
    const y = scene.chart.y + scene.chart.height

    target.dispatchEvent(pointer('pointerdown', x, y, 'mouse', 3))
    target.dispatchEvent(pointer('pointercancel', x, y, 'mouse', 3))
    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({
      type: 'cancel',
      source: 'pointer',
      value: dates[0],
      origin: dates[0],
    })
    expect(target.getAttribute('aria-valuenow')).toBe('0')

    target.dispatchEvent(pointer('pointerdown', x, y, 'touch', 4))
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({
      type: 'cancel',
      source: 'keyboard',
      value: dates[0],
    })
    expect(target.getAttribute('aria-valuenow')).toBe('0')

    host.destroy()
    container.remove()
  })

  it('lets synchronous rejection abort a gesture without a stale commit', () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const options = () => ({
      definition: edgeDefinition(dates[0], reject),
      width: 480,
      height: 260,
      ariaLabel: 'Controlled handle',
    })
    let host: ChartHost<(typeof rows)[number], Date, number>
    function reject(next: Date, reason: HandleXChange<Date>) {
      onChange(next, reason)
      if (reason.type === 'preview') host.update(options())
    }
    host = mountChart(container, options())
    mockBounds(container.querySelector('svg.ts-chart')!, 480, 260)
    const target = handleSurface(container)
    const scene = host.getScene()
    const x = scene.scales.x.map(dates[1])
    const y = scene.chart.y + scene.chart.height

    target.dispatchEvent(pointer('pointerdown', x, y, 'mouse', 9))
    target.dispatchEvent(pointer('pointerup', x, y, 'mouse', 9))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0]?.[1]).toMatchObject({ type: 'preview' })
    expect(target.getAttribute('aria-valuenow')).toBe('0')

    host.destroy()
    container.remove()
  })

  it('preserves accepted echoes, aborts divergent updates, remaps, and tears down', () => {
    const onChange = vi.fn()
    let current: Date = dates[0]
    const container = document.createElement('div')
    document.body.append(container)
    const options = (width = 480) => ({
      definition: edgeDefinition(current, accept),
      width,
      height: 260,
      ariaLabel: 'Echoed handle',
    })
    let host: ChartHost<(typeof rows)[number], Date, number>
    function accept(next: Date, reason: HandleXChange<Date>) {
      onChange(next, reason)
      if (reason.type === 'preview') {
        current = next
        host.update(options())
      }
    }
    host = mountChart(container, options())
    mockBounds(container.querySelector('svg.ts-chart')!, 480, 260)
    const target = handleSurface(container)
    const firstScene = host.getScene()
    const x = firstScene.scales.x.map(dates[1])
    const y = firstScene.chart.y + firstScene.chart.height

    target.dispatchEvent(pointer('pointerdown', x, y, 'mouse', 11))
    target.dispatchEvent(pointer('pointerup', x, y, 'mouse', 11))
    expect(onChange.mock.calls.map((call) => call[1].type)).toEqual([
      'preview',
      'commit',
    ])
    expect(target.getAttribute('aria-valuenow')).toBe('1')

    target.focus()
    const beforeResize = Number(
      container
        .querySelector('[data-chart-handle-track="date"]')
        ?.getAttribute('width'),
    )
    host.update(options(620))
    const afterResize = Number(
      container
        .querySelector('[data-chart-handle-track="date"]')
        ?.getAttribute('width'),
    )
    expect(afterResize).toBeGreaterThan(beforeResize)
    expect(document.activeElement).toBe(target)

    const resizedScene = host.getScene()
    mockBounds(container.querySelector('svg.ts-chart')!, 620, 260)
    const endX = resizedScene.scales.x.map(dates[2])
    target.dispatchEvent(pointer('pointerdown', endX, y, 'mouse', 12))
    current = dates[0]
    host.update(options(620))
    const calls = onChange.mock.calls.length
    target.dispatchEvent(pointer('pointerup', endX, y, 'mouse', 12))
    expect(onChange).toHaveBeenCalledTimes(calls)
    expect(target.getAttribute('aria-valuenow')).toBe('0')

    host.destroy()
    expect(target.isConnected).toBe(false)
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('preserves literal x and semantic y types', () => {
    type Stage = 'draft' | 'review' | 'published'
    type Lane = 'Engineering' | 'Design'
    const signal = controlledSignal<Stage, HandleXChange<Stage>>(
      'draft',
      () => {},
    )
    const cross: HandleXCross<Lane> = { value: 'Engineering' }
    const behavior = handleX({
      value: signal,
      values: ['draft', 'review', 'published'],
      cross,
    })

    expectTypeOf(signal.onChange).parameter(0).toEqualTypeOf<Stage>()
    expectTypeOf(signal.onChange)
      .parameter(1)
      .toEqualTypeOf<ControlledSignalChangeContext<HandleXChange<Stage>>>()
    expectTypeOf(behavior.__xValue).toEqualTypeOf<Stage | undefined>()
    expectTypeOf(behavior.__yValue).toEqualTypeOf<Lane | undefined>()
  })
})

interface EdgeDefinitionOptions {
  id?: string
  values?: readonly Date[]
  cross?: { edge: 'top' | 'bottom'; offset?: number }
  hitSize?: number
  keyboard?: boolean
}

function edgeDefinition(
  value: Date,
  onChange: (value: Date, reason: HandleXChange<Date>) => void,
  options: EdgeDefinitionOptions = {},
) {
  return defineChart({
    marks: [dot(rows, { x: 'date', y: 'value' })],
    x: { scale: scaleUtc().domain(dates) },
    y: { scale: scaleLinear().domain([0, dates.length - 1]) },
    controls: [
      handleX({
        id: options.id ?? 'date',
        value: controlledSignal<Date, HandleXChange<Date>>(
          value,
          (next, { reason }) => onChange(next, reason),
        ),
        values: options.values ?? dates,
        cross: options.cross ?? { edge: 'bottom', offset: 18 },
        hitSize: options.hitSize,
        keyboard: options.keyboard,
        ariaLabel: 'Selected date',
        format: (date) =>
          date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }),
      }),
    ],
    margin: { top: 20, right: 24, bottom: 58, left: 44 },
    keyboard: false,
  })
}

function mount(definition: ReturnType<typeof edgeDefinition>) {
  const container = document.createElement('div')
  document.body.append(container)
  const host = mountChart(container, {
    definition,
    width: 480,
    height: 260,
    ariaLabel: 'Handle chart',
  })
  return { container, host }
}

function handleSurface(container: HTMLElement) {
  const element = container.querySelector<SVGRectElement>(
    '[data-chart-handle-surface="date"]',
  )
  if (!element) throw new Error('Expected handle surface')
  return element
}

function pointer(
  type: string,
  clientX: number,
  clientY: number,
  pointerType: 'mouse' | 'touch',
  pointerId: number,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX,
    clientY,
  })
  Object.defineProperties(event, {
    pointerType: { value: pointerType },
    pointerId: { value: pointerId },
    isPrimary: { value: true },
  })
  return event
}

function mockBounds(element: Element, width: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    width,
    height,
    toJSON: () => ({}),
  })
}
