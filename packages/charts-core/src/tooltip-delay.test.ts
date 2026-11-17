import { afterEach, expect, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { lineY } from './line'
import { mountChartRenderer } from './renderer'
import { defineChart } from './scene'
import { tooltip } from './tooltip'
import { motion } from './motion'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function setup(showDelay = 150, hideDelay = 0, animated = false) {
  vi.useFakeTimers()
  const rows = [1, 2, 3, 4].map((x) => ({ x, y: x * 10 }))
  const format = vi.fn((point: { x: number }) => String(point.x))
  const definition = (delay: number, hide = hideDelay) => {
    const options = {
      use: tooltip,
      showDelay: delay,
      hideDelay: hide,
      format,
      motion: animated ? undefined : (false as const),
      sticky: true,
    }
    return defineChart({
      motion: animated
        ? { transition: { type: 'tween' as const, duration: 100 } }
        : false,
      marks: [lineY(rows, { x: 'x', y: 'y' })],
      tooltip: options,
      scales: {
        x: { scale: scaleLinear().domain([1, 4]) },
        y: { scale: scaleLinear().domain([0, 40]) },
      },
    })
  }
  const element = document.createElement('div')
  const options = {
    definition: definition(showDelay),
    renderer: motion({ initial: false }),
    width: 300,
    height: 200,
    ariaLabel: 'delay reproduction',
  }
  const host = mountChartRenderer(element, options)
  cleanups.push(() => host.destroy())
  const svg = element.querySelector('svg')!
  svg.getBoundingClientRect = () =>
    DOMRect.fromRect({ width: 300, height: 200 })
  const move = (index = 1) => {
    const point = host.getScene().points[index]!
    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: point.x,
        clientY: point.y,
      }),
    )
    return point
  }
  const visible = () =>
    element.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden === false
  const lose = () =>
    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: -10000,
        clientY: -10000,
      }),
    )
  const update = (delay: number, hide = hideDelay) =>
    host.update({ ...options, definition: definition(delay, hide) })
  const disable = () =>
    host.update({
      ...options,
      definition: { ...definition(showDelay), tooltip: false },
    })
  const empty = () =>
    host.update({
      ...options,
      definition: { ...definition(showDelay), marks: [] },
    })
  return { element, host, move, lose, visible, format, update, disable, empty }
}

it('keeps the first tooltip hidden until the opted-in deadline', () => {
  const f = setup()
  f.move()
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(149)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(true)
})

it('cancels a pending show on destruction', () => {
  const f = setup()
  f.move()
  f.host.destroy()
  vi.advanceTimersByTime(150)
  expect(f.element.querySelector('.ts-chart-tooltip')).toBeNull()
  expect(f.format).not.toHaveBeenCalled()
})

it('cancels a pending show on target loss', () => {
  const f = setup()
  f.move()
  f.lose()
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(false)
  expect(f.format).not.toHaveBeenCalled()
})

it.each(['mouseleave', 'pointercancel'])(
  'cancels a pending show on the host %s event',
  (event) => {
    const f = setup()
    f.move()
    f.element.dispatchEvent(new MouseEvent(event))
    vi.advanceTimersByTime(150)
    expect(f.visible()).toBe(false)
    expect(f.format).not.toHaveBeenCalled()
  },
)

it('starts a fresh delay after reacquiring a target', () => {
  const f = setup()
  f.move()
  vi.advanceTimersByTime(100)
  f.lose()
  f.move()
  vi.advanceTimersByTime(50)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(100)
  expect(f.visible()).toBe(true)
})

it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
  'shows immediately with delay %s',
  (delay) => {
    const f = setup(delay)
    f.move()
    expect(f.visible()).toBe(true)
  },
)

it('uses the latest target without restarting the pending delay', () => {
  const f = setup()
  f.move()
  vi.advanceTimersByTime(100)
  const latest = f.move(2)
  expect(f.format).not.toHaveBeenCalled()
  vi.advanceTimersByTime(50)
  expect(f.format.mock.calls.at(-1)?.[0].x).toBe(latest.x)
  expect(f.visible()).toBe(true)
})

it('does not delay movement after the tooltip is visible', () => {
  const f = setup()
  f.move()
  vi.advanceTimersByTime(150)
  const latest = f.move(2)
  expect(f.format.mock.calls.at(-1)?.[0].x).toBe(latest.x)
  expect(f.visible()).toBe(true)
})

it('uses an updated zero delay without leaving a pending callback', () => {
  const f = setup()
  const schedule = vi.spyOn(globalThis, 'setTimeout')
  const cancel = vi.spyOn(globalThis, 'clearTimeout')
  f.move()
  const pending = schedule.mock.results.find(
    (_, index) => schedule.mock.calls[index]?.[1] === 150,
  )?.value
  expect(pending).toBeDefined()
  vi.advanceTimersByTime(50)
  f.update(0)
  expect(f.visible()).toBe(true)
  expect(cancel).toHaveBeenCalledWith(pending)
})

it('restarts a pending show when its configured delay changes', () => {
  const f = setup()
  f.move()
  vi.advanceTimersByTime(100)
  f.update(200)
  vi.advanceTimersByTime(50)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(149)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(true)
})

