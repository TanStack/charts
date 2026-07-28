import { describe, expect, it, vi } from 'vitest'
import { reconcileChartSvg } from './reconcile'

describe('keyed SVG reconciliation', () => {
  it('retains keyed elements while updating geometry', () => {
    const container = document.createElement('div')
    reconcileChartSvg(
      container,
      '<svg><g data-ts-key="marks"><rect data-ts-key="a" x="0" y="4" width="8" height="12"/></g></svg>',
    )
    const svg = container.querySelector('svg')
    const rectangle = container.querySelector('[data-ts-key="a"]')

    reconcileChartSvg(
      container,
      '<svg><g data-ts-key="marks"><rect data-ts-key="a" x="20" y="2" width="12" height="16"/><circle data-ts-key="b" cx="4" cy="4" r="2"/></g></svg>',
    )

    expect(container.querySelector('svg')).toBe(svg)
    expect(container.querySelector('[data-ts-key="a"]')).toBe(rectangle)
    expect(rectangle?.getAttribute('x')).toBe('20')
    expect(container.querySelector('[data-ts-key="b"]')).not.toBeNull()
  })

  it('interpolates retained geometry without hiding it', () => {
    const container = document.createElement('div')
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
    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="0" y="0" width="10" height="10"/></svg>',
    )
    const rectangle = container.querySelector('[data-ts-key="a"]')

    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="100" y="20" width="20" height="30"/></svg>',
      { duration: 100, easing: 'linear' },
    )

    expect(rectangle?.getAttribute('x')).toBe('0')
    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(Number(rectangle?.getAttribute('x'))).toBeCloseTo(50)
    expect(Number(rectangle?.getAttribute('width'))).toBeCloseTo(15)
    callbacks.shift()?.(100)
    expect(rectangle?.getAttribute('x')).toBe('100')
    expect(rectangle?.getAttribute('height')).toBe('30')

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('fades removed keyed elements before removing them', () => {
    const container = document.createElement('div')
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
    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="0" y="0" width="10" height="10"/></svg>',
    )

    reconcileChartSvg(container, '<svg><g data-ts-key="empty"></g></svg>', {
      duration: 100,
      easing: 'linear',
    })
    const rectangle = container.querySelector('[data-ts-key="a"]')

    expect(rectangle).not.toBeNull()
    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(Number(rectangle?.getAttribute('opacity'))).toBeCloseTo(0.5)
    callbacks.shift()?.(100)
    expect(container.querySelector('[data-ts-key="a"]')).toBeNull()

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('accepts a custom easing function', () => {
    const container = document.createElement('div')
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
    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="0" y="0" width="10" height="10"/></svg>',
    )

    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="100" y="0" width="10" height="10"/></svg>',
      { duration: 100, easing: (progress) => progress * progress },
    )

    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(Number(container.querySelector('rect')?.getAttribute('x'))).toBe(25)

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })
})
