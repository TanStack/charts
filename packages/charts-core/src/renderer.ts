import { createChartRuntime } from './runtime'
import { createDomTextMeasurer } from './dom-text'
import { findNearestPoint } from './scene'
import { focusNearestX, focusNearestY, focusX, focusY } from './focus'
import type {
  ChartAnimationOptions,
  ChartFocusMode,
  ChartFocusStrategy,
  ChartPoint,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartScene,
  ChartSpatialIndex,
  ChartSurface,
  ChartTooltipContent,
  ChartTooltipContentContext,
  ChartTooltipChannelItem,
  ChartTooltipItem,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPosition,
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
  let pointerPosition: ChartTooltipPosition | null = null
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
      tabIndex:
        options.definition.keyboard === false ? -1 : (options.tabIndex ?? 0),
      idPrefix: options.idPrefix,
      animation: hasRendered
        ? resolveAnimation(options.definition.animate, container, reason)
        : undefined,
    })
    hasRendered = true
    spatialIndex = options.definition.spatialIndex?.(scene.points)
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
    forcePaint = false,
  ) => {
    const point = points[0] ?? null
    if (samePointIdentity(point, focusedPoint)) {
      if (forcePaint) paintTooltip(point, points)
      return
    }
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
    pointerPosition = position ?? null
    if (!position) return []
    const maxDistance = options.definition.maxFocusDistance ?? 48
    return resolvePointerFocus(position.x, position.y, maxDistance)
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (pinnedKey) return
    updateFocus(
      pointsAtPointer(event.clientX, event.clientY),
      tooltipTracksPointer(),
    )
  }
  const clearTransientFocus = ({ relatedTarget }: MouseEvent | FocusEvent) => {
    if (
      !pinnedKey &&
      !(
        view &&
        relatedTarget instanceof view.Node &&
        container.contains(relatedTarget)
      )
    ) {
      pointerPosition = null
      updateFocus([])
    }
  }
  const handleClick = (event: MouseEvent) => {
    if (event.target && tooltipElement?.contains(event.target as Node)) {
      return
    }
    const points = pointsAtPointer(event.clientX, event.clientY)
    const point = points[0] ?? null
    let pinChanged = false
    if (tooltipIsSticky()) {
      if (pinnedKey) {
        pinnedKey = null
        pinChanged = true
      } else if (point) {
        pinnedKey = point.key
        pinChanged = true
      }
    }
    updateFocus(points, pinChanged)
    options.onSelect?.(point)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (options.definition.keyboard === false || !scene.points.length) return
    if (event.key === 'Escape' && pinnedKey) {
      event.preventDefault()
      pinnedKey = null
      pointerPosition = null
      updateFocus([])
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedPoint) return
      event.preventDefault()
      options.onSelect?.(focusedPoint)
      return
    }
    const focus = resolveFocusStrategy(options.definition.focus)
    const point = focus
      ? pointFromNavigationOrder(
          focus.navigation(scene.points),
          focusedPoint,
          event.key,
        )
      : pointFromSceneOrder(scene.points, focusedPoint, event.key)
    if (point === undefined) return
    event.preventDefault()
    pointerPosition = null
    updateFocus(point ? focusPointsForPoint(point) : [])
  }
  const handleFocus = (event: FocusEvent) => {
    if (
      options.definition.keyboard !== false &&
      event.target === surface?.element &&
      !focusedPoint
    ) {
      const focus = resolveFocusStrategy(options.definition.focus)
      const point = focus
        ? focus.navigation(scene.points)[0]
        : pointFromSceneOrder(scene.points, null, 'Home')
      pointerPosition = null
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
        options.measureText !== nextOptions.measureText ||
        fontChanged
      const observerChanged = options.width !== nextOptions.width
      options = nextOptions
      if (!tooltipIsSticky()) pinnedKey = null
      if (needsRender) {
        render(
          false,
          layoutChanged ? 'layout' : sizeChanged ? 'resize' : 'update',
        )
      } else {
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
    const focus = resolveFocusStrategy(options.definition.focus)
    if (focus) {
      return focus.resolve(scene.points, x, y, maxDistance)
    }
    const point = spatialIndex
      ? spatialIndex.findNearest(x, y, maxDistance)
      : findNearestPoint(scene, x, y, maxDistance)
    return point ? [point] : []
  }

  function focusPointsForPoint(
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
    return (
      resolveFocusStrategy(options.definition.focus)?.group(
        scene.points,
        point,
      ) ?? [point]
    )
  }

  function paintTooltip(
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) {
    if (!options.definition.tooltip || !point) {
      tooltipElement?.setAttribute('hidden', '')
      return
    }
    const tooltipOptions =
      typeof options.definition.tooltip === 'object'
        ? options.definition.tooltip
        : undefined
    tooltipElement ??= createTooltip(container)
    tooltipElement.className = tooltipOptions?.className
      ? `ts-chart-tooltip ${tooltipOptions.className}`
      : 'ts-chart-tooltip'
    const contentContext = createTooltipContentContext(scene, tooltipOptions)
    const content = tooltipOptions?.content?.(points, contentContext)
    const text =
      content === undefined
        ? (tooltipOptions?.formatGroup?.(points) ??
          tooltipOptions?.format?.(point))
        : undefined
    if (content) {
      paintStructuredTooltip(tooltipElement, content)
    } else if (text !== undefined) {
      paintPlainTooltip(tooltipElement, text)
    } else {
      paintStructuredTooltip(
        tooltipElement,
        defaultTooltipContent(points, scene, tooltipOptions),
      )
    }
    const pinned = pinnedKey !== null
    tooltipElement.style.pointerEvents = pinned ? 'auto' : 'none'
    tooltipElement.style.userSelect = pinned ? 'text' : 'none'
    tooltipElement.dataset.sticky = String(pinned)
    tooltipElement.style.visibility = 'hidden'
    tooltipElement.removeAttribute('hidden')
    const anchor = resolveTooltipAnchor(
      point,
      points,
      scene,
      pointerPosition,
      tooltipOptions,
    )
    placeTooltip(
      tooltipElement,
      anchor.x,
      anchor.y,
      scene.width,
      scene.height,
      tooltipOptions?.placement,
      tooltipOptions?.offset,
    )
    tooltipElement.style.removeProperty('visibility')
  }

  function tooltipIsSticky() {
    return (
      Boolean(options.definition.tooltip) &&
      !(
        typeof options.definition.tooltip === 'object' &&
        options.definition.tooltip.sticky === false
      )
    )
  }

  function tooltipTracksPointer() {
    const tooltip = options.definition.tooltip
    if (!tooltip || typeof tooltip !== 'object') return false
    return tooltip.anchor === 'pointer' || typeof tooltip.anchor === 'function'
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

function resolveFocusStrategy<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  focus: ChartFocusMode<TDatum, TXValue, TYValue> | undefined,
): ChartFocusStrategy<TDatum, TXValue, TYValue> | undefined {
  if (typeof focus !== 'string') return focus
  switch (focus) {
    case 'nearest-x':
      return focusNearestX
    case 'nearest-y':
      return focusNearestY
    case 'group-x':
      return focusX
    case 'group-y':
      return focusY
    case 'nearest':
      return undefined
  }
}

function resolveAnimation(
  animation: boolean | ChartAnimationOptions | undefined,
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
    overflowWrap: 'anywhere',
  })
  tooltip.hidden = true
  container.append(tooltip)
  return tooltip
}

