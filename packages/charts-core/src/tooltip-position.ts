import type { ChartTooltipPlacement, ChartTooltipPosition } from './types'

export interface TooltipBounds {
  left: number
  top: number
  right: number
  bottom: number
}

const defaultPlacements: readonly ChartTooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

export function placeTooltip(
  tooltip: HTMLElement,
  anchorX: number,
  anchorY: number,
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
  const width = tooltip.offsetWidth
  const height = tooltip.offsetHeight
  const minimumLeft = boundary.left + edge
  const minimumTop = boundary.top + edge
  const maxLeft = Math.max(minimumLeft, boundary.right - edge - width)
  const maxTop = Math.max(minimumTop, boundary.bottom - edge - height)
  const placements =
    placement === undefined || placement === 'auto'
      ? defaultPlacements
      : Array.isArray(placement)
        ? placement.length
          ? placement
          : defaultPlacements
        : [placement as ChartTooltipPlacement]
  const candidates = placements.map((candidate) =>
    tooltipPlacement(candidate, anchorX, anchorY, width, height, gap),
  )
  let selected = candidates[0]!
  let selectedOverflow = overflow(selected, width, height, boundary, edge)
  for (const candidate of candidates) {
    const candidateOverflow = overflow(candidate, width, height, boundary, edge)
    if (candidateOverflow === 0) {
      selected = candidate
      break
    }
    if (candidateOverflow < selectedOverflow) {
      selected = candidate
      selectedOverflow = candidateOverflow
    }
  }
  tooltip.style.left = `${clamp(selected.left, minimumLeft, maxLeft)}px`
  tooltip.style.top = `${clamp(selected.top, minimumTop, maxTop)}px`
  tooltip.dataset.placement = selected.placement
}

export function sceneToClient(
  element: Element,
  width: number,
  height: number,
  position: ChartTooltipPosition,
): ChartTooltipPosition | null {
  const bounds = element.getBoundingClientRect()
  if (!bounds.width || !bounds.height || !width || !height) return null
  return {
    x: bounds.left + (position.x / width) * bounds.width,
    y: bounds.top + (position.y / height) * bounds.height,
  }
}

export function viewportBounds(document: Document): TooltipBounds {
  const view = document.defaultView
  const visualViewport = view?.visualViewport
  const left = visualViewport?.offsetLeft ?? 0
  const top = visualViewport?.offsetTop ?? 0
  const width =
    visualViewport?.width ||
    document.documentElement.clientWidth ||
    view?.innerWidth ||
    0
  const height =
    visualViewport?.height ||
    document.documentElement.clientHeight ||
    view?.innerHeight ||
    0
  return { left, top, right: left + width, bottom: top + height }
}

export function pointInBounds(
  point: ChartTooltipPosition,
  bounds: TooltipBounds,
) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  )
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
