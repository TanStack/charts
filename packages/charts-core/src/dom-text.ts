import { estimateSceneText } from './guide-layout'
import type {
  ChartTextMeasurer,
  ChartTextMeasureOptions,
  ChartTextMetrics,
} from './types'

interface FontStyle {
  family: string
  style: string
  stretch: CanvasFontStretch
  weight: string
  direction: CanvasDirection
  letterSpacing: string
}

export interface DomTextMeasurer {
  measureText: ChartTextMeasurer
  refresh: () => boolean
  invalidate: () => void
}

export function createDomTextMeasurer(container: HTMLElement): DomTextMeasurer {
  const view = container.ownerDocument.defaultView
  const CanvasContext = view?.CanvasRenderingContext2D
  const context = CanvasContext
    ? container.ownerDocument.createElement('canvas').getContext('2d')
    : null
  let style = readFontStyle()
  let signature = fontSignature(style)
  const cache = new Map<string, ChartTextMetrics>()

  return {
    measureText(text, options) {
      if (!context) return estimateSceneText(text, options)
      const key = `${signature}\u0000${options.fontSize}\u0000${options.fontWeight ?? ''}\u0000${options.anchor}\u0000${options.baseline}\u0000${text}`
      const cached = cache.get(key)
      if (cached) return cached

      configureContext(context, style, options)
      const measured = context.measureText(text)
      const metrics = paintedBounds(measured, options)
      cache.set(key, metrics)
      return metrics
    },
    refresh() {
      const nextStyle = readFontStyle()
      const nextSignature = fontSignature(nextStyle)
      if (nextSignature === signature) return false
      style = nextStyle
      signature = nextSignature
      cache.clear()
      return true
    },
    invalidate() {
      cache.clear()
    },
  }

  function readFontStyle(): FontStyle {
    const computed = view?.getComputedStyle(container)
    return {
      family: computed?.fontFamily || 'sans-serif',
      style: computed?.fontStyle || 'normal',
      stretch: normalizeFontStretch(computed?.fontStretch),
      weight: computed?.fontWeight || '400',
      direction:
        computed?.direction === 'rtl'
          ? 'rtl'
          : computed?.direction === 'ltr'
            ? 'ltr'
            : 'inherit',
      letterSpacing: computed?.letterSpacing || '0px',
    }
  }
}

function configureContext(
  context: CanvasRenderingContext2D,
  style: FontStyle,
  options: ChartTextMeasureOptions,
): void {
  const weight = options.fontWeight ?? style.weight
  context.font = [
    style.style,
    weight,
    `${options.fontSize}px`,
    style.family,
  ].join(' ')
  if ('fontStretch' in context) {
    context.fontStretch = style.stretch
  }
  context.textAlign = options.anchor === 'middle' ? 'center' : options.anchor
  context.textBaseline =
    options.baseline === 'auto' ? 'alphabetic' : options.baseline
  context.direction = style.direction
  if ('letterSpacing' in context) {
    context.letterSpacing = style.letterSpacing
  }
}

function paintedBounds(
  measured: TextMetrics,
  options: ChartTextMeasureOptions,
): ChartTextMetrics {
  const left = measured.actualBoundingBoxLeft
  const right = measured.actualBoundingBoxRight
  const ascent = measured.actualBoundingBoxAscent
  const descent = measured.actualBoundingBoxDescent
  if (
    [left, right, ascent, descent].every((value) => Number.isFinite(value)) &&
    (left + right > 0 || measured.width === 0) &&
    (ascent + descent > 0 || measured.width === 0)
  ) {
    return {
      x: -left,
      y: -ascent,
      width: left + right,
      height: ascent + descent,
    }
  }

  const width = Number.isFinite(measured.width)
    ? Math.max(0, measured.width)
    : 0
  const x =
    options.anchor === 'middle'
      ? -width / 2
      : options.anchor === 'end'
        ? -width
        : 0
  const y =
    options.baseline === 'middle'
      ? -options.fontSize / 2
      : options.baseline === 'hanging'
        ? 0
        : -options.fontSize * 0.8
  return { x, y, width, height: options.fontSize }
}

function fontSignature(style: FontStyle): string {
  return [
    style.family,
    style.style,
    style.stretch,
    style.weight,
    style.direction,
    style.letterSpacing,
  ].join('\u0000')
}

function normalizeFontStretch(value: string | undefined): CanvasFontStretch {
  if (
    value === 'ultra-condensed' ||
    value === 'extra-condensed' ||
    value === 'condensed' ||
    value === 'semi-condensed' ||
    value === 'normal' ||
    value === 'semi-expanded' ||
    value === 'expanded' ||
    value === 'extra-expanded' ||
    value === 'ultra-expanded'
  ) {
    return value
  }
  const percentage = Number.parseFloat(value ?? '')
  if (!Number.isFinite(percentage)) return 'normal'
  if (percentage <= 50) return 'ultra-condensed'
  if (percentage <= 62.5) return 'extra-condensed'
  if (percentage <= 75) return 'condensed'
  if (percentage <= 87.5) return 'semi-condensed'
  if (percentage < 112.5) return 'normal'
  if (percentage < 125) return 'semi-expanded'
  if (percentage < 150) return 'expanded'
  if (percentage < 200) return 'extra-expanded'
  return 'ultra-expanded'
}
