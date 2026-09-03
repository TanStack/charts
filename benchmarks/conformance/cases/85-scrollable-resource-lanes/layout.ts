export const timelineMargin = {
  top: 18,
  right: 24,
  bottom: 50,
  left: 12,
} as const

const headerHeight = 42

export function timelineBodyHeight(height: number) {
  return Math.max(220, height - headerHeight)
}

export function timelineContentWidth(viewportWidth: number) {
  return Math.max(960, viewportWidth * 2)
}

export function timelineChartHeight(viewportHeight: number) {
  return Math.max(240, viewportHeight - 16)
}

export function timelineLaneRailWidth(width: number) {
  return Math.round(Math.max(96, Math.min(128, width * 0.28)))
}
