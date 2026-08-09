import { scaleLinear, scaleUtc } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { dot } from './dot'
import { mountChart } from './dom'
import {
  continuousCursor,
  type ContinuousCursorChange,
  type ContinuousCursorPosition,
} from './interaction-cursor'
import {
  controlledSignal,
  type ControlledSignalChangeContext,
} from './interaction-signal'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type { ChartHost } from './dom-types'
import type { SceneGroup, SceneNode } from './types'

const rows = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
]

describe('continuousCursor', () => {
  it('resolves a clamped pinned crosshair and labels as a static fallback', () => {
    const definition = numericDefinition({ x: -5, y: 15 }, () => {})
    const scene = createChartScene(definition, { width: 480, height: 240 })
    const fallback = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.key === 'behavior:free:fallback',
    )

    expect(fallback?.children.map((node) => node.className)).toEqual([
      'ts-chart__continuous-cursor-x-rule',
      'ts-chart__continuous-cursor-y-rule',
      'ts-chart__continuous-cursor-marker',
      'ts-chart__continuous-cursor-x-label-box',
      'ts-chart__continuous-cursor-x-label-text',
      'ts-chart__continuous-cursor-y-label-box',
      'ts-chart__continuous-cursor-y-label-text',
    ])
    expect(rule(fallback?.children, 'x').x1).toBe(scene.chart.x)
    expect(rule(fallback?.children, 'y').y1).toBe(scene.chart.y)
    expect(label(fallback?.children, 'x').text).toBe('X 0.0')
    expect(label(fallback?.children, 'y').text).toBe('Y 10.0')
    expect(scene.controls).toHaveLength(1)
    expect(renderChartSvg(scene, { ariaLabel: 'Free cursor' })).toContain(
      'ts-chart__continuous-cursor-fallback',
    )
  })

  it('keeps an unpinned static fallback empty and infers temporal value types', () => {
    const dates = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-02-01T00:00:00.000Z'),
    ] as const
    const signal = controlledSignal<
      ContinuousCursorPosition<Date, number> | null,
      ContinuousCursorChange<Date, number>
    >(null, () => {})
    const behavior = continuousCursor({ position: signal })
    const definition = defineChart({
      marks: [
        dot(
          dates.map((x, y) => ({ x, y })),
          { x: 'x', y: 'y' },
        ),
      ],
      x: { scale: scaleUtc().domain(dates) },
      y: { scale: scaleLinear().domain([0, 1]) },
      controls: [behavior],
    })
    const scene = createChartScene(definition, { width: 480, height: 240 })
    const fallback = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' &&
        node.key === 'behavior:continuous-cursor:fallback',
    )

    expect(fallback?.children).toEqual([])
    expectTypeOf(behavior.__xValue).toEqualTypeOf<Date | undefined>()
    expectTypeOf(behavior.__yValue).toEqualTypeOf<number | undefined>()
    expectTypeOf(signal.onChange)
      .parameter(1)
      .toEqualTypeOf<
        ControlledSignalChangeContext<ContinuousCursorChange<Date, number>>
      >()
  })

  it('owns pointer preview, touch pinning, leave, and scoped Escape without rerendering previews', () => {
    const onChange = vi.fn()
    let renderCount = 0
    let accepted: ContinuousCursorPosition<number, number> | null = null
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<(typeof rows)[number], number, number>
    const options = () => ({
      definition: numericDefinition(accepted, (next, reason) => {
        onChange(next, reason)
        if (reason.type === 'preview') return
        accepted = next
        host.update(options())
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Interactive free cursor',
      onRender() {
        renderCount += 1
      },
    })
    host = mountChart(container, options())
    const scene = host.getScene()
    const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
    const overlay = cursorOverlay(container)
    mockBounds(surface, 480, 240)
    const target = {
      x: scene.chart.x + scene.chart.width * 0.25,
      y: scene.chart.y + scene.chart.height * 0.75,
    }

    overlay.dispatchEvent(pointer('pointermove', target.x, target.y))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 2.5, y: 2.5 }),
      expect.objectContaining({
        type: 'preview',
        source: 'pointer',
        cause: 'move',
      }),
    )
    expect(overlay.dataset.visible).toBe('true')
    expect(overlay.dataset.pinned).toBe('false')
    expect(renderCount).toBe(1)
    expect(
      overlay.querySelector('.ts-chart__continuous-cursor-x-label-text')
        ?.textContent,
    ).toBe('X 2.5')

    overlay.dispatchEvent(pointer('pointercancel', target.x, target.y))
    expect(overlay.dataset.visible).toBe('false')
    expect(onChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({ type: 'preview', cause: 'cancel' }),
    )

    overlay.dispatchEvent(pointer('pointermove', target.x, target.y))
    overlay.dispatchEvent(pointer('pointerleave', target.x, target.y))
    expect(overlay.dataset.visible).toBe('false')
    expect(onChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({ type: 'preview', cause: 'leave' }),
    )

    overlay.dispatchEvent(pointer('pointerdown', target.x, target.y, 'touch'))
    overlay.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: target.x,
        clientY: target.y,
      }),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 2.5, y: 2.5 }),
      expect.objectContaining({
        type: 'commit',
        source: 'touch',
        cause: 'pin',
      }),
    )
    expect(overlay.dataset.pinned).toBe('true')

    const callCount = onChange.mock.calls.length
    overlay.dispatchEvent(pointer('pointerleave', target.x, target.y, 'touch'))
    expect(onChange).toHaveBeenCalledTimes(callCount)
    expect(overlay.dataset.visible).toBe('true')

    overlay.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: target.x,
        clientY: target.y,
      }),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({
        type: 'clear',
        source: 'touch',
        cause: 'toggle',
      }),
    )
    expect(overlay.dataset.visible).toBe('false')

    overlay.dispatchEvent(pointer('pointerdown', target.x, target.y))
    overlay.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: target.x,
        clientY: target.y,
      }),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 2.5, y: 2.5 }),
      expect.objectContaining({
        type: 'commit',
        source: 'pointer',
        cause: 'pin',
      }),
    )

    surface.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(onChange).toHaveBeenLastCalledWith(
      null,
      expect.objectContaining({
        type: 'clear',
        source: 'keyboard',
        cause: 'escape',
      }),
    )
    expect(overlay.dataset.visible).toBe('false')
    expect(renderCount).toBe(5)

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('restores accepted cursor paint when a terminal proposal is rejected without an update', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const onChange = vi.fn()
    const host = mountChart(container, {
      definition: numericDefinition(null, onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Controlled free cursor',
    })
    const scene = host.getScene()
    const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
    const overlay = cursorOverlay(container)
    mockBounds(surface, 480, 240)
    const x = scene.chart.x + scene.chart.width / 2
    const y = scene.chart.y + scene.chart.height / 2

    overlay.dispatchEvent(pointer('pointerdown', x, y))
    overlay.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }),
    )

    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({ type: 'commit' })
    expect(overlay.dataset.visible).toBe('false')
    expect(overlay.dataset.pinned).toBe('false')

    host.destroy()
    container.remove()
  })

  it('keeps an accepted pin when clearing is rejected without an update', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const onChange = vi.fn()
    const host = mountChart(container, {
      definition: numericDefinition({ x: 5, y: 5 }, onChange),
      width: 480,
      height: 240,
      ariaLabel: 'Pinned free cursor',
    })
    const overlay = cursorOverlay(container)

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onChange.mock.calls.at(-1)?.[1]).toMatchObject({ type: 'clear' })
    expect(overlay.dataset.visible).toBe('true')
    expect(overlay.dataset.pinned).toBe('true')

    host.destroy()
    container.remove()
  })

  it('inverts reversed temporal axes and clones Date change payloads', () => {
    const dates = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-03T00:00:00.000Z'),
    ] as const
    const onChange = vi.fn()
    const position = controlledSignal<
      ContinuousCursorPosition<Date, number> | null,
      ContinuousCursorChange<Date, number>
    >(null, onChange)
    const definition = defineChart({
      marks: [
        dot(
          dates.map((x, index) => ({ x, y: index * 10 })),
          { x: 'x', y: 'y' },
        ),
      ],
      x: { scale: scaleUtc().domain([dates[1], dates[0]]) },
      y: { scale: scaleLinear().domain([10, 0]) },
      controls: [continuousCursor({ id: 'temporal', position })],
      keyboard: false,
    })
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition,
      width: 480,
      height: 240,
      ariaLabel: 'Temporal free cursor',
    })
    const scene = host.getScene()
    const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
    const overlay = container.querySelector<SVGSVGElement>(
      '[data-chart-cursor="temporal"]',
    )!
    mockBounds(surface, 480, 240)

    overlay.dispatchEvent(
      pointer(
        'pointermove',
        scene.chart.x + scene.chart.width * 0.25,
        scene.chart.y + scene.chart.height * 0.25,
      ),
    )

    const [value, { reason: change }] = onChange.mock.calls.at(-1)! as [
      ContinuousCursorPosition<Date, number>,
      { reason: ContinuousCursorChange<Date, number> },
    ]
    expect(value.x.toISOString()).toBe('2024-01-02T12:00:00.000Z')
    expect(value.y).toBeCloseTo(2.5)
    expect(change).toMatchObject({ type: 'preview', origin: null })
    expect(change.value?.x).not.toBe(value.x)
    expect(change.value?.x).toEqual(value.x)
    expect(value.x).not.toBe(dates[0])
    expect(value.x).not.toBe(dates[1])

    host.destroy()
    container.remove()
  })

  it('remaps accepted semantic positions after controlled updates and resize', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let position: ContinuousCursorPosition<number, number> | null = {
      x: 2,
      y: 8,
    }
    const options = (width: number) => ({
      definition: numericDefinition(position, () => {}),
      width,
      height: 240,
      ariaLabel: 'Resizable free cursor',
    })
    const host = mountChart(container, options(480))
    const overlay = cursorOverlay(container)
    const first = Number(
      overlay
        .querySelector('.ts-chart__continuous-cursor-x-rule')
        ?.getAttribute('x1'),
    )

    host.update(options(800))
    const resized = Number(
      overlay
        .querySelector('.ts-chart__continuous-cursor-x-rule')
        ?.getAttribute('x1'),
    )
    expect(resized).toBeGreaterThan(first)
    expect(overlay.dataset.pinned).toBe('true')

    position = null
    host.update(options(800))
    expect(overlay.dataset.visible).toBe('false')

    host.destroy()
    container.remove()
  })
})

