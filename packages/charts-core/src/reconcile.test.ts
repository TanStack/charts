import { describe, expect, it, vi } from 'vitest'
import { reconcileChartSvg, reconcileChartSvgFragment } from './reconcile'

describe('keyed SVG reconciliation', () => {
  it.each([
    ['<tspan data-ts-key="a">old</tspan>', 'new'],
    ['old', '<tspan data-ts-key="a">new</tspan>'],
    [
      'before<tspan data-ts-key="a">old</tspan>after',
      'start<tspan data-ts-key="a">new</tspan>end',
    ],
  ])('updates structured text from %s to %s', (previous, next) => {
    const container = document.createElement('div')
    reconcileChartSvg(container, `<svg><text>${previous}</text></svg>`)
    const text = container.querySelector('text')!
    const child = text.querySelector('tspan')
    reconcileChartSvg(container, `<svg><text>${next}</text></svg>`)
    expect(container.querySelector('text')).toBe(text)
    expect(text.innerHTML).toBe(next)
    if (child && next.includes('<tspan'))
      expect(text.querySelector('tspan')).toBe(child)
  })

  it('preserves replacement text after an old child finishes exiting', () => {
    const frames: FrameRequestCallback[] = []
    const request = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    try {
      const container = document.createElement('div')
      reconcileChartSvg(container, '<svg><text><tspan>old</tspan></text></svg>')
      const text = container.querySelector('text')!
      const child = text.firstElementChild
      reconcileChartSvg(container, '<svg><text>new</text></svg>', {
        duration: 100,
        easing: 'linear',
      })
      expect(text.firstElementChild).toBe(child)
      frames.shift()?.(0)
      frames.shift()?.(100)
      expect(text.firstElementChild).toBeNull()
      expect(text.textContent).toBe('new')
    } finally {
      request.mockRestore()
      cancel.mockRestore()
    }
  })

  it.each([undefined, { duration: 0 }])(
    'removes obsolete duplicate keyed children with animation %s',
    (animation) => {
      const container = document.createElement('div')
      reconcileChartSvg(
        container,
        '<svg><g><rect data-ts-key="a" x="1"/><rect data-ts-key="a" x="2"/><circle data-ts-key="b" r="3"/></g></svg>',
      )
      const previous = [...container.querySelectorAll('rect')]
      const circle = container.querySelector('circle')
      reconcileChartSvg(
        container,
        '<svg><g><circle data-ts-key="b" r="4"/><rect data-ts-key="a" x="5"/></g></svg>',
        animation,
      )
      expect(container.querySelectorAll('rect')).toHaveLength(1)
      expect(container.querySelector('rect')?.getAttribute('x')).toBe('5')
      expect(previous.filter((node) => node.parentElement)).toHaveLength(1)
      expect(container.querySelector('circle')).toBe(circle)
      expect(circle?.getAttribute('r')).toBe('4')
      expect(
        [...container.querySelector('g')!.children].map(
          (node) => node.localName,
        ),
      ).toEqual(['circle', 'rect'])
    },
  )

  it('removes stale attributes and retains empty and qualified attributes', () => {
    const container = document.createElement('div')
    reconcileChartSvg(
      container,
      '<svg><use data-ts-key="a" x="10" stroke="red" aria-label="old" xlink:href="#old"/></svg>',
    )
    const element = container.querySelector('use')!
    reconcileChartSvg(
      container,
      '<svg><use data-ts-key="a" x="20" fill="" aria-label="" xlink:href="#new"/></svg>',
    )
    expect(container.querySelector('use')).toBe(element)
    expect(element.hasAttribute('stroke')).toBe(false)
    expect(element.getAttribute('x')).toBe('20')
    expect(element.getAttribute('fill')).toBe('')
    expect(element.getAttribute('aria-label')).toBe('')
    expect(element.getAttribute('xlink:href')).toBe('#new')
    expect(element.getAttributeNames().sort()).toEqual([
      'aria-label',
      'data-ts-key',
      'fill',
      'x',
      'xlink:href',
    ])
  })

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

  it('replaces a keyed gradient type without leaving duplicate ids', () => {
    const container = document.createElement('div')
    reconcileChartSvg(
      container,
      '<svg><defs><linearGradient data-ts-key="gradient:fill" id="fill"><stop offset="0%" stop-color="red"/></linearGradient></defs></svg>',
    )

    reconcileChartSvg(
      container,
      '<svg><defs><radialGradient data-ts-key="gradient:fill" id="fill"><stop offset="0%" stop-color="blue"/></radialGradient></defs></svg>',
      { duration: 100 },
    )

    expect(container.querySelector('linearGradient')).toBeNull()
    expect(
      container
        .querySelector('radialGradient stop')
        ?.getAttribute('stop-color'),
    ).toBe('blue')
    expect(container.querySelectorAll('[id="fill"]')).toHaveLength(1)
  })

  it('interpolates retained radial gradient focal coordinates', () => {
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
      '<svg><defs><radialGradient data-ts-key="gradient:fill" id="fill" fx="0%" fy="0%"/></defs></svg>',
    )
    const gradient = container.querySelector('radialGradient')

    reconcileChartSvg(
      container,
      '<svg><defs><radialGradient data-ts-key="gradient:fill" id="fill" fx="100%" fy="50%"/></defs></svg>',
      { duration: 100, easing: 'linear' },
    )

    expect(container.querySelector('radialGradient')).toBe(gradient)
    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(gradient?.getAttribute('fx')).toBe('50%')
    expect(gradient?.getAttribute('fy')).toBe('25%')
    callbacks.shift()?.(100)
    expect(gradient?.getAttribute('fx')).toBe('100%')
    expect(gradient?.getAttribute('fy')).toBe('50%')

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('keeps enter and exit fades for keyed tag switches outside defs', () => {
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
      '<svg><rect data-ts-key="shape" width="10" height="10"/></svg>',
    )

    reconcileChartSvg(
      container,
      '<svg><circle data-ts-key="shape" cx="5" cy="5" r="5"/></svg>',
      { duration: 100, easing: 'linear' },
    )

    const rectangle = container.querySelector('rect')
    const circle = container.querySelector('circle')
    expect(rectangle).not.toBeNull()
    expect(circle?.getAttribute('opacity')).toBe('0')
    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(rectangle?.getAttribute('opacity')).toBe('0.5')
    expect(circle?.getAttribute('opacity')).toBe('0.5')
    callbacks.shift()?.(100)
    expect(container.querySelector('rect')).toBeNull()
    expect(circle?.hasAttribute('opacity')).toBe(false)

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('reconciles one SVG fragment without touching sibling chart geometry', () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg"><g data-ts-key="marks"><path data-ts-key="series" d="M0,0L10,10"/></g><g data-ts-key="focus"><line data-ts-key="crosshair:x" x1="4" x2="4" y1="0" y2="10"/></g></svg>'
    const marks = container.querySelector<SVGGElement>('[data-ts-key="marks"]')
    const series = container.querySelector('[data-ts-key="series"]')
    const focus = container.querySelector<SVGGElement>('[data-ts-key="focus"]')
    const line = container.querySelector('[data-ts-key="crosshair:x"]')
    if (!focus) throw new Error('Expected an SVG focus fragment')

    reconcileChartSvgFragment(
      focus,
      '<g data-ts-key="focus"><line data-ts-key="crosshair:x" x1="8" x2="8" y1="0" y2="10"/><circle data-ts-key="crosshair:marker" cx="8" cy="6" r="3"/></g>',
    )

    expect(container.querySelector('[data-ts-key="marks"]')).toBe(marks)
    expect(container.querySelector('[data-ts-key="series"]')).toBe(series)
    expect(container.querySelector('[data-ts-key="crosshair:x"]')).toBe(line)
    expect(line?.getAttribute('x1')).toBe('8')
    expect(
      container.querySelector('[data-ts-key="crosshair:marker"]'),
    ).not.toBeNull()
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

  it('keeps SVG arc flags discrete while interpolating path geometry', () => {
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
      '<svg><path data-ts-key="arc" d="M 0 0 A 40 40 0 0 0 80 0"/></svg>',
    )
    const arc = container.querySelector('path')

    reconcileChartSvg(
      container,
      '<svg><path data-ts-key="arc" d="M 10 0 A 50 50 0 1 1 100 0"/></svg>',
      { duration: 100, easing: 'linear' },
    )

    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(arc?.getAttribute('d')).toBe('M 5 0 A 45 45 0 1 1 90 0')
    callbacks.shift()?.(100)
    expect(arc?.getAttribute('d')).toBe('M 10 0 A 50 50 0 1 1 100 0')

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('parses adjacent SVG arc flags as separate values', () => {
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
      '<svg><path data-ts-key="arc" d="M 0 0 A 40 40 0 00 80 0"/></svg>',
    )
    const arc = container.querySelector('path')

    reconcileChartSvg(
      container,
      '<svg><path data-ts-key="arc" d="M 10 0 A 50 50 0 01 100 0"/></svg>',
      { duration: 100, easing: 'linear' },
    )

    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(arc?.getAttribute('d')).toBe('M 5 0 A 45 45 0 01 90 0')
    callbacks.shift()?.(100)
    expect(arc?.getAttribute('d')).toBe('M 10 0 A 50 50 0 01 100 0')

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('interpolates numeric label typography and snaps categorical anchors', () => {
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
      '<svg><text data-ts-key="label" font-size="10" font-weight="400" text-anchor="middle">A</text></svg>',
    )
    const label = container.querySelector('text')

    reconcileChartSvg(
      container,
      '<svg><text data-ts-key="label" font-size="20" font-weight="700" text-anchor="start">A</text></svg>',
      { duration: 100, easing: 'linear' },
    )

    expect(label?.getAttribute('text-anchor')).toBe('start')
    expect(label?.getAttribute('font-size')).toBe('10')
    callbacks.shift()?.(0)
    callbacks.shift()?.(50)
    expect(Number(label?.getAttribute('font-size'))).toBeCloseTo(15)
    expect(Number(label?.getAttribute('font-weight'))).toBeCloseTo(550)
    callbacks.shift()?.(100)
    expect(label?.getAttribute('font-size')).toBe('20')
    expect(label?.getAttribute('font-weight')).toBe('700')

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

  it('continues an interrupted animation from painted geometry without stale writes', () => {
    const container = document.createElement('div')
    const callbacks = new Map<number, FrameRequestCallback>()
    let frame = 0
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frame++
        const handle = frame
        callbacks.set(handle, (time) => {
          callbacks.delete(handle)
          callback(time)
        })
        return frame
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle) => {
        if (typeof handle === 'number') callbacks.delete(handle)
      })
    reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="0" y="0" width="10" height="10"/></svg>',
    )
    const rectangle = container.querySelector('[data-ts-key="a"]')

    const cancelFirst = reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="100" y="0" width="10" height="10"/></svg>',
      { duration: 100, easing: 'linear' },
    )
    callbacks.get(1)?.(0)
    callbacks.get(2)?.(40)
    expect(Number(rectangle?.getAttribute('x'))).toBeCloseTo(40)

    cancelFirst()
    const cancelSecond = reconcileChartSvg(
      container,
      '<svg><rect data-ts-key="a" x="200" y="0" width="10" height="10"/></svg>',
      { duration: 100, easing: 'linear' },
    )

    expect(container.querySelector('[data-ts-key="a"]')).toBe(rectangle)
    expect(Number(rectangle?.getAttribute('x'))).toBeCloseTo(40)
    callbacks.get(4)?.(40)
    callbacks.get(5)?.(90)
    expect(Number(rectangle?.getAttribute('x'))).toBeCloseTo(120)
    callbacks.get(6)?.(140)
    expect(rectangle?.getAttribute('x')).toBe('200')

    cancelSecond()
    expect(callbacks.size).toBe(0)
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })
})
