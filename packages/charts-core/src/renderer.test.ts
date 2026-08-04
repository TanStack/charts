import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import { createChartCursor } from './cursor'
import { lineY } from './line'
import { mountChartRenderer } from './renderer'
import { defineChart, findNearestPoint } from './scene'
import { stack } from './stack'
import { tooltip as tooltipExtension } from './tooltip'
import { portal as portalExtension } from './tooltip-portal'
import type {
  ChartRenderer,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type {
  ChartPoint,
  ChartScene,
  ChartTooltipAnchorContext,
  SceneNode,
} from './types'

interface Datum {
  id: string
  x: number
  y: number
}

const data = [
  { id: 'a', x: 0, y: 4 },
  { id: 'b', x: 1, y: 8 },
]

const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'x',
      y: 'y',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 8]) },
  guides: false,
})

describe('renderer-neutral chart host', () => {
  it('delegates rendering, coordinates, focus, keyboard, and selection to a surface', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const query = vi.spyOn(container, 'querySelector')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const onRender = vi.fn()
    const host = mountChartRenderer(container, {
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
      },
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Renderer-neutral chart',
      onFocusChange,
      onSelect,
      onRender,
    })

    expect(fake.mount).toHaveBeenCalledOnce()
    expect(fake.render).toHaveBeenCalledOnce()
    expect(fake.render.mock.calls[0]?.[0]).toBe(host.getScene())
    expect(fake.render.mock.calls[0]?.[1]).toMatchObject({
      ariaLabel: 'Renderer-neutral chart',
      tabIndex: 0,
    })
    expect(onRender).toHaveBeenCalledWith({
      container,
      scene: host.getScene(),
      surface: fake.surface,
      interaction: host.interaction,
    })
    expect(query).not.toHaveBeenCalledWith('svg')
    expect(query).not.toHaveBeenCalledWith('svg.ts-chart')
    expect(query).not.toHaveBeenCalledWith('[data-ts-chart-focus]')

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )

    expect(fake.clientToScene).toHaveBeenLastCalledWith(
      host.getScene(),
      123,
      45,
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.primary.datum).toBe(data[0])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'pointer',
      pinned: false,
    })
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 200 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )
    const firstPoint = host.getScene().points[0]
    if (!firstPoint) throw new Error('Expected first chart point')
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(8)
    expect(Number.parseFloat(tooltip.style.left) + 200).toBeLessThanOrEqual(472)
    expect(Number.parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(8)
    expect(Number.parseFloat(tooltip.style.top) + 40).toBeLessThanOrEqual(252)

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'keyboard',
      pinned: true,
    })

    host.destroy()
    host.destroy()
    expect(fake.destroy).toHaveBeenCalledOnce()
    expect(container.childElementCount).toBe(0)
  })

  it('delegates controlled client coordinate conversion to the mounted surface', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const position = { x: 37, y: 91 }
    fake.clientToScene.mockReturnValue(position)
    const host = mountChartRenderer(container, {
      definition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Controlled coordinate conversion',
    })

    expect(host.interaction.clientToScene(123, 45)).toEqual(position)
    expect(fake.clientToScene).toHaveBeenLastCalledWith(
      host.getScene(),
      123,
      45,
    )

    host.destroy()
    expect(host.interaction.clientToScene(123, 45)).toBeNull()
  })

  it('lets applications resolve and present focus while automatic pointer behavior is disabled', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const onFocusGroupChange = vi.fn()
    const onSelect = vi.fn()
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        pointer: false,
        focus: 'nearest-x',
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Controlled pointer chart',
      onFocusChange,
      onFocusGroupChange,
      onSelect,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )
    fake.element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )
    expect(fake.clientToScene).not.toHaveBeenCalled()
    expect(onFocusChange).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()

    const resolved = host.interaction.resolvePointer(123, 45)
    expect(resolved).toMatchObject({
      position: {
        x: host.getScene().points[0]?.x,
        y: host.getScene().points[0]?.y,
      },
      point: { datum: data[0] },
    })
    expect(resolved?.points).toHaveLength(1)
    expect(onFocusChange).not.toHaveBeenCalled()

    host.interaction.setControlledFocus(resolved, { pinned: true })
    expect(onFocusChange).toHaveBeenLastCalledWith(resolved?.point)
    expect(onFocusGroupChange).toHaveBeenLastCalledWith(resolved?.points)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'pointer',
      pinned: true,
    })
    expect(fake.paintFocus.mock.calls.at(-1)?.[1]).toEqual(resolved?.position)
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()

    fake.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    fake.element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(onFocusChange).not.toHaveBeenLastCalledWith(null)

    host.interaction.setControlledFocus(host.getScene().points[1]!)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'programmatic',
      pinned: false,
    })
    expect(onFocusChange).toHaveBeenLastCalledWith(host.getScene().points[1])

    host.interaction.setControlledFocus(null)
    expect(onFocusChange).toHaveBeenLastCalledWith(null)
    expect(onFocusGroupChange).toHaveBeenLastCalledWith([])
    expect(fake.paintFocus).toHaveBeenLastCalledWith(null, null)
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(true)

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'keyboard',
    })
    expect(onFocusChange).toHaveBeenLastCalledWith(host.getScene().points[0])

    host.destroy()
    expect(host.interaction.resolvePointer(123, 45)).toBeNull()
    host.interaction.setControlledFocus(host.getScene().points[0]!)
  })

  it('lets a spatial index fully own pointer resolution', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const findNearest = vi.fn()
    const spatialIndex = vi.fn(
      (points: readonly ChartPoint<Datum, number, number>[]) => {
        findNearest.mockReturnValue(points[1] ?? null)
        return { findNearest }
      },
    )
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, { spatialIndex }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Indexed chart',
      onFocusChange,
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      }),
    )

    const firstPoint = host.getScene().points[0]!
    expect(spatialIndex).toHaveBeenCalledWith(host.getScene().points, {
      scene: host.getScene(),
    })
    expect(findNearest).toHaveBeenCalledWith(firstPoint.x, firstPoint.y, 48)
    expect(onFocusChange).toHaveBeenLastCalledWith(host.getScene().points[1])
    host.destroy()
  })

  it('uses painted containment to seed built-in grouped axis focus', () => {
    const rows: readonly Datum[] = [
      { id: 'disease', x: 0, y: 100 },
      { id: 'wounds', x: 0, y: 40 },
      { id: 'other', x: 0, y: 20 },
    ]
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusGroupChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: defineChart({
        marks: [
          barY(rows, {
            x: 'x',
            y: 'y',
            z: 'id',
            key: 'id',
            layout: stack({ order: rows.map((row) => row.id) }),
          }),
        ],
        x: { scale: scaleBand<number>().domain([0]) },
        y: { scale: scaleLinear().domain([0, 160]) },
        guides: false,
        margin: 0,
        focus: 'group-x',
        maxFocusDistance: 0,
      }),
      renderer: fake.renderer,
      width: 320,
      height: 200,
      ariaLabel: 'Stacked focus chart',
      onFocusGroupChange,
    })
    const target = host
      .getScene()
      .points.find((point) => point.datum.id === 'wounds')
    const targetRect = target
      ? flattenSceneNodes(host.getScene().nodes).find(
          (node) => node.kind === 'rect' && node.interaction?.point === target,
        )
      : undefined
    if (!target || targetRect?.kind !== 'rect') {
      throw new Error('Expected the wounds stack segment')
    }
    fake.clientToScene.mockReturnValue({
      x: targetRect.x + targetRect.width / 2,
      y: targetRect.y + targetRect.height / 2,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }),
    )

    const focused = onFocusGroupChange.mock.calls.at(-1)?.[0] as
      readonly ChartPoint<Datum, number, number>[] | undefined
    expect(focused).toHaveLength(3)
    expect(focused?.[0]?.datum.id).toBe('wounds')
    host.destroy()
  })

  it('keeps custom focus strategies in control of pointer resolution', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const resolve = vi.fn(
      (points: readonly ChartPoint<Datum, number, number>[]) =>
        points[1] ? [points[1]] : [],
    )
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        focus: {
          resolve,
          group: (_points, point) => [point],
          navigation: (points) => points,
        },
        maxFocusDistance: 1_000,
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Custom focus chart',
      onFocusChange,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }),
    )

    expect(resolve).toHaveBeenCalledOnce()
    expect(onFocusChange).toHaveBeenLastCalledWith(host.getScene().points[1])
    host.destroy()
  })

  it('resolves pointers against the destination scene returned by focus paint', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        focus: 'nearest-x',
        maxFocusDistance: 1,
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Destination-scene interaction',
      onFocusChange,
    })
    const baseScene = host.getScene()
    const first = baseScene.points[0]!
    const second = baseScene.points[1]!
    const movedX = 310
    const movedY = 190
    const destinationScene: ChartScene<Datum, number, number> = {
      ...baseScene,
      nodes: [
        {
          kind: 'rect',
          key: 'moved-first',
          x: movedX - 20,
          y: movedY - 20,
          width: 40,
          height: 40,
          interaction: { point: first, affinity: 'xy' },
        },
      ],
    }

    expect(findNearestPoint(baseScene, movedX, movedY, 1)).toBe(second)
    fake.paintFocus.mockReturnValue(destinationScene)
    fake.clientToScene.mockReturnValueOnce({ x: first.x, y: first.y })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    expect(onFocusChange).toHaveBeenLastCalledWith(first)

    onFocusChange.mockClear()
    fake.clientToScene.mockReturnValue({ x: movedX, y: movedY })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: movedX,
        clientY: movedY,
      }),
    )

    expect(onFocusChange).not.toHaveBeenCalled()
    expect(fake.paintFocus).toHaveBeenCalledOnce()
    host.destroy()
  })

  it('resolves pointer focus against renderer presentation geometry', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    let presentation: ChartScene<Datum, number, number>['points'] | undefined
    fake.surface.getPresentationPoints = () => presentation
    const host = mountChartRenderer(container, {
      definition: {
        ...definition,
        focus: 'nearest-x',
        maxFocusDistance: 20,
      },
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Moving chart',
      onFocusChange,
    })
    const [first, second] = host.getScene().points
    if (!first || !second) throw new Error('Expected two points')
    presentation = [
      { ...first, x: first.x + 100, y: first.y + 100 },
      { ...second, x: first.x, y: first.y },
    ]

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.primary.x).toBe(first.x)
    host.destroy()
  })

  it('builds spatial indexes from destination geometry during presentation', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    let presentation: ChartScene<Datum, number, number>['points'] | undefined
    fake.surface.getPresentationPoints = () => presentation
    fake.clientToScene.mockImplementation(
      (_scene, clientX: number, clientY: number) => ({
        x: clientX,
        y: clientY,
      }),
    )
    const spatialIndex = (
      points: readonly ChartPoint<Datum, number, number>[],
    ) => ({
      findNearest(x: number, y: number, maxDistance = 0) {
        return (
          points.find(
            (point) =>
              (point.x - x) ** 2 + (point.y - y) ** 2 <= maxDistance ** 2,
          ) ?? null
        )
      },
    })
    const makeDefinition = (x: number) =>
      defineChart(
        {
          marks: [
            lineY([{ id: 'moving', x, y: 4 }], {
              x: 'x',
              y: 'y',
              key: 'id',
            }),
          ],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 8]) },
          guides: false,
          maxFocusDistance: 1,
        },
        { spatialIndex },
      )
    const options = {
      definition: makeDefinition(0),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Indexed presentation geometry',
    }
    const host = mountChartRenderer(container, options)
    presentation = host.getScene().points

    host.update({ ...options, definition: makeDefinition(1) })
    const destination = host.getScene().points[0]
    if (!destination) throw new Error('Expected a destination point')
    presentation = undefined

    expect(
      host.interaction.resolvePointer(destination.x, destination.y)?.points[0],
    ).toBe(destination)
    host.destroy()
  })

  it('re-resolves a stationary pointer when presentation geometry advances', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    let presentation: ChartScene<Datum, number, number>['points'] | undefined
    let publish:
      | ((points: ChartScene<Datum, number, number>['points']) => void)
      | undefined
    const unsubscribe = vi.fn()
    fake.surface.getPresentationPoints = () => presentation
    fake.surface.subscribePresentationPoints = (listener) => {
      publish = listener
      return unsubscribe
    }
    const host = mountChartRenderer(container, {
      definition: { ...definition, maxFocusDistance: 20 },
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Advancing presentation geometry',
      onFocusChange,
    })
    const [first, second] = host.getScene().points
    if (!first || !second || !publish) {
      throw new Error('Expected presentation subscription')
    }

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(first.datum)

    presentation = [
      { ...first, x: first.x + 100, y: first.y + 100 },
      { ...second, x: first.x, y: first.y },
    ]
    publish(presentation)

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(second.datum)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.primary.x).toBe(first.x)

    host.destroy()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('keeps controlled pointer focus aligned with presentation geometry', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    let presentation: ChartScene<Datum, number, number>['points'] | undefined
    let publish:
      | ((points: ChartScene<Datum, number, number>['points']) => void)
      | undefined
    fake.surface.getPresentationPoints = () => presentation
    fake.surface.subscribePresentationPoints = (listener) => {
      publish = listener
      return () => {}
    }
    const controlledDefinition = defineChart(definition, {
      pointer: false,
      maxFocusDistance: 20,
    })
    const options = {
      definition: controlledDefinition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Controlled moving chart',
      onFocusChange,
    }
    const host = mountChartRenderer(container, options)
    const [first, second] = host.getScene().points
    if (!first || !second || !publish) {
      throw new Error('Expected presentation subscription')
    }

    const resolved = host.interaction.resolvePointer(first.x, first.y)
    host.interaction.setControlledFocus(resolved)
    expect(onFocusChange).toHaveBeenLastCalledWith(first)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'pointer',
    })

    host.update({ ...options, width: 481 })
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'pointer',
    })

    presentation = [
      { ...first, x: first.x + 100, y: first.y + 100 },
      { ...second, x: first.x, y: first.y },
    ]
    publish(presentation)

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(second.datum)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      primary: { datum: second.datum, x: first.x, y: first.y },
      source: 'pointer',
      pinned: false,
    })

    host.destroy()
  })

  it('repaints controlled focus when same-key presentation geometry changes', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    let presentation: ChartScene<Datum, number, number>['points'] | undefined
    let publish:
      | ((points: ChartScene<Datum, number, number>['points']) => void)
      | undefined
    fake.surface.getPresentationPoints = () => presentation
    fake.surface.subscribePresentationPoints = (listener) => {
      publish = listener
      return () => {}
    }
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, { pointer: false }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Same-key presentation focus',
      onFocusChange,
    })
    const [first, second] = host.getScene().points
    if (!first || !second || !publish) {
      throw new Error('Expected presentation subscription')
    }

    host.interaction.setControlledFocus(first)
    expect(onFocusChange).toHaveBeenCalledOnce()
    fake.paintFocus.mockClear()

    const movedFirst = { ...first, x: first.x + 24, y: first.y + 16 }
    presentation = [movedFirst, second]
    publish(presentation)

    expect(fake.paintFocus).toHaveBeenCalledOnce()
    expect(fake.paintFocus.mock.calls[0]?.[0]?.primary).toEqual(movedFirst)
    expect(onFocusChange).toHaveBeenCalledOnce()

    host.destroy()
  })

  it('anchors to the pointer, follows placement fallbacks, and clears pointer state for keyboard focus', () => {
    const fake = createFakeRenderer()
    fake.clientToScene.mockReturnValue({ x: 20, y: 20 })
    const container = document.createElement('div')
    const pointerDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltipExtension,
        anchor: 'pointer',
        placement: ['top', 'bottom-right'],
        offset: 12,
      },
    })
    const options = {
      definition: pointerDefinition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Positioned tooltip',
    }
    const host = mountChartRenderer(container, options)

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(tooltip.dataset.placement).toBe('bottom-right')
    expect(tooltip.style.left).toBe('32px')
    expect(tooltip.style.top).toBe('32px')

    const pointers: Array<{ x: number; y: number } | null> = []
    const customDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltipExtension,
        anchor(_points, context) {
          pointers.push(context.pointer)
          return { x: 300, y: 120 }
        },
        placement: 'left',
        offset: 5,
      },
    })
    host.update({ ...options, definition: customDefinition })

    expect(pointers.at(-1)).toEqual({ x: 20, y: 20 })
    expect(tooltip.dataset.placement).toBe('left')
    expect(tooltip.style.left).toBe('195px')
    expect(tooltip.style.top).toBe('100px')

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(pointers.at(-1)).toBeNull()
    host.destroy()
  })

  it('resolves tooltip coordinates independently and exposes complete anchor context', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    let anchorContext:
      ChartTooltipAnchorContext<Datum, number, number> | undefined
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          anchor: { x: 'plot-center', y: 'plot-top' },
          placement: 'bottom',
          offset: 12,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Axis-anchored tooltip',
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    expect(tooltip.style.left).toBe('240px')
    expect(tooltip.style.top).toBe('12px')

    host.update({
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          anchor(points, context) {
            anchorContext = context
            return {
              x: context.scales.x.map(points[0]!.xValue),
              y: context.plot.y,
            }
          },
          placement: 'bottom',
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Callback-anchored tooltip',
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(anchorContext).toMatchObject({
      plot: host.getScene().chart,
      surface: { width: 480, height: 260 },
      focus: {
        source: 'pointer',
        pinned: false,
      },
    })
    expect(anchorContext?.focus.primary.datum).toBe(data[0])
    expect(anchorContext?.focus.group).toHaveLength(1)
    host.destroy()
  })

  it('anchors value-based tooltips in viewport presentation coordinates', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const host = mountChartRenderer(container, {
      definition: defineChart({
        marks: [lineY(history, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2], translate: 30 },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
        tooltip: {
          use: tooltipExtension,
          anchor: { x: 'value', y: 'plot-top' },
          placement: 'bottom',
          offset: 0,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Viewport tooltip',
    })
    const point = host
      .getScene()
      .points.find((candidate) => candidate.datum.x === 1)
    if (!point) throw new Error('Expected a visible history point')

    host.interaction.setControlledFocus(point)

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(host.getScene().scales.x.viewport?.map(point.xValue)).toBe(point.x)
    expect(tooltip?.style.left).toBe(`${point.x}px`)
    host.destroy()
  })

  it('re-resolves a stationary pointer when viewport content moves beneath it', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const makeDefinition = (translate: number) =>
      defineChart({
        marks: [lineY(history, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2], translate },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
        focus: 'nearest-x',
        maxFocusDistance: 1,
      })
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const options = {
      definition: makeDefinition(0),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Moving viewport focus',
      onFocusChange,
    }
    const host = mountChartRenderer(container, options)
    const points = host.getScene().points
    const firstVisible = points.find((point) => point.datum.x === 1)
    const previous = points.find((point) => point.datum.x === 0)
    if (!firstVisible || !previous) throw new Error('Expected history points')
    const pageWidth = firstVisible.x - previous.x
    fake.clientToScene.mockReturnValue({
      x: firstVisible.x,
      y: firstVisible.y,
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.x).toBe(1)

    host.update({ ...options, definition: makeDefinition(pageWidth) })

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.x).toBe(0)
    host.destroy()
  })

  it('limits keyboard navigation to presented viewport points', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: defineChart({
        marks: [lineY(history, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2] },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
        focus: 'nearest-x',
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Viewport keyboard focus',
      onFocusChange,
    })

    fake.element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.x).toBe(1)
    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.x).toBe(2)
    host.destroy()
  })

  it('retains geometry-aware line hits when a viewport filters no points', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: defineChart({
        marks: [
          lineY(
            [
              { id: 'start', x: 0, y: 0 },
              { id: 'end', x: 1, y: 1 },
            ],
            { x: 'x', y: 'y', key: 'id' },
          ),
        ],
        x: {
          scale: scaleLinear().domain([0, 1]),
          viewport: { domain: [0, 1] },
        },
        y: { scale: scaleLinear().domain([0, 1]) },
        guides: false,
        maxFocusDistance: 0,
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Viewport line geometry',
      onFocusChange,
    })
    const [start, end] = host.getScene().points
    if (!start || !end) throw new Error('Expected line endpoints')
    fake.clientToScene.mockReturnValue({
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 1 }),
    )

    expect(onFocusChange.mock.calls.at(-1)?.[0]).toBeDefined()
    host.destroy()
  })

  it('keeps clipped line geometry but excludes offscreen semantic anchors', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const makeDefinition = (translate: number) =>
      defineChart({
        marks: [lineY(history, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2], translate },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
        maxFocusDistance: 0,
      })
    const initial = mountChartRenderer(document.createElement('div'), {
      definition: makeDefinition(0),
      renderer: createFakeRenderer('measure').renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Measure viewport',
    })
    const initialPoints = initial.getScene().points
    const one = initialPoints.find((point) => point.datum.x === 1)
    const two = initialPoints.find((point) => point.datum.x === 2)
    if (!one || !two) throw new Error('Expected adjacent history points')
    const translate = (two.x - one.x) / 4
    initial.destroy()

    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: makeDefinition(translate),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Filtered viewport geometry',
      onFocusChange,
    })
    const scene = host.getScene()
    const visible = scene.points.find((point) => point.datum.x === 1)
    const excluded = scene.points.find((point) => point.datum.x === 2)
    if (!visible || !excluded) throw new Error('Expected presented points')
    const right = scene.chart.x + scene.chart.width
    const progress = (right - visible.x) / (excluded.x - visible.x)
    fake.clientToScene.mockReturnValue({
      x: right,
      y: visible.y + (excluded.y - visible.y) * progress,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 1 }),
    )

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.x).toBe(1)
    host.destroy()
  })

  it('uses a configured spatial index with an active viewport', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const findNearest = vi.fn()
    const spatialIndex = vi.fn((points: readonly ChartPoint<Datum>[]) => {
      findNearest.mockImplementation(() => points[0] ?? null)
      return { findNearest }
    })
    const viewportDefinition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
      x: {
        scale: scaleLinear().domain([0, 1]),
        viewport: { domain: [0, 1] },
      },
      y: { scale: scaleLinear().domain([0, 8]) },
      guides: false,
    })
    const host = mountChartRenderer(container, {
      definition: defineChart(viewportDefinition, { spatialIndex }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Viewport spatial index',
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 1, clientY: 1 }),
    )

    expect(spatialIndex).toHaveBeenCalledOnce()
    expect(findNearest).toHaveBeenCalledOnce()
    host.destroy()
  })

  it('orders tooltip body and anchor points without reordering focus callbacks', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const focusedGroups: string[][] = []
    const tooltipGroups: string[][] = []
    const anchorGroups: string[][] = []
    let tooltipContent: unknown
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        focus: {
          resolve: (points) => points,
          group: (points) => points,
          navigation: (points) => points,
        },
        tooltip: {
          use: tooltipExtension,
          sort: (left, right) => right.yValue - left.yValue,
          anchor(points) {
            anchorGroups.push(points.map((point) => point.datum.id))
            return { x: 240, y: 130 }
          },
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Ordered tooltip body',
      onFocusGroupChange(points) {
        focusedGroups.push(points.map((point) => point.datum.id))
      },
      onTooltipBodyChange(target) {
        if (!target) return
        tooltipGroups.push(target.points.map((point) => point.datum.id))
        tooltipContent = target.content
      },
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(focusedGroups.at(-1)).toEqual(['a', 'b'])
    expect(tooltipGroups.at(-1)).toEqual(['b', 'a'])
    expect(anchorGroups.at(-1)).toEqual(['b', 'a'])
    expect(tooltipContent).toMatchObject({
      rows: [{ value: '1 · 8' }, { value: '0 · 4' }],
    })
    host.destroy()
  })

  it('does not repin when dismissing a tooltip unmounts the click target', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    let closeButton: HTMLButtonElement | undefined
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Dismissible composed tooltip',
      onFocusChange,
      onTooltipBodyChange(target) {
        if (!target) {
          closeButton?.remove()
          closeButton = undefined
          return
        }
        if (closeButton) return
        closeButton = document.createElement('button')
        closeButton.addEventListener('click', () => target.dismiss())
        target.element.append(closeButton)
      },
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    fake.element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(tooltip?.dataset.sticky).toBe('true')
    if (!closeButton) throw new Error('Expected composed tooltip close button')

    closeButton.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(tooltip?.hidden).toBe(true)
    expect(onFocusChange).toHaveBeenLastCalledWith(null)
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    host.destroy()
  })

  it('uses the tooltip as a top-layer popover, retains ancestry, and reopens it while active', () => {
    const popover = installPopoverMock(window)
    const viewport = installVisualViewport(window, {
      left: 600,
      top: 100,
      width: 400,
      height: 300,
    })
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    document.body.append(container)
    let surfaceLeft = 800
    vi.spyOn(fake.element, 'getBoundingClientRect').mockImplementation(() => ({
      x: surfaceLeft,
      y: 200,
      top: 200,
      right: surfaceLeft + 240,
      bottom: 330,
      left: surfaceLeft,
      width: 240,
      height: 130,
      toJSON: () => ({}),
    }))
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          portal: portalExtension,
          anchor: () => ({ x: 240, y: 130 }),
          placement: ['right', 'left'],
          offset: 10,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Portaled tooltip',
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    if (!tooltip) throw new Error('Expected portaled tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 200 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )

    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.getAttribute('popover')).toBe('manual')
    expect(popover.isOpen(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.dataset.placement).toBe('left')
    expect(tooltip.style.left).toBe('710px')
    expect(tooltip.style.top).toBe('245px')

    tooltip.hidePopover()
    expect(popover.isOpen(tooltip)).toBe(false)
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(popover.isOpen(tooltip)).toBe(true)
    expect(popover.show).toHaveBeenCalledTimes(2)

    surfaceLeft = 1_200
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(tooltip.hidden).toBe(true)
    expect(popover.isOpen(tooltip)).toBe(false)

    surfaceLeft = 800
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(tooltip.hidden).toBe(false)
    expect(popover.isOpen(tooltip)).toBe(true)

    host.destroy()
    expect(tooltip.isConnected).toBe(false)
    container.remove()
    viewport.restore()
    popover.restore()
  })

  it('falls back to independent owner-document body portals and cleans up each host', () => {
    const popover = disablePopover(window)
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const first = createFakeRenderer()
    const second = createFakeRenderer()
    const firstContainer = document.createElement('div')
    const secondContainer = document.createElement('div')
    const bounds = {
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    }
    vi.spyOn(first.element, 'getBoundingClientRect').mockReturnValue(bounds)
    vi.spyOn(second.element, 'getBoundingClientRect').mockReturnValue(bounds)
    const portalDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: { use: tooltipExtension, portal: portalExtension },
    })
    const firstHost = mountChartRenderer(firstContainer, {
      definition: portalDefinition,
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'First portaled tooltip',
    })
    const secondHost = mountChartRenderer(secondContainer, {
      definition: portalDefinition,
      renderer: second.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Second portaled tooltip',
    })

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    second.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    const tooltips = document.querySelectorAll(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
    )
    expect(tooltips).toHaveLength(2)
    expect(tooltips[0]?.parentNode).toBe(document.body)
    expect(tooltips[1]?.parentNode).toBe(document.body)
    expect((tooltips[0] as HTMLElement).style.zIndex).toBe('2147483647')

    firstHost.destroy()
    expect(
      document.querySelectorAll(
        '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
      ),
    ).toHaveLength(1)
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(1)
    secondHost.destroy()
    expect(
      document.querySelector('.ts-chart-tooltip[data-ts-chart-tooltip-portal]'),
    ).toBeNull()
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(2)
    removeEventListener.mockRestore()
    popover.restore()
  })

  it('moves an active tooltip between top-layer and local modes', () => {
    const popover = installPopoverMock(window)
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    document.body.append(container)
    vi.spyOn(fake.element, 'getBoundingClientRect').mockReturnValue({
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
    const common = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Switchable tooltip',
    }
    const portalDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: { use: tooltipExtension, portal: portalExtension },
    })
    const localDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: tooltipExtension,
    })
    const host = mountChartRenderer(container, {
      ...common,
      definition: portalDefinition,
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected tooltip')

    host.update({ ...common, definition: localDefinition })
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('absolute')
    expect(tooltip.hasAttribute('popover')).toBe(false)
    expect(tooltip.dataset.tsChartTooltipPortal).toBeUndefined()
    expect(popover.isOpen(tooltip)).toBe(false)

    host.update({ ...common, definition: portalDefinition })
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.getAttribute('popover')).toBe('manual')
    expect(tooltip.dataset.tsChartTooltipPortal).toBe('popover')
    expect(popover.isOpen(tooltip)).toBe(true)

    host.update({
      ...common,
      definition: defineChart(definition, { tooltip: false }),
    })
    expect(tooltip.hidden).toBe(true)
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.hasAttribute('popover')).toBe(false)
    expect(tooltip.dataset.tsChartTooltipPortal).toBeUndefined()
    host.destroy()
    container.remove()
    popover.restore()
  })

  it('replaces a renderer without orphaning its portaled tooltip', () => {
    const popover = installPopoverMock(window)
    const first = createFakeRenderer('shared-id')
    const second = createFakeRenderer('shared-id')
    const bounds = {
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    }
    vi.spyOn(first.element, 'getBoundingClientRect').mockReturnValue(bounds)
    vi.spyOn(second.element, 'getBoundingClientRect').mockReturnValue(bounds)
    const container = document.createElement('div')
    document.body.append(container)
    const options = {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: { use: tooltipExtension, portal: portalExtension },
      }),
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaceable portal renderer',
    }
    const host = mountChartRenderer(container, options)
    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const previousTooltip = container.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    if (!previousTooltip) throw new Error('Expected portaled tooltip')

    host.update({ ...options, renderer: second.renderer })

    const nextTooltips = container.querySelectorAll(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    expect(previousTooltip.isConnected).toBe(false)
    expect(nextTooltips).toHaveLength(1)
    expect(nextTooltips[0]).not.toBe(previousTooltip)
    expect(popover.isOpen(nextTooltips[0] as HTMLElement)).toBe(true)
    host.destroy()
    expect(
      container.querySelector(
        '.ts-chart-tooltip[data-ts-chart-tooltip-portal]',
      ),
    ).toBeNull()
    container.remove()
    popover.restore()
  })

  it('repositions a portaled tooltip after scroll, resize, and observed content changes', () => {
    const popover = disablePopover(window)
    let resize: ResizeObserverCallback | undefined
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    const originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = TestResizeObserver
    const frames: FrameRequestCallback[] = []
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const fake = createFakeRenderer()
    let surfaceLeft = 100
    vi.spyOn(fake.element, 'getBoundingClientRect').mockImplementation(() => ({
      x: surfaceLeft,
      y: 200,
      top: 200,
      right: surfaceLeft + 240,
      bottom: 330,
      left: surfaceLeft,
      width: 240,
      height: 130,
      toJSON: () => ({}),
    }))
    const container = document.createElement('div')
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          portal: portalExtension,
          anchor: () => ({ x: 240, y: 130 }),
          placement: 'top',
          offset: 10,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Repositioned portal tooltip',
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = document.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
    )
    if (!tooltip) throw new Error('Expected portaled tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    expect(tooltip.style.left).toBe('170px')

    surfaceLeft = 140
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(tooltip.style.left).toBe('210px')

    Object.defineProperty(tooltip, 'offsetWidth', {
      configurable: true,
      value: 160,
    })
    resize?.([], {} as ResizeObserver)
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(tooltip.style.left).toBe('180px')

    host.destroy()
    window.ResizeObserver = originalResizeObserver
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
    popover.restore()
  })

  it('replaces a changed renderer once and restores focused tooltip state', () => {
    const first = createFakeRenderer('shared-id')
    const second = createFakeRenderer('shared-id')
    const container = document.createElement('div')
    const options = {
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
        animate: true,
      },
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaceable renderer',
    }
    const host = mountChartRenderer(container, options)

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    const previousTooltip =
      container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(previousTooltip?.hidden).toBe(false)

    host.update({ ...options, renderer: second.renderer })

    expect(first.destroy).toHaveBeenCalledOnce()
    expect(first.element.isConnected).toBe(false)
    expect(second.mount).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledOnce()
    expect(second.render.mock.calls[0]?.[1].animation).toBeUndefined()
    expect(second.paintFocus.mock.calls.at(-1)?.[0]?.primary.datum).toBe(
      data[0],
    )
    const nextTooltip =
      container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(nextTooltip).not.toBe(previousTooltip)
    expect(nextTooltip && container.contains(nextTooltip)).toBe(true)
    expect(nextTooltip?.hidden).toBe(false)

    host.update({
      ...options,
      renderer: second.renderer,
      ariaLabel: 'Updated renderer',
    })

    expect(second.mount).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledTimes(2)
    expect(second.render.mock.calls[1]?.[1]).toMatchObject({
      ariaLabel: 'Updated renderer',
      animation: {},
    })
    host.destroy()
    expect(second.destroy).toHaveBeenCalledOnce()
  })

  it('coalesces render requests made by the active surface', () => {
    const fake = createFakeRenderer()
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
    const host = mountChartRenderer(container, {
      definition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Requested render',
    })

    fake.requestRender?.(true)
    fake.requestRender?.(true)
    fake.requestRender?.(true)

    expect(callbacks).toHaveLength(1)
    callbacks.shift()?.(0)
    expect(fake.render).toHaveBeenCalledTimes(2)

    host.destroy()
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('skips resize animation by default and supports an explicit opt-in', () => {
    let resize: ResizeObserverCallback | undefined
    let width = 320
    const frames: FrameRequestCallback[] = []
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    const originalResizeObserver = window.ResizeObserver
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    window.ResizeObserver = TestResizeObserver
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: width,
      bottom: 260,
      left: 0,
      width,
      height: 260,
      toJSON: () => ({}),
    }))
    const options = {
      definition: defineChart(definition, {
        animate: { duration: 120 },
      }),
      renderer: fake.renderer,
      height: 260,
      ariaLabel: 'Responsive animation',
    }
    const host = mountChartRenderer(container, options)

    width = 480
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      definition: defineChart(definition, {
        animate: { duration: 120, resize: true },
      }),
    })
    width = 640
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[3]?.[1].animation).toEqual({
      duration: 120,
    })

    host.destroy()
    window.ResizeObserver = originalResizeObserver
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('applies resize animation policy to explicit size updates', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const options = {
      definition: defineChart(definition, {
        animate: { duration: 120 },
      }),
      renderer: fake.renderer,
      width: 320,
      height: 260,
      ariaLabel: 'Explicit size animation',
    }
    const host = mountChartRenderer(container, options)

    host.update({ ...options, width: 480 })
    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      width: 640,
      definition: defineChart(definition, {
        animate: { duration: 120, resize: true },
      }),
    })
    expect(fake.render.mock.calls[2]?.[1].animation).toEqual({
      duration: 120,
    })

    host.destroy()
  })

  it('synchronizes semantic focus cursors across hosts without rendering again', () => {
    const controller = createChartCursor<number, number>()
    const cursorDefinition = defineChart(definition, {
      focus: 'group-x',
      maxFocusDistance: 1_000,
      cursor: {
        mode: 'focus',
        match: 'x',
        pin: true,
        controller,
      },
    })
    const first = createFakeRenderer('first-cursor-host')
    const second = createFakeRenderer('second-cursor-host')
    const firstContainer = document.createElement('div')
    const secondContainer = document.createElement('div')
    const firstFocus = vi.fn()
    const secondFocus = vi.fn()
    const firstHost = mountChartRenderer(firstContainer, {
      definition: cursorDefinition,
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'First synchronized chart',
      onFocusChange: firstFocus,
    })
    const secondHost = mountChartRenderer(secondContainer, {
      definition: cursorDefinition,
      renderer: second.renderer,
      width: 640,
      height: 320,
      ariaLabel: 'Second synchronized chart',
      onFocusChange: secondFocus,
    })

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )

    expect(controller.getState()).toMatchObject({
      anchor: 'value',
      value: { x: 0 },
      source: 'pointer',
      pinned: false,
    })
    expect(firstFocus).toHaveBeenLastCalledWith(firstHost.getScene().points[0])
    expect(secondFocus).toHaveBeenLastCalledWith(
      secondHost.getScene().points[0],
    )
    expect(first.paintFocus.mock.calls.at(-1)?.[0]?.primary.xValue).toBe(0)
    expect(second.paintFocus.mock.calls.at(-1)?.[0]?.primary.xValue).toBe(0)
    expect(first.paintFocus.mock.calls.at(-1)?.[2]).toMatchObject({
      state: { value: { x: 0 } },
      x: { value: 0 },
    })
    expect(first.paintFocus.mock.calls.at(-1)?.[2]?.y).toBeUndefined()
    expect(first.render).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledOnce()

    first.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(controller.getState()).toMatchObject({
      value: { x: 1 },
      source: 'keyboard',
    })
    expect(firstFocus.mock.calls.at(-1)?.[0]?.xValue).toBe(1)
    expect(secondFocus.mock.calls.at(-1)?.[0]?.xValue).toBe(1)

    first.element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).toMatchObject({
      value: { x: 0 },
      source: 'pointer',
      pinned: true,
    })
    const firstPaintCount = first.paintFocus.mock.calls.length
    const secondPaintCount = second.paintFocus.mock.calls.length
    first.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    second.element.dispatchEvent(
      new MouseEvent('pointercancel', { bubbles: true }),
    )
    expect(controller.getState()?.pinned).toBe(true)
    expect(first.paintFocus).toHaveBeenCalledTimes(firstPaintCount)
    expect(second.paintFocus).toHaveBeenCalledTimes(secondPaintCount)

    second.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(controller.getState()).toBeNull()
    expect(first.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    expect(second.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    expect(first.render).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledOnce()

    firstHost.destroy()
    secondHost.destroy()
  })

  it('projects, pins, and clears a free cursor without datum focus or keyboard stepping', () => {
    const controller = createChartCursor<number, number>()
    const freeDefinition = defineChart(definition, {
      cursor: {
        mode: 'free',
        pin: true,
        controller,
        x: { valueAt: ({ normalized }) => normalized },
        y: { valueAt: ({ normalized }) => normalized },
      },
    })
    const fake = createFakeRenderer('free-cursor-host')
    fake.clientToScene.mockImplementation((scene) => ({
      x: scene.chart.x + scene.chart.width * 0.25,
      y: scene.chart.y + scene.chart.height * 0.75,
    }))
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChartRenderer(container, {
      definition: freeDefinition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Free cursor chart',
      onFocusChange,
    })
    expect(fake.render.mock.calls[0]?.[1]?.tabIndex).toBe(-1)

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    const pointerState = controller.getState()
    expect(pointerState).toMatchObject({
      anchor: 'normalized',
      normalized: { x: 0.25, y: 0.75 },
      value: { x: 0.25, y: 0.75 },
      source: 'pointer',
      pinned: false,
    })
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toMatchObject({
      x: { normalized: 0.25, value: 0.25 },
      y: { normalized: 0.75, value: 0.75 },
    })
    expect(onFocusChange).not.toHaveBeenCalled()
    expect(fake.render).toHaveBeenCalledOnce()

    const paintCountBeforeKey = fake.paintFocus.mock.calls.length
    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(controller.getState()).toBe(pointerState)
    expect(fake.paintFocus).toHaveBeenCalledTimes(paintCountBeforeKey)

    controller.setState({
      anchor: 'value',
      value: { x: 0.5, y: 4 },
      source: 'programmatic',
      pinned: false,
    })
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toMatchObject({
      x: { position: host.getScene().scales.x!.map(0.5), value: 0.5 },
      y: { position: host.getScene().scales.y!.map(4), value: 4 },
    })
    expect(fake.render).toHaveBeenCalledOnce()

    fake.element.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    fake.element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).toMatchObject({
      anchor: 'normalized',
      pinned: true,
    })
    const pinnedPaintCount = fake.paintFocus.mock.calls.length
    fake.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    fake.element.dispatchEvent(
      new MouseEvent('pointercancel', { bubbles: true }),
    )
    expect(controller.getState()?.pinned).toBe(true)
    expect(fake.paintFocus).toHaveBeenCalledTimes(pinnedPaintCount)

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(controller.getState()).toBeNull()
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toBeNull()

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).not.toBeNull()
    fake.clientToScene.mockReturnValue({
      x: host.getScene().chart.x - 1,
      y: host.getScene().chart.y,
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      }),
    )
    expect(controller.getState()).toBeNull()
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toBeNull()

    const paintCountBeforeDestroy = fake.paintFocus.mock.calls.length
    host.destroy()
    controller.setState({
      anchor: 'normalized',
      normalized: { x: 0.5 },
      source: 'programmatic',
      pinned: false,
    })
    expect(fake.paintFocus).toHaveBeenCalledTimes(paintCountBeforeDestroy)
  })

  it('keeps free cursors out of the tab order and preserves focus cursor keyboard access', () => {
    const controller = createChartCursor<number, number>()
    const fake = createFakeRenderer('cursor-tab-order-host')
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Cursor tab order chart',
      tabIndex: 4,
    }
    const host = mountChartRenderer(document.createElement('div'), {
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'free', controller },
      }),
    })
    expect(fake.render.mock.calls.at(-1)?.[1]?.tabIndex).toBe(-1)

    host.update({
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'focus', controller },
      }),
    })
    expect(fake.render.mock.calls.at(-1)?.[1]?.tabIndex).toBe(4)

    host.update({
      ...options,
      definition: defineChart(definition, {
        keyboard: false,
        cursor: { mode: 'focus', controller },
      }),
    })
    expect(fake.render.mock.calls.at(-1)?.[1]?.tabIndex).toBe(-1)
    host.destroy()
  })

  it('clears cursor presentation and subscription when cursor behavior is removed', () => {
    const controller = createChartCursor<number, number>({
      anchor: 'normalized',
      normalized: { x: 0.5, y: 0.5 },
      source: 'programmatic',
      pinned: false,
    })
    const fake = createFakeRenderer('removable-cursor-host')
    const container = document.createElement('div')
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Removable cursor chart',
    }
    const host = mountChartRenderer(container, {
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'free', controller },
      }),
    })
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toMatchObject({
      state: controller.getState(),
    })

    host.update({ ...options, definition })
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toBeNull()
    const paintCount = fake.paintFocus.mock.calls.length
    controller.setState({
      anchor: 'normalized',
      normalized: { x: 0.75, y: 0.25 },
      source: 'programmatic',
      pinned: false,
    })
    expect(fake.paintFocus).toHaveBeenCalledTimes(paintCount)

    host.destroy()
  })

  it('clears controlled focus instead of restoring it when a focus cursor is removed', () => {
    const controller = createChartCursor<number, number>({
      anchor: 'value',
      value: { x: 1 },
      source: 'programmatic',
      pinned: true,
    })
    const fake = createFakeRenderer('removable-focus-cursor-host')
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const onFocusGroupChange = vi.fn()
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Removable focus cursor chart',
      onFocusChange,
      onFocusGroupChange,
    }
    const host = mountChartRenderer(container, {
      ...options,
      definition: defineChart(definition, {
        focus: 'group-x',
        cursor: { mode: 'focus', match: 'x', controller },
      }),
    })
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.primary.xValue).toBe(1)

    onFocusChange.mockClear()
    onFocusGroupChange.mockClear()
    host.update({ ...options, definition })

    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toBeNull()
    expect(fake.paintFocus.mock.calls.at(-1)?.[2]).toBeNull()
    expect(onFocusChange).toHaveBeenCalledOnce()
    expect(onFocusChange).toHaveBeenLastCalledWith(null)
    expect(onFocusGroupChange).toHaveBeenLastCalledWith([])

    const paintCount = fake.paintFocus.mock.calls.length
    controller.setState({
      anchor: 'value',
      value: { x: 0 },
      source: 'programmatic',
      pinned: false,
    })
    expect(fake.paintFocus).toHaveBeenCalledTimes(paintCount)
    host.destroy()
  })

  it('clears only transient cursor state published by the leaving host', () => {
    const controller = createChartCursor<number, number>()
    const cursorDefinition = defineChart(definition, {
      cursor: { mode: 'free', controller },
    })
    const first = createFakeRenderer('first-owned-cursor-host')
    const second = createFakeRenderer('second-owned-cursor-host')
    const firstHost = mountChartRenderer(document.createElement('div'), {
      definition: cursorDefinition,
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'First owned cursor chart',
    })
    const secondHost = mountChartRenderer(document.createElement('div'), {
      definition: cursorDefinition,
      renderer: second.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Second owned cursor chart',
    })

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    const firstPublished = controller.getState()
    expect(firstPublished?.source).toBe('pointer')

    const programmatic = {
      anchor: 'value' as const,
      value: { x: 1, y: 8 },
      source: 'programmatic' as const,
      pinned: false,
    }
    controller.setState(programmatic)
    expect(first.paintFocus.mock.calls.at(-1)?.[1]).toBeNull()
    first.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(controller.getState()).toBe(programmatic)

    second.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 24,
        clientY: 36,
      }),
    )
    const secondPublished = controller.getState()
    expect(secondPublished).not.toBe(programmatic)
    expect(first.paintFocus.mock.calls.at(-1)?.[1]).toBeNull()
    expect(second.paintFocus.mock.calls.at(-1)?.[1]).not.toBeNull()
    first.element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(controller.getState()).toBe(secondPublished)

    second.element.dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    )
    expect(controller.getState()).toBeNull()

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).not.toBeNull()
    firstHost.destroy()
    expect(controller.getState()).toBeNull()
    secondHost.destroy()
  })

  it('clears an owned transient cursor when its binding is replaced', () => {
    const controller = createChartCursor<number, number>()
    const fake = createFakeRenderer('replaced-owned-cursor-host')
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaced owned cursor chart',
    }
    const host = mountChartRenderer(document.createElement('div'), {
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'free', controller },
      }),
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).not.toBeNull()

    host.update({ ...options, definition })
    expect(controller.getState()).toBeNull()
    host.destroy()
  })

  it('clears an owned transient cursor when its binding mode changes', () => {
    const controller = createChartCursor<number, number>()
    const fake = createFakeRenderer('mode-changed-owned-cursor-host')
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Mode-changed owned cursor chart',
    }
    const host = mountChartRenderer(document.createElement('div'), {
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'free', controller },
      }),
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()?.anchor).toBe('normalized')

    host.update({
      ...options,
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        cursor: { mode: 'focus', match: 'x', controller },
      }),
    })
    expect(controller.getState()).toBeNull()

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()?.anchor).toBe('value')

    host.update({
      ...options,
      definition: defineChart(definition, {
        cursor: { mode: 'free', controller },
      }),
    })
    expect(controller.getState()).toBeNull()
    host.destroy()
  })

  it('treats focus match as binding identity without clearing foreign or pinned state', () => {
    const controller = createChartCursor<number, number>()
    const fake = createFakeRenderer('match-changed-owned-cursor-host')
    const options = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Match-changed owned cursor chart',
    }
    const definitionFor = (match: 'x' | 'y') =>
      defineChart(definition, {
        maxFocusDistance: 1_000,
        cursor: { mode: 'focus', match, pin: true, controller },
      })
    const host = mountChartRenderer(document.createElement('div'), {
      ...options,
      definition: definitionFor('x'),
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).toMatchObject({ value: { x: 0 } })
    host.update({ ...options, definition: definitionFor('y') })
    expect(controller.getState()).toBeNull()

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    expect(controller.getState()).toMatchObject({ value: { y: 4 } })
    const foreign = {
      anchor: 'value' as const,
      value: { y: 8 },
      source: 'programmatic' as const,
      pinned: false,
    }
    controller.setState(foreign)
    host.update({ ...options, definition: definitionFor('x') })
    expect(controller.getState()).toBe(foreign)

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    fake.element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 20, clientY: 30 }),
    )
    const pinned = controller.getState()
    expect(pinned?.pinned).toBe(true)
    host.update({ ...options, definition: definitionFor('y') })
    expect(controller.getState()).toBe(pinned)

    host.destroy()
    expect(controller.getState()).toBe(pinned)
  })
})

