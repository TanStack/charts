import type { ColorValue } from 'react-native'

export interface NativePaintContext {
  color: ColorValue
  /** Native equivalent of the browser `Canvas` system color. */
  canvas?: ColorValue
}

export type NativePaintResolver = (
  paint: string,
  context: NativePaintContext,
) => ColorValue

export function resolveNativePaint(
  paint: string,
  context: NativePaintContext,
): ColorValue {
  const { color, canvas } = context
  const value = paint.trim()
  if (value === 'currentColor' || value === 'CanvasText') return color
  if (value === 'Canvas') return canvas ?? color
  if (!value.startsWith('var(') || !value.endsWith(')')) return value

  const fallback = cssVariableFallback(value)
  return fallback ? resolveNativePaint(fallback, context) : color
}

export function resolveNativeSolidPaint(
  paint: string,
  context: NativePaintContext,
  resolvePaint: NativePaintResolver = resolveNativePaint,
): ColorValue {
  const resolved = resolvePaint(paint, context)
  return typeof resolved === 'string' &&
    resolved.trim().startsWith('url(') &&
    resolved.trim().endsWith(')')
    ? context.color
    : resolved
}

function cssVariableFallback(value: string) {
  let depth = 0
  for (let index = 4; index < value.length - 1; index += 1) {
    const character = value[index]
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (character === ',' && depth === 0) {
      return value.slice(index + 1, -1).trim()
    }
  }
  return undefined
}
