import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { dot } from './dot'
import { createChartScene, defineChart } from './scene'
import { svgChartRenderer } from './svg-surface'

describe('SVG surface coordinates', () => {
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
    const resolved = surface.clientToScene(
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

    expect(surface.clientToScene(scene, 170, 140)).toEqual({ x: 320, y: 240 })

    surface.destroy()
  })
})
