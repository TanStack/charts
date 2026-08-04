import { describe, expect, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { crosshair } from './crosshair'
import { dot } from './dot'
import { renderChartImage, serializeChartSvg } from './export'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { renderChartSvgWithResources } from './svg-resources'
import { svgChartRenderer } from './svg-surface'
import { linearAxes } from './test-scales'

describe('optional export', () => {
  it('serializes a self-contained sized SVG without interaction chrome', () => {
    const container = document.createElement('div')
    container.innerHTML = renderChartSvg(
      createChartScene(
        defineChart({
          marks: [
            lineY([1, 3, 2], {
              stroke: 'currentColor',
            }),
          ],
          ...linearAxes([0, 2], [0, 3]),
        }),
        { width: 480, height: 260 },
      ),
      { ariaLabel: 'Exported chart' },
    )

    const result = serializeChartSvg(container)

    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(result).toContain('width="480"')
    expect(result).toContain('height="260"')
    expect(result).toContain('aria-label="Exported chart"')
    expect(result).not.toContain('data-ts-focus-layer')
  })

  it('inlines computed presentation for gradient stops', () => {
    const container = document.createElement('div')
    container.innerHTML = renderChartSvgWithResources(
      createChartScene(
        defineChart({
          marks: [
            lineY([1, 3, 2], {
              stroke: 'url(#trend)',
            }),
          ],
          ...linearAxes([0, 2], [0, 3]),
          gradients: [
            {
              id: 'trend',
              stops: [
                { offset: 0, color: 'var(--trend-start)' },
                { offset: 1, color: 'var(--trend-end)' },
              ],
            },
          ],
        }),
        { width: 480, height: 260 },
      ),
      { ariaLabel: 'Gradient export' },
    )
    const firstStop = container.querySelector('stop')
    expect(firstStop).not.toBeNull()
    firstStop!.style.setProperty('stop-opacity', 'var(--trend-opacity)')
    const readStyle = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element) => {
        const propertyValues: Record<string, string> =
          element === firstStop
            ? {
                'stop-color': 'rgb(37, 99, 235)',
                'stop-opacity': '0.35',
              }
            : {}
        return {
          getPropertyValue(property: string) {
            return propertyValues[property] ?? ''
          },
        } as CSSStyleDeclaration
      })

    const result = serializeChartSvg(container)

    expect(result).toContain('stop-color="rgb(37, 99, 235)"')
    expect(result).toContain('stop-opacity="0.35"')
    readStyle.mockRestore()
  })

  it('includes the currently painted crosshair only when requested', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          dot([{ x: 1, y: 2 }], { x: 'x', y: 'y' }),
          crosshair({ marker: true }),
        ],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 4]) },
        guides: false,
      }),
      { width: 300, height: 180 },
    )
    const point = scene.points[0]
    if (!point) throw new Error('Expected an export focus point')
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Focused export' })
    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'programmatic',
      pinned: true,
    })

    expect(serializeChartSvg(container)).not.toContain('ts-chart__crosshair')
    const focused = serializeChartSvg(container, { includeFocus: true })
    expect(focused).toContain('ts-chart__crosshair')
    expect(focused).toContain(`${point.x}`)
    expect(focused).toContain(`${point.y}`)
    surface.destroy()
  })

  it('exports Canvas background, underlay, scene, and overlay in compositing order', async () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<div class="ts-chart ts-chart-canvas" data-ts-chart-width="400" data-ts-chart-height="200" data-ts-chart-pixel-ratio="2"><canvas class="ts-chart-canvas__background" width="800" height="400"></canvas><canvas class="ts-chart-canvas__focus-under" width="800" height="400"></canvas><canvas class="ts-chart-canvas__scene" width="800" height="400"></canvas><canvas class="ts-chart-canvas__focus" width="800" height="400"></canvas><canvas class="ts-chart-canvas__base" width="800" height="400"></canvas></div>'
    const drawImage = vi.fn()
    let output: HTMLCanvasElement | undefined
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function (this: HTMLCanvasElement) {
        output = this
        return {
          scale: vi.fn(),
          fillRect: vi.fn(),
          drawImage,
        } as unknown as CanvasRenderingContext2D
      })
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (callback) {
        callback(new Blob(['canvas'], { type: 'image/png' }))
      })

    const blob = await renderChartImage(container, {
      scale: 1.5,
      includeFocus: true,
    })

    expect(blob.type).toBe('image/png')
    expect(output?.width).toBe(600)
    expect(output?.height).toBe(300)
    expect(drawImage).toHaveBeenCalledTimes(4)
    expect(drawImage.mock.calls[0]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__background'),
    )
    expect(drawImage.mock.calls[1]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__focus-under'),
    )
    expect(drawImage.mock.calls[2]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__scene'),
    )
    expect(drawImage.mock.calls[3]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__focus'),
    )

    drawImage.mockClear()
    await renderChartImage(container, { scale: 1 })
    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(drawImage.mock.calls[0]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__base'),
    )
    getContext.mockRestore()
    toBlob.mockRestore()
  })
})
