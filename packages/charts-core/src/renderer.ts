import { createChartRuntime } from './runtime'
import { createDomTextMeasurer } from './dom-text'
import { findNearestPoint } from './scene'
import type {
  ChartPoint,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartScene,
  ChartSpatialIndex,
  ChartSurface,
  ChartValue,
} from './types'

type HostRenderReason = 'update' | 'resize' | 'layout'

/**
 * Mounts a chart and owns the runtime until the returned host is destroyed.
 * Pass a runtime that already rendered initial markup to preserve renderer
 * handoff state across adapter prerender and DOM mounting.
 */
export function mountChartRenderer<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  runtime: ChartRuntime<TDatum, TXValue, TYValue> = createChartRuntime<
    TDatum,
    TXValue,
    TYValue
  >(),
): ChartRendererHost<TDatum, TXValue, TYValue> {
  let options = initialOptions
  let scene!: ChartScene<TDatum, TXValue, TYValue>
  let focusedPoint: ChartPoint<TDatum, TXValue, TYValue> | null = null
  let pinnedKey: string | null = null
  let observer: ResizeObserver | undefined
  let renderFrame: number | undefined
  let forceScheduledRender = false
  let scheduledRenderReason: Exclude<HostRenderReason, 'update'> | undefined
  let destroyed = false
  let hasRendered = false
  let surface: ChartSurface<TDatum, TXValue, TYValue> | undefined
  let tooltipElement: HTMLDivElement | undefined
  let spatialIndex: ChartSpatialIndex<TDatum, TXValue, TYValue> | undefined
  const previousPosition = container.style.position
  const view = container.ownerDocument.defaultView
  const computedPosition = view?.getComputedStyle(container).position
  const ownsPosition = !computedPosition || computedPosition === 'static'
  const domText = createDomTextMeasurer(container)
  const fontSet = container.ownerDocument.fonts
  if (ownsPosition) container.style.position = 'relative'

  const render = (refreshText = false, reason: HostRenderReason = 'update') => {
    if (destroyed) return
    if (refreshText && !options.measureText) domText.refresh()
    const previousFocusedPoint = focusedPoint
    scene = createScene()
    if (!surface) {
      surface = options.renderer.mount(container, scheduleRender)
    } else if (surface.renderer !== options.renderer) {
      surface?.destroy()
      container.replaceChildren()
      tooltipElement = undefined
      surface = options.renderer.mount(container, scheduleRender)
      hasRendered = false
    }
    surface.render(scene, {
      ariaLabel: options.ariaLabel,
      ariaDescription: options.ariaDescription,
      className: options.className,
      tabIndex: options.keyboard === false ? -1 : (options.tabIndex ?? 0),
      idPrefix: options.idPrefix,
      animation: hasRendered
        ? resolveAnimation(options.animate, container, reason)
        : undefined,
    })
    hasRendered = true
    spatialIndex = options.spatialIndex?.(scene.points)
    const nextFocusedPoint = previousFocusedPoint
      ? restoreFocusedPoint(scene.points, previousFocusedPoint)
      : null
    focusedPoint = nextFocusedPoint
    if (!nextFocusedPoint) pinnedKey = null
    if (previousFocusedPoint) {
      const nextFocusedPoints = nextFocusedPoint
        ? focusPointsForPoint(nextFocusedPoint)
        : []
      paintFocus(nextFocusedPoint, nextFocusedPoints)
      options.onFocusChange?.(nextFocusedPoint)
      options.onFocusGroupChange?.(nextFocusedPoints)
    }
    const onRender = options.onRender
    if (onRender) {
      onRender({ container, scene, surface })
    }
  }

  const currentWidth = () => {
    const width = options.width ?? container.getBoundingClientRect().width
    return options.width !== undefined || width > 0 ? width : undefined
  }

  const configureObserver = () => {
    observer?.disconnect()
    observer = undefined
    if (options.width !== undefined) return
    const ResizeObserverConstructor = view?.ResizeObserver
    if (!ResizeObserverConstructor) return
    observer = new ResizeObserverConstructor(() => {
      const width = currentWidth()
      if (width === undefined || width === scene.width) return
      scheduleRender(false, 'resize')
    })
    observer.observe(container)
  }

  const scheduleRender = (
    force = false,
    reason: Exclude<HostRenderReason, 'update'> = 'layout',
  ) => {
    forceScheduledRender ||= force
    scheduledRenderReason =
      scheduledRenderReason === 'layout' || reason === 'layout'
        ? 'layout'
        : 'resize'
    if (renderFrame !== undefined) return
    if (!view?.requestAnimationFrame) {
      const nextWidth = currentWidth()
      const shouldRender =
        forceScheduledRender ||
        (nextWidth !== undefined && nextWidth !== scene.width)
      forceScheduledRender = false
      const nextReason = scheduledRenderReason ?? 'layout'
      scheduledRenderReason = undefined
      if (shouldRender) render(true, nextReason)
      return
    }
    renderFrame = view.requestAnimationFrame(() => {
      renderFrame = undefined
      const nextWidth = currentWidth()
      const shouldRender =
        forceScheduledRender ||
        (nextWidth !== undefined && nextWidth !== scene.width)
      forceScheduledRender = false
      const nextReason = scheduledRenderReason ?? 'layout'
      scheduledRenderReason = undefined
      if (shouldRender) render(true, nextReason)
    })
  }

  const handleFontLoad = () => {
    if (destroyed || options.measureText) return
    domText.invalidate()
    scheduleRender(true)
  }

  const updateFocus = (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => {
    const point = points[0] ?? null
    if (samePointIdentity(point, focusedPoint)) return
    focusedPoint = point
    paintFocus(point, points)
    options.onFocusChange?.(point)
    options.onFocusGroupChange?.(points)
  }

  const paintFocus = (
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => {
    surface?.paintFocus(point, points)
    paintTooltip(point, points)
  }

  const pointsAtPointer = (clientX: number, clientY: number) => {
    const position = surface?.clientToScene(scene, clientX, clientY)
    if (!position) return []
    const maxDistance = options.maxFocusDistance ?? 48
    return resolvePointerFocus(position.x, position.y, maxDistance)
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (pinnedKey) return
    updateFocus(pointsAtPointer(event.clientX, event.clientY))
  }
  const clearTransientFocus = ({ relatedTarget }: MouseEvent | FocusEvent) => {
    if (
      !pinnedKey &&
      !(
        view &&
        relatedTarget instanceof view.Node &&
        container.contains(relatedTarget)
      )
    )
      updateFocus([])
  }
  const handleClick = (event: MouseEvent) => {
    const points = pointsAtPointer(event.clientX, event.clientY)
    const point = points[0] ?? null
    if (tooltipIsSticky()) {
      if (pinnedKey) {
        pinnedKey = null
      } else if (point) {
        pinnedKey = point.key
      }
    }
    updateFocus(points)
    options.onSelect?.(point)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (options.keyboard === false || !scene.points.length) return
    if (event.key === 'Escape' && pinnedKey) {
      event.preventDefault()
      pinnedKey = null
      updateFocus([])
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedPoint) return
      event.preventDefault()
      options.onSelect?.(focusedPoint)
      return
    }
    const point = options.focus
      ? pointFromNavigationOrder(
          options.focus.navigation(scene.points),
          focusedPoint,
          event.key,
        )
      : pointFromSceneOrder(scene.points, focusedPoint, event.key)
    if (point === undefined) return
    event.preventDefault()
    updateFocus(point ? focusPointsForPoint(point) : [])
  }
  const handleFocus = (event: FocusEvent) => {
    if (
      options.keyboard !== false &&
      event.target === surface?.element &&
      !focusedPoint
    ) {
      const point = options.focus
        ? options.focus.navigation(scene.points)[0]
        : pointFromSceneOrder(scene.points, null, 'Home')
      updateFocus(point ? focusPointsForPoint(point) : [])
    }
  }
  container.addEventListener('pointermove', handlePointerMove)
  container.addEventListener('pointercancel', clearTransientFocus)
  container.addEventListener('mouseleave', clearTransientFocus)
  container.addEventListener('click', handleClick)
  container.addEventListener('keydown', handleKeyDown)
  container.addEventListener('focusin', handleFocus)
  container.addEventListener('focusout', clearTransientFocus)
  fontSet?.addEventListener?.('loadingdone', handleFontLoad)
  render()
  configureObserver()

  return {
    update(nextOptions) {
      if (destroyed) return
      const fontChanged =
        nextOptions.measureText === undefined && domText.refresh()
      const definitionChanged = options.definition !== nextOptions.definition
      const sizeChanged =
        options.height !== nextOptions.height ||
        options.aspectRatio !== nextOptions.aspectRatio ||
        options.width !== nextOptions.width ||
        options.initialWidth !== nextOptions.initialWidth
      const layoutChanged =
        options.idPrefix !== nextOptions.idPrefix ||
        options.renderer !== nextOptions.renderer ||
        options.measureText !== nextOptions.measureText ||
        fontChanged
      const needsRender =
        definitionChanged ||
        sizeChanged ||
        options.ariaLabel !== nextOptions.ariaLabel ||
        options.ariaDescription !== nextOptions.ariaDescription ||
        options.className !== nextOptions.className ||
        options.tabIndex !== nextOptions.tabIndex ||
        options.idPrefix !== nextOptions.idPrefix ||
        options.renderer !== nextOptions.renderer ||
        options.keyboard !== nextOptions.keyboard ||
        options.measureText !== nextOptions.measureText ||
        fontChanged
      const observerChanged = options.width !== nextOptions.width
      const spatialIndexChanged =
        options.spatialIndex !== nextOptions.spatialIndex
      options = nextOptions
      if (!tooltipIsSticky()) pinnedKey = null
      if (needsRender) {
        render(
          false,
          layoutChanged ? 'layout' : sizeChanged ? 'resize' : 'update',
        )
      } else {
        if (spatialIndexChanged) {
          spatialIndex = options.spatialIndex?.(scene.points)
        }
        if (focusedPoint) {
          paintFocus(focusedPoint, focusPointsForPoint(focusedPoint))
        }
      }
      if (observerChanged) configureObserver()
    },
    getScene: () => scene,
    destroy() {
      if (destroyed) return
      destroyed = true
      observer?.disconnect()
      fontSet?.removeEventListener?.('loadingdone', handleFontLoad)
      if (renderFrame !== undefined) {
        view?.cancelAnimationFrame?.(renderFrame)
      }
      surface?.destroy()
      runtime.destroy()
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointercancel', clearTransientFocus)
      container.removeEventListener('mouseleave', clearTransientFocus)
      container.removeEventListener('click', handleClick)
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focusin', handleFocus)
      container.removeEventListener('focusout', clearTransientFocus)
      container.replaceChildren()
      if (ownsPosition && container.style.position === 'relative') {
        container.style.position = previousPosition
      }
    },
  }

  function createScene(): ChartScene<TDatum, TXValue, TYValue> {
    const width = currentWidth() ?? options.initialWidth ?? 640
    return runtime.render(
      options.definition,
      {
        width,
        height:
          options.height ??
          (isPositiveFiniteNumber(options.aspectRatio)
            ? width / options.aspectRatio
            : 320),
      },
      { measureText: options.measureText ?? domText.measureText },
    )
  }

  function resolvePointerFocus(
    x: number,
    y: number,
    maxDistance: number,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
    if (options.focus) {
      return options.focus.resolve(scene.points, x, y, maxDistance)
    }
    const point = spatialIndex
      ? spatialIndex.findNearest(x, y, maxDistance)
      : findNearestPoint(scene, x, y, maxDistance)
    return point ? [point] : []
  }

  function focusPointsForPoint(
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
    return options.focus?.group(scene.points, point) ?? [point]
  }

  function paintTooltip(
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) {
    if (!options.tooltip || !point) {
      tooltipElement?.setAttribute('hidden', '')
      return
    }
    const tooltipOptions =
      typeof options.tooltip === 'object' ? options.tooltip : undefined
    tooltipElement ??= createTooltip(container)
    tooltipElement.className = tooltipOptions?.className
      ? `ts-chart-tooltip ${tooltipOptions.className}`
      : 'ts-chart-tooltip'
    tooltipElement.textContent =
      tooltipOptions?.formatGroup?.(points) ??
      tooltipOptions?.format?.(point) ??
      (points.length > 1
        ? points.map(defaultTooltip).join('\n')
        : defaultTooltip(point))
    tooltipElement.style.visibility = 'hidden'
    tooltipElement.removeAttribute('hidden')
    placeTooltip(tooltipElement, point.x, point.y, scene.width, scene.height)
    tooltipElement.style.removeProperty('visibility')
  }

  function tooltipIsSticky() {
    return (
      typeof options.tooltip === 'object' && options.tooltip.sticky === true
    )
  }
}

function samePointIdentity<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: ChartPoint<TDatum, TXValue, TYValue> | null,
  right: ChartPoint<TDatum, TXValue, TYValue> | null,
) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.key === right.key &&
      left.markId === right.markId &&
      left.datumIndex === right.datumIndex)
  )
}

function restoreFocusedPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  previous: ChartPoint<TDatum, TXValue, TYValue>,
) {
  const matches = points.filter((point) => point.key === previous.key)
  if (matches.length < 2) return matches[0] ?? null

  const datumType = typeof previous.datum
  const hasReferenceIdentity =
    previous.datum !== null &&
    (datumType === 'object' || datumType === 'function')
  if (hasReferenceIdentity) {
    const sameDatum = matches.find((point) => point.datum === previous.datum)
    if (sameDatum) return sameDatum
  }

  return (
    matches.find(
      (point) =>
        point.markId === previous.markId &&
        Object.is(point.group, previous.group) &&
        chartValueEqual(point.xValue, previous.xValue) &&
        chartValueEqual(point.yValue, previous.yValue),
    ) ??
    matches.find(
      (point) =>
        point.markId === previous.markId &&
        point.datumIndex === previous.datumIndex,
    ) ??
    matches[0] ??
    null
  )
}

function chartValueEqual(left: ChartValue, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function resolveAnimation(
  animation: ChartRendererHostOptions['animate'],
  container: HTMLElement,
  reason: HostRenderReason,
) {
  const configured = animation === true ? {} : animation || undefined
  if (!configured) return undefined
  if (reason === 'layout') return undefined
  if (reason === 'resize' && configured.resize !== true) return undefined
  if (
    (configured.respectReducedMotion ?? true) &&
    container.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
  ) {
    return undefined
  }
  const { resize: _resize, ...resolved } = configured
  return resolved
}

function pointFromNavigationOrder<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  current: ChartPoint<TDatum, TXValue, TYValue> | null,
  key: string,
): ChartPoint<TDatum, TXValue, TYValue> | null | undefined {
  const currentIndex = current
    ? points.findIndex((point) => samePointIdentity(point, current))
    : -1
  let nextIndex: number
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = Math.min(points.length - 1, currentIndex + 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = Math.max(0, currentIndex < 0 ? 0 : currentIndex - 1)
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = points.length - 1
      break
    default:
      return undefined
  }
  return points[nextIndex] ?? null
}

