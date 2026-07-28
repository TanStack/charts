import { describe, expect, it } from 'vitest'
import { serializeChartSvg } from './export'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
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
})
