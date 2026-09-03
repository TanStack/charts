/** @jsxImportSource solid-js */
import { renderToString } from 'solid-js/web'
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
  scales: {
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  },
})

describe('Solid adapter SSR', () => {
  it('server-renders complete SVG', () => {
    const html = renderToString(() => (
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />
    ))

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Revenue"')
  })
})