function numericDefinition(
  position: ContinuousCursorPosition<number, number> | null,
  onChange: (
    value: ContinuousCursorPosition<number, number> | null,
    reason: ContinuousCursorChange<number, number>,
  ) => void,
) {
  return defineChart({
    marks: [dot(rows, { x: 'x', y: 'y' })],
    x: { scale: scaleLinear().domain([0, 10]) },
    y: { scale: scaleLinear().domain([0, 10]) },
    controls: [
      continuousCursor({
        id: 'free',
        position: controlledSignal<
          ContinuousCursorPosition<number, number> | null,
          ContinuousCursorChange<number, number>
        >(position, (next, { reason }) => onChange(next, reason)),
        xRule: { stroke: '#64748b' },
        yRule: { stroke: '#64748b' },
        marker: { fill: '#fff', stroke: '#0f766e' },
        xLabel: { format: (value) => `X ${value.toFixed(1)}` },
        yLabel: { format: (value) => `Y ${value.toFixed(1)}` },
      }),
    ],
    margin: { top: 20, right: 24, bottom: 40, left: 44 },
    keyboard: false,
  })
}

function cursorOverlay(container: HTMLElement) {
  const overlay = container.querySelector<SVGSVGElement>(
    '[data-chart-cursor="free"]',
  )
  if (!overlay) throw new Error('Expected continuous cursor overlay')
  return overlay
}

function pointer(
  type: string,
  clientX: number,
  clientY: number,
  pointerType = 'mouse',
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX,
    clientY,
  })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
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

function rule(nodes: readonly SceneNode[] | undefined, axis: 'x' | 'y') {
  const node = nodes?.find(
    (candidate) =>
      candidate.kind === 'rule' &&
      candidate.className === `ts-chart__continuous-cursor-${axis}-rule`,
  )
  if (!node || node.kind !== 'rule') throw new Error('Expected cursor rule')
  return node
}

function label(nodes: readonly SceneNode[] | undefined, axis: 'x' | 'y') {
  const node = nodes?.find(
    (candidate) =>
      candidate.kind === 'label' &&
      candidate.className === `ts-chart__continuous-cursor-${axis}-label-text`,
  )
  if (!node || node.kind !== 'label') throw new Error('Expected cursor label')
  return node
}