function installPopoverMock(view: Window & typeof globalThis) {
  const prototype = view.HTMLElement.prototype
  const showDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'showPopover',
  )
  const hideDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'hidePopover',
  )
  const matchesDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'matches',
  )
  const matches = prototype.matches
  const open = new WeakSet<HTMLElement>()
  const show = vi.fn(function (this: HTMLElement) {
    if (
      !this.isConnected ||
      this.hidden ||
      this.getAttribute('popover') !== 'manual'
    ) {
      throw new Error('Popover is not ready to show')
    }
    open.add(this)
  })
  const hide = vi.fn(function (this: HTMLElement) {
    open.delete(this)
  })
  Object.defineProperties(prototype, {
    showPopover: { configurable: true, value: show },
    hidePopover: { configurable: true, value: hide },
    matches: {
      configurable: true,
      value(this: HTMLElement, selector: string) {
        return selector === ':popover-open'
          ? open.has(this)
          : matches.call(this, selector)
      },
    },
  })
  return {
    show,
    hide,
    isOpen: (element: HTMLElement) => open.has(element),
    restore() {
      restoreProperty(prototype, 'showPopover', showDescriptor)
      restoreProperty(prototype, 'hidePopover', hideDescriptor)
      restoreProperty(prototype, 'matches', matchesDescriptor)
    },
  }
}

