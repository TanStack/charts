import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { dot } from './dot'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { svgChartRenderer } from './svg-surface'

describe('SVG surface coordinates', () => {
  it('mounts viewport content with the fixed authored plot clip', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { x: 0, y: 0 },
              { x: 10, y: 1 },
              { x: 20, y: 2 },
              { x: 30, y: 3 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        x: {
          scale: scaleLinear().domain([0, 30]),
          viewport: { domain: [10, 20], translate: 32 },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
      }),
      { width: 640, height: 320 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, {
      ariaLabel: 'Clipped history',
      idPrefix: 'viewport',
    })

    const marks = container.querySelector<SVGGElement>('g.ts-chart__marks')
    const content = marks?.querySelector<SVGGElement>(
      'g.ts-chart__viewport-content',
    )
    const viewportClip = marks?.querySelector<SVGGElement>(
      'g.ts-chart__viewport-clip',
    )
    const clip = viewportClip?.querySelector('clipPath rect')
    expect(marks?.getAttribute('clip-path')).toBeNull()
    expect(viewportClip?.getAttribute('clip-path')).toMatch(
      /^url\(#viewport-ts-chart-clip-/,
    )
    expect(content?.getAttribute('transform')).toBe('translate(32 0)')
    expect(Number(clip?.getAttribute('x'))).toBeCloseTo(scene.chart.x)
    expect(Number(clip?.getAttribute('width'))).toBeCloseTo(scene.chart.width)

    surface.destroy()
  })

  it('applies viewport translation revisions without generic interpolation', () => {
    const definition = (translate: number) =>
      defineChart({
        marks: [
          lineY(
            [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        x: {
          scale: scaleLinear().domain([0, 2]),
          viewport: { domain: [0.5, 1.5], translate },
        },
        y: { scale: scaleLinear().domain([0, 2]) },
        guides: false,
      })
    const scene = (translate: number) =>
      createChartScene(definition(translate), { width: 480, height: 260 })
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene(0), { ariaLabel: 'Viewport animation' })
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    surface.render(scene(40), {
      ariaLabel: 'Viewport animation',
      animation: { duration: 120 },
    })

    expect(requestFrame).not.toHaveBeenCalled()
    expect(
      container
        .querySelector('g.ts-chart__viewport-content')
        ?.getAttribute('transform'),
    ).toBe('translate(40 0)')
    requestFrame.mockRestore()
    surface.destroy()
  })

  it('maps client coordinates through the rendered SVG transform', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]) },
        margin: 0,
      }),
      { width: 640, height: 480 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Coordinate mapping' })

    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected an SVG chart surface')

    const left = 29
    const top = 277.8828125
    const renderedWidth = 604
    const renderedHeight = 480
    const scale = renderedWidth / scene.width
    const verticalInset = (renderedHeight - scene.height * scale) / 2

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({
        x: left,
        y: top,
        width: renderedWidth,
        height: renderedHeight,
      }),
    )
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => ({
        inverse: () => ({
          a: 1 / scale,
          b: 0,
          c: 0,
          d: 1 / scale,
          e: -left / scale,
          f: -(top + verticalInset) / scale,
        }),
      })),
    })

    const expected = { x: 603.84, y: 28.76 }
    const resolved = surface.clientToScene?.(
      scene,
      left + expected.x * scale,
      top + verticalInset + expected.y * scale,
    )

    expect(resolved?.x).toBeCloseTo(expected.x)
    expect(resolved?.y).toBeCloseTo(expected.y)

    surface.destroy()
  })

  it('falls back to bounds when the DOM has no SVG screen matrix', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]) },
        margin: 0,
      }),
      { width: 640, height: 480 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Fallback coordinate mapping' })

    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected an SVG chart surface')

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 10, y: 20, width: 320, height: 240 }),
    )
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => null),
    })

    expect(surface.clientToScene?.(scene, 170, 140)).toEqual({
      x: 320,
      y: 240,
    })

    surface.destroy()
  })
})
