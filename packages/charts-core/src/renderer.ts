import { createChartRuntime } from './runtime'
import { createDomTextMeasurer } from './dom-text'
import { findNearestPoint } from './scene'
import { focusNearestX, focusNearestY, focusX, focusY } from './focus'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartSurface,
  ChartTooltipExtension,
  ChartTooltipExtensionInstance,
} from './dom-types'
import type {
  ChartAnimationOptions,
  ChartFocusMode,
  ChartFocusStrategy,
  ChartPoint,
  ChartRuntime,
  ChartScene,
  ChartSpatialIndex,
  ChartTooltipInput,
  ChartTooltipOptions,
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
  let tooltipExtension: ChartTooltipExtension | undefined
  let tooltipInstance:
    ChartTooltipExtensionInstance<TDatum, TXValue, TYValue> | undefined
  let suppressNextSurfaceFocus = false
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
      destroyTooltip()
      container.replaceChildren()
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

  const dismissTooltip = () => {
    if (!focusedPoint && !pinnedKey) return
    const restoreFocus = Boolean(
      tooltipInstance?.contains(container.ownerDocument.activeElement),
    )
    pinnedKey = null
    pointerPosition = null
    updateFocus([])
    const element = surface?.element
    if (
      restoreFocus &&
      element &&
      'focus' in element &&
      typeof element.focus === 'function'
    ) {
      suppressNextSurfaceFocus = true
      element.focus()
    }
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
    if (tooltipInstance?.contains(event.target)) {
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
      dismissTooltip()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedPoint) return
      event.preventDefault()
      if (tooltipIsSticky()) {
        pinnedKey = pinnedKey ? null : focusedPoint.key
        paintFocus(focusedPoint, focusPointsForPoint(focusedPoint))
      }
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
    if (event.target === surface?.element && suppressNextSurfaceFocus) {
      suppressNextSurfaceFocus = false
      return
    }
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
      syncTooltip()
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
      destroyTooltip()
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
    const input = resolveTooltipInput(options.definition.tooltip)
    if (!input || !point || !surface) {
      tooltipInstance?.hide()
      return
    }
    if (tooltipExtension !== input.extension || !tooltipInstance) {
      destroyTooltip()
      tooltipExtension = input.extension
      tooltipInstance = input.extension.create({
        container,
        dismiss: dismissTooltip,
        bodyChange: () => options.onTooltipBodyChange,
      })
    }
    const instance = tooltipInstance
    instance.update(input.options)
    instance.paint({
      point,
      points,
      scene,
      surface,
      pointer: pointerPosition,
      pinned: pinnedKey !== null,
    })
  }

  function syncTooltip() {
    const input = resolveTooltipInput(options.definition.tooltip)
    if (!input) {
      tooltipInstance?.update(emptyTooltipOptions)
      tooltipInstance?.hide()
    } else if (input.extension !== tooltipExtension) {
      destroyTooltip()
    } else {
      tooltipInstance?.update(input.options)
    }
  }

  function destroyTooltip() {
    tooltipInstance?.destroy()
    tooltipInstance = undefined
    tooltipExtension = undefined
  }

  function tooltipIsSticky() {
    const input = resolveTooltipInput(options.definition.tooltip)
    return Boolean(input && input.options.sticky !== false)
  }

  function tooltipTracksPointer() {
    const input = resolveTooltipInput(options.definition.tooltip)
    const anchor = input?.options.anchor
    return anchor === 'pointer' || typeof anchor === 'function'
  }
}

const emptyTooltipOptions: ChartTooltipOptions<any, any, any> = {}

function resolveTooltipInput<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  input: false | ChartTooltipInput<TDatum, TXValue, TYValue> | undefined,
): {
  extension: ChartTooltipExtension
  options: ChartTooltipOptions<TDatum, TXValue, TYValue>
} | null {
  if (!input) return null
  return 'create' in input
    ? {
        extension: input as ChartTooltipExtension,
        options: emptyTooltipOptions,
      }
    : {
        extension: input.use as ChartTooltipExtension,
        options: input,
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
