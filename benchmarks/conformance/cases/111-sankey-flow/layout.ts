export function responsiveLayout(width: number, height: number) {
  return {
    leftMargin: clamp(width * 0.15, 56, 122),
    rightMargin: clamp(width * 0.13, 48, 105),
    topMargin: clamp(height * 0.14, 38, 70),
    bottomMargin: clamp(height * 0.025, 8, 14),
    nodeWidth: clamp(width * 0.032, 10, 24),
    nodePadding: clamp(height * 0.11, 12, 40),
    labelFontSize: clamp(width * 0.013, 6.5, 10.5),
    labelOffset: clamp(width * 0.008, 3, 6),
    titleFontSize: clamp(width * 0.034, 14, 26),
    titleY: clamp(height * 0.065, 17, 32),
  }
}

export function labelBackdropBounds(options: {
  anchor: 'start' | 'end'
  centerY: number
  fontSize: number
  label: string
  labelX: number
  value: string
}) {
  const width =
    Math.max(options.label.length, options.value.length) *
      options.fontSize *
      0.58 +
    5
  const height = options.fontSize * 2.25
  return {
    x:
      options.anchor === 'start'
        ? options.labelX - 2
        : options.labelX - width + 2,
    y: options.centerY - height / 2,
    width,
    height,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
