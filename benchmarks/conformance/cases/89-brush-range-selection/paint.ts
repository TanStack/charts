export const brushSelectionFill = 'rgba(147, 197, 253, 0.4)'

export function normalizedElementFill(element: Element) {
  const view = element.ownerDocument.defaultView
  if (!view) return null
  const style = view.getComputedStyle(element)
  return normalizedRenderedFill(style.fill, style.fillOpacity, style.opacity)
}

export function normalizedRenderedFill(
  fill: string,
  fillOpacity: string | number | undefined,
  opacity: string | number | undefined,
) {
  const color = parseColor(fill)
  if (!color) return null
  const alpha =
    color.alpha * numericOpacity(fillOpacity) * numericOpacity(opacity)
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${formatAlpha(alpha)})`
}

interface ParsedColor {
  red: number
  green: number
  blue: number
  alpha: number
}

function parseColor(value: string): ParsedColor | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'transparent') {
    return { red: 0, green: 0, blue: 0, alpha: 0 }
  }

  const hex = /^#([\da-f]{6})([\da-f]{2})?$/.exec(normalized)
  if (hex) {
    const channels = hex[1]
    if (!channels) return null
    return {
      red: Number.parseInt(channels.slice(0, 2), 16),
      green: Number.parseInt(channels.slice(2, 4), 16),
      blue: Number.parseInt(channels.slice(4, 6), 16),
      alpha: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
    }
  }

  const functional = /^rgba?\((.*)\)$/.exec(normalized)
  if (!functional?.[1]) return null
  const [channelText, slashAlpha] = functional[1]
    .split('/')
    .map((part) => part.trim())
  if (!channelText) return null
  const commaParts = channelText.split(',').map((part) => part.trim())
  const parts =
    commaParts.length > 1
      ? commaParts
      : channelText.split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  const red = colorChannel(parts[0])
  const green = colorChannel(parts[1])
  const blue = colorChannel(parts[2])
  const inlineAlpha = commaParts.length > 3 ? commaParts[3] : undefined
  const alpha = alphaChannel(slashAlpha ?? inlineAlpha ?? '1')
  if (red === null || green === null || blue === null || alpha === null) {
    return null
  }
  return { red, green, blue, alpha }
}

function colorChannel(value: string | undefined) {
  if (!value) return null
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) return null
  return Math.round(
    Math.min(255, Math.max(0, value.endsWith('%') ? numeric * 2.55 : numeric)),
  )
}

function alphaChannel(value: string) {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) return null
  return Math.min(1, Math.max(0, value.endsWith('%') ? numeric / 100 : numeric))
}

function numericOpacity(value: string | number | undefined) {
  const numeric = Number(value ?? 1)
  return Number.isFinite(numeric) ? numeric : 1
}

function formatAlpha(value: number) {
  return String(Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000)
}