function createTooltipContentContext(
  scene: ChartScene,
  options?: ChartTooltipOptions<any, any, any>,
): ChartTooltipContentContext {
  const x = findTooltipChannelItem(options?.items, 'x')
  const y = findTooltipChannelItem(options?.items, 'y')
  return {
    xLabel: x?.label ?? findSceneLabel(scene, 'x-label') ?? 'x',
    yLabel: y?.label ?? findSceneLabel(scene, 'y-label') ?? 'y',
    formatX: formatValue,
    formatY: formatValue,
  }
}

function defaultTooltipContent(
  points: readonly ChartPoint[],
  scene: ChartScene,
  options?: ChartTooltipOptions<any, any, any>,
): ChartTooltipContent {
  const point = points[0]
  if (!point) return { rows: [] }
  const context = createTooltipContentContext(scene, options)
  const x = findTooltipChannelItem(options?.items, 'x')
  const y = findTooltipChannelItem(options?.items, 'y')
  const group = findTooltipChannelItem(options?.items, 'group')
  const orderedPoints = orderTooltipPoints(points, scene, options?.sort)
  const sharedX =
    points.length > 1 &&
    points.every((candidate) => chartValueEqual(candidate.xValue, point.xValue))
  const sharedY =
    points.length > 1 &&
    points.every((candidate) => chartValueEqual(candidate.yValue, point.yValue))

  if (sharedX || sharedY) {
    const axis = sharedX ? 'x' : 'y'
    const axisItem = sharedX ? x : y
    const label = axisItem?.label ?? findSceneLabel(scene, `${axis}-label`)
    const value = formatPointAxis(point, axis, axisItem, context)
    return {
      title: label ? `${label}: ${value}` : value,
      rows: orderedPoints.map((candidate) => ({
        label: formatTooltipGroup(candidate, group, context),
        value: formatPointAxis(
          candidate,
          sharedX ? 'y' : 'x',
          sharedX ? y : x,
          context,
        ),
        color: candidate.color,
      })),
    }
  }

  if (points.length > 1) {
    return {
      rows: orderedPoints.map((candidate) => ({
        label: formatTooltipGroup(candidate, group, context),
        value: `${formatPointAxis(candidate, 'x', x, context)} · ${formatPointAxis(candidate, 'y', y, context)}`,
        color: candidate.color,
      })),
    }
  }

  const items = options?.items
  return {
    title:
      point.group == null || items?.some(isTooltipGroupItem)
        ? undefined
        : formatTooltipGroup(point, group, context),
    color:
      point.group == null || items?.some(isTooltipGroupItem)
        ? undefined
        : point.color,
    rows: items
      ? tooltipItemRows(point, items, context)
      : [
          {
            label: context.xLabel,
            value: formatPointAxis(point, 'x', x, context),
          },
          {
            label: context.yLabel,
            value: formatPointAxis(point, 'y', y, context),
          },
        ],
  }
}