function disablePopover(view: Window & typeof globalThis) {
  const prototype = view.HTMLElement.prototype
  const showDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'showPopover',
  )
  const hideDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'hidePopover',
  )
  Object.defineProperties(prototype, {
    showPopover: { configurable: true, value: undefined },
    hidePopover: { configurable: true, value: undefined },
  })
  return {
    restore() {
      restoreProperty(prototype, 'showPopover', showDescriptor)
      restoreProperty(prototype, 'hidePopover', hideDescriptor)
    },
  }
}

function installVisualViewport(
  view: Window & typeof globalThis,
  bounds: { left: number; top: number; width: number; height: number },
) {
  const descriptor = Object.getOwnPropertyDescriptor(view, 'visualViewport')
  const viewport = new EventTarget()
  Object.defineProperties(viewport, {
    offsetLeft: { value: bounds.left },
    offsetTop: { value: bounds.top },
    width: { value: bounds.width },
    height: { value: bounds.height },
  })
  Object.defineProperty(view, 'visualViewport', {
    configurable: true,
    value: viewport,
  })
  return {
    restore() {
      restoreProperty(view, 'visualViewport', descriptor)
    },
  }
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) Object.defineProperty(target, key, descriptor)
  else Reflect.deleteProperty(target, key)
}

function flattenSceneNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? [node, ...flattenSceneNodes(node.children)]
      : [node],
  )
}

