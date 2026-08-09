import { renderToString } from 'octane/server'
import { describe, expect, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/octane/canvas'
import { scaleLinear } from 'd3-scale'

const data = [
  { id: 'jan', month: 1, value: 8 },
  { id: 'feb', month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
  guides: false,
})

describe('Octane Canvas adapter', () => {
  it('server-renders an accessible Canvas shell without Canvas APIs or SVG', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    function ServerChart() {
      return (
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          ariaDescription="Monthly revenue"
          tabIndex={4}
        />
      )
    }

    const { html } = renderToString(ServerChart)

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('class="ts-chart ts-chart-canvas"')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('aria-description="Monthly revenue"')
    expect(html).toContain('tabindex="4"')
    expect(html).toContain('ts-chart-canvas__background')
    expect(html).toContain('ts-chart-canvas__scene')
    expect(html).toContain('ts-chart-canvas__focus')
    expect(html).toContain('ts-chart-canvas__base')
    expect(html).toContain('<canvas')
    expect(html).not.toContain('<svg')
    expect(getContext).not.toHaveBeenCalled()
    getContext.mockRestore()
  })
})
