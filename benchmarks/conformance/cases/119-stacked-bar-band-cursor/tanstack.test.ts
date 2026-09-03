import { describe, expect, it } from 'vitest'
import { catalogCase } from './tanstack'

describe('stacked cursor catalog preview', () => {
  it('paints the native labeled band and rule without ordinary guides', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = catalogCase.mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      interactive: false,
      preview: true,
    })

    expect(
      container.querySelector('[data-ts-key="stacked-cursor-band:x-band"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-ts-key="stacked-cursor-rule:y-rule"]'),
    ).not.toBeNull()
    expect(
      container.querySelector(
        '[data-ts-key="stacked-cursor-band:x-label:text"]',
      )?.textContent,
    ).toBe('Nov')
    expect(
      container.querySelector(
        '[data-ts-key="stacked-cursor-rule:y-label:text"]',
      )?.textContent,
    ).toBe('1,131')
    expect(container.querySelectorAll('.ts-chart__axes')).toHaveLength(0)
    expect(container.querySelectorAll('.ts-chart__grid')).toHaveLength(0)

    handle.destroy()
    container.remove()
  })
})
