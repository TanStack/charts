import { describe, expect, it, vi } from 'vitest'
import { createChartController } from './controller'
import type { ChartEnvironment, ChartRenderContext, ChartSize } from './types'

class ManualResizeObserver {
  static latest: ManualResizeObserver | undefined
  readonly callback: ResizeObserverCallback
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ManualResizeObserver.latest = this
  }

  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

class ManualMutationObserver {
  static latest: ManualMutationObserver | undefined
  readonly callback: MutationCallback
  disconnected = false

  constructor(callback: MutationCallback) {
    this.callback = callback
    ManualMutationObserver.latest = this
  }

  observe() {}
  takeRecords() {
    return []
  }
  disconnect() {
    this.disconnected = true
  }

  trigger() {
    this.callback([], this as unknown as MutationObserver)
  }
}

function createEnvironment(size: ChartSize) {
  let measured = size
  let nextFrame = 0
  const frames = new Map<number, FrameRequestCallback>()

  const environment: ChartEnvironment = {
    ResizeObserver: ManualResizeObserver as unknown as typeof ResizeObserver,
    MutationObserver:
      ManualMutationObserver as unknown as typeof MutationObserver,
    measure: () => measured,
    requestAnimationFrame(callback) {
      nextFrame += 1
      frames.set(nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame(handle) {
      frames.delete(handle)
    },
    getComputedStyle: (element) =>
      element.ownerDocument.defaultView!.getComputedStyle(element),
    matchMedia: () =>
      ({
        matches: false,
        media: '',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
    now: () => 10,
  }

  return {
    environment,
    setSize(size: ChartSize) {
      measured = size
    },
    flushFrame() {
      const pending = [...frames.entries()]
      frames.clear()
      for (const [, callback] of pending) callback(10)
    },
    get pendingFrames() {
      return frames.size
    },
  }
}

describe('createChartController', () => {
  it('renders synchronously at the measured container size', () => {
    const container = document.createElement('div')
    const harness = createEnvironment({ width: 640, height: 320 })
    const contexts: Array<ChartRenderContext<string>> = []

    const controller = createChartController(container, {
      data: 'first',
      environment: harness.environment,
      renderer(context) {
        contexts.push(context)
        return { element: document.createElement('svg') }
      },
    })

    expect(controller.renderCount).toBe(1)
    expect(controller.size).toEqual({ width: 640, height: 320 })
    expect(container.firstElementChild?.tagName).toBe('SVG')
    expect(contexts[0]).toMatchObject({
      data: 'first',
      width: 640,
      height: 320,
    })

    controller.destroy()
  })

  it('waits for a hidden container and coalesces resize work', () => {
    const container = document.createElement('div')
    const harness = createEnvironment({ width: 0, height: 0 })
    const render = vi.fn(() => ({
      element: document.createElement('svg'),
    }))

    const controller = createChartController(container, {
      data: [],
      environment: harness.environment,
      renderer: render,
    })

    expect(controller.renderCount).toBe(0)

    harness.setSize({ width: 480, height: 240 })
    ManualResizeObserver.latest?.trigger()
    ManualResizeObserver.latest?.trigger()
    ManualResizeObserver.latest?.trigger()

    expect(harness.pendingFrames).toBe(1)
    harness.flushFrame()
    expect(render).toHaveBeenCalledOnce()
    expect(controller.size).toEqual({ width: 480, height: 240 })

    controller.destroy()
  })

  it('replaces renders, forwards values, and cleans up deterministically', () => {
    const container = document.createElement('div')
    const harness = createEnvironment({ width: 600, height: 300 })
    const unsubscribe = vi.fn()
    const destroyRender = vi.fn()
    const onValueChange = vi.fn()
    let notify: ((value: string | undefined) => void) | undefined

    const controller = createChartController<string, string>(container, {
      data: 'first',
      environment: harness.environment,
      onValueChange,
      renderer() {
        return {
          element: document.createElement('div'),
          destroy: destroyRender,
          subscribeValue(listener) {
            notify = listener
            return unsubscribe
          },
        }
      },
    })

    notify?.('selected')
    expect(onValueChange).toHaveBeenCalledWith('selected')

    controller.update({ data: 'second' })
    harness.flushFrame()
    expect(controller.renderCount).toBe(2)
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(destroyRender).toHaveBeenCalledOnce()

    controller.destroy()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
    expect(destroyRender).toHaveBeenCalledTimes(2)
    expect(ManualResizeObserver.latest?.disconnected).toBe(true)
    expect(ManualMutationObserver.latest?.disconnected).toBe(true)
    expect(container.childElementCount).toBe(0)
  })

  it('updates a stateful render result without replacing its host element', () => {
    const container = document.createElement('div')
    const harness = createEnvironment({ width: 600, height: 300 })
    const surface = document.createElement('div')
    const update = vi.fn()
    const destroy = vi.fn()
    const renderer = vi.fn(() => ({
      element: surface,
      update,
      destroy,
    }))

    const controller = createChartController(container, {
      data: 'first',
      environment: harness.environment,
      renderer,
    })

    controller.update({ data: 'second' })
    harness.flushFrame()

    expect(renderer).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledOnce()
    expect(update.mock.calls[0]?.[0]).toMatchObject({ data: 'second' })
    expect(update.mock.calls[0]?.[1]).toEqual({ reason: 'update' })
    expect(container.firstElementChild).toBe(surface)
    expect(destroy).not.toHaveBeenCalled()

    controller.destroy()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('resolves the nearest theme and rerenders only when it changes', () => {
    const parent = document.createElement('section')
    const container = document.createElement('div')
    parent.append(container)
    parent.dataset.theme = 'dark'
    const harness = createEnvironment({ width: 600, height: 300 })
    const modes: string[] = []

    const controller = createChartController(container, {
      data: [],
      environment: harness.environment,
      renderer(context) {
        modes.push(context.theme.mode)
        return { element: document.createElement('svg') }
      },
    })

    expect(modes).toEqual(['dark'])
    expect(container.dataset.tsPlotResolvedTheme).toBe('dark')

    parent.dataset.theme = 'light'
    ManualMutationObserver.latest?.trigger()
    harness.flushFrame()

    expect(modes).toEqual(['dark', 'light'])
    expect(container.dataset.tsPlotResolvedTheme).toBe('light')

    ManualMutationObserver.latest?.trigger()
    harness.flushFrame()
    expect(modes).toHaveLength(2)

    controller.destroy()
  })

  it('does not rerender for callbacks or structurally equal sizing', () => {
    const container = document.createElement('div')
    const harness = createEnvironment({ width: 600, height: 300 })
    const render = vi.fn(() => ({
      element: document.createElement('svg'),
    }))
    const controller = createChartController(container, {
      data: [],
      environment: harness.environment,
      renderer: render,
      sizing: { height: 300 },
      initialSize: { width: 600, height: 300 },
    })

    controller.update({
      onValueChange: vi.fn(),
      onRender: vi.fn(),
      sizing: { height: 300 },
      initialSize: { width: 600, height: 300 },
    })
    expect(harness.pendingFrames).toBe(0)
    expect(render).toHaveBeenCalledOnce()

    controller.destroy()
  })
})
