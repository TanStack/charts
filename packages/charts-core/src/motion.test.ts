import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import { dot } from './dot'
import { lineY } from './line'
import { motion } from './motion'
import { createChartScene, defineChart } from './scene'
import { chartSceneSource } from './scene-source'
import { renderChartSvg } from './svg'
import type { ChartMotionContext, ChartPoint, ChartScene } from './types'

const rows = [
  { id: 'a', category: 'A', value: 40 },
  { id: 'b', category: 'B', value: 80 },
]

describe('SVG motion', () => {
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
    frames.run(0)
    frames.run(80)
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
    frames.run(80)
    frames.run(96)
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
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}
