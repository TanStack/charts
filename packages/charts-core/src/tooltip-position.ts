import {
  resolveChartTooltipPlacement,
  type TooltipBounds,
} from './tooltip-placement'
import type { ChartTooltipPlacement, ChartTooltipPosition } from './types'

export {
  resolveChartTooltipPlacement,
  type TooltipBounds,
  type TooltipSize,
} from './tooltip-placement'

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
  const width = tooltip.offsetWidth
  const height = tooltip.offsetHeight
  const resolved = resolveChartTooltipPlacement(
    { x: anchorX, y: anchorY },
    { width, height },
    boundary,
    placement,
    offset,
  )
  tooltip.style.left = `${resolved.left}px`
  tooltip.style.top = `${resolved.top}px`
  tooltip.dataset.placement = resolved.placement
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
