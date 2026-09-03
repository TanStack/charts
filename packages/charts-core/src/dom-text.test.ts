import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDomTextMeasurer } from './dom-text'

describe('DOM text measurement', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses inherited font properties and exact painted bounds', () => {
    const context = {
      direction: 'inherit',
      font: '',
      fontStretch: 'normal',
      letterSpacing: '0px',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      measureText: vi.fn(() => ({
        width: 31,
        actualBoundingBoxLeft: 30,
        actualBoundingBoxRight: 3,
        actualBoundingBoxAscent: 4,
        actualBoundingBoxDescent: 7,
      })),
    } as unknown as CanvasRenderingContext2D
    const previousCanvasContext = window.CanvasRenderingContext2D
    Object.defineProperty(window, 'CanvasRenderingContext2D', {
      configurable: true,
      value: class TestCanvasContext {},
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      direction: 'rtl',
      fontFamily: '"Inter var", sans-serif',
      fontStretch: 'condensed',
      fontStyle: 'italic',
      fontWeight: '700',
      letterSpacing: '0.4px',
    } as CSSStyleDeclaration)

    const measurer = createDomTextMeasurer(document.createElement('div'))
    const tick = measurer.measureText('Italic', {
      fontSize: 11,
      fontFamily: '"Inter var", sans-serif',
      fontStyle: 'italic',
      fontStretch: 'condensed',
      letterSpacing: 0.4,
      direction: 'rtl',
      fontScale: 1,
      anchor: 'end',
      baseline: 'middle',
    })

    expect(context.font).toContain('italic 700 11px')
    expect(context.font).toContain('"Inter var", sans-serif')
    expect(context.fontStretch).toBe('condensed')
    expect(context.direction).toBe('rtl')
    expect(context.textAlign).toBe('end')
    expect(context.textBaseline).toBe('middle')
    expect(context.letterSpacing).toBe('0.4px')
    expect(tick).toEqual({ x: -30, y: -4, width: 33, height: 11 })

    measurer.measureText('Title', {
      fontSize: 11,
      fontWeight: 600,
      fontFamily: '"Inter var", sans-serif',
      fontStyle: 'italic',
      fontStretch: 'condensed',
      letterSpacing: 0.4,
      direction: 'rtl',
      fontScale: 1,
      anchor: 'middle',
      baseline: 'auto',
    })
    expect(context.font).toContain('italic 600 11px')

    Object.defineProperty(window, 'CanvasRenderingContext2D', {
      configurable: true,
      value: previousCanvasContext,
    })
  })
})
