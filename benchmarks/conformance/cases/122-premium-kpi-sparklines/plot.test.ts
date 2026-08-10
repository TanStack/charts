import { describe, expect, it } from 'vitest'
import { mount } from './plot'

describe('premium KPI Observable Plot reference', () => {
  it('renders and updates three real Plot surfaces', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })

    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelectorAll('g[aria-label="line"]')).toHaveLength(3)
    expect(container.querySelectorAll('g[aria-label="area"]')).toHaveLength(2)
    expect(container.querySelectorAll('linearGradient')).toHaveLength(2)
    expect(container.textContent).toContain('$412.8K')
    expect(handle.driver?.readState()).toMatchObject({
      revision: 0,
      preview: true,
      svgCount: 3,
    })

    handle.update({
      width: 960,
      height: 360,
      revision: 1,
      preview: false,
    })

    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelectorAll('[data-premium-kpi]')).toHaveLength(3)
    expect(container.textContent).toContain('$429.2K')
    expect(container.textContent).not.toContain('$412.8K')
    expect(handle.driver?.readState()).toMatchObject({
      revision: 1,
      preview: false,
      values: ['$429.2K', '3,976', '1.6%'],
      svgCount: 3,
    })

    handle.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('lets the explicit host color scheme select every paired surface token', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })
    const styles = container.querySelector('style')?.textContent ?? ''

    expect(styles).toContain('color-scheme: inherit')
    expect(styles).toContain(
      '--premium-kpi-canvas: light-dark(#f5f6f8, #09090b)',
    )
    expect(styles).toContain(
      '--premium-kpi-foreground: light-dark(#18181b, #fafafa)',
    )
    expect(styles.match(/light-dark\(/g)).toHaveLength(6)
    expect(styles).not.toContain('prefers-color-scheme')

    handle.destroy()
    container.remove()
  })
})
