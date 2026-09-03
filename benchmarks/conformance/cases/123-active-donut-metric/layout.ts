const compactBreakpoint = 560
const compactHorizontalPadding = 36
const compactVerticalPadding = 20
const compactHeaderHeight = 53
const compactContentGap = 8
const compactSafetyInset = 6
const legendItemHeight = 38
const legendGap = 4

export interface ActiveDonutLayout {
  compact: boolean
  chartSize: number
  contentGap: number
  legendColumns: number
  legendHeight: number
  occupiedHeight: number
}

export function activeDonutLayout(
  width: number,
  height: number,
  itemCount = 5,
): ActiveDonutLayout {
  const compact = width < compactBreakpoint

  if (!compact) {
    return {
      compact,
      chartSize: Math.max(180, Math.min(height - 62, width * 0.55)),
      contentGap: 18,
      legendColumns: 1,
      legendHeight: itemCount * legendItemHeight + (itemCount - 1) * legendGap,
      occupiedHeight: height,
    }
  }

  const legendColumns = 2
  const legendRows = Math.ceil(itemCount / legendColumns)
  const legendHeight =
    legendRows * legendItemHeight + Math.max(0, legendRows - 1) * legendGap
  const availableChartHeight =
    height -
    compactHeaderHeight -
    compactVerticalPadding -
    compactContentGap -
    legendHeight -
    compactSafetyInset
  const chartSize = Math.max(
    120,
    Math.min(width - compactHorizontalPadding, availableChartHeight),
  )

  return {
    compact,
    chartSize,
    contentGap: compactContentGap,
    legendColumns,
    legendHeight,
    occupiedHeight:
      compactHeaderHeight +
      compactVerticalPadding +
      chartSize +
      compactContentGap +
      legendHeight,
  }
}
