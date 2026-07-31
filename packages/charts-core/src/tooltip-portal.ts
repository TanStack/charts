import {
  placeTooltip,
  pointInBounds,
  sceneToClient,
  viewportBounds,
} from './tooltip-position'
import type {
  ChartTooltipPortalExtension,
  ChartTooltipPortalExtensionContext,
  ChartTooltipPortalExtensionInstance,
  ChartTooltipPortalPositionContext,
} from './dom-types'
import type { ChartTooltipPortalOptions } from './types'

export const portal: ChartTooltipPortalExtension = {
  id: 'portal',
  create: createPortal,
}

export type {
  ChartTooltipPortalExtension,
  ChartTooltipPortalExtensionContext,
  ChartTooltipPortalExtensionInstance,
  ChartTooltipPortalPositionContext,
} from './dom-types'
export type {
  ChartTooltipPortalInput,
  ChartTooltipPortalOptions,
} from './types'

function createPortal(
  context: ChartTooltipPortalExtensionContext,
  initialOptions: ChartTooltipPortalOptions,
): ChartTooltipPortalExtensionInstance {
  let options = initialOptions
  let listening = false
  let usesPopover = false
  let popoverOpen = false
  let popoverFailed = false
  let positionFrame: number | undefined
  let positionContext: ChartTooltipPortalPositionContext | undefined
  const { container, element } = context
  const document = container.ownerDocument
  const view = document.defaultView
  const resizeObserver = view?.ResizeObserver
    ? new view.ResizeObserver(schedulePosition)
    : undefined
  resizeObserver?.observe(element)

  function schedulePosition() {
    if (!positionContext || positionFrame !== undefined) return
    if (!view?.requestAnimationFrame) {
      position(positionContext)
      return
    }
    positionFrame = view.requestAnimationFrame(() => {
      positionFrame = undefined
      if (positionContext) position(positionContext)
    })
  }

  function startListening() {
    if (listening) return
    listening = true
    view?.addEventListener('scroll', schedulePosition, {
      capture: true,
      passive: true,
    })
    view?.addEventListener('resize', schedulePosition, { passive: true })
    view?.visualViewport?.addEventListener('scroll', schedulePosition, {
      passive: true,
    })
    view?.visualViewport?.addEventListener('resize', schedulePosition, {
      passive: true,
    })
    resizeObserver?.observe(container)
  }

  function stopListening() {
    if (!listening) return
    listening = false
    view?.removeEventListener('scroll', schedulePosition, true)
    view?.removeEventListener('resize', schedulePosition)
    view?.visualViewport?.removeEventListener('scroll', schedulePosition)
    view?.visualViewport?.removeEventListener('resize', schedulePosition)
    resizeObserver?.unobserve(container)
    if (positionFrame !== undefined) {
      view?.cancelAnimationFrame?.(positionFrame)
      positionFrame = undefined
    }
  }

  function configureParent() {
    const showPopover = (element as HTMLElement & { showPopover?: () => void })
      .showPopover
    if (typeof showPopover === 'function' && !popoverFailed) {
      if (element.parentNode !== container) container.append(element)
      element.setAttribute('popover', 'manual')
      element.dataset.tsChartTooltipPortal = 'popover'
      element.style.zIndex = '1'
      usesPopover = true
    } else {
      moveToFallback()
    }
    Object.assign(element.style, {
      position: 'fixed',
      right: 'auto',
      bottom: 'auto',
      margin: '0',
    })
  }

  function position(next: ChartTooltipPortalPositionContext) {
    positionContext = next
    startListening()
    configureParent()
    const anchor = sceneToClient(
      next.surface.element,
      next.scene.width,
      next.scene.height,
      next.anchor,
    )
    const boundary = viewportBounds(document)
    if (
      !anchor ||
      boundary.right <= boundary.left ||
      boundary.bottom <= boundary.top ||
      !pointInBounds(anchor, boundary)
    ) {
      hide(false)
      return false
    }
    element.removeAttribute('hidden')
    if (usesPopover && !showPopover()) {
      popoverFailed = true
      moveToFallback()
    }
    placeTooltip(
      element,
      anchor.x,
      anchor.y,
      boundary,
      next.placement,
      next.offset,
    )
    return true
  }

  function moveToFallback() {
    hidePopover()
    usesPopover = false
    element.removeAttribute('popover')
    element.dataset.tsChartTooltipPortal = 'fallback'
    element.style.zIndex = '2147483647'
    const parent = document.body ?? document.documentElement
    if (element.parentNode !== parent) parent.append(element)
  }

  function showPopover() {
    if (!usesPopover) return false
    if (popoverIsOpen()) return true
    try {
      ;(element as HTMLElement & { showPopover: () => void }).showPopover()
      popoverOpen = true
      return true
    } catch {
      popoverOpen = false
      return false
    }
  }

  function hidePopover() {
    if (!usesPopover) return
    try {
      if (popoverIsOpen()) {
        ;(element as HTMLElement & { hidePopover?: () => void }).hidePopover?.()
      }
    } catch {
      // Hiding or removing the element still closes its top-layer box.
    }
    popoverOpen = false
  }

  function popoverIsOpen() {
    if (!usesPopover) return false
    try {
      return element.matches(':popover-open')
    } catch {
      return popoverOpen
    }
  }

  function hide(stop = true) {
    hidePopover()
    element.setAttribute('hidden', '')
    if (stop) {
      positionContext = undefined
      stopListening()
    }
  }

  configureParent()

  return {
    update(nextOptions) {
      options = nextOptions
      void options
    },
    position,
    hide,
    destroy() {
      positionContext = undefined
      stopListening()
      hidePopover()
      resizeObserver?.disconnect()
      usesPopover = false
      popoverOpen = false
      popoverFailed = false
      element.removeAttribute('popover')
      delete element.dataset.tsChartTooltipPortal
    },
  }
}
