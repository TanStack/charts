import { createSSRApp, h, nextTick, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
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

describe('Vue adapter', () => {
  it('server-renders complete SVG', async () => {
    const app = createSSRApp({
      render: () =>
        h(Chart, {
          definition,
          width: 480,
          height: 260,
          ariaLabel: 'Revenue',
          className: 'revenue-surface',
        }),
    })
    const html = await renderToString(app)

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('class="ts-chart revenue-surface"')
  })

  it('mounts and cleans up the shared host', async () => {
    const target = document.createElement('div')
    const label = ref('Revenue')
    const app = createSSRApp({
      render: () =>
        h(Chart, {
          definition,
          width: 480,
          height: 260,
          ariaLabel: label.value,
          className: 'revenue-surface',
        }),
    })

    app.mount(target)
    await nextTick()
    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('revenue-surface')).toBe(true)
    label.value = 'Updated revenue'
    await nextTick()
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    app.unmount()
    expect(target.childElementCount).toBe(0)
  })
})
