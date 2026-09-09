import { createChartScene } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { catalogCase, createExampleChart, mount } from './tanstack'

describe('shadcn pie legend', () => {
  it('keeps the drawn legend decorative and exposes an accessible list', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 640,
      height: 600,
      revision: 0,
      interactive: true,
      preview: false,
    })

    try {
      const legend = container.querySelector('[aria-label="Browser legend"]')
      const drawnLegend = container.querySelector('.ts-chart__legend')

      expect(legend?.tagName).toBe('UL')
      expect(
        [...(legend?.querySelectorAll('li') ?? [])].map(
          (item) => item.textContent,
        ),
      ).toEqual(['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'])
      expect(drawnLegend?.getAttribute('aria-hidden')).toBe('true')
    } finally {
      handle.destroy()
      container.remove()
    }
  })

  it('reserves a bottom margin for the native legend', () => {
    const scene = createChartScene(createExampleChart(), {
      width: 250,
      height: 250,
    })
    const legend = scene.nodes.find(
      (node) => node.kind === 'group' && node.key === 'legend',
    )
    if (legend?.kind !== 'group') throw new Error('Expected a legend group')
    const indicators = legend.children.filter((node) => node.kind === 'rect')

    expect(indicators).toHaveLength(5)
    expect(Math.min(...indicators.map(({ y }) => y))).toBeGreaterThanOrEqual(
      scene.chart.y + scene.chart.height,
    )
  })

  it('retains the native legend in catalog previews', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = catalogCase(container, {
      width: 288,
      height: 192,
      revision: 0,
      interactive: false,
      preview: true,
    })

    try {
      expect(container.querySelectorAll('.ts-chart__legend')).toHaveLength(1)
      expect(
        container.querySelectorAll('[data-ts-key^="legend-square:"]'),
      ).toHaveLength(5)
    } finally {
      handle.destroy()
      container.remove()
    }
  })
})
