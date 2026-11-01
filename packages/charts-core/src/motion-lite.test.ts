import { afterEach, describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import { createChartScene, defineChart } from './scene'
import { motionLite } from './motion-lite'
import { createSvgChartRenderer } from './svg-surface'

const renderOptions = { ariaLabel: 'Values' }
const scene = (value: number, width = 400) =>
  createChartScene(
    defineChart({
      guides: false,
      marks: [
        barY([{ id: 'a', x: 'a', y: value }], { key: 'id', x: 'x', y: 'y' }),
      ],
      scales: {
        x: { scale: scaleBand().domain(['a']) },
        y: { scale: scaleLinear().domain([0, 10]) },
      },
    }),
    { width, height: 200 },
  )

afterEach(() => vi.unstubAllGlobals())

describe('lightweight motion', () => {
  it('continues the same entrance across updates and cancels on immediate resize', () => {
    const previous = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'animate',
    )
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }))
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: animate,
    })
    const container = document.createElement('div')
    const surface = motionLite({ duration: 100, easing: 'linear' }).mount(
      container,
      () => {},
    )
    try {
      surface.render(scene(2), renderOptions)
      expect(animate).toHaveBeenCalledOnce()
      expect(animate.mock.calls[0]).toBeDefined()
      surface.render(scene(4), renderOptions)
      expect(animate).toHaveBeenCalledOnce()
      expect(cancel).not.toHaveBeenCalled()
      surface.render(scene(4, 500), renderOptions)
      expect(cancel).toHaveBeenCalledOnce()
    } finally {
      surface.destroy()
      if (previous)
        Object.defineProperty(Element.prototype, 'animate', previous)
      else Reflect.deleteProperty(Element.prototype, 'animate')
    }
  })

  it('renders and updates when Web Animations is unavailable', () => {
    const container = document.createElement('div')
    const surface = motionLite().mount(container, () => {})
    expect(() => surface.render(scene(2), renderOptions)).not.toThrow()
    expect(() => surface.render(scene(4), renderOptions)).not.toThrow()
    surface.destroy()
  })

  it.each([-1, NaN, Infinity])('rejects invalid duration %s', (duration) => {
    expect(() => motionLite({ duration })).toThrow(RangeError)
  })

  it('keeps server output identical to static SVG and has no tooltip motion capability', () => {
    const renderer = motionLite()
    expect(renderer.prerender(scene(2), renderOptions)).toBe(
      createSvgChartRenderer().prerender(scene(2), renderOptions),
    )
    expect(renderer.capabilities).toBeUndefined()
  })

  it.each([false, true])(
    'adopts existing SVG without an entrance, initial: %s',
    (initial) => {
      const container = document.createElement('div')
      const renderer = motionLite({ initial })
      container.innerHTML = renderer.prerender(scene(2), renderOptions)
      const element = container.firstElementChild!
      const animate = vi.fn()
      Object.defineProperty(element, 'animate', { value: animate })
      const surface = renderer.mount(container, () => {})
      surface.render(scene(2), renderOptions)
      expect(surface.element).toBe(element)
      expect(animate).not.toHaveBeenCalled()
      surface.destroy()
    },
  )

  it.each([false, true])(
    'retargets from painted geometry and handles resize: %s',
    (resize) => {
      const callbacks = new Map<number, FrameRequestCallback>()
      let id = 0
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
        callbacks.set(++id, fn)
        return id
      })
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(
        (key) => key != null && callbacks.delete(key),
      )
      const tick = (time: number) => {
        const pending = [...callbacks.values()]
        callbacks.clear()
        pending.forEach((fn) => fn(time))
      }
      const container = document.createElement('div')
      const surface = motionLite({
        initial: false,
        duration: 100,
        easing: 'linear',
        resize,
      }).mount(container, () => {})
      surface.render(scene(2), renderOptions)
      const bar = container.querySelector('rect')!
      const height = () => Number(bar.getAttribute('height'))
      const first = height()
      surface.render(scene(8), renderOptions)
      tick(0)
      tick(50)
      expect(height()).toBeCloseTo(first * 2.5)
      const midway = height()
      surface.render(scene(4), renderOptions)
      expect(height()).toBe(midway)
      tick(60)
      tick(160)
      expect(height()).toBeCloseTo(first * 2)
      surface.render(scene(9, 500), renderOptions)
      expect(height()).toBeCloseTo(first * (resize ? 2 : 4.5))
      tick(170)
      tick(270)
      expect(height()).toBeCloseTo(first * 4.5)
      surface.render(scene(1, 500), renderOptions)
      tick(280)
      tick(300)
      surface.destroy()
      expect(callbacks.size).toBe(0)
      const stopped = height()
      tick(500)
      expect(height()).toBe(stopped)
    },
  )

  it('snaps reduced-motion updates and ignores conflicting host animation', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    const container = document.createElement('div')
    const surface = motionLite().mount(container, () => {})
    surface.render(scene(2), renderOptions)
    const first = Number(
      container.querySelector('rect')!.getAttribute('height'),
    )
    surface.render(scene(8), {
      ...renderOptions,
      animation: { duration: 1000 },
    })
    expect(
      Number(container.querySelector('rect')!.getAttribute('height')),
    ).toBe(first * 4)
    expect(frame).not.toHaveBeenCalled()
    surface.destroy()
  })

  it('treats duration zero as immediate and works without Web Animations', () => {
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    const container = document.createElement('div')
    const surface = motionLite({ duration: 0 }).mount(container, () => {})
    surface.render(scene(2), renderOptions)
    surface.render(scene(8), renderOptions)
    expect(container.querySelector('rect')!.getAttribute('height')).toBe('160')
    expect(frame).not.toHaveBeenCalled()
    surface.destroy()
  })
})