function orderTooltipPoints(
  points: readonly ChartPoint[],
  scene: ChartScene,
  sort: ChartTooltipOptions['sort'],
) {
  if (sort === 'focus') return [...points]
  if (typeof sort === 'function') return [...points].sort(sort)
  return [...points].sort(
    (left, right) =>
      colorOrder(scene, left.group) - colorOrder(scene, right.group),
  )
}

function colorOrder(scene: ChartScene, group: ChartPoint['group']) {
  const index = group == null ? -1 : scene.colors.domain.indexOf(group)
  return index < 0 ? Number.MAX_SAFE_INTEGER : index
}

function tooltipItemRows(
  point: ChartPoint,
  items: readonly ChartTooltipItem<any, any, any>[],
  context: ChartTooltipContentContext,
) {
  return items.flatMap((item) => {
    if (typeof item === 'string') {
      if (item === 'group') {
        return [
          {
            label: 'Group',
            value: point.groupLabel,
            color: point.color,
          },
        ]
      }
      return [
        {
          label: item === 'x' ? context.xLabel : context.yLabel,
          value: formatPointAxis(point, item, undefined, context),
        },
      ]
    }
    if ('channel' in item) {
      const text = item.text?.(point, context)
      if (item.text && text == null) return []
      if (item.channel === 'group') {
        return [
          {
            label: item.label ?? 'Group',
            value: text ?? point.groupLabel,
            color: point.color,
          },
        ]
      }
      return [
        {
          label:
            item.label ??
            (item.channel === 'x' ? context.xLabel : context.yLabel),
          value:
            text ?? formatPointAxis(point, item.channel, undefined, context),
        },
      ]
    }
    if ('field' in item) {
      const value = (point.datum as Record<string, ChartValue | null>)[
        item.field
      ]
      if (value == null) return []
      const text = item.text?.(point, context)
      if (item.text && text == null) return []
      return [
        {
          label: item.label ?? item.field,
          value: text ?? formatValue(value),
        },
      ]
    }
    const value = item.text(point, context)
    return value == null ? [] : [{ label: item.label ?? item.id, value }]
  })
}