interface FakeRenderer {
  renderer: ChartRenderer<Datum, number, number>
  surface: ChartSurface<Datum, number, number>
  element: HTMLDivElement
  mount: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  clientToScene: ReturnType<typeof vi.fn>
  paintFocus: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  requestRender?: (force?: boolean) => void
}

function createFakeRenderer(id = 'fake'): FakeRenderer {
  const element = document.createElement('div')
  element.className = 'test-chart-surface'
  const render = vi.fn(
    (
      _scene: ChartScene<Datum, number, number>,
      options: ChartSurfaceRenderOptions,
    ) => {
      element.tabIndex = options.tabIndex ?? 0
      element.setAttribute('aria-label', options.ariaLabel)
    },
  )
  const clientToScene = vi.fn((scene: ChartScene<Datum, number, number>) => {
    const point = scene.points[0]
    return point ? { x: point.x, y: point.y } : null
  })
  const paintFocus = vi.fn()
  const destroy = vi.fn()
  let renderer!: ChartRenderer<Datum, number, number>
  const surface: ChartSurface<Datum, number, number> = {
    get renderer() {
      return renderer
    },
    element,
    render,
    clientToScene,
    paintFocus,
    destroy,
  }
  const result = {} as FakeRenderer
  const mount = vi.fn(
    (container: HTMLElement, requestRender: (force?: boolean) => void) => {
      result.requestRender = requestRender
      container.append(element)
      return surface
    },
  )
  renderer = {
    id,
    prerender: () => '<div class="test-chart-surface"></div>',
    mount,
  }
  Object.assign(result, {
    renderer,
    surface,
    element,
    mount,
    render,
    clientToScene,
    paintFocus,
    destroy,
  })
  return result
}

