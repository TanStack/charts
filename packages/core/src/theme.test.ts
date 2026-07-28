import { describe, expect, it } from 'vitest'
import { resolveChartTheme } from './theme'

describe('resolveChartTheme', () => {
  it('inherits a native color-scheme without requiring a theme class', () => {
    const container = document.createElement('div')
    container.style.colorScheme = 'dark'

    const theme = resolveChartTheme(container, 'auto', {
      getComputedStyle: (element) =>
        element.ownerDocument.defaultView!.getComputedStyle(element),
      matchMedia: () => ({ matches: false }) as MediaQueryList,
    })

    expect(theme.mode).toBe('dark')
    expect(container.dataset.tsPlotResolvedTheme).toBe('dark')
  })

  it('allows an explicit mode to override inherited color-scheme', () => {
    const container = document.createElement('div')
    container.style.colorScheme = 'dark'

    const theme = resolveChartTheme(container, 'light', {
      getComputedStyle: (element) =>
        element.ownerDocument.defaultView!.getComputedStyle(element),
      matchMedia: () => ({ matches: true }) as MediaQueryList,
    })

    expect(theme.mode).toBe('light')
  })
})
