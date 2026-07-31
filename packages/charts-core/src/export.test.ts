import { describe, expect, it, vi } from 'vitest'
import { renderChartImage, serializeChartSvg } from './export'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { renderChartSvgWithResources } from './svg-resources'
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

  it('exports Canvas scene and optional focus layers through the raster API', async () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<div class="ts-chart ts-chart-canvas" data-ts-chart-width="400" data-ts-chart-height="200" data-ts-chart-pixel-ratio="2"><canvas class="ts-chart-canvas__focus-under" width="800" height="400"></canvas><canvas class="ts-chart-canvas__scene" width="800" height="400"></canvas><canvas class="ts-chart-canvas__focus" width="800" height="400"></canvas></div>'
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
    expect(drawImage).toHaveBeenCalledTimes(3)
    expect(drawImage.mock.calls[0]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__focus-under'),
    )
    expect(drawImage.mock.calls[1]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__scene'),
    )
    expect(drawImage.mock.calls[2]?.[0]).toBe(
      container.querySelector('.ts-chart-canvas__focus'),
    )
    getContext.mockRestore()
    toBlob.mockRestore()
  })
})
