import { describe, expect, it, vi } from 'vitest'
import { serializeChartSvg } from './export'
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
    expect(result).not.toContain('data-ts-chart-focus')
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
})
