import { scaleLinear, scaleUtc } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { dot } from './dot'
import { mountChart } from './dom'
import { zoomX, type ZoomXChange, type ZoomXWindow } from './interaction-zoom'
import { controlledSignal } from './interaction-signal'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type { ChartHost, ChartHostOptions } from './dom-types'

const numericRows = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
]

describe('zoomX', () => {
  it('resolves a renderer-neutral continuous control without static DOM output', () => {
    const definition = numericDefinition({ start: 2, end: 8 }, () => {})
    const scene = createChartScene(definition, { width: 480, height: 240 })

    expect(scene.controls).toHaveLength(1)
    expect(scene.controls?.[0]).toMatchObject({
      kind: 'zoom-x',
      id: 'window',
      window: { start: 2, end: 8 },
      extent: { start: 0, end: 10 },
    })
    expect(renderChartSvg(scene, { ariaLabel: 'Static zoom' })).not.toContain(
      'data-chart-zoom',
    )
    expect(() =>
      zoomX({
        window: controlledSignal({ start: 0, end: 1 }, () => {}),
        extent: [0, 1],
        scaleExtent: [0.5, 4],
      }),
    ).toThrow(/must start at 1/)
  })

  it('owns focus, keyboard navigation, reset, controlled updates, and teardown', () => {
    let accepted: ZoomXWindow<number> = { start: 0, end: 10 }
    const changes: ZoomXChange<number>[] = []
    const activeChanges: boolean[] = []
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<(typeof numericRows)[number], number, number>
    const options = (
      width = 480,
    ): ChartHostOptions<(typeof numericRows)[number], number, number> => ({
      definition: numericDefinition(
        accepted,
        (next, reason) => {
          accepted = copyWindow(next)
          changes.push(reason)
          host.update(options(width))
        },
        (active) => activeChanges.push(active),
      ),
      width,
      height: 240,
      ariaLabel: 'Keyboard zoom',
    })
    host = mountChart(container, options())
    const target = zoomTarget(container)

    expect(target.dataset.zoomActive).toBe('false')
    expect(target.dataset.zoomWheelCaptured).toBe('false')
    expect(target.dataset.zoomLastAction).toBe('none')
    expect(target.getAttribute('role')).toBe('application')
    expect(target.getAttribute('aria-keyshortcuts')).toContain('Home')
    expect(target.style.touchAction).toBe('pan-y')

    target.focus()
    expect(activeChanges).toEqual([true])
    expect(target.dataset.zoomActive).toBe('true')
    expect(target.style.touchAction).toBe('none')

    target.dispatchEvent(key('+'))
    expect(accepted.start).toBeCloseTo(2.5)
    expect(accepted.end).toBeCloseTo(7.5)
    expect(changes.at(-1)).toMatchObject({
      type: 'commit',
      source: 'keyboard',
      action: 'zoom',
      origin: { start: 0, end: 10 },
    })
    expect(document.activeElement).toBe(target)

    target.dispatchEvent(key('ArrowRight'))
    expect(accepted.start).toBeCloseTo(3.125)
    expect(accepted.end).toBeCloseTo(8.125)
    expect(changes.at(-1)).toMatchObject({ action: 'pan' })

    target.dispatchEvent(key('Home'))
    expect(accepted).toEqual({ start: 0, end: 10 })
    expect(changes.at(-1)).toMatchObject({ action: 'reset' })

    accepted = { start: 2, end: 6 }
    host.update(options(800))
    expect(zoomTarget(container)).toBe(target)
    expect(target.getAttribute('width')).not.toBe('0')
    expect(target.getAttribute('aria-description')).toContain('2 to 6')
    expect(document.activeElement).toBe(target)

    target.blur()
    expect(activeChanges).toEqual([true, false])
    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('removes keyboard semantics when disabled and publishes active teardown', () => {
    const changes: ZoomXChange<number>[] = []
    const activeChanges: boolean[] = []
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition: numericDefinition(
        { start: 0, end: 10 },
        (_next, reason) => changes.push(reason),
        (active) => activeChanges.push(active),
        false,
      ),
      width: 480,
      height: 240,
      ariaLabel: 'Pointer zoom',
    })
    const target = zoomTarget(container)

    expect(target.getAttribute('role')).toBeNull()
    expect(target.getAttribute('tabindex')).toBe('-1')
    expect(target.getAttribute('aria-keyshortcuts')).toBeNull()
    expect(target.getAttribute('aria-description')).not.toContain('plus')

    target.dispatchEvent(key('+'))
    expect(changes).toEqual([])

    target.focus()
    expect(activeChanges).toEqual([true])
    host.destroy()
    expect(activeChanges).toEqual([true, false])
    container.remove()

    const inactiveContainer = document.createElement('div')
    document.body.append(inactiveContainer)
    const inactiveChanges: boolean[] = []
    const inactiveHost = mountChart(inactiveContainer, {
      definition: numericDefinition(
        { start: 0, end: 10 },
        () => {},
        (active) => inactiveChanges.push(active),
      ),
      width: 480,
      height: 240,
      ariaLabel: 'Inactive zoom',
    })
    inactiveHost.destroy()
    expect(inactiveChanges).toEqual([])
    inactiveContainer.remove()
  })

  it('leaves unfocused wheel input alone and groups normalized wheel zoom and pan', () => {
    vi.useFakeTimers()
    try {
      let accepted: ZoomXWindow<number> = { start: 0, end: 10 }
      const calls: Array<{
        value: ZoomXWindow<number>
        reason: ZoomXChange<number>
      }> = []
      const container = document.createElement('div')
      document.body.append(container)
      let host: ChartHost<(typeof numericRows)[number], number, number>
      const options = (): ChartHostOptions<
        (typeof numericRows)[number],
        number,
        number
      > => ({
        definition: numericDefinition(accepted, (next, reason) => {
          accepted = copyWindow(next)
          calls.push({ value: copyWindow(next), reason })
          host.update(options())
        }),
        width: 480,
        height: 240,
        ariaLabel: 'Wheel zoom',
      })
      host = mountChart(container, options())
      const target = zoomTarget(container)
      const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
      mockBounds(surface, 480, 240)
      const scene = host.getScene()
      const x = scene.chart.x + scene.chart.width * 0.25
      const y = scene.chart.y + scene.chart.height / 2

      const ignored = wheel(x, y, { deltaY: -240 })
      target.dispatchEvent(ignored)
      expect(ignored.defaultPrevented).toBe(false)
      expect(calls).toEqual([])
      expect(target.dataset.zoomWheelCaptured).toBe('false')

      target.focus()
      const vertical = wheel(x, y, { deltaY: -15, deltaMode: 1 })
      target.dispatchEvent(vertical)
      expect(vertical.defaultPrevented).toBe(true)
      expect(accepted.start).toBeCloseTo(1.25)
      expect(accepted.end).toBeCloseTo(6.25)
      expect(calls.at(-1)?.reason).toMatchObject({
        type: 'preview',
        source: 'wheel',
        action: 'zoom',
      })
      expect(target.dataset.zoomWheelCaptured).toBe('true')
      expect(target.dataset.zoomLastAction).toBe('zoom')

      vi.advanceTimersByTime(150)
      expect(calls.at(-1)?.reason).toMatchObject({
        type: 'commit',
        origin: { start: 0, end: 10 },
      })

      const horizontal = wheel(x, y, { deltaX: 220 })
      target.dispatchEvent(horizontal)
      expect(horizontal.defaultPrevented).toBe(true)
      expect(accepted.start).toBeCloseTo(2.5)
      expect(accepted.end).toBeCloseTo(7.5)
      expect(calls.at(-1)?.reason).toMatchObject({
        type: 'preview',
        action: 'pan',
      })
      vi.advanceTimersByTime(150)
      expect(calls.at(-1)?.reason).toMatchObject({
        type: 'commit',
        action: 'pan',
      })

      host.destroy()
      container.remove()
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses reversed final-scale inversion and clones temporal payloads', () => {
    vi.useFakeTimers()
    try {
      const dates = [
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-01-11T00:00:00.000Z'),
      ] as const
      let accepted: ZoomXWindow<Date> = {
        start: dates[0],
        end: dates[1],
      }
      const calls: Array<{
        value: ZoomXWindow<Date>
        reason: ZoomXChange<Date>
      }> = []
      const container = document.createElement('div')
      document.body.append(container)
      let host: ChartHost<{ x: Date; y: number }, Date, number>
      const options = (): ChartHostOptions<
        { x: Date; y: number },
        Date,
        number
      > => ({
        definition: temporalDefinition(
          accepted,
          dates,
          (next, reason) => {
            accepted = copyWindow(next)
            calls.push({ value: copyWindow(next), reason })
            host.update(options())
          },
          true,
        ),
        width: 480,
        height: 240,
        ariaLabel: 'Reversed temporal zoom',
      })
      host = mountChart(container, options())
      const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
      const target = zoomTarget(container)
      mockBounds(surface, 480, 240)
      const scene = host.getScene()
      target.focus()
      target.dispatchEvent(
        wheel(
          scene.chart.x + scene.chart.width * 0.25,
          scene.chart.y + scene.chart.height / 2,
          { deltaY: -240 },
        ),
      )

      const preview = calls.at(-1)!
      expect(preview.reason).toMatchObject({ type: 'preview' })
      expect(preview.value.start.toISOString()).toBe('2024-01-04T18:00:00.000Z')
      expect(preview.value.end.toISOString()).toBe('2024-01-09T18:00:00.000Z')
      expect(preview.reason.value.start).not.toBe(preview.value.start)
      expect(preview.reason.origin.start).not.toBe(dates[0])
      expect(preview.reason.origin.start).toEqual(dates[0])

      vi.advanceTimersByTime(150)
      host.destroy()
      container.remove()
    } finally {
      vi.useRealTimers()
    }
  })

  it('previews and commits mouse pan, then rolls a later pan back on Escape', () => {
    const initial = { start: 2.5, end: 7.5 }
    const calls: Array<{
      value: ZoomXWindow<number>
      reason: ZoomXChange<number>
    }> = []
    const container = document.createElement('div')
    document.body.append(container)
    const options = () => ({
      definition: numericDefinition(initial, (value, reason) => {
        calls.push({ value: copyWindow(value), reason })
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Drag zoom',
    })
    const host = mountChart(container, options())
    const target = zoomTarget(container)
    const scene = host.getScene()
    mockBounds(target, 480, 240)
    target.focus()
    const x = scene.chart.x + scene.chart.width / 2
    const y = scene.chart.y + scene.chart.height / 2

    target.dispatchEvent(mouse('mousedown', x, y))
    window.dispatchEvent(mouse('mousemove', x + 40, y, 1))
    window.dispatchEvent(mouse('mouseup', x + 40, y))
    expect(calls.some(({ reason }) => reason.type === 'preview')).toBe(true)
    expect(calls.at(-1)?.reason).toMatchObject({
      type: 'commit',
      source: 'pointer',
      action: 'pan',
    })

    host.update(options())
    calls.length = 0
    target.dispatchEvent(mouse('mousedown', x, y))
    window.dispatchEvent(mouse('mousemove', x - 40, y, 1))
    target.dispatchEvent(key('Escape'))
    expect(calls.at(-1)).toMatchObject({
      value: initial,
      reason: {
        type: 'cancel',
        value: initial,
        origin: initial,
        source: 'keyboard',
        action: 'pan',
      },
    })

    calls.length = 0
    target.dispatchEvent(mouse('mousedown', x, y))
    window.dispatchEvent(mouse('mousemove', x + 40, y, 1))
    target.dispatchEvent(
      new Event('pointercancel', { bubbles: true, cancelable: true }),
    )
    expect(calls.at(-1)).toMatchObject({
      value: initial,
      reason: {
        type: 'cancel',
        value: initial,
        origin: initial,
        source: 'pointer',
        action: 'pan',
      },
    })
    const cancelledCallCount = calls.length
    window.dispatchEvent(mouse('mouseup', x + 40, y))
    expect(calls).toHaveLength(cancelledCallCount)

    host.destroy()
    container.remove()
  })

  it('preserves accepted controlled echoes through active pointer and touch gestures', () => {
    const initial = { start: 2.5, end: 7.5 }
    let accepted: ZoomXWindow<number> = initial
    const calls: Array<{
      value: ZoomXWindow<number>
      reason: ZoomXChange<number>
    }> = []
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<(typeof numericRows)[number], number, number>
    const options = (): ChartHostOptions<
      (typeof numericRows)[number],
      number,
      number
    > => ({
      definition: numericDefinition(accepted, (value, reason) => {
        accepted = copyWindow(value)
        calls.push({ value: copyWindow(value), reason })
        host.update(options())
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Accepted drag zoom',
    })
    host = mountChart(container, options())
    const target = zoomTarget(container)
    const scene = host.getScene()
    mockBounds(target, 480, 240)
    target.focus()
    const x = scene.chart.x + scene.chart.width / 2
    const y = scene.chart.y + scene.chart.height / 2

    target.dispatchEvent(mouse('mousedown', x, y))
    window.dispatchEvent(mouse('mousemove', x + 20, y, 1))
    window.dispatchEvent(mouse('mousemove', x + 40, y, 1))
    window.dispatchEvent(mouse('mouseup', x + 40, y))

    const previews = calls.filter(({ reason }) => reason.type === 'preview')
    const commit = calls.find(({ reason }) => reason.type === 'commit')
    expect(previews).toHaveLength(2)
    expect(commit?.reason).toMatchObject({
      type: 'commit',
      origin: initial,
      source: 'pointer',
      action: 'pan',
    })
    expect(commit?.value.start).toBeCloseTo(previews.at(-1)!.value.start)
    expect(commit?.value.end).toBeCloseTo(previews.at(-1)!.value.end)
    expect(accepted.start).toBeCloseTo(commit!.value.start)
    expect(accepted.end).toBeCloseTo(commit!.value.end)

    calls.length = 0
    const touchOrigin = copyWindow(accepted)
    const first = touch(1, x, y)
    target.dispatchEvent(touchEvent('touchstart', [first], [first]))
    const firstMove = touch(1, x + 20, y)
    target.dispatchEvent(touchEvent('touchmove', [firstMove], [firstMove]))
    const secondMove = touch(1, x + 40, y)
    target.dispatchEvent(touchEvent('touchmove', [secondMove], [secondMove]))
    target.dispatchEvent(touchEvent('touchend', [], [secondMove]))

    const touchPreviews = calls.filter(
      ({ reason }) => reason.type === 'preview',
    )
    expect(touchPreviews).toHaveLength(2)
    expect(calls.at(-1)?.reason).toMatchObject({
      type: 'commit',
      origin: touchOrigin,
      source: 'touch',
      action: 'pan',
    })
    expect(calls.at(-1)?.value.start).toBeCloseTo(
      touchPreviews.at(-1)!.value.start,
    )
    expect(calls.at(-1)?.value.end).toBeCloseTo(touchPreviews.at(-1)!.value.end)

    host.destroy()
    container.remove()
  })

  it('keeps a narrow temporal pointer pan attached across controlled previews', () => {
    const extent = [
      new Date('2018-01-02T00:00:00.000Z'),
      new Date('2018-01-18T00:00:00.000Z'),
    ] as const
    let accepted: ZoomXWindow<Date> = {
      start: extent[0],
      end: extent[1],
    }
    const changes: ZoomXChange<Date>[] = []
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<{ x: Date; y: number }, Date, number>
    const options = (): ChartHostOptions<
      { x: Date; y: number },
      Date,
      number
    > => {
      const leftMargin =
        accepted.start.getTime() >
        new Date('2018-01-06T00:00:00.000Z').getTime()
          ? 90
          : 40
      return {
        definition: temporalDefinition(
          accepted,
          extent,
          (next, reason) => {
            accepted = copyWindow(next)
            changes.push(reason)
            host.update(options())
          },
          false,
          leftMargin,
        ),
        width: 320,
        height: 240,
        ariaLabel: 'Narrow temporal zoom',
      }
    }
    host = mountChart(container, options())
    const target = zoomTarget(container)
    mockBounds(target, 320, 240)
    target.focus()
    target.dispatchEvent(key('+'))
    expect(day(accepted.start)).toBe('2018-01-06')
    expect(day(accepted.end)).toBe('2018-01-14')

    changes.length = 0
    const scene = host.getScene()
    const from = scene.scales.x.map(new Date('2018-01-10T00:00:00.000Z'))
    const to = scene.scales.x.map(new Date('2018-01-08T00:00:00.000Z'))
    const y = scene.chart.y + scene.chart.height / 2
    target.dispatchEvent(mouse('mousedown', from, y))
    for (let step = 1; step <= 8; step += 1) {
      window.dispatchEvent(
        mouse('mousemove', from + ((to - from) * step) / 8, y, 1),
      )
    }
    window.dispatchEvent(mouse('mouseup', to, y))

    expect(changes.filter(({ type }) => type === 'preview')).toHaveLength(8)
    expect(changes.at(-1)?.type).toBe('commit')
    expect(day(accepted.start)).toBe('2018-01-08')
    expect(day(accepted.end)).toBe('2018-01-16')
    expect(host.getScene().chart.x).not.toBe(scene.chart.x)

    host.destroy()
    container.remove()
  })

  it('ends rejected pointer and divergent touch gestures without a stale commit', () => {
    let accepted: ZoomXWindow<number> = { start: 2.5, end: 7.5 }
    let rejectPreview = true
    const calls: Array<{
      value: ZoomXWindow<number>
      reason: ZoomXChange<number>
    }> = []
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<(typeof numericRows)[number], number, number>
    const options = (): ChartHostOptions<
      (typeof numericRows)[number],
      number,
      number
    > => ({
      definition: numericDefinition(accepted, (value, reason) => {
        calls.push({ value: copyWindow(value), reason })
        if (rejectPreview && reason.type === 'preview') host.update(options())
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Controlled gesture zoom',
    })
    host = mountChart(container, options())
    const target = zoomTarget(container)
    let scene = host.getScene()
    mockBounds(target, 480, 240)
    target.focus()
    let x = scene.chart.x + scene.chart.width / 2
    let y = scene.chart.y + scene.chart.height / 2

    target.dispatchEvent(mouse('mousedown', x, y))
    window.dispatchEvent(mouse('mousemove', x + 40, y, 1))
    window.dispatchEvent(mouse('mouseup', x + 40, y))
    expect(calls).toHaveLength(1)
    expect(calls[0]?.reason.type).toBe('preview')

    calls.length = 0
    rejectPreview = false
    const first = touch(1, x, y)
    target.dispatchEvent(touchEvent('touchstart', [first], [first]))
    const moved = touch(1, x + 40, y)
    target.dispatchEvent(touchEvent('touchmove', [moved], [moved]))
    expect(calls.at(-1)?.reason.type).toBe('preview')

    accepted = { start: 1, end: 4 }
    host.update(options())
    const movedAgain = touch(1, x + 80, y)
    target.dispatchEvent(touchEvent('touchmove', [movedAgain], [movedAgain]))
    target.dispatchEvent(touchEvent('touchend', [], [movedAgain]))
    expect(calls).toHaveLength(1)
    expect(calls.some(({ reason }) => reason.type === 'commit')).toBe(false)
    expect(target.getAttribute('aria-description')).toContain('1 to 4')

    calls.length = 0
    scene = host.getScene()
    x = scene.chart.x + scene.chart.width / 2
    y = scene.chart.y + scene.chart.height / 2
    const next = touch(2, x, y)
    target.dispatchEvent(touchEvent('touchstart', [next], [next]))
    const nextMoved = touch(2, x + 20, y)
    target.dispatchEvent(touchEvent('touchmove', [nextMoved], [nextMoved]))
    target.dispatchEvent(touchEvent('touchend', [], [nextMoved]))
    expect(calls[0]?.reason).toMatchObject({
      type: 'preview',
      origin: { start: 1, end: 4 },
      source: 'touch',
      action: 'pan',
    })
    expect(calls.at(-1)?.reason).toMatchObject({
      type: 'commit',
      origin: { start: 1, end: 4 },
      source: 'touch',
      action: 'pan',
    })

    host.destroy()
    container.remove()
  })

  it('supports touch pan, pinch classification, and touch-cancel rollback', () => {
    const initial = { start: 2.5, end: 7.5 }
    const changes: ZoomXChange<number>[] = []
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, {
      definition: numericDefinition(initial, (_value, reason) => {
        changes.push(reason)
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Touch zoom',
    })
    const target = zoomTarget(container)
    const scene = host.getScene()
    mockBounds(target, 480, 240)
    target.focus()
    const x = scene.chart.x + scene.chart.width / 2
    const y = scene.chart.y + scene.chart.height / 2
    const first = touch(1, x, y)

    target.dispatchEvent(touchEvent('touchstart', [first], [first]))
    const moved = touch(1, x + 40, y)
    target.dispatchEvent(touchEvent('touchmove', [moved], [moved]))
    target.dispatchEvent(touchEvent('touchcancel', [], [moved]))
    expect(changes.at(-1)).toMatchObject({
      type: 'cancel',
      value: initial,
      origin: initial,
      source: 'touch',
      action: 'pan',
    })

    changes.length = 0
    const left = touch(2, x - 30, y)
    const right = touch(3, x + 30, y)
    target.dispatchEvent(touchEvent('touchstart', [left, right], [left, right]))
    const fartherLeft = touch(2, x - 60, y)
    const fartherRight = touch(3, x + 60, y)
    target.dispatchEvent(
      touchEvent(
        'touchmove',
        [fartherLeft, fartherRight],
        [fartherLeft, fartherRight],
      ),
    )
    target.dispatchEvent(
      touchEvent('touchend', [], [fartherLeft, fartherRight]),
    )
    expect(changes.some(({ action }) => action === 'zoom')).toBe(true)
    expect(changes.at(-1)).toMatchObject({
      type: 'commit',
      source: 'touch',
      action: 'zoom',
    })

    host.destroy()
    container.remove()
  })

  it('lets synchronous controlled rejection remain authoritative', () => {
    const accepted = { start: 0, end: 10 }
    const changes: ZoomXChange<number>[] = []
    const container = document.createElement('div')
    document.body.append(container)
    let host: ChartHost<(typeof numericRows)[number], number, number>
    const options = () => ({
      definition: numericDefinition(accepted, (_next, reason) => {
        changes.push(reason)
        host.update(options())
      }),
      width: 480,
      height: 240,
      ariaLabel: 'Rejected zoom',
    })
    host = mountChart(container, options())
    const target = zoomTarget(container)
    target.focus()
    target.dispatchEvent(key('+'))

    expect(changes.at(-1)?.type).toBe('commit')
    expect(changes.at(-1)?.value.start).toBeCloseTo(2.5)
    expect(changes.at(-1)?.value.end).toBeCloseTo(7.5)
    expect(target.getAttribute('aria-description')).toContain('0 to 10')

    host.destroy()
    container.remove()
  })

  it('does not commit a wheel preview rejected by a controlled update', () => {
    vi.useFakeTimers()
    try {
      const accepted = { start: 0, end: 10 }
      const changes: ZoomXChange<number>[] = []
      const container = document.createElement('div')
      document.body.append(container)
      let host: ChartHost<(typeof numericRows)[number], number, number>
      const options = () => ({
        definition: numericDefinition(accepted, (_next, reason) => {
          changes.push(reason)
          host.update(options())
        }),
        width: 480,
        height: 240,
        ariaLabel: 'Rejected wheel zoom',
      })
      host = mountChart(container, options())
      const target = zoomTarget(container)
      const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')!
      const scene = host.getScene()
      mockBounds(surface, 480, 240)
      target.focus()
      target.dispatchEvent(
        wheel(
          scene.chart.x + scene.chart.width / 2,
          scene.chart.y + scene.chart.height / 2,
          { deltaY: -240 },
        ),
      )

      expect(changes).toHaveLength(1)
      expect(changes[0]?.type).toBe('preview')
      vi.advanceTimersByTime(200)
      expect(changes).toHaveLength(1)
      expect(target.getAttribute('aria-description')).toContain('0 to 10')

      host.destroy()
      container.remove()
    } finally {
      vi.useRealTimers()
    }
  })
})

function numericDefinition(
  window: ZoomXWindow<number>,
  onChange: (value: ZoomXWindow<number>, reason: ZoomXChange<number>) => void,
  onActiveChange?: (active: boolean) => void,
  keyboard = true,
) {
  return defineChart({
    marks: [dot(numericRows, { x: 'x', y: 'y' })],
    x: { scale: scaleLinear().domain([window.start, window.end]) },
    y: { scale: scaleLinear().domain([0, 10]) },
    controls: [
      zoomX({
        id: 'window',
        window: controlledSignal<ZoomXWindow<number>, ZoomXChange<number>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        extent: [0, 10],
        scaleExtent: [1, 8],
        format: (value) => String(value),
        onActiveChange,
        keyboard,
      }),
    ],
    keyboard: false,
  })
}

function temporalDefinition(
  window: ZoomXWindow<Date>,
  extent: readonly [Date, Date],
  onChange: (value: ZoomXWindow<Date>, reason: ZoomXChange<Date>) => void,
  reverse = false,
  leftMargin?: number,
) {
  return defineChart({
    marks: [
      dot(
        extent.map((x, y) => ({ x, y })),
        { x: 'x', y: 'y' },
      ),
    ],
    x: {
      scale: scaleUtc().domain([window.start, window.end]),
      reverse,
    },
    y: { scale: scaleLinear().domain([0, 1]) },
    controls: [
      zoomX({
        id: 'window',
        window: controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        extent,
        scaleExtent: [1, 8],
      }),
    ],
    keyboard: false,
    ...(leftMargin === undefined
      ? {}
      : {
          margin: {
            top: 20,
            right: 20,
            bottom: 30,
            left: leftMargin,
          },
        }),
  })
}

function zoomTarget(container: HTMLElement) {
  const target = container.querySelector<SVGRectElement>(
    '[data-chart-zoom-surface="window"]',
  )
  if (!target) throw new Error('Expected horizontal zoom surface')
  return target
}

function copyWindow<TValue extends number | Date>(
  window: ZoomXWindow<TValue>,
): ZoomXWindow<TValue> {
  const clone = (value: TValue) =>
    (value instanceof Date ? new Date(value.getTime()) : value) as TValue
  return { start: clone(window.start), end: clone(window.end) }
}

function day(value: Date) {
  return value.toISOString().slice(0, 10)
}

function key(value: string) {
  return new KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
  })
}

function wheel(
  clientX: number,
  clientY: number,
  options: { deltaX?: number; deltaY?: number; deltaMode?: number },
) {
  return new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    ...options,
  })
}

function mouse(type: string, clientX: number, clientY: number, buttons = 0) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons,
    clientX,
    clientY,
  })
  Object.defineProperty(event, 'view', { value: window })
  return event
}

function touch(identifier: number, clientX: number, clientY: number) {
  return { identifier, clientX, clientY }
}

function touchEvent(
  type: string,
  touches: readonly ReturnType<typeof touch>[],
  changedTouches: readonly ReturnType<typeof touch>[],
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
    view: { value: window },
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
