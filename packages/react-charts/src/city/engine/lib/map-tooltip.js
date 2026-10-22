// Keep the roof anchor available while a visible facade is hovered, even when
// the roof itself projects beyond the map after zooming or panning.
export function mapTooltipAnchor(point, width, height) {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    width <= 0 ||
    height <= 0
  )
    return null
  const insetX = Math.min(18, width / 2)
  const insetY = Math.min(18, height / 2)
  return {
    x: Math.max(
      insetX,
      Math.min((point.x * 0.5 + 0.5) * width, width - insetX),
    ),
    y: Math.max(
      insetY,
      Math.min((-point.y * 0.5 + 0.5) * height, height - insetY),
    ),
  }
}
