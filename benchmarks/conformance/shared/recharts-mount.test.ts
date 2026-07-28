import { describe, expect, it } from 'vitest'
import { applyRechartsAccessibility } from './recharts-mount'

describe('Recharts conformance accessibility', () => {
  it('keeps the rendered SVG as the sole named chart root', () => {
    const surface = document.createElement('div')
    surface.setAttribute('role', 'img')
    surface.setAttribute('aria-label', 'Duplicate chart name')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('role', 'application')
    surface.append(svg)

    applyRechartsAccessibility(surface, 'Layered categorical measures')

    expect(surface.hasAttribute('role')).toBe(false)
    expect(surface.hasAttribute('aria-label')).toBe(false)
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toBe('Layered categorical measures')
    expect(surface.querySelectorAll('[aria-label]')).toHaveLength(1)
  })
})
