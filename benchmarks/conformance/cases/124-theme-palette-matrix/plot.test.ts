import { describe, expect, it } from 'vitest'
import { mount } from './plot'

describe('theme palette matrix Observable Plot reference', () => {
  it('renders three scoped gradient charts and updates their shared rows', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })

    const initialPath = container
      .querySelector('g[aria-label="line"] path')
      ?.getAttribute('d')
    const gradients = [...container.querySelectorAll('linearGradient')]

    expect(
      container.querySelector(
        '[data-catalog-preview-composition="theme-palette-matrix"]',
      ),
    ).not.toBeNull()
    expect(container.querySelectorAll('[data-palette-treatment]')).toHaveLength(
      3,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelectorAll('g[aria-label="area"]')).toHaveLength(3)
    expect(container.querySelectorAll('g[aria-label="line"]')).toHaveLength(6)
    expect(container.querySelectorAll('g[aria-label="dot"]')).toHaveLength(3)
    expect(gradients).toHaveLength(3)
    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(3)
    expect(
      gradients.every(
        (gradient) => gradient.querySelectorAll('stop').length === 3,
      ),
    ).toBe(true)
    expect(handle.driver?.readState()).toMatchObject({
      revision: 0,
      rowCount: 8,
      paletteCount: 3,
      svgCount: 3,
      palettes: ['neutral', 'vibrant', 'monochrome'],
    })

    handle.update({
      width: 390,
      height: 480,
      revision: 1,
      preview: false,
    })

    const updatedPath = container
      .querySelector('g[aria-label="line"] path')
      ?.getAttribute('d')
    expect(updatedPath).not.toBe(initialPath)
    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelectorAll('linearGradient')).toHaveLength(3)
    expect(container.textContent).toContain('Neutral')
    expect(container.textContent).toContain('Vibrant')
    expect(container.textContent).toContain('Monochrome')
    expect(
      [
        ...container.querySelectorAll<HTMLElement>('[data-palette-treatment]'),
      ].every((panel) => panel.style.gridTemplateColumns.startsWith('120px')),
    ).toBe(true)
    expect(handle.driver?.readState()).toMatchObject({
      revision: 1,
      svgCount: 3,
    })

    handle.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })
})
