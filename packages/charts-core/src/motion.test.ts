import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { areaY } from './area'
import { barY } from './bar'
import { bandX } from './band'
import { crosshair } from './crosshair'
import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { lineY } from './line'
import { createMark } from './mark'
import { motion } from './motion'
import { mountChartRenderer } from './renderer'
import { createChartScene, defineChart } from './scene'
import { chartSceneSource } from './scene-source'
import { renderChartSvg } from './svg'
import { tooltip } from './tooltip'
import type { ChartMotionContext, ChartPoint, ChartScene } from './types'

const rows = [
  { id: 'a', category: 'A', value: 40 },
  { id: 'b', category: 'B', value: 80 },
]

describe('SVG motion', () => {
  it('maps client coordinates through the rendered SVG transform', () => {
    const scene = createChartScene(
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value', key: 'id' })],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Transformed motion chart' })
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected an SVG chart surface')
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => ({
        inverse: () => ({
          a: 2,
          b: 0,
          c: 0,
          d: 3,
          e: -20,
          f: -30,
        }),
      })),
    })

    expect(surface.clientToScene?.(scene, 140, 100)).toEqual({
      x: 260,
      y: 270,
    })
    surface.destroy()
  })

  it('applies viewport translation revisions synchronously', () => {
    const history = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const definition = (translate: number) =>
      defineChart({
        motion: {
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [lineY(history, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2], translate },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(0), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(40), {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Viewport history' })
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    surface.render(next, { ariaLabel: 'Viewport history' })

    expect(requestFrame).not.toHaveBeenCalled()
    expect(
      container
        .querySelector('g.ts-chart__viewport-content')
        ?.getAttribute('transform'),
    ).toBe('translate(40 0)')
    expect(surface.getPresentationPoints?.()).toBeUndefined()

    requestFrame.mockRestore()
    surface.destroy()
  })

  it('keeps definition metadata out of the public scene shape', () => {
    const definition = defineChart({
      marks: [barY(rows, { x: 'category', y: 'value', key: 'id' })],
      x: { scale: scaleBand().domain(['A', 'B']) },
      y: { scale: scaleLinear().domain([0, 100]) },
      guides: false,
    })
    const staticScene = createChartScene(definition, {
      width: 300,
      height: 200,
    })
    expect(Object.keys(staticScene)).not.toContain('motion')
    expect(
      (staticScene as ChartScene & { [chartSceneSource]?: unknown })[
        chartSceneSource
      ],
    ).toBeDefined()
  })

  it('owns initial motion while preserving server-rendered SVG on adoption', () => {
    const scene = createChartScene(
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value', key: 'id' })],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const renderer = motion({
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    const fresh = document.createElement('div')
    const frames = installFrames()
    const freshSurface = renderer.mount(fresh, () => {})
    freshSurface.render(scene, { ariaLabel: 'Fresh chart' })

    expect(
      fresh.querySelector('svg')?.getAttribute('data-ts-motion-state'),
    ).toBe('running')
    freshSurface.destroy()
    frames.restore()

    const adopted = document.createElement('div')
    adopted.innerHTML = renderChartSvg(scene, { ariaLabel: 'Adopted chart' })
    const request = vi.spyOn(window, 'requestAnimationFrame')
    const adoptedSurface = renderer.mount(adopted, () => {})
    adoptedSurface.render(scene, { ariaLabel: 'Adopted chart' })

    expect(request).not.toHaveBeenCalled()
    expect(
      adopted.querySelector('svg')?.hasAttribute('data-ts-motion-state'),
    ).toBe(false)
    adoptedSurface.destroy()
    request.mockRestore()
  })

  it('is the sole animation owner when the definition also enables animate', () => {
    const makeDefinition = (value: number) =>
      defineChart({
        animate: { duration: 1, easing: 'linear' },
        motion: {
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          barY([{ id: 'a', category: 'A', value }], {
            x: 'category',
            y: 'value',
            key: 'id',
          }),
        ],
        x: { scale: scaleBand().domain(['A']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      })
    const firstDefinition = makeDefinition(20)
    const nextDefinition = makeDefinition(80)
    const firstScene = createChartScene(firstDefinition, {
      width: 300,
      height: 200,
    })
    const nextScene = createChartScene(nextDefinition, {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const renderer = motion<
      { id: string; category: string; value: number },
      string,
      number
    >({ initial: false })
    const options = {
      definition: firstDefinition,
      renderer,
      width: 300,
      height: 200,
      ariaLabel: 'Single animation owner',
    }
    const frames = installFrames()
    const host = mountChartRenderer(container, options)

    host.update({ ...options, definition: nextDefinition })
    frames.run(0)
    frames.run(50)

    const rectangle = container.querySelector<SVGRectElement>(
      'g.ts-chart__bar-y > rect',
    )
    expect(Number(rectangle?.getAttribute('y'))).toBeCloseTo(
      ((firstScene.points[0]?.y ?? 0) + (nextScene.points[0]?.y ?? 0)) / 2,
    )

    frames.run(100)
    host.destroy()
    frames.restore()
  })

  it('shifts keyed streaming paths without morphing sample values', () => {
    const firstRows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 45 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 70 },
      { id: 'e', time: 4, value: 55 },
      { id: 'f', time: 5, value: 40 },
    ]
    const nextRows = [
      firstRows[2]!,
      firstRows[3]!,
      firstRows[4]!,
      firstRows[5]!,
      { id: 'g', time: 6, value: 65 },
      { id: 'h', time: 7, value: 50 },
    ]
    const definition = (
      streamingRows: typeof firstRows,
      domain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          areaY(streamingRows, {
            id: 'stream area',
            x: 'time',
            y1: 0,
            y2: 'value',
            key: 'id',
          }),
          lineY(streamingRows, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
            points: true,
          }),
        ],
        x: { scale: scaleLinear().domain(domain) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(firstRows, [2, 5]), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(nextRows, [4, 7]), {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const renderer = motion({ initial: false })
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Streaming line' })
    const path = container.querySelector<SVGPathElement>(
      'g.ts-chart__line > path',
    )
    const area = container.querySelector<SVGPathElement>(
      'g.ts-chart__area > path',
    )
    const firstPath = path?.getAttribute('d')
    const firstArea = area?.getAttribute('d')
    const marks = container.querySelector<SVGGElement>('g.ts-chart__marks')
    const clipRectangle = marks?.querySelector<SVGRectElement>('clipPath rect')
    expect(marks?.getAttribute('clip-path')).toMatch(/^url\(#.+\)$/)
    expect(Number(clipRectangle?.getAttribute('x'))).toBeCloseTo(first.chart.x)
    expect(Number(clipRectangle?.getAttribute('y'))).toBeCloseTo(first.chart.y)
    expect(Number(clipRectangle?.getAttribute('width'))).toBeCloseTo(
      first.chart.width,
    )
    expect(Number(clipRectangle?.getAttribute('height'))).toBeCloseTo(
      first.chart.height,
    )
    const expectedShift =
      first.scales.x.map(firstRows[2]!.time) -
      next.scales.x.map(firstRows[2]!.time)
    const retained = next.points.find(
      (point) => point.markId === 'stream' && point.datum.id === 'c',
    )
    const entering = next.points.find(
      (point) => point.markId === 'stream' && point.datum.id === 'h',
    )
    const exiting = first.points.find(
      (point) => point.markId === 'stream' && point.datum.id === 'a',
    )
    if (!retained || !entering || !exiting) {
      throw new Error('Expected rolling decoration points')
    }
    const authoredDot = (point: ChartPoint) =>
      container.querySelector<SVGCircleElement>(
        `g.ts-chart__line circle[data-ts-key="${point.key}:dot"]`,
      )
    const focusDot = (point: ChartPoint) =>
      container.querySelector<SVGCircleElement>(
        `g.ts-chart__focus-layer--default circle[data-ts-key="${point.key}"]`,
      )
    const frames = installFrames()

    surface.render(next, { ariaLabel: 'Streaming line' })

    const targetPath = path?.getAttribute('d')
    const targetArea = area?.getAttribute('d')
    expect(targetPath).not.toBe(firstPath)
    expect(targetArea).not.toBe(firstArea)
    expect(translateX(path)).toBeCloseTo(expectedShift)
    expect(translateX(area)).toBeCloseTo(expectedShift)
    for (const point of [retained, entering]) {
      expect(Number(authoredDot(point)?.getAttribute('cx'))).toBeCloseTo(
        point.x + expectedShift,
      )
      expect(Number(focusDot(point)?.getAttribute('cx'))).toBeCloseTo(
        point.x + expectedShift,
      )
    }
    expect(Number(authoredDot(exiting)?.getAttribute('cx'))).toBeCloseTo(
      exiting.x,
    )
    expect(
      surface
        .getPresentationPoints?.()
        ?.find((point) => point.key === exiting.key)?.x,
    ).toBeCloseTo(exiting.x)

    frames.run(0)
    frames.run(50)
    expect(path?.getAttribute('d')).toBe(targetPath)
    expect(area?.getAttribute('d')).toBe(targetArea)
    expect(translateX(path)).toBeCloseTo(expectedShift / 2)
    expect(translateX(area)).toBeCloseTo(expectedShift / 2)
    for (const point of [retained, entering]) {
      expect(Number(authoredDot(point)?.getAttribute('cx'))).toBeCloseTo(
        point.x + expectedShift / 2,
      )
      expect(Number(focusDot(point)?.getAttribute('cx'))).toBeCloseTo(
        point.x + expectedShift / 2,
      )
    }
    expect(Number(authoredDot(exiting)?.getAttribute('cx'))).toBeCloseTo(
      exiting.x - expectedShift / 2,
    )
    expect(
      surface
        .getPresentationPoints?.()
        ?.find((point) => point.key === exiting.key)?.x,
    ).toBeCloseTo(exiting.x - expectedShift / 2)

    frames.run(100)
    expect(path?.getAttribute('d')).toBe(targetPath)
    expect(area?.getAttribute('d')).toBe(targetArea)
    expect(path?.hasAttribute('transform')).toBe(false)
    expect(area?.hasAttribute('transform')).toBe(false)
    expect(authoredDot(exiting)).toBeNull()
    expect(focusDot(exiting)).toBeNull()
    expect(
      surface
        .getPresentationPoints?.()
        ?.some((point) => point.key === exiting.key),
    ).not.toBe(true)

    surface.destroy()
    frames.restore()
  })

  it('keeps an authored focus band aligned with rolling path geometry', () => {
    const rows = [0, 1, 2, 3, 4, 5].map((time) => ({
      id: String.fromCharCode(97 + time),
      time,
      value: 20 + time * 5,
    }))
    const definition = (
      window: readonly (typeof rows)[number][],
      domain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          whenFocused(
            bandX(window, {
              id: 'cursor',
              x: 'time',
              key: 'id',
              width: 1,
            }),
            { match: 'x' },
          ),
          lineY(window, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear().domain(domain) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(rows.slice(0, 5), [1, 4]), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(rows.slice(1, 6), [2, 5]), {
      width: 300,
      height: 200,
    })
    const retained = next.points.find((point) => point.datum.id === 'c')
    if (!retained) throw new Error('Expected retained focus datum')
    const shift =
      first.scales.x.map(retained.xValue) - next.scales.x.map(retained.xValue)
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Rolling focus band' })
    const band = container.querySelector<SVGRectElement>(
      'g.ts-chart__band-x rect[data-ts-key$="string:c"]',
    )
    if (!band) throw new Error('Expected authored focus band')
    const frames = installFrames()

    surface.render(next, { ariaLabel: 'Rolling focus band' })
    expect(Number(band.getAttribute('x'))).toBeCloseTo(retained.x + shift - 0.5)
    frames.run(0)
    frames.run(50)
    expect(Number(band.getAttribute('x'))).toBeCloseTo(
      retained.x + shift / 2 - 0.5,
    )

    frames.run(100)
    surface.destroy()
    frames.restore()
  })

  it('shifts rolling paths while reprojecting a changed y-domain', () => {
    const firstRows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 40 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 60 },
      { id: 'e', time: 4, value: 50 },
    ]
    const nextRows = [
      firstRows[1]!,
      firstRows[2]!,
      firstRows[3]!,
      firstRows[4]!,
      { id: 'f', time: 5, value: 70 },
    ]
    const definition = (
      streamingRows: typeof firstRows,
      xDomain: [number, number],
      yDomain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: {
            update: 'rolling',
            x: 'shift',
            y: 'reproject',
          },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          areaY(streamingRows, {
            id: 'stream area',
            x: 'time',
            y1: 0,
            y2: 'value',
            key: 'id',
          }),
          lineY(streamingRows, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
            points: true,
          }),
        ],
        x: { scale: scaleLinear().domain(xDomain) },
        y: { scale: scaleLinear().domain(yDomain) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(firstRows, [1, 4], [0, 100]), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(nextRows, [2, 5], [20, 80]), {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const renderer = motion({ initial: false })
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Reprojected rolling line' })
    const line = container.querySelector<SVGPathElement>(
      'g.ts-chart__line > path',
    )
    const area = container.querySelector<SVGPathElement>(
      'g.ts-chart__area > path',
    )
    const firstLine = line?.getAttribute('d')
    const frames = installFrames()

    surface.render(next, { ariaLabel: 'Reprojected rolling line' })

    const targetLine = line?.getAttribute('d')
    expect(targetLine).not.toBe(firstLine)
    expect(matrixTransform(line)).toEqual([1, 0, 0, 0.6, 100, 40])
    expect(matrixTransform(area)).toEqual([1, 0, 0, 0.6, 100, 40])

    frames.run(0)
    frames.run(50)
    expect(line?.getAttribute('d')).toBe(targetLine)
    expect(matrixTransform(line)).toEqual([1, 0, 0, 0.8, 50, 20])
    const targetPoint = next.points.find((point) => point.datum.id === 'd')
    const presentedPoint = surface
      .getPresentationPoints?.()
      ?.find((point) => (point.datum as { id: string }).id === 'd')
    if (!targetPoint || !presentedPoint) {
      throw new Error('Expected reprojected presentation point')
    }
    expect(presentedPoint.x).toBeCloseTo(targetPoint.x + 50)
    expect(presentedPoint.y).toBeCloseTo(targetPoint.y * 0.8 + 20)

    frames.run(100)
    expect(line?.hasAttribute('transform')).toBe(false)
    expect(area?.hasAttribute('transform')).toBe(false)
    surface.destroy()
    frames.restore()
  })

  it('composes an interrupted rolling transform without moving retained presentation points', () => {
    const rows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 40 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 60 },
      { id: 'e', time: 4, value: 50 },
      { id: 'f', time: 5, value: 70 },
      { id: 'g', time: 6, value: 45 },
    ]
    const definition = (
      window: readonly (typeof rows)[number][],
      domain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          lineY(window, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear().domain(domain) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        clip: true,
      })
    const scene = (
      window: readonly (typeof rows)[number][],
      domain: [number, number],
    ) =>
      createChartScene(definition(window, domain), {
        width: 300,
        height: 200,
      })
    const first = scene(rows.slice(0, 5), [1, 4])
    const second = scene(rows.slice(1, 6), [2, 5])
    const third = scene(rows.slice(2, 7), [3, 6])
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Interrupted rolling line' })
    const line = container.querySelector<SVGPathElement>(
      'g.ts-chart__line > path',
    )
    const frames = installFrames()

    surface.render(second, { ariaLabel: 'Interrupted rolling line' })
    frames.run(0)
    frames.run(40)
    expect(matrixTransform(line)).toEqual([1, 0, 0, 1, 60, 0])
    const before = surface
      .getPresentationPoints?.()
      ?.find((point) => (point.datum as { id: string }).id === 'd')
    if (!before) throw new Error('Expected interrupted presentation point')

    surface.render(third, { ariaLabel: 'Interrupted rolling line' })

    expect(matrixTransform(line)).toEqual([1, 0, 0, 1, 160, 0])
    const after = surface
      .getPresentationPoints?.()
      ?.find((point) => (point.datum as { id: string }).id === 'd')
    if (!after) throw new Error('Expected retargeted presentation point')
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)

    surface.destroy()
    frames.restore()
  })

  it('preserves a deferred mark state across back-to-back rolling updates', async () => {
    const rows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 40 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 60 },
      { id: 'e', time: 4, value: 50 },
      { id: 'f', time: 5, value: 70 },
      { id: 'g', time: 6, value: 45 },
    ]
    const definition = (
      window: readonly (typeof rows)[number][],
      domain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          lineY(window, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
            states: [
              {
                when: { focus: 'primary' },
                style: { strokeWidth: 8 },
                transition: { type: 'tween', duration: 60 },
              },
            ],
          }),
        ],
        x: { scale: scaleLinear().domain(domain) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(rows.slice(0, 5), [1, 4]), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(rows.slice(1, 6), [2, 5]), {
      width: 300,
      height: 200,
    })
    const third = createChartScene(definition(rows.slice(2, 7), [3, 6]), {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Rolling focus state' })
    const line = container.querySelector<SVGPathElement>(
      'g.ts-chart__line > path',
    )
    const focused = next.points.find((point) => point.datum.id === 'd')
    if (!line || !focused) throw new Error('Expected rolling focus geometry')
    const frames = installManagedFrames()

    surface.render(next, { ariaLabel: 'Rolling focus state' })
    frames.run(0)
    frames.run(40)
    const rollingTransform = line.getAttribute('transform')
    const pendingStateScene = surface.paintFocus({
      primary: focused,
      group: [focused],
      source: 'pointer',
      pinned: false,
    })

    expect(pendingStateScene).toBeDefined()
    expect(pendingStateScene).not.toBe(next)
    expect(line.getAttribute('transform')).toBe(rollingTransform)
    surface.render(third, { ariaLabel: 'Rolling focus state' })
    expect(line.hasAttribute('transform')).toBe(true)
    frames.run(40)
    frames.run(140)
    await Promise.resolve()
    expect(line.hasAttribute('transform')).toBe(false)
    expect(container.querySelector('svg')?.dataset.tsMotionState).toBe(
      'running',
    )

    frames.run(140)
    frames.run(200)
    expect(Number(line.getAttribute('stroke-width'))).toBeCloseTo(8)
    surface.destroy()
    frames.restore()
  })

  it('snaps an invalid rolling path instead of falling through to morphing', () => {
    const firstRows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 40 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 60 },
    ]
    const nextRows = [
      firstRows[1]!,
      firstRows[2]!,
      firstRows[3]!,
      { id: 'e', time: 4, value: 70 },
    ]
    const definition = (
      streamingRows: typeof firstRows,
      xDomain: [number, number],
      yDomain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          lineY(streamingRows, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
            points: true,
          }),
        ],
        x: { scale: scaleLinear().domain(xDomain) },
        y: { scale: scaleLinear().domain(yDomain) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(firstRows, [1, 3], [0, 100]), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(nextRows, [2, 4], [20, 80]), {
      width: 300,
      height: 200,
    })
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Invalid rolling line' })
    const line = container.querySelector<SVGPathElement>(
      'g.ts-chart__line > path',
    )
    const firstPath = line?.getAttribute('d')
    const frames = installFrames()
    const retained = next.points.find((point) => point.datum.id === 'd')
    const exiting = first.points.find((point) => point.datum.id === 'a')
    if (!retained || !exiting) throw new Error('Expected snap points')

    surface.render(next, { ariaLabel: 'Invalid rolling line' })

    expect(line?.getAttribute('d')).not.toBe(firstPath)
    expect(line?.hasAttribute('transform')).toBe(false)
    expect(frames.request).not.toHaveBeenCalled()
    expect(
      Number(
        container
          .querySelector(
            `g.ts-chart__line circle[data-ts-key="${retained.key}:dot"]`,
          )
          ?.getAttribute('cx'),
      ),
    ).toBeCloseTo(retained.x)
    expect(
      Number(
        container
          .querySelector(
            `g.ts-chart__focus-layer--default circle[data-ts-key="${retained.key}"]`,
          )
          ?.getAttribute('cx'),
      ),
    ).toBeCloseTo(retained.x)
    expect(
      container.querySelector(
        `g.ts-chart__line circle[data-ts-key="${exiting.key}:dot"]`,
      ),
    ).toBeNull()
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('honors rolling fallback when a path has no semantic points', () => {
    const customLine = (middle: number) =>
      createMark<never, number, number>(() => ({
        id: 'custom-line',
        channels: {},
        render: () => ({
          nodes: [
            {
              kind: 'group',
              key: 'custom-line',
              className: 'ts-chart__line',
              children: [
                {
                  kind: 'polyline',
                  key: 'custom-line:path',
                  points: [
                    [0, 100],
                    [50, middle],
                    [100, 0],
                  ],
                  style: { fill: 'none', stroke: '#000' },
                },
              ],
            },
          ],
        }),
      }))
    const definition = (middle: number) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [customLine(middle)],
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
        guides: false,
        clip: true,
      })
    const first = createChartScene(definition(50), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(20), {
      width: 300,
      height: 200,
    })
    const target = document.createElement('div')
    target.innerHTML = renderChartSvg(next, { ariaLabel: 'Target custom line' })
    const targetPath = target.querySelector('path')?.getAttribute('d')
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Custom rolling line' })
    const frames = installFrames()

    surface.render(next, { ariaLabel: 'Custom rolling line' })

    expect(container.querySelector('path')?.getAttribute('d')).toBe(targetPath)
    expect(
      container.querySelector('path')?.hasAttribute('data-ts-motion-role'),
    ).toBe(false)
    surface.destroy()
    frames.restore()
  })

  it('moves pinned focus and tooltip geometry with a streaming path', () => {
    const firstRows = [
      { id: 'a', time: 0, value: 20 },
      { id: 'b', time: 1, value: 45 },
      { id: 'c', time: 2, value: 30 },
      { id: 'd', time: 3, value: 70 },
      { id: 'e', time: 4, value: 55 },
      { id: 'f', time: 5, value: 40 },
    ]
    const nextRows = [
      firstRows[2]!,
      firstRows[3]!,
      firstRows[4]!,
      firstRows[5]!,
      { id: 'g', time: 6, value: 65 },
      { id: 'h', time: 7, value: 50 },
    ]
    const definition = (
      streamingRows: typeof firstRows,
      domain: [number, number],
    ) =>
      defineChart({
        motion: {
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        tooltip: {
          use: tooltip,
          placement: 'right',
          format: (point) => point.datum.id,
        },
        marks: [
          lineY(streamingRows, {
            id: 'stream',
            x: 'time',
            y: 'value',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear().domain(domain) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        clip: true,
      })
    const firstDefinition = definition(firstRows, [2, 5])
    const nextDefinition = definition(nextRows, [4, 7])
    const container = document.createElement('div')
    const renderer = motion<(typeof firstRows)[number], number, number>({
      initial: false,
    })
    const options = {
      definition: firstDefinition,
      renderer,
      width: 300,
      height: 200,
      ariaLabel: 'Interactive streaming line',
    }
    const frames = installFrames()
    const host = mountChartRenderer(container, options)
    const firstPoint = host
      .getScene()
      .points.find((point) => point.datum.id === 'e')
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!firstPoint || !svg) throw new Error('Expected streaming focus point')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 300, height: 200 }),
    )

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: firstPoint.x,
        clientY: firstPoint.y,
      }),
    )
    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: firstPoint.x,
        clientY: firstPoint.y,
      }),
    )
    const tooltipElement =
      container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltipElement) throw new Error('Expected streaming tooltip')
    expect(tooltipElement.textContent).toBe('e')
    expect(Number.parseFloat(tooltipElement.style.left)).toBeCloseTo(
      firstPoint.x + 10,
    )

    host.update({ ...options, definition: nextDefinition })
    const nextPoint = host
      .getScene()
      .points.find((point) => point.datum.id === 'e')
    if (!nextPoint) throw new Error('Expected retained streaming point')
    const focusCircle = [
      ...container.querySelectorAll<SVGCircleElement>(
        'g.ts-chart__focus-layer--default circle',
      ),
    ].find((circle) => circle.dataset.tsKey === nextPoint.key)
    const shift = firstPoint.x - nextPoint.x

    expect(Number(focusCircle?.getAttribute('cx'))).toBeCloseTo(firstPoint.x)
    expect(Number.parseFloat(tooltipElement.style.left)).toBeCloseTo(
      firstPoint.x + 10,
    )

    frames.run(0)
    frames.run(50)
    expect(Number(focusCircle?.getAttribute('cx'))).toBeCloseTo(
      nextPoint.x + shift / 2,
    )
    expect(Number.parseFloat(tooltipElement.style.left)).toBeCloseTo(
      nextPoint.x + shift / 2 + 10,
    )

    frames.run(100)
    expect(Number(focusCircle?.getAttribute('cx'))).toBeCloseTo(nextPoint.x)
    expect(Number.parseFloat(tooltipElement.style.left)).toBeCloseTo(
      nextPoint.x + 10,
    )

    host.destroy()
    frames.restore()
  })

  it('grows bars from their semantic baseline with bounded datum timing', () => {
    const timing = vi.fn((context) =>
      context.datum?.id === 'b'
        ? {
            delay: 40,
            transition: { type: 'tween' as const, duration: 50 },
          }
        : undefined,
    )
    const scene = createChartScene(
      defineChart({
        motion: timing,
        marks: [
          barY(rows, {
            x: 'category',
            y: 'value',
            key: 'id',
          }),
        ],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const container = document.createElement('div')
    const renderer = motion<(typeof rows)[number], string, number>({
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    const frames = installFrames()
    const surface = renderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Bars' })
    const rectangles = [
      ...container.querySelectorAll<SVGRectElement>('g.ts-chart__bar-y > rect'),
    ]
    const baseline = scene.scales.y.map(0)

    expect(rectangles).toHaveLength(2)
    expect(Number(rectangles[0]?.getAttribute('y'))).toBeCloseTo(baseline)
    expect(rectangles[0]?.getAttribute('height')).toBe('0')
    expect(timing.mock.calls.map(([context]) => context.datum?.id)).toEqual([
      'a',
      'b',
    ])

    frames.run(0)
    frames.run(50)
    expect(Number(rectangles[0]?.getAttribute('height'))).toBeCloseTo(
      scene.chart.height * 0.4 * 0.5,
    )
    expect(Number(rectangles[1]?.getAttribute('height'))).toBeCloseTo(
      scene.chart.height * 0.8 * 0.2,
    )

    frames.run(120)
    expect(rectangles[0]?.hasAttribute('data-ts-motion-role')).toBe(false)
    expect(
      container.querySelector('svg')?.getAttribute('data-ts-motion-state'),
    ).toBe('finished')

    surface.destroy()
    frames.restore()
  })

  it('cascades definition motion through marks, axes, ticks, and labels', () => {
    const chartRoles: string[] = []
    const markRoles: string[] = []
    const guideRoles: string[] = []
    const definition = (value: number) =>
      defineChart({
        motion(context) {
          chartRoles.push(context.role)
          return {
            transition: {
              type: 'spring',
              stiffness: 170,
              damping: 18,
            },
          }
        },
        marks: [
          barY([{ id: 'a', category: 'A', value }], {
            id: 'revenue',
            x: 'category',
            y: 'value',
            key: 'id',
            motion(context) {
              markRoles.push(context.role)
              return { transition: { type: 'spring', mass: 1.2 } }
            },
          }),
        ],
        x: {
          scale: scaleBand().domain(['A']),
          axis: {
            motion(context) {
              guideRoles.push(context.role)
              return { transition: { type: 'tween', duration: 120 } }
            },
            ticks: {
              motion(context) {
                guideRoles.push(context.role)
                return { delay: 5 }
              },
            },
            tickLabels: {
              motion(context) {
                guideRoles.push(context.role)
                return { delay: 10 }
              },
            },
            label: {
              text: 'Period',
              motion(context) {
                guideRoles.push(context.role)
                return { transition: { type: 'tween', duration: 80 } }
              },
            },
          },
        },
        y: { scale: scaleLinear().domain([0, 100]) },
      })
    const first = createChartScene(definition(20), {
      width: 300,
      height: 200,
    })
    const next = createChartScene(definition(80), {
      width: 380,
      height: 200,
    })

    expect(Object.keys(next)).not.toContain('motion')

    const container = document.createElement('div')
    const renderer = motion({ initial: false, resize: true })
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Definition motion' })
    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Definition motion' })

    frames.run(0)
    frames.run(16)
    expect(chartRoles).toContain('bar')
    expect(markRoles).toContain('bar')
    expect(guideRoles).toContain('axis')
    expect(guideRoles).toContain('tick')
    expect(guideRoles).toContain('tick-label')
    expect(guideRoles).toContain('axis-label')
    surface.destroy()
    frames.restore()
  })

  it('springs primary, grouped, and unmatched focus states with interruption momentum', () => {
    const focusRows = [
      { id: 'a', x: 1, y: 3 },
      { id: 'b', x: 1, y: 7 },
      { id: 'c', x: 2, y: 5 },
    ]
    const transition = {
      type: 'spring' as const,
      stiffness: 160,
      damping: 16,
      mass: 1,
    }
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(focusRows, {
            x: 'x',
            y: 'y',
            key: 'id',
            r: 4,
            states: [
              {
                when: { focus: 'unmatched' },
                style: { opacity: 0.15 },
                transition,
              },
              {
                when: { focus: 'group' },
                style: { r: 5 },
                transition,
              },
              {
                when: { focus: 'primary' },
                style: { r: 12, strokeWidth: 3 },
                transition,
              },
            ],
          }),
        ],
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
      }),
      { width: 320, height: 200 },
    )
    const [first, grouped, unmatched] = scene.points
    if (!first || !grouped || !unmatched) throw new Error('Expected points')
    const container = document.createElement('div')
    const renderer = motion({ initial: false })
    const surface = renderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Focus motion' })
    const frames = installManagedFrames()
    const circle = (point: ChartPoint) =>
      container.querySelector<SVGCircleElement>(
        `g.ts-chart__dot > circle[data-ts-key="${point.key}"]`,
      )

    surface.paintFocus({
      primary: first,
      group: [first, grouped],
      source: 'pointer',
      pinned: false,
    })
    frames.runAll(0)
    frames.runAll(80)
    const interruptedRadius = Number(circle(first)?.getAttribute('r'))
    expect(interruptedRadius).toBeGreaterThan(5)
    expect(interruptedRadius).toBeLessThan(12)
    expect(Number(circle(grouped)?.getAttribute('r'))).toBeGreaterThan(4)
    expect(Number(circle(unmatched)?.getAttribute('opacity'))).toBeLessThan(1)

    surface.paintFocus({
      primary: grouped,
      group: [grouped, first],
      source: 'pointer',
      pinned: false,
    })
    expect(Number(circle(first)?.getAttribute('r'))).toBeCloseTo(
      interruptedRadius,
    )
    frames.runAll(80)
    frames.runAll(96)
    expect(Number(circle(first)?.getAttribute('r'))).toBeGreaterThan(
      interruptedRadius,
    )

    for (let time = 112; time <= 4_000; time += 16) {
      if (container.querySelector('svg')?.dataset.tsMotionState === 'finished')
        break
      frames.run(time)
    }
    expect(Number(circle(first)?.getAttribute('r'))).toBeCloseTo(5)
    expect(Number(circle(grouped)?.getAttribute('r'))).toBeCloseTo(12)
    expect(Number(circle(unmatched)?.getAttribute('opacity'))).toBeCloseTo(0.15)

    surface.paintFocus(null)
    frames.run(4_000)
    for (let time = 4_016; time <= 8_000; time += 16) {
      if (container.querySelector('svg')?.dataset.tsMotionState === 'finished')
        break
      frames.run(time)
    }
    expect(Number(circle(first)?.getAttribute('r'))).toBeCloseTo(4)
    expect(Number(circle(grouped)?.getAttribute('r'))).toBeCloseTo(4)
    expect(circle(unmatched)?.hasAttribute('opacity')).toBe(false)
    surface.destroy()
    frames.restore()
  })

  it('does not reenter host focus painting when a mark-state transition resets presentation points', () => {
    const focusRows = [
      { id: 'a', x: 1, y: 3 },
      { id: 'b', x: 2, y: 7 },
    ]
    const definition = defineChart({
      marks: [
        dot(focusRows, {
          x: 'x',
          y: 'y',
          key: 'id',
          r: 4,
          states: [
            {
              when: { focus: 'primary' },
              style: { r: 10 },
              transition: { type: 'tween', duration: 100 },
            },
          ],
        }),
      ],
      x: { scale: scaleLinear().domain([0, 3]) },
      y: { scale: scaleLinear().domain([0, 10]) },
      guides: false,
      maxFocusDistance: 1_000,
    })
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const frames = installManagedFrames()
    const host = mountChartRenderer(container, {
      definition,
      renderer: motion<(typeof focusRows)[number], number, number>({
        initial: false,
      }),
      width: 300,
      height: 200,
      ariaLabel: 'Mark-state focus subscription',
      onFocusChange,
    })
    const point = host.getScene().points[0]
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!point || !svg) throw new Error('Expected a rendered focus point')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 300, height: 200 }),
    )

    expect(() => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: point.x,
          clientY: point.y,
        }),
      )
    }).not.toThrow()
    expect(onFocusChange).toHaveBeenCalledOnce()
    expect(onFocusChange).toHaveBeenLastCalledWith(point)

    host.destroy()
    frames.restore()
  })

  it('keeps deferred mark-state geometry available to host hit testing', async () => {
    const definition = (movingY: number) =>
      defineChart({
        motion: {
          transition: { type: 'tween', duration: 100, easing: 'linear' },
        },
        marks: [
          dot(
            [
              { id: 'focused', x: 1, y: 5 },
              { id: 'moving', x: 2, y: movingY },
            ],
            {
              x: 'x',
              y: 'y',
              key: 'id',
              r: 4,
              states: [
                {
                  when: { focus: 'primary' },
                  style: { r: 20 },
                },
              ],
            },
          ),
        ],
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
        maxFocusDistance: 0,
      })
    const firstDefinition = definition(3)
    const nextDefinition = definition(8)
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const frames = installManagedFrames()
    const options = {
      definition: firstDefinition,
      renderer: motion<{ id: string; x: number; y: number }, number, number>({
        initial: false,
      }),
      width: 300,
      height: 200,
      ariaLabel: 'Deferred mark-state interaction geometry',
      onFocusChange,
    }
    const host = mountChartRenderer(container, options)
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    const focused = host
      .getScene()
      .points.find((point) => point.datum.id === 'focused')
    if (!svg || !focused) throw new Error('Expected a focused dot')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 300, height: 200 }),
    )

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: focused.x,
        clientY: focused.y,
      }),
    )
    host.update({ ...options, definition: nextDefinition })
    const retained = host
      .getScene()
      .points.find((point) => point.datum.id === 'focused')
    if (!retained) throw new Error('Expected the retained focused dot')
    frames.run(0)
    frames.run(100)
    await Promise.resolve()

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: retained.x + 15,
        clientY: retained.y,
      }),
    )

    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum.id).toBe('focused')
    host.destroy()
    frames.restore()
  })

  it('retargets a persistent crosshair spring without replacing guide elements', () => {
    const transition = {
      type: 'spring' as const,
      stiffness: 160,
      damping: 16,
      mass: 1,
    }
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(
            [
              { id: 'a', x: 1, y: 2 },
              { id: 'b', x: 3, y: 8 },
            ],
            {
              x: 'x',
              y: 'y',
              key: 'id',
              states: [
                {
                  when: { focus: 'primary' },
                  style: { r: 10 },
                  transition,
                },
              ],
            },
          ),
          crosshair({
            x: { label: true },
            y: { label: true },
            marker: true,
            motion: { transition },
          }),
        ],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
      }),
      { width: 320, height: 200 },
    )
    const [first, second] = scene.points
    if (!first || !second) throw new Error('Expected crosshair points')
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Motion crosshair' })
    const frames = installManagedFrames()
    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'pointer',
      pinned: false,
    })
    const layer = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="over"]',
    )
    const xRule = layer?.querySelector<SVGLineElement>(
      '[data-ts-key$=":x-rule"]',
    )
    expect(Number(xRule?.getAttribute('x1'))).toBeCloseTo(first.x)

    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'pointer',
      pinned: false,
    })
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    expect(layer ? container.contains(layer) : false).toBe(true)
    frames.runAll(0)
    frames.runAll(80)
    const interruptedX = Number(xRule?.getAttribute('x1'))
    expect(interruptedX).toBeGreaterThan(first.x)
    expect(interruptedX).toBeLessThan(second.x)

    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'keyboard',
      pinned: false,
    })
    expect(Number(xRule?.getAttribute('x1'))).toBeCloseTo(interruptedX)
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    expect(layer ? container.contains(layer) : false).toBe(true)
    frames.runAll(80)
    frames.runAll(96)
    expect(Number(xRule?.getAttribute('x1'))).toBeGreaterThan(interruptedX)

    const root = container.querySelector<SVGSVGElement>('svg.ts-chart')
    for (let time = 112; time <= 4_000; time += 16) {
      if (
        layer?.dataset.tsMotionState === 'finished' &&
        root?.dataset.tsMotionState === 'finished'
      ) {
        break
      }
      frames.runAll(time)
    }
    expect(layer ? container.contains(layer) : false).toBe(true)
    expect(container.querySelector('[data-ts-focus-guide-layer="over"]')).toBe(
      layer,
    )
    expect(layer?.getAttribute('visibility')).toBe('visible')
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    expect(Number(xRule?.getAttribute('x1'))).toBeCloseTo(first.x)
    expect(layer?.querySelectorAll('text').length).toBe(4)
    expect(layer?.querySelector('[data-ts-key$=":marker"]')).not.toBeNull()

    surface.paintFocus(null)
    expect(layer?.getAttribute('visibility')).toBe('hidden')
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    surface.destroy()
    frames.restore()
  })

  it('moves a categorical cursor band and dotted rule as persistent guides', () => {
    const transition = {
      type: 'spring' as const,
      stiffness: 210,
      damping: 22,
      mass: 0.8,
    }
    const scene = createChartScene(
      defineChart({
        marks: [
          crosshair({
            id: 'motion-band',
            x: {
              label: true,
              band: {
                inset: 2,
                fill: '#64748b',
                fillOpacity: 0.24,
              },
            },
            y: false,
            motion: { transition },
          }),
          barY(rows, {
            x: 'category',
            y: 'value',
            key: 'id',
            inset: 4,
          }),
          crosshair({
            id: 'motion-rule',
            x: false,
            y: { label: true, strokeDasharray: '4 4' },
            motion: { transition },
          }),
        ],
        x: { scale: scaleBand().domain(['A', 'B']).padding(0.18) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
        focusRing: false,
      }),
      { width: 320, height: 200 },
    )
    const [first, second] = scene.points
    if (!first || !second) throw new Error('Expected cursor-band points')
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Motion cursor band' })
    const frames = installManagedFrames()
    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'pointer',
      pinned: false,
    })
    const under = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="under"]',
    )
    const over = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="over"]',
    )
    const band = under?.querySelector<SVGRectElement>(
      '[data-ts-key="motion-band:x-band"]',
    )
    const rule = over?.querySelector<SVGLineElement>(
      '[data-ts-key="motion-rule:y-rule"]',
    )
    const xLabel = under?.querySelector<SVGTextElement>(
      '[data-ts-key="motion-band:x-label:text"]',
    )
    const yLabel = over?.querySelector<SVGTextElement>(
      '[data-ts-key="motion-rule:y-label:text"]',
    )
    const firstBandX = first.x - scene.scales.x.bandwidth / 2 + 2

    expect(Number(band?.getAttribute('x'))).toBeCloseTo(firstBandX)
    expect(Number(band?.getAttribute('width'))).toBeCloseTo(
      scene.scales.x.bandwidth - 4,
    )
    expect(Number(rule?.getAttribute('y1'))).toBeCloseTo(first.y)
    expect(Number(xLabel?.getAttribute('x'))).toBeCloseTo(first.x)
    expect(Number(yLabel?.getAttribute('y'))).toBeCloseTo(first.y)

    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'pointer',
      pinned: false,
    })
    expect(under?.querySelector('[data-ts-key="motion-band:x-band"]')).toBe(
      band,
    )
    expect(over?.querySelector('[data-ts-key="motion-rule:y-rule"]')).toBe(rule)
    frames.runAll(0)
    frames.runAll(80)

    const movingBandX = Number(band?.getAttribute('x'))
    const movingRuleY = Number(rule?.getAttribute('y1'))
    const secondBandX = second.x - scene.scales.x.bandwidth / 2 + 2
    expect(movingBandX).toBeGreaterThan(firstBandX)
    expect(movingBandX).toBeLessThan(secondBandX)
    expect(movingRuleY).toBeGreaterThan(Math.min(first.y, second.y))
    expect(movingRuleY).toBeLessThan(Math.max(first.y, second.y))
    expect(Number(xLabel?.getAttribute('x'))).toBeCloseTo(
      movingBandX + (scene.scales.x.bandwidth - 4) / 2,
    )
    expect(Number(yLabel?.getAttribute('y'))).toBeCloseTo(movingRuleY)
    expect(under?.dataset.tsMotionState).toBe('running')
    expect(over?.dataset.tsMotionState).toBe('running')

    for (let time = 96; time <= 4_000 && frames.pending(); time += 16) {
      frames.runAll(time)
    }
    expect(Number(band?.getAttribute('x'))).toBeCloseTo(secondBandX)
    expect(Number(rule?.getAttribute('y1'))).toBeCloseTo(second.y)
    expect(Number(xLabel?.getAttribute('x'))).toBeCloseTo(second.x)
    expect(Number(yLabel?.getAttribute('y'))).toBeCloseTo(second.y)
    expect(under?.dataset.tsMotionState).toBe('finished')
    expect(over?.dataset.tsMotionState).toBe('finished')
    surface.destroy()
    frames.restore()
  })

  it('keeps an active focus guide animated through a keyed data update', () => {
    const transition = {
      type: 'tween' as const,
      duration: 100,
      easing: 'linear' as const,
    }
    const makeScene = (value: number) =>
      createChartScene(
        defineChart({
          marks: [
            crosshair({
              id: 'update-band',
              x: { band: { inset: 2 } },
              y: false,
              motion: { transition },
            }),
            barY([{ id: 'a', category: 'A', value }], {
              x: 'category',
              y: 'value',
              key: 'id',
              inset: 4,
            }),
            crosshair({
              id: 'update-rule',
              x: false,
              y: true,
              motion: { transition },
            }),
          ],
          x: { scale: scaleBand().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          focusRing: false,
        }),
        { width: 300, height: 200 },
      )
    const first = makeScene(20)
    const next = makeScene(80)
    const firstPoint = first.points[0]!
    const nextPoint = next.points[0]!
    const container = document.createElement('div')
    const surface = motion({
      initial: false,
      transition,
    }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Updating cursor guide' })
    surface.paintFocus({
      primary: firstPoint,
      group: [firstPoint],
      source: 'pointer',
      pinned: false,
    })
    const rule = container.querySelector<SVGLineElement>(
      '[data-ts-key="update-rule:y-rule"]',
    )
    const band = container.querySelector<SVGRectElement>(
      '[data-ts-key="update-band:x-band"]',
    )
    expect(Number(rule?.getAttribute('y1'))).toBeCloseTo(firstPoint.y)

    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Updating cursor guide' })
    expect(container.querySelector('[data-ts-key="update-rule:y-rule"]')).toBe(
      rule,
    )
    expect(container.querySelector('[data-ts-key="update-band:x-band"]')).toBe(
      band,
    )
    surface.paintFocus({
      primary: nextPoint,
      group: [nextPoint],
      source: 'restored',
      pinned: false,
    })
    expect(Number(rule?.getAttribute('y1'))).toBeCloseTo(firstPoint.y)

    frames.runAll(0)
    frames.runAll(50)
    const movingY = Number(rule?.getAttribute('y1'))
    expect(movingY).toBeGreaterThan(Math.min(firstPoint.y, nextPoint.y))
    expect(movingY).toBeLessThan(Math.max(firstPoint.y, nextPoint.y))
    expect(
      rule?.closest<SVGGElement>('[data-ts-focus-guide-layer]')?.dataset
        .tsMotionState,
    ).toBe('running')

    frames.runAll(100)
    expect(Number(rule?.getAttribute('y1'))).toBeCloseTo(nextPoint.y)
    surface.destroy()
    frames.restore()
  })

  it('removes a retained focus-guide layer when the next scene drops its crosshair', () => {
    const data = [
      { id: 'a', x: 1, y: 2 },
      { id: 'b', x: 3, y: 8 },
    ]
    const definition = (includeCrosshair: boolean) =>
      defineChart({
        marks: includeCrosshair
          ? [dot(data, { x: 'x', y: 'y', key: 'id' }), crosshair()]
          : [dot(data, { x: 'x', y: 'y', key: 'id' })],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
      })
    const firstScene = createChartScene(definition(true), {
      width: 320,
      height: 200,
    })
    const nextScene = createChartScene(definition(false), {
      width: 320,
      height: 200,
    })
    const firstPoint = firstScene.points[0]!
    const nextPoint = nextScene.points[0]!
    const container = document.createElement('div')
    const frames = installManagedFrames()
    const surface = motion({ initial: false }).mount(container, () => {})

    surface.render(firstScene, { ariaLabel: 'Removable crosshair' })
    surface.paintFocus({
      primary: firstPoint,
      group: [firstPoint],
      source: 'pointer',
      pinned: false,
    })
    const layer = container.querySelector('[data-ts-focus-guide-layer="over"]')
    expect(layer).not.toBeNull()

    surface.render(nextScene, { ariaLabel: 'Removed crosshair' })
    surface.paintFocus({
      primary: nextPoint,
      group: [nextPoint],
      source: 'restored',
      pinned: false,
    })
    for (let time = 0; time <= 2_000 && frames.pending(); time += 16) {
      frames.runAll(time)
    }

    expect(layer ? container.contains(layer) : false).toBe(false)
    expect(container.querySelector('[data-ts-focus-guide-layer]')).toBeNull()
    surface.destroy()
    frames.restore()
  })

  it('animates focus guides without canceling the base scene', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(rows, { x: 'category', y: 'value', key: 'id' }),
          crosshair({ y: false }),
        ],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const [first, second] = scene.points
    if (!first || !second) throw new Error('Expected animated focus points')
    const container = document.createElement('div')
    const frames = installManagedFrames()
    const surface = motion({
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    }).mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Independent focus motion' })
    expect(frames.pending()).toBe(1)
    expect(container.querySelector('svg')?.dataset.tsMotionState).toBe(
      'running',
    )

    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'pointer',
      pinned: false,
    })
    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'pointer',
      pinned: false,
    })
    expect(frames.pending()).toBe(2)
    expect(container.querySelector('svg')?.dataset.tsMotionState).toBe(
      'running',
    )
    surface.destroy()
    frames.restore()
  })

  it('cleans element probes and temporary clips when interrupted', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          barY(rows, { x: 'category', y: 'value', key: 'id' }),
          lineY(rows, { x: 'category', y: 'value', key: 'id' }),
        ],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const container = document.createElement('div')
    const frames = installFrames()
    const renderer = motion({
      transition: { type: 'tween', duration: 100 },
    })
    const surface = renderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Composed chart' })

    expect(container.querySelectorAll('[data-ts-motion-role]').length).toBe(3)
    expect(
      container.querySelector('clipPath[id^="ts-chart-motion-clip"]'),
    ).not.toBeNull()
    surface.destroy()

    expect(container.querySelector('[data-ts-motion-role]')).toBeNull()
    expect(
      container.querySelector('clipPath[id^="ts-chart-motion-clip"]'),
    ).toBeNull()
    expect(
      container.querySelector('svg')?.getAttribute('data-ts-motion-state'),
    ).toBe('cancelled')
    frames.restore()
  })

  it('continues keyed updates from painted geometry and publishes interaction points', () => {
    const firstRows = [
      { id: 'a', category: 'A', value: 30 },
      { id: 'b', category: 'B', value: 70 },
    ]
    const secondRows = [
      { id: 'b', category: 'B', value: 20 },
      { id: 'a', category: 'A', value: 90 },
      { id: 'c', category: 'C', value: 55 },
    ]
    const finalRows = [
      { id: 'c', category: 'C', value: 95 },
      { id: 'a', category: 'A', value: 10 },
    ]
    const phases: string[] = []
    const makeScene = (data: typeof firstRows) =>
      createChartScene(
        defineChart({
          motion(context) {
            phases.push(`${context.phase}:${context.datum?.id ?? context.role}`)
            return {
              delay: 0,
              transition: {
                type: 'tween',
                duration: 100,
                easing: 'linear',
              },
            }
          },
          marks: [barY(data, { x: 'category', y: 'value', key: 'id' })],
          x: { scale: scaleBand().domain(data.map((row) => row.category)) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const first = makeScene(firstRows)
    const second = makeScene(secondRows)
    const final = makeScene(finalRows)
    const renderer = motion<(typeof firstRows)[number], string, number>({
      initial: false,
    })
    const container = document.createElement('div')
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Updating bars' })
    const frames = installManagedFrames()
    surface.render(second, { ariaLabel: 'Updating bars' })
    const aKey = second.points.find((point) => point.datum.id === 'a')?.key
    const aRectangle = container.querySelector<SVGRectElement>(
      `g.ts-chart__bar-y > rect[data-ts-key="${aKey}"]`,
    )

    frames.run(0)
    frames.run(40)
    const interruptedY = Number(aRectangle?.getAttribute('y'))
    const presentedA = (surface.getPresentationPoints?.() ?? []).find(
      (point) => point.datum.id === 'a',
    )
    expect(interruptedY).toBeGreaterThan(second.scales.y.map(90))
    expect(interruptedY).toBeLessThan(first.scales.y.map(30))
    expect(presentedA?.y).toBeCloseTo(interruptedY)

    surface.render(final, { ariaLabel: 'Interrupted bars' })

    expect(Number(aRectangle?.getAttribute('y'))).toBeCloseTo(interruptedY)
    frames.run(40)
    frames.run(90)
    expect(Number(aRectangle?.getAttribute('y'))).toBeGreaterThan(interruptedY)
    frames.run(140)
    expect(Number(aRectangle?.getAttribute('y'))).toBeCloseTo(
      final.scales.y.map(10),
    )
    expect(
      container.querySelector(
        `[data-ts-key="${second.points.find((point) => point.datum.id === 'b')?.key}"]`,
      ),
    ).toBeNull()
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    expect(phases).toEqual(
      expect.arrayContaining(['update:a', 'update:b', 'enter:c', 'exit:b']),
    )

    surface.destroy()
    frames.restore()
  })

  it('keeps non-line interaction points aligned with animated geometry', () => {
    const makeScene = (value: number) =>
      createChartScene(
        defineChart({
          marks: [
            dot([{ id: 'a', x: 1, y: value }], {
              x: 'x',
              y: 'y',
              key: 'id',
              motion: {
                transition: {
                  type: 'tween',
                  duration: 100,
                  easing: 'linear',
                },
              },
            }),
          ],
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 10]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const first = makeScene(2)
    const next = makeScene(8)
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Moving dot' })
    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Moving dot' })

    frames.run(0)
    frames.run(50)
    const expectedY = ((first.points[0]?.y ?? 0) + (next.points[0]?.y ?? 0)) / 2
    expect(
      Number(
        container.querySelector('g.ts-chart__dot circle')?.getAttribute('cy'),
      ),
    ).toBeCloseTo(expectedY)
    expect(surface.getPresentationPoints?.()?.[0]?.y).toBeCloseTo(expectedY)

    frames.run(100)
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('uses updated data while retained points animate from prior geometry', () => {
    const makeScene = (datum: {
      id: string
      category: string
      value: number
      revision: number
    }) =>
      createChartScene(
        defineChart({
          marks: [barY([datum], { x: 'category', y: 'value', key: 'id' })],
          x: { scale: scaleBand().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const initialDatum = {
      id: 'a',
      category: 'A',
      value: 20,
      revision: 0,
    }
    const updatedDatum = {
      id: 'a',
      category: 'A',
      value: 80,
      revision: 1,
    }
    const initial = makeScene(initialDatum)
    const updated = makeScene(updatedDatum)
    const container = document.createElement('div')
    const surface = motion<typeof initialDatum, string, number>({
      initial: false,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    }).mount(container, () => {})
    surface.render(initial, { ariaLabel: 'Updating data' })
    const frames = installManagedFrames()

    surface.render(updated, { ariaLabel: 'Updating data' })

    const presented = surface.getPresentationPoints?.()?.[0]
    expect(presented?.datum).toBe(updatedDatum)
    expect(presented?.y).toBeCloseTo(initial.points[0]?.y ?? Number.NaN)
    expect(presented?.y).not.toBeCloseTo(updated.points[0]?.y ?? Number.NaN)

    frames.run(0)
    frames.run(100)
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('snaps without scheduling frames when reduced motion is requested', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    const request = vi.spyOn(window, 'requestAnimationFrame')
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    })
    const scene = createChartScene(
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value', key: 'id' })],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const container = document.createElement('div')
    const surface = motion().mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Reduced motion chart' })

    expect(request).not.toHaveBeenCalled()
    expect(
      container.querySelector('svg')?.dataset.tsMotionState,
    ).toBeUndefined()
    expect(
      Number(
        container.querySelector('g.ts-chart__bar-y rect')?.getAttribute('y'),
      ),
    ).toBeCloseTo(scene.points[0]?.y ?? 0)

    surface.destroy()
    request.mockRestore()
    if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor)
    else Reflect.deleteProperty(window, 'matchMedia')
  })

  it('carries spring momentum through an interrupted target change', () => {
    const makeScene = (value: number) =>
      createChartScene(
        defineChart({
          motion: { delay: 200 },
          marks: [
            barY([{ id: 'a', category: 'A', value }], {
              x: 'category',
              y: 'value',
              key: 'id',
            }),
          ],
          x: { scale: scaleBand().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const first = makeScene(20)
    const second = makeScene(90)
    const final = makeScene(10)
    const container = document.createElement('div')
    const renderer = motion({
      initial: false,
      transition: {
        type: 'spring',
        stiffness: 170,
        damping: 14,
        mass: 1,
      },
    })
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Spring update' })
    const frames = installManagedFrames()
    surface.render(second, { ariaLabel: 'Spring update' })
    frames.run(0)
    frames.run(120)
    const rectangle = container.querySelector<SVGRectElement>(
      'g.ts-chart__bar-y > rect',
    )
    const interruptedY = Number(rectangle?.getAttribute('y'))
    surface.render(final, { ariaLabel: 'Spring update' })

    expect(Number(rectangle?.getAttribute('y'))).toBeCloseTo(interruptedY)
    frames.run(120)
    frames.run(136)
    const momentumY = Number(rectangle?.getAttribute('y'))
    expect(momentumY).toBeLessThan(interruptedY)
    expect(final.scales.y.map(10)).toBeGreaterThan(interruptedY)
    expect(surface.getPresentationPoints?.()?.[0]?.y).toBeCloseTo(momentumY)

    for (let time = 152; time <= 4_000; time += 16) {
      if (container.querySelector('svg')?.dataset.tsMotionState === 'finished')
        break
      frames.run(time)
    }
    expect(Number(rectangle?.getAttribute('y'))).toBeCloseTo(
      final.scales.y.map(10),
    )
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('morphs compatible line topology and its presentation points together', () => {
    const firstRows = [
      { id: 'a', category: 'A', value: 20 },
      { id: 'b', category: 'B', value: 80 },
    ]
    const nextRows = [
      { id: 'a', category: 'A', value: 80 },
      { id: 'b', category: 'B', value: 20 },
    ]
    const makeScene = (data: typeof firstRows) =>
      createChartScene(
        defineChart({
          marks: [lineY(data, { x: 'category', y: 'value', key: 'id' })],
          x: { scale: scaleBand().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const first = makeScene(firstRows)
    const next = makeScene(nextRows)
    const container = document.createElement('div')
    const renderer = motion<(typeof firstRows)[number], string, number>({
      initial: false,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    const surface = renderer.mount(container, () => {})
    surface.render(first, { ariaLabel: 'Line update' })
    const sourcePath = container
      .querySelector('g.ts-chart__line path')
      ?.getAttribute('d')
    const targetContainer = document.createElement('div')
    targetContainer.innerHTML = renderChartSvg(next, {
      ariaLabel: 'Line update',
    })
    const targetPath = targetContainer
      .querySelector('g.ts-chart__line path')
      ?.getAttribute('d')
    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Line update' })

    frames.run(0)
    frames.run(50)
    const halfwayPath = container
      .querySelector('g.ts-chart__line path')
      ?.getAttribute('d')
    expect(halfwayPath).not.toBe(sourcePath)
    expect(halfwayPath).not.toBe(targetPath)
    expect(surface.getPresentationPoints?.()?.[0]?.y).toBeCloseTo(
      ((first.points[0]?.y ?? 0) + (next.points[0]?.y ?? 0)) / 2,
    )
    frames.run(100)
    expect(
      container.querySelector('g.ts-chart__line path')?.getAttribute('d'),
    ).toBe(targetPath)
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('keeps grouped line presentation timing keyed to each series', () => {
    const firstRows = [
      { id: 'a-1', category: 'A', series: 'alpha', value: 20 },
      { id: 'a-2', category: 'B', series: 'alpha', value: 40 },
      { id: 'b-1', category: 'A', series: 'beta', value: 80 },
      { id: 'b-2', category: 'B', series: 'beta', value: 60 },
    ]
    const nextRows = firstRows.map((row) => ({
      ...row,
      value: 100 - row.value,
    }))
    const timing = vi.fn((_context: ChartMotionContext) => ({
      transition: { type: 'tween' as const, duration: 100, easing: 'linear' },
    }))
    const makeScene = (data: typeof firstRows) =>
      createChartScene(
        defineChart({
          motion: timing,
          marks: [
            lineY(data, {
              x: 'category',
              y: 'value',
              z: 'series',
              key: 'id',
            }),
          ],
          x: { scale: scaleBand().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
        }),
        { width: 300, height: 200 },
      )
    const container = document.createElement('div')
    const surface = motion({ initial: false }).mount(container, () => {})
    surface.render(makeScene(firstRows), { ariaLabel: 'Grouped lines' })
    const seriesKeys = [
      ...container.querySelectorAll<SVGGElement>('g.ts-chart__line'),
    ].map((group) => group.dataset.tsKey)
    timing.mockClear()
    const frames = installManagedFrames()
    surface.render(makeScene(nextRows), { ariaLabel: 'Grouped lines' })

    const timedSeries = new Set(
      timing.mock.calls
        .map(([context]) => context.seriesKey)
        .filter((key): key is string => key !== undefined),
    )
    expect(timedSeries).toEqual(new Set(seriesKeys))

    frames.run(0)
    frames.run(100)
    surface.destroy()
    frames.restore()
  })

  it('reveals a complete line group through a chart-space clip', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(rows, {
            x: 'category',
            y: 'value',
            key: 'id',
            points: true,
          }),
        ],
        x: { scale: scaleBand().domain(['A', 'B']) },
        y: { scale: scaleLinear().domain([0, 100]) },
        guides: false,
      }),
      { width: 300, height: 200 },
    )
    const container = document.createElement('div')
    const renderer = motion({
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    })
    const frames = installFrames()
    const surface = renderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Line' })
    const line = container.querySelector<SVGGElement>('g.ts-chart__line')
    const clipRectangle = container.querySelector<SVGRectElement>(
      'clipPath[id^="ts-chart-motion-clip"] rect',
    )

    expect(line?.getAttribute('clip-path')).toMatch(
      /^url\(#ts-chart-motion-clip-/,
    )
    expect(clipRectangle?.getAttribute('width')).toBe('0')
    frames.run(0)
    frames.run(50)
    expect(Number(clipRectangle?.getAttribute('width'))).toBeCloseTo(
      scene.chart.width / 2,
    )
    frames.run(100)
    expect(line?.hasAttribute('clip-path')).toBe(false)
    expect(
      container.querySelector('clipPath[id^="ts-chart-motion-clip"]'),
    ).toBeNull()

    surface.destroy()
    frames.restore()
  })
})

function installFrames() {
  const callbacks: FrameRequestCallback[] = []
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      callbacks.push(callback)
      return callbacks.length
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation(() => {})
  return {
    request,
    run(time: number) {
      const callback = callbacks.shift()
      if (!callback)
        throw new Error(`No animation frame scheduled at ${time}ms`)
      callback(time)
    },
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}

function translateX(element: Element | null) {
  const transform = element?.getAttribute('transform') ?? ''
  const translate = /translate\(([-+\d.e]+)(?:\s|\))/.exec(transform)
  if (translate) return Number(translate[1])
  const matrix = matrixTransform(element)
  return matrix[4] ?? Number.NaN
}

function matrixTransform(element: Element | null) {
  const values =
    element
      ?.getAttribute('transform')
      ?.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)
      ?.map(Number) ?? []
  return values
}

function installManagedFrames() {
  const callbacks = new Map<number, FrameRequestCallback>()
  let handle = 0
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      handle += 1
      callbacks.set(handle, callback)
      return handle
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frame) => {
      if (frame !== null && frame !== undefined) callbacks.delete(frame)
    })
  return {
    run(time: number) {
      const next = callbacks.entries().next().value as
        [number, FrameRequestCallback] | undefined
      if (!next) throw new Error(`No animation frame scheduled at ${time}ms`)
      callbacks.delete(next[0])
      next[1](time)
    },
    runAll(time: number) {
      const pending = [...callbacks.values()]
      if (!pending.length) {
        throw new Error(`No animation frame scheduled at ${time}ms`)
      }
      callbacks.clear()
      pending.forEach((callback) => callback(time))
    },
    pending() {
      return callbacks.size
    },
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}
