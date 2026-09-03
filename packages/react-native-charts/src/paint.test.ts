import { describe, expect, it } from 'vitest'
import { resolveNativePaint, resolveNativeSolidPaint } from './paint'

describe('native paint resolution', () => {
  it('resolves the browser-backed default theme tokens', () => {
    const context = { color: '#102030' }

    expect(resolveNativePaint('currentColor', context)).toBe('#102030')
    expect(resolveNativePaint('CanvasText', context)).toBe('#102030')
    expect(
      resolveNativePaint('Canvas', {
        color: '#102030',
        canvas: '#f8fafc',
      }),
    ).toBe('#f8fafc')
    expect(
      resolveNativePaint('var(--focus-fill, Canvas)', {
        color: '#102030',
        canvas: '#f8fafc',
      }),
    ).toBe('#f8fafc')
    expect(resolveNativePaint('var(--ts-chart-1, #2563eb)', context)).toBe(
      '#2563eb',
    )
    expect(
      resolveNativePaint(
        'var(--app-chart, var(--ts-chart-2, rgb(10, 20, 30)))',
        context,
      ),
    ).toBe('rgb(10, 20, 30)')
  })

  it('uses the host color when an authored CSS variable has no fallback', () => {
    expect(resolveNativePaint('var(--app-chart)', { color: '#abcdef' })).toBe(
      '#abcdef',
    )
  })

  it('preserves concrete native paints and resource references', () => {
    const context = { color: '#102030' }

    expect(resolveNativePaint('transparent', context)).toBe('transparent')
    expect(resolveNativePaint('#fff', context)).toBe('#fff')
    expect(resolveNativePaint('url(#gradient)', context)).toBe('url(#gradient)')
  })

  it('falls back to the host color where native views cannot use SVG resources', () => {
    expect(
      resolveNativeSolidPaint('url(#gradient)', { color: '#102030' }),
    ).toBe('#102030')
    expect(resolveNativeSolidPaint('#abcdef', { color: '#102030' })).toBe(
      '#abcdef',
    )
  })
})