it('keeps a pending pinned tooltip after the pointer leaves the host', () => {
  const f = setup()
  const point = f.move()
  f.element.querySelector('svg')!.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: point.x,
      clientY: point.y,
    }),
  )
  f.element.dispatchEvent(new MouseEvent('mouseleave'))
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(true)
  expect(
    f.element.querySelector<HTMLElement>('.ts-chart-tooltip')?.dataset.sticky,
  ).toBe('true')
})

it('keeps a visible tooltip until the hide deadline without restarting on repeated misses', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  vi.advanceTimersByTime(100)
  f.lose()
  vi.advanceTimersByTime(49)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(false)
})

it('cancels pending hide when the pointer reacquires a target', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  vi.advanceTimersByTime(100)
  const latest = f.move(2)
  vi.advanceTimersByTime(100)
  expect(f.visible()).toBe(true)
  expect(f.format.mock.calls.at(-1)?.[0].x).toBe(latest.x)
  f.lose()
  vi.advanceTimersByTime(149)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(false)
})

it('destroys immediately during the hide delay', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  f.host.destroy()
  expect(f.element.querySelector('.ts-chart-tooltip')).toBeNull()
  vi.advanceTimersByTime(150)
  expect(f.element.querySelector('.ts-chart-tooltip')).toBeNull()
})

it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
  'hides immediately with hide delay %s',
  (delay) => {
    const f = setup(0, delay)
    f.move()
    f.lose()
    expect(f.visible()).toBe(false)
  },
)

it('restarts an already pending hide when its configured delay changes', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  vi.advanceTimersByTime(100)
  f.update(0, 200)
  vi.advanceTimersByTime(50)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(149)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(false)
})

it('applies an updated zero hide delay immediately', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  vi.advanceTimersByTime(100)
  f.update(0, 0)
  expect(f.visible()).toBe(false)
})

it('keeps the original deadline after an equivalent options update', () => {
  const f = setup()
  f.move()
  vi.advanceTimersByTime(100)
  f.update(150)
  vi.advanceTimersByTime(50)
  expect(f.visible()).toBe(true)
})

it('clamps an overflowing show delay instead of showing after one millisecond', () => {
  const f = setup(2_147_483_648)
  f.move()
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(2_147_483_645)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(true)
})

it('clamps an overflowing hide delay instead of hiding after one millisecond', () => {
  const f = setup(0, 2_147_483_648)
  f.move()
  f.lose()
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(2_147_483_646)
  expect(f.visible()).toBe(false)
})

it('keeps a visible tooltip through reentry, then delays a later fresh show', () => {
  const f = setup(150, 150)
  f.move()
  vi.advanceTimersByTime(150)
  f.lose()
  vi.advanceTimersByTime(100)
  f.move(2)
  expect(f.visible()).toBe(true)
  vi.advanceTimersByTime(100)
  expect(f.visible()).toBe(true)
  f.lose()
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(false)
  f.move()
  vi.advanceTimersByTime(149)
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(1)
  expect(f.visible()).toBe(true)
})

it('does not cancel pending show when leaving toward a child inside the host', () => {
  const f = setup()
  f.move()
  const child = document.createElement('button')
  f.element.append(child)
  f.element.dispatchEvent(
    new MouseEvent('mouseleave', { relatedTarget: child }),
  )
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(true)
})

it('cancels pending show when tooltips are disabled', () => {
  const f = setup()
  f.move()
  f.disable()
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(false)
  expect(f.format).not.toHaveBeenCalled()
})

it('hides immediately when tooltips are disabled during hide delay', () => {
  const f = setup(0, 150)
  f.move()
  f.lose()
  f.disable()
  expect(f.visible()).toBe(false)
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(false)
})

it('cancels a pending show when an update removes its target', () => {
  const f = setup()
  f.move()
  f.empty()
  vi.advanceTimersByTime(150)
  expect(f.visible()).toBe(false)
  expect(f.format).not.toHaveBeenCalled()
})

it('waits before inherited entry and exit motion, then lets exit completion hide the element', () => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'animate',
  )
  const animations: Array<{
    cancel: ReturnType<typeof vi.fn>
    onfinish: (() => void) | null
  }> = []
  const animate = vi.fn(() => {
    const animation: {
      cancel: ReturnType<typeof vi.fn>
      onfinish: (() => void) | null
    } = { cancel: vi.fn(), onfinish: null }
    animations.push(animation)
    return animation
  })
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  })
  cleanups.push(() => {
    if (original)
      Object.defineProperty(HTMLElement.prototype, 'animate', original)
    else Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  })
  const f = setup(150, 150, true)
  f.move()
  expect(animate).not.toHaveBeenCalled()
  vi.advanceTimersByTime(150)
  expect(animate).toHaveBeenCalledOnce()
  f.lose()
  vi.advanceTimersByTime(149)
  expect(animate).toHaveBeenCalledOnce()
  vi.advanceTimersByTime(1)
  expect(animate).toHaveBeenCalledTimes(2)
  expect(f.visible()).toBe(true)
  animations.at(-1)?.onfinish?.()
  expect(f.visible()).toBe(false)
})
