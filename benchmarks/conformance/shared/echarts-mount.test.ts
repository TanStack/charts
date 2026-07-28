import { describe, expect, it } from 'vitest'
import { applyEChartsAccessibility } from './echarts-mount'

describe('ECharts conformance accessibility', () => {
  it('keeps one named focusable chart root', () => {
    const surface = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', 'Duplicate chart name')
    svg.setAttribute('tabindex', '0')
    surface.append(svg)

    applyEChartsAccessibility(surface, 'Interactive time series')

    expect(surface.getAttribute('role')).toBe('application')
    expect(surface.getAttribute('aria-label')).toBe('Interactive time series')
    expect(surface.tabIndex).toBe(0)
    expect(svg.getAttribute('role')).toBe('presentation')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect(svg.hasAttribute('aria-label')).toBe(false)
    expect(svg.hasAttribute('tabindex')).toBe(false)
    expect(surface.querySelectorAll('[aria-label]')).toHaveLength(0)
    expect([surface, ...surface.querySelectorAll('[aria-label]')]).toHaveLength(
      1,
    )
  })
})