function pointFromSceneOrder<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  current: ChartPoint<TDatum, TXValue, TYValue> | null,
  key: string,
): ChartPoint<TDatum, TXValue, TYValue> | null | undefined {
  const direction =
    key === 'ArrowRight' || key === 'ArrowDown'
      ? 1
      : key === 'ArrowLeft' || key === 'ArrowUp'
        ? -1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? 2
            : undefined
  if (direction === undefined) return undefined
  if (!points.length) return null

  const currentIndex = current
    ? points.findIndex((point) => samePointIdentity(point, current))
    : -1
  if (!current || currentIndex < 0 || direction === 0 || direction === 2) {
    return navigationExtreme(points, direction === 2)
  }

  let candidate: ChartPoint<TDatum, TXValue, TYValue> | null = null
  let candidateIndex = -1
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (!point) continue
    const relative = compareNavigationPoints(
      point,
      index,
      current,
      currentIndex,
    )
    if ((direction > 0 && relative <= 0) || (direction < 0 && relative >= 0)) {
      continue
    }
    if (
      !candidate ||
      direction *
        compareNavigationPoints(point, index, candidate, candidateIndex) <
        0
    ) {
      candidate = point
      candidateIndex = index
    }
  }
  return candidate ?? current
}

function navigationExtreme<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(points: readonly ChartPoint<TDatum, TXValue, TYValue>[], maximum: boolean) {
  let candidate = points[0] ?? null
  let candidateIndex = 0
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    if (!point || !candidate) continue
    const comparison = compareNavigationPoints(
      point,
      index,
      candidate,
      candidateIndex,
    )
    if ((maximum && comparison > 0) || (!maximum && comparison < 0)) {
      candidate = point
      candidateIndex = index
    }
  }
  return candidate
}

function compareNavigationPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: ChartPoint<TDatum, TXValue, TYValue>,
  leftIndex: number,
  right: ChartPoint<TDatum, TXValue, TYValue>,
  rightIndex: number,
) {
  return left.x - right.x || left.y - right.y || leftIndex - rightIndex
}

function createTooltip(container: HTMLElement) {
  const tooltip = container.ownerDocument.createElement('div')
  tooltip.className = 'ts-chart-tooltip'
  tooltip.setAttribute('role', 'status')
  tooltip.setAttribute('aria-live', 'polite')
  Object.assign(tooltip.style, {
    position: 'absolute',
    zIndex: '1',
    maxWidth: 'min(24rem, 80%)',
    padding: '0.4rem 0.55rem',
    border: '1px solid color-mix(in srgb, CanvasText 18%, transparent)',
    borderRadius: '0.45rem',
    background: 'Canvas',
    color: 'CanvasText',
    boxShadow: '0 6px 24px rgb(0 0 0 / 0.14)',
    font: '500 0.75rem/1.3 system-ui, sans-serif',
    pointerEvents: 'none',
    whiteSpace: 'pre',
  })
  tooltip.hidden = true
  container.append(tooltip)
  return tooltip
}

function defaultTooltip(point: ChartPoint) {
  return `${point.groupLabel} · ${formatValue(point.xValue)} · ${formatValue(point.yValue)}`
}

function formatValue(value: ChartPoint['xValue']) {
  return value instanceof Date
    ? value.toLocaleString()
    : typeof value === 'number'
      ? value.toLocaleString()
      : value
}

function placeTooltip(
  tooltip: HTMLElement,
  anchorX: number,
  anchorY: number,
  sceneWidth: number,
  sceneHeight: number,
) {
  const edge = 8
  const gap = 10
  const width = tooltip.offsetWidth
  const height = tooltip.offsetHeight
  const maxLeft = Math.max(edge, sceneWidth - edge - width)
  const maxTop = Math.max(edge, sceneHeight - edge - height)
  const left = clamp(anchorX - width / 2, edge, maxLeft)
  const topAbove = anchorY - height - gap
  const placeBelow = topAbove < edge
  const top = clamp(placeBelow ? anchorY + gap : topAbove, edge, maxTop)

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.dataset.placement = placeBelow ? 'below' : 'above'
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
