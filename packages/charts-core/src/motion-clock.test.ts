import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import { motion } from './motion'
import { createChartScene, defineChart } from './scene'

describe('motion run clock', () => {
  it.each([
    { firstFrame: 900, delay: 0, observedAt: 1500 },
    { firstFrame: 1250, delay: 0, observedAt: 1500 },
    { firstFrame: 900, delay: 100, observedAt: 1600 },
  ])(
    'measures elapsed time from scheduling: %j',
    ({ firstFrame, delay, observedAt }) => {
      const callbacks = new Map<number, FrameRequestCallback>()
      let handle = 0
      const now = vi.spyOn(window.performance, 'now').mockReturnValue(1000)
      const request = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(function (this: Window, callback) {
          expect(this).toBe(window)
          callbacks.set(++handle, callback)
          return handle
        })
      const cancel = vi
        .spyOn(window, 'cancelAnimationFrame')
        .mockImplementation(function (this: Window, id) {
          expect(this).toBe(window)
          if (id !== null && id !== undefined) callbacks.delete(id)
        })
      const container = document.createElement('div')
      const surface = motion({
        transition: { type: 'tween', duration: 1000, easing: 'linear' },
      }).mount(container, () => {})
      const scene = createChartScene(
        defineChart({
          marks: [
            barY([{ category: 'A', value: 100 }], {
              x: 'category',
              y: 'value',
              motion: { delay },
            }),
          ],
          scales: {
            x: { scale: scaleBand },
            y: { scale: scaleLinear().domain([0, 100]) },
          },
          guides: false,
          margin: 0,
        }),
        { width: 300, height: 200 },
      )
      const frame = (time: number) => {
        const pending = [...callbacks.values()]
        callbacks.clear()
        expect(pending).not.toHaveLength(0)
        pending.forEach((callback) => callback(time))
      }
      try {
        surface.render(scene, { ariaLabel: 'Scheduled motion' })
        frame(firstFrame)
        const bar = container.querySelector('rect')!
        if (firstFrame < 1000 + delay)
          expect(Number(bar.getAttribute('height'))).toBe(0)
        frame(observedAt)
        expect(Number(bar.getAttribute('height'))).toBeCloseTo(100)
        frame(2000 + delay)
        expect(Number(bar.getAttribute('height'))).toBe(200)
        expect(container.querySelector('svg')!.dataset.tsMotionState).toBe(
          'finished',
        )
      } finally {
        surface.destroy()
        now.mockRestore()
        request.mockRestore()
        cancel.mockRestore()
      }
    },
  )
})
