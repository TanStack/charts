import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import Chart from '../src/Chart.svelte'

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

describe('Svelte adapter SSR', () => {
  it('server-renders complete SVG', () => {
    const { body } = render(Chart, {
      props: {
        definition,
        width: 480,
        height: 260,
        ariaLabel: 'Revenue',
      },
    })

    expect(body).toContain('class="ts-chart-host"')
    expect(body).toContain('<svg')
    expect(body).toContain('aria-label="Revenue"')
  })
})