function findTooltipChannelItem(
  items: readonly ChartTooltipItem<any, any, any>[] | undefined,
  channel: 'x' | 'y' | 'group',
): ChartTooltipChannelItem<any, any, any> | undefined {
  const item = items?.find(
    (candidate) => tooltipItemChannel(candidate) === channel,
  )
  return typeof item === 'object' && 'channel' in item
    ? (item as ChartTooltipChannelItem<any, any, any>)
    : undefined
}

function tooltipItemChannel(item: ChartTooltipItem<any, any, any>) {
  return typeof item === 'string'
    ? item
    : 'channel' in item
      ? item.channel
      : undefined
}

function isTooltipGroupItem(item: ChartTooltipItem<any, any, any>) {
  return tooltipItemChannel(item) === 'group'
}

function formatTooltipGroup(
  point: ChartPoint,
  item: ChartTooltipChannelItem<any, any, any> | undefined,
  context: ChartTooltipContentContext,
) {
  return item?.text?.(point, context) ?? point.groupLabel
}

function formatPointAxis(
  point: ChartPoint,
  axis: 'x' | 'y',
  item: ChartTooltipChannelItem<any, any, any> | undefined,
  context: ChartTooltipContentContext,
) {
  const itemText = item?.text?.(point, context)
  if (itemText != null) return itemText
  const start = axis === 'x' ? point.x1Value : point.y1Value
  const end = axis === 'x' ? point.x2Value : point.y2Value
  const interval = axis === 'x' ? point.xInterval : point.yInterval
  if (
    interval === 'difference' &&
    typeof start === 'number' &&
    typeof end === 'number'
  ) {
    return formatValue(end - start)
  }
  if (
    interval === 'range' &&
    start !== undefined &&
    end !== undefined &&
    !chartValueEqual(start, end)
  ) {
    return `${formatValue(start)}–${formatValue(end)}`
  }
  return formatValue(axis === 'x' ? point.xValue : point.yValue)
}

function findSceneLabel(scene: ChartScene, key: string) {
  const axes = scene.nodes.find(
    (node) => node.kind === 'group' && node.key === 'axes',
  )
  if (axes?.kind !== 'group') return undefined
  const label = axes.children.find((node) => node.key === key)
  return label?.kind === 'label' ? label.text : undefined
}

function paintPlainTooltip(tooltip: HTMLElement, text: string) {
  tooltip.removeAttribute('aria-label')
  tooltip.style.whiteSpace = 'pre-wrap'
  tooltip.textContent = text
}

function paintStructuredTooltip(
  tooltip: HTMLElement,
  content: ChartTooltipContent,
) {
  const document = tooltip.ownerDocument
  const children: HTMLElement[] = []
  if (content.title) {
    const title = document.createElement('div')
    title.className = 'ts-chart-tooltip__title'
    title.style.cssText = `display:flex;align-items:center;gap:.4rem;font-weight:650;margin-bottom:${content.rows.length ? '.3rem' : '0'}`
    if (content.color)
      title.append(createTooltipSwatch(document, content.color))
    title.append(content.title)
    children.push(title)
  }
  if (content.rows.length) {
    const rows = document.createElement('div')
    rows.className = 'ts-chart-tooltip__rows'
    rows.setAttribute('aria-hidden', 'true')
    for (const row of content.rows) {
      const line = document.createElement('div')
      line.className = 'ts-chart-tooltip__row'
      line.style.cssText =
        'display:grid;grid-template-columns:.55rem minmax(0,1fr) auto;align-items:center;column-gap:.4rem'
      const swatch = row.color
        ? createTooltipSwatch(document, row.color)
        : document.createElement('span')
      const label = document.createElement('span')
      label.textContent = row.label
      const value = document.createElement('span')
      value.textContent = row.value
      value.style.cssText =
        'text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap'
      line.append(swatch, label, value)
      rows.append(line)
    }
    children.push(rows)
  }
  tooltip.style.whiteSpace = 'normal'
  tooltip.replaceChildren(...children)
  tooltip.setAttribute(
    'aria-label',
    [content.title, ...content.rows.map((row) => `${row.label}: ${row.value}`)]
      .filter(Boolean)
      .join('\n'),
  )
}

