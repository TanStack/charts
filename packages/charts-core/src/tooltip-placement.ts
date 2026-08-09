import type { ChartTooltipPlacement, ChartTooltipPosition } from './types'

export interface TooltipBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface TooltipSize {
  width: number
  height: number
}

const defaultPlacements: readonly ChartTooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

/** Resolves host-local tooltip placement without reading the DOM. */
export function resolveChartTooltipPlacement(
  anchor: ChartTooltipPosition,
  tooltip: TooltipSize,
  boundary: TooltipBounds,
  placement:
    | 'auto'
    | ChartTooltipPlacement
    | readonly ChartTooltipPlacement[]
    | undefined,
  offset: number | undefined,
) {
  const edge = 8
  const gap =
    offset !== undefined && Number.isFinite(offset) ? Math.max(0, offset) : 10
  const minimumLeft = boundary.left + edge
  const minimumTop = boundary.top + edge
  const maxLeft = Math.max(minimumLeft, boundary.right - edge - tooltip.width)
  const maxTop = Math.max(minimumTop, boundary.bottom - edge - tooltip.height)
  const placements =
    placement === undefined || placement === 'auto'
      ? defaultPlacements
      : Array.isArray(placement)
        ? placement.length
          ? placement
          : defaultPlacements
        : [placement as ChartTooltipPlacement]
  const candidates = placements.map((candidate) =>
    tooltipPlacement(
      candidate,
      anchor.x,
      anchor.y,
      tooltip.width,
      tooltip.height,
      gap,
    ),
  )
  let selected = candidates[0]!
  let selectedOverflow = overflow(
    selected,
    tooltip.width,
    tooltip.height,
    boundary,
    edge,
  )
  for (const candidate of candidates) {
    const candidateOverflow = overflow(
      candidate,
      tooltip.width,
      tooltip.height,
      boundary,
      edge,
    )
    if (candidateOverflow === 0) {
      selected = candidate
      break
    }
    if (candidateOverflow < selectedOverflow) {
      selected = candidate
      selectedOverflow = candidateOverflow
    }
  }
  return {
    left: clamp(selected.left, minimumLeft, maxLeft),
    top: clamp(selected.top, minimumTop, maxTop),
    placement: selected.placement,
  }
}

function tooltipPlacement(
  placement: ChartTooltipPlacement,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  gap: number,
) {
  const xDirection =
    placement.endsWith('right') || placement === 'right'
      ? 1
      : placement.endsWith('left') || placement === 'left'
        ? -1
        : 0
  const yDirection =
    placement.startsWith('bottom') || placement === 'bottom'
      ? 1
      : placement.startsWith('top') || placement === 'top'
        ? -1
        : 0
  return {
    placement,
    left: anchorX + ((xDirection - 1) * width) / 2 + xDirection * gap,
    top: anchorY + ((yDirection - 1) * height) / 2 + yDirection * gap,
  }
}

function overflow(
  position: { left: number; top: number },
  width: number,
  height: number,
  boundary: TooltipBounds,
  edge: number,
) {
  return (
    Math.max(0, boundary.left + edge - position.left) +
    Math.max(0, position.left + width + edge - boundary.right) +
    Math.max(0, boundary.top + edge - position.top) +
    Math.max(0, position.top + height + edge - boundary.bottom)
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
