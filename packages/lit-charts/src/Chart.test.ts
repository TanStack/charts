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

describe('Lit adapter', () => {
  it('mounts, updates, and reconnects the shared host', async () => {
    const tagName = `tanstack-chart-test-${Math.random().toString(36).slice(2)}`
    customElements.define(tagName, Chart)
    const chart = document.createElement(tagName) as Chart<
      (typeof rows)[number]
    >
    chart.options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    }

    document.body.append(chart)
    await chart.updateComplete
    expect(chart.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Revenue',
    )

    chart.options = { ...chart.options, ariaLabel: 'Updated revenue' }
    await chart.updateComplete
    expect(chart.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Updated revenue',
    )

    chart.remove()
    document.body.append(chart)
    await chart.updateComplete
    expect(chart.querySelector('svg')).not.toBeNull()
    chart.remove()
  })
})