function createTooltipSwatch(document: Document, color: string) {
  const swatch = document.createElement('span')
  swatch.className = 'ts-chart-tooltip__swatch'
  swatch.setAttribute('aria-hidden', 'true')
  swatch.style.cssText =
    'display:block;width:.55rem;height:.55rem;border-radius:.15rem;box-shadow:inset 0 0 0 1px rgb(0 0 0/.12)'
  swatch.style.background = color
  return swatch
}

function formatValue(value: ChartValue) {
  return value instanceof Date
    ? Number.isNaN(+value)
      ? 'Invalid Date'
      : value.toISOString().replace('T00:00:00.000Z', '')
    : typeof value === 'number'
      ? value.toLocaleString()
      : String(value)
}

function resolveTooltipAnchor(
  point: ChartPoint,
  points: readonly ChartPoint[],
  scene: ChartScene,
  pointer: ChartTooltipPosition | null,
  options?: ChartTooltipOptions<any, any, any>,
): ChartTooltipPosition {
  const fallback = { x: point.x, y: point.y }
  const anchor = options?.anchor ?? 'point'
  if (anchor === 'point') return fallback
  if (anchor === 'pointer') return pointer ?? fallback
  if (anchor === 'group-center') {
    let x1 = point.x
    let x2 = point.x
    let y1 = point.y
    let y2 = point.y
    for (const candidate of points) {
      x1 = Math.min(x1, candidate.x)
      x2 = Math.max(x2, candidate.x)
      y1 = Math.min(y1, candidate.y)
      y2 = Math.max(y2, candidate.y)
    }
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  }
  const resolved = anchor(points, {
    pointer,
    chart: scene.chart,
    width: scene.width,
    height: scene.height,
  })
  return resolved && Number.isFinite(resolved.x) && Number.isFinite(resolved.y)
    ? resolved
    : fallback
}

function placeTooltip(
  tooltip: HTMLElement,
  anchorX: number,
  anchorY: number,
  sceneWidth: number,
  sceneHeight: number,
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
  const maxLeft = Math.max(edge, sceneWidth - edge - width)
  const maxTop = Math.max(edge, sceneHeight - edge - height)
  const placements =
    placement === undefined || placement === 'auto'
      ? defaultTooltipPlacements
      : Array.isArray(placement)
        ? placement.length
          ? placement
          : defaultTooltipPlacements
        : [placement as ChartTooltipPlacement]
  const candidates = placements.map((candidate) =>
    tooltipPlacement(candidate, anchorX, anchorY, width, height, gap),
  )
  let selected = candidates[0]!
  let selectedOverflow = overflow(
    selected,
    width,
    height,
    sceneWidth,
    sceneHeight,
    edge,
  )
  for (const candidate of candidates) {
    const candidateOverflow = overflow(
      candidate,
      width,
      height,
      sceneWidth,
      sceneHeight,
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
  const left = clamp(selected.left, edge, maxLeft)
  const top = clamp(selected.top, edge, maxTop)

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.dataset.placement = selected.placement
}

const defaultTooltipPlacements: readonly ChartTooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

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
  sceneWidth: number,
  sceneHeight: number,
  edge: number,
) {
  return (
    Math.max(0, edge - position.left) +
    Math.max(0, position.left + width + edge - sceneWidth) +
    Math.max(0, edge - position.top) +
    Math.max(0, position.top + height + edge - sceneHeight)
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
