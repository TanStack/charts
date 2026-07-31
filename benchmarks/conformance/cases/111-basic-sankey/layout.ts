export function responsiveLayout(width: number, height: number) {
  return {
    sideMargin: clamp(width * 0.14, 48, 82),
    verticalMargin: clamp(height * 0.1, 18, 32),
    nodeWidth: clamp(width * 0.025, 10, 18),
    nodePadding: clamp(height * 0.12, 18, 38),
    labelFontSize: clamp(width * 0.018, 8, 12),
    labelOffset: clamp(width * 0.012, 4, 8),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
