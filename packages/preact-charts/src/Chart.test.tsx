/** @jsxImportSource preact */
import { render } from 'preact'
import renderToString from 'preact-render-to-string'
import { describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

describe('Preact adapter', () => {
  it('server-renders complete SVG', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
    )

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Revenue"')
  })

  it('mounts and cleans up the shared host', () => {
    const target = document.createElement('div')
    render(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
      target,
    )

    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    render(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Updated revenue"
      />,
      target,
    )
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    render(null, target)
    expect(target.childElementCount).toBe(0)
  })
})
