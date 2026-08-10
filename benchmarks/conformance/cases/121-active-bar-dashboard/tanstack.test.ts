import { describe, expect, it } from 'vitest'
import { createChartScene } from '@tanstack/charts'
import { activeBarDashboardDefinition } from './chart'
import { dashboardRows, metricTotal } from './model'
import { mount } from './view'

const input = {
  width: 480,
  height: 320,
  revision: 0,
  interactive: true,
  preview: false,
}

describe('active bar dashboard', () => {
  it('keeps the KPI controls and bar definition on the same keyed rows', () => {
    const rows = dashboardRows(0)
    const desktop = createChartScene(
      activeBarDashboardDefinition(input, 'desktop'),
      input,
    )
    const mobile = createChartScene(
      activeBarDashboardDefinition(input, 'mobile'),
      input,
    )

    expect(desktop.points).toHaveLength(24)
    expect(mobile.points).toHaveLength(24)
    expect(desktop.points.map((point) => point.key)).toEqual(
      mobile.points.map((point) => point.key),
    )
    expect(metricTotal(rows, 'desktop')).toBe(5936)
    expect(metricTotal(rows, 'mobile')).toBe(4266)
    expect(metricTotal(dashboardRows(1), 'mobile')).toBe(4208)
    expect(dashboardRows(1).find((row) => row.id === '10')?.mobile).toBe(124)
    expect(desktop.gradients).toHaveLength(1)
    expect(desktop.focusGuides).toHaveLength(1)
  })

  it('keeps the compact preview renderer-native', () => {
    const preview = createChartScene(
      activeBarDashboardDefinition(
        { ...input, width: 288, height: 192, preview: true },
        'desktop',
      ),
      { width: 288, height: 192 },
    )

    expect(preview.points).toHaveLength(24)
    expect(preview.gradients[0]?.id).toBe('visitor-bars')
    expect(preview.chart.height).toBeGreaterThan(120)
  })

  it('settles its single chart host before conformance sampling', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      ...input,
      width: 288,
      height: 192,
      preview: true,
    })

    try {
      const hosts = container.querySelectorAll('.ts-chart-host')
      const svg = container.querySelector('svg.ts-chart')
      expect(hosts).toHaveLength(1)
      svg?.setAttribute('data-ts-motion-state', 'finished')
      const settled = handle.driver?.settle?.()
      expect(settled).toBeInstanceOf(Promise)
      await settled
    } finally {
      handle.destroy()
      container.remove()
    }
  })
})