interface CategoricalDatum {
  id: string
  category: string
  value: number
}

const categoricalRows: readonly CategoricalDatum[] = [
  { id: 'a', category: 'Alpha', value: 4 },
]
const categoricalDefinition = defineChart({
  marks: [
    lineY(categoricalRows, {
      x: 'category',
      y: 'value',
      key: 'id',
    }),
  ],
  x: { scale: scaleBand<string>().domain(['Alpha']) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

if (false) {
  const container = document.createElement('div')
  mountChartRenderer(container, {
    definition: categoricalDefinition,
    ariaLabel: 'Inferred renderer',
    renderer: {
      id: 'inferred',
      prerender(scene) {
        expectTypeOf(scene.points).items.toMatchTypeOf<{
          datum: CategoricalDatum
          xValue: string
          yValue: number
        }>()
        return ''
      },
      mount() {
        return null as unknown as ChartSurface<CategoricalDatum, string, number>
      },
    },
  })

  const numericRenderer = null as unknown as ChartRenderer<
    CategoricalDatum,
    number,
    number
  >
  mountChartRenderer<CategoricalDatum, string, number>(container, {
    definition: categoricalDefinition,
    ariaLabel: 'Incompatible renderer',
    // @ts-expect-error A numeric-x renderer cannot consume a string-x scene.
    renderer: numericRenderer,
  })
}
