import { createChartRuntime } from './runtime'
import { resolveChartHostTabIndex } from './adapter-shared'
import { createDomTextMeasurer } from './dom-text'
import { findNearestPoint, viewportInteractionPoints } from './scene'
import { focusDisabled } from './focus-disabled'
import { nearestPoint } from './nearest'
import { connectRendererTooltipMotion } from './renderer-motion-internal'
import {
  chartPointFromNavigationOrder,
  chartPointFromSceneOrder,
  resolveChartFocusStrategy,
  resolveChartPointerFocus,
  restoreChartFocusPoint,
  sameChartPointIdentity,
} from './interaction'
import {
  createChartCursorHostSession,
  type ChartCursorHostSession,
} from './cursor-host-contract'
import type {
  ChartInteractionController,
  ChartPointerResolution,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartHostControlExtension,
  ChartHostControlInstance,
  ChartSurface,
  ChartTooltipExtension,
  ChartTooltipExtensionInstance,
} from './dom-types'
import type {
  ChartAnimationOptions,
  ChartCursorBinding,
  ChartCursorPresentation,
  ChartFocusMode,
  ChartFocusSource,
  ChartFocusStrategy,
  ChartHostControl,
  ChartPoint,
  ChartRuntime,
  ChartScene,
  ChartSpatialIndex,
  ChartTooltipInput,
  ChartTooltipOptions,
  ChartTooltipPosition,
  ChartMotionTransition,
  ChartValue,
} from './types'

type HostRenderReason = 'update' | 'resize' | 'layout'
type FocusOwner = 'pointer' | 'keyboard' | 'controlled'

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
  resolveTooltipInput(initialOptions.definition.tooltip)
  let options = initialOptions
  let scene!: ChartScene<TDatum, TXValue, TYValue>
  let interactionScene!: ChartScene<TDatum, TXValue, TYValue>
  let focusedPoint: ChartPoint<TDatum, TXValue, TYValue> | null = null
  let focusSource: ChartFocusSource = 'pointer'
  let focusOwner: FocusOwner | null = null
  let pointerPosition: ChartTooltipPosition | null = null
  let pinnedKey: string | null = null
  let observer: ResizeObserver | undefined
  let renderFrame: number | undefined
  let forceScheduledRender = false
  let scheduledRenderReason: Exclude<HostRenderReason, 'update'> | undefined
  let destroyed = false
  let hasRendered = false
  let surface: ChartSurface<TDatum, TXValue, TYValue> | undefined
  let unsubscribePresentation: (() => void) | undefined
  let renderingSurface = false
  let paintingFocus = false
  let tooltipExtension: ChartTooltipExtension | undefined
  let tooltipInstance:
    ChartTooltipExtensionInstance<TDatum, TXValue, TYValue> | undefined
  let suppressNextSurfaceFocus = false
  let spatialIndex: ChartSpatialIndex<TDatum, TXValue, TYValue> | undefined
  const controlInstances = new Map<
    string,
    {
      extension: ChartHostControlExtension
      instance: ChartHostControlInstance
    }
  >()
  let cursorSession:
    ChartCursorHostSession<TDatum, TXValue, TYValue> | undefined
  let cursorMode: ChartCursorBinding['mode'] | undefined
  let cursorMatch: 'x' | 'y' | 'xy' | undefined
  let cursorExtension: ChartCursorBinding['use'] | undefined
  let renderedCursorBinding:
    ChartCursorBinding<TDatum, TXValue, TYValue> | undefined
  let unsubscribeCursor: (() => void) | undefined
  let cursorPresentation: ChartCursorPresentation<TXValue, TYValue> | null =
    null
  let hasCursorPresentation = false
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
    const previousCursorPresentation = cursorPresentation
    const previousCursorBinding = renderedCursorBinding
    scene = createHostedScene(createScene())
    interactionScene = scene
    if (!surface) {
      surface = options.renderer.mount(container, scheduleRender)
      subscribeToPresentation()
    } else if (surface.renderer !== options.renderer) {
      unsubscribePresentation?.()
      unsubscribePresentation = undefined
      destroyTooltip()
      destroyHostControls()
      surface.destroy()
      container.replaceChildren()
      surface = options.renderer.mount(container, scheduleRender)
      subscribeToPresentation()
      hasRendered = false
    }
    renderingSurface = true
    try {
      surface.render(scene, {
        ariaLabel: options.ariaLabel,
        ariaDescription: options.ariaDescription,
        className: options.className,
        tabIndex: resolveChartHostTabIndex(
          options.definition,
          options.tabIndex,
        ),
        idPrefix: options.idPrefix,
        animation: hasRendered
          ? resolveAnimation(options.definition.svgAnimation, container, reason)
          : undefined,
      })
    } finally {
      renderingSurface = false
    }
    syncHostControls()
    hasRendered = true
    const presentedPoints = interactionPoints()
    spatialIndex =
      options.definition.focus === false
        ? undefined
        : options.definition.spatialIndex?.(
            viewportInteractionPoints(scene, scene.points),
            { scene },
          )
    const nextCursorBinding = cursorBinding()
    renderedCursorBinding = nextCursorBinding
    if (nextCursorBinding) {
      applyCursorState(true)
    } else if (previousCursorBinding) {
      cursorPresentation = null
      focusedPoint = null
      pinnedKey = null
      pointerPosition = null
      focusOwner = null
      paintFocus(null, [])
      if (previousFocusedPoint) {
        options.onFocusChange?.(null)
        options.onFocusGroupChange?.([])
      }
    } else {
      cursorPresentation = null
      const trackedPointer =
        (focusOwner === 'pointer' ||
          (focusOwner === 'controlled' && focusSource === 'pointer')) &&
        pinnedKey === null
          ? pointerPosition
          : null
      const nextFocusedPoints = trackedPointer
        ? resolvePointerFocus(trackedPointer.x, trackedPointer.y, maxDistance())
        : previousFocusedPoint
          ? (() => {
              const restored = restoreChartFocusPoint(
                presentedPoints,
                previousFocusedPoint,
              )
              return restored
                ? focusPointsForPoint(restored, presentedPoints)
                : []
            })()
          : []
      const nextFocusedPoint = nextFocusedPoints[0] ?? null
      focusedPoint = nextFocusedPoint
      if (!nextFocusedPoint) pinnedKey = null
      if (
        previousFocusedPoint ||
        nextFocusedPoint ||
        previousCursorPresentation
      ) {
        if (!trackedPointer) focusSource = 'restored'
        paintFocus(nextFocusedPoint, nextFocusedPoints)
        options.onFocusChange?.(nextFocusedPoint)
        options.onFocusGroupChange?.(nextFocusedPoints)
      }
    }
    const onRender = options.onRender
    if (onRender) {
      onRender({ container, scene, surface, interaction })
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

  const cursorBinding = ():
    ChartCursorBinding<TDatum, TXValue, TYValue> | undefined =>
    options.definition.cursor

  const cursorIsPinned = () => cursorSession?.getState()?.pinned === true

  const interactionIsPinned = () => pinnedKey !== null || cursorIsPinned()

  const configureCursorController = () => {
    const nextBinding = cursorBinding()
    if (nextBinding) hasCursorPresentation = true
    const nextController = nextBinding?.controller
    const nextMode = nextBinding?.mode
    const nextMatch =
      nextBinding?.mode === 'focus' ? (nextBinding.match ?? 'xy') : undefined
    if (
      nextController === cursorSession?.controller &&
      nextMode === cursorMode &&
      nextMatch === cursorMatch &&
      nextBinding?.use === cursorExtension
    ) {
      return
    }
    unsubscribeCursor?.()
    unsubscribeCursor = undefined
    cursorSession?.destroy()
    cursorSession = nextBinding
      ? createChartCursorHostSession(nextBinding)
      : undefined
    cursorMode = nextMode
    cursorMatch = nextMatch
    cursorExtension = nextBinding?.use
    unsubscribeCursor = cursorSession?.subscribe(() => {
      if (!destroyed && hasRendered) applyCursorState(false)
    })
  }

  const applyCursorState = (notifyRestored: boolean) => {
    const binding = cursorBinding()
    if (!binding) {
      cursorPresentation = null
      return
    }
    const session = cursorSession
    if (!session) return
    const state = session.getState()
    if (state?.source !== 'pointer' || !session.owns(state)) {
      pointerPosition = null
    }
    cursorPresentation = session.resolvePresentation(scene, binding, state)
    const previous = focusedPoint
    if (binding.mode === 'focus') {
      const focus = resolveChartFocusStrategy(options.definition.focus)
      const points = session.resolveFocus(
        interactionPoints(),
        binding,
        state,
        focus,
      )
      const point = points[0] ?? null
      if (state) focusSource = state.source
      pinnedKey = state?.pinned && point ? point.key : null
      focusedPoint = point
      paintFocus(point, points)
      if (
        !sameChartPointIdentity(previous, point) ||
        (notifyRestored && (previous !== null || point !== null))
      ) {
        options.onFocusChange?.(point)
        options.onFocusGroupChange?.(points)
      }
      return
    }

    pinnedKey = null
    focusedPoint = null
    paintFocus(null, [])
    if (previous) {
      options.onFocusChange?.(null)
      options.onFocusGroupChange?.([])
    }
  }

  const publishFocusCursor = (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    pinned = interactionIsPinned(),
  ) => {
    const binding = cursorBinding()
    if (binding?.mode !== 'focus') return false
    const session = cursorSession
    if (!session) return false
    const point = points[0]
    if (!point) {
      session.clearOwnedTransient()
      return true
    }
    session.publish(
      session.createFocusState(scene, binding, {
        primary: point,
        group: points,
        source: focusSource,
        pinned,
      }),
    )
    return true
  }

  const updateFocus = (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    forcePaint = false,
  ) => {
    const point = points[0] ?? null
    if (publishFocusCursor(points)) return
    if (sameChartPointIdentity(point, focusedPoint)) {
      focusedPoint = point
      if (forcePaint) paintFocus(point, points)
      return
    }
    focusedPoint = point
    paintFocus(point, points)
    options.onFocusChange?.(point)
    options.onFocusGroupChange?.(points)
  }

  const dismissTooltip = () => {
    const binding = cursorBinding()
    if (!focusedPoint && !pinnedKey && !cursorSession?.getState()) return
    const restoreFocus = Boolean(
      tooltipInstance?.contains(container.ownerDocument.activeElement),
    )
    pinnedKey = null
    pointerPosition = null
    focusOwner = null
    if (binding) cursorSession?.clear()
    else updateFocus([])
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
    paintingFocus = true
    let paintedScene: ChartScene<TDatum, TXValue, TYValue> | void
    try {
      const focus = point
        ? {
            primary: point,
            group: points,
            source: focusSource,
            pinned: interactionIsPinned(),
          }
        : null
      paintedScene = hasCursorPresentation
        ? surface?.paintFocus(focus, pointerPosition, cursorPresentation)
        : surface?.paintFocus(focus, pointerPosition)
    } finally {
      paintingFocus = false
    }
    interactionScene = paintedScene ?? scene
    paintTooltip(point, points)
  }

  const resolveClientPointer = (clientX: number, clientY: number) => {
    const position = surface?.clientToScene?.(scene, clientX, clientY)
    if (!position) return null
    return {
      position,
      points: resolvePointerFocus(position.x, position.y, maxDistance()),
    }
  }
  const pointsAtPointer = (clientX: number, clientY: number) => {
    const resolved = resolveClientPointer(clientX, clientY)
    pointerPosition = resolved?.position ?? null
    return resolved?.points ?? []
  }
  const interaction: ChartInteractionController<TDatum, TXValue, TYValue> = {
    clientToScene(clientX, clientY) {
      if (destroyed) return null
      return surface?.clientToScene?.(scene, clientX, clientY) ?? null
    },
    resolvePointer(clientX, clientY) {
      if (destroyed) return null
      const resolved = resolveClientPointer(clientX, clientY)
      const point = resolved?.points[0]
      return resolved && point
        ? {
            position: resolved.position,
            point,
            points: resolved.points,
          }
        : null
    },
    setControlledFocus(target, controlledOptions = {}) {
      if (destroyed) return
      focusOwner = 'controlled'
      if (!target) {
        focusSource = controlledOptions.source ?? 'programmatic'
        pointerPosition = null
        pinnedKey = null
        updateFocus([])
        focusOwner = null
        return
      }

      let resolution: ChartPointerResolution<TDatum, TXValue, TYValue> | null
      let targetPoint: ChartPoint<TDatum, TXValue, TYValue>
      if (isPointerResolution(target)) {
        resolution = target
        targetPoint = target.point
      } else {
        resolution = null
        targetPoint = target
      }
      focusSource =
        controlledOptions.source ??
        (resolution === null ? 'programmatic' : 'pointer')
      const points = interactionPoints()
      const point = restoreChartFocusPoint(points, targetPoint)
      pointerPosition = resolution?.position ?? null
      if (!point) {
        pinnedKey = null
        updateFocus([])
        focusOwner = null
        return
      }

      const focusPoints = focusPointsForPoint(point, points)
      pinnedKey =
        controlledOptions.pinned &&
        (tooltipIsSticky() || cursorBinding()?.pin === true)
          ? point.key
          : null
      if (sameChartPointIdentity(point, focusedPoint)) {
        focusedPoint = point
        paintFocus(point, focusPoints)
        return
      }
      updateFocus(focusPoints)
    },
  }

  const scenePositionAtPointer = (clientX: number, clientY: number) => {
    const position = surface?.clientToScene?.(scene, clientX, clientY)
    pointerPosition = position ?? null
    return position
  }

  const updateFreeCursorAtPointer = (clientX: number, clientY: number) => {
    const binding = cursorBinding()
    if (binding?.mode !== 'free') return false
    if (cursorIsPinned()) return true
    const position = scenePositionAtPointer(clientX, clientY)
    if (!position || !plotContains(scene, position)) {
      pointerPosition = null
      cursorSession?.clearOwnedTransient()
      return true
    }
    const session = cursorSession
    if (!session) return false
    session.publish(
      session.createFreeState(scene, binding, position, 'pointer', false),
    )
    return true
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (controlContains(event.target)) {
      if (!interactionIsPinned()) {
        pointerPosition = null
        updateFocus([])
      }
      return
    }
    if (options.definition.pointer === false || interactionIsPinned()) return
    focusOwner = 'pointer'
    focusSource = 'pointer'
    if (updateFreeCursorAtPointer(event.clientX, event.clientY)) return
    updateFocus(
      pointsAtPointer(event.clientX, event.clientY),
      tooltipTracksPointer(),
    )
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (options.definition.pointer === false || interactionIsPinned()) return
    focusOwner = 'pointer'
    focusSource = 'pointer'
    updateFreeCursorAtPointer(event.clientX, event.clientY)
  }

  const clearPointerFocus = ({ relatedTarget }: MouseEvent | PointerEvent) => {
    if (
      options.definition.pointer !== false &&
      focusOwner === 'pointer' &&
      !interactionIsPinned() &&
      !(
        view &&
        relatedTarget instanceof view.Node &&
        container.contains(relatedTarget)
      )
    ) {
      pointerPosition = null
      const binding = cursorBinding()
      if (binding) cursorSession?.clearOwnedTransient()
      else updateFocus([])
      focusOwner = null
    }
  }
  const clearKeyboardFocus = ({ relatedTarget }: FocusEvent) => {
    if (
      focusOwner === 'keyboard' &&
      !pinnedKey &&
      !(
        view &&
        relatedTarget instanceof view.Node &&
        container.contains(relatedTarget)
      )
    ) {
      pointerPosition = null
      const binding = cursorBinding()
      if (binding) cursorSession?.clearOwnedTransient()
      else updateFocus([])
      focusOwner = null
    }
  }

  const handleClick = (event: MouseEvent) => {
    if (controlContains(event.target)) return
    if (options.definition.pointer === false) return
    const activeTooltip = tooltipInstance
    const NodeConstructor = container.ownerDocument.defaultView?.Node
    const originatedInTooltip = NodeConstructor
      ? event
          .composedPath()
          .some(
            (target) =>
              target instanceof NodeConstructor &&
              activeTooltip?.contains(target),
          )
      : activeTooltip?.contains(event.target)
    if (activeTooltip && originatedInTooltip) {
      return
    }
    focusOwner = 'pointer'
    const binding = cursorBinding()
    if (binding?.mode === 'free') {
      const state = cursorSession?.getState()
      if (!state) {
        updateFreeCursorAtPointer(event.clientX, event.clientY)
      }
      const current = cursorSession?.getState()
      if (binding.pin && current) {
        if (current.pinned) {
          cursorSession?.clear()
        } else {
          cursorSession?.publish({ ...current, pinned: true })
        }
      }
      options.onSelect?.(null)
      return
    }
    const points = pointsAtPointer(event.clientX, event.clientY)
    focusSource = 'pointer'
    const point = points[0] ?? null
    let pinChanged = false
    const canPin = tooltipIsSticky() || binding?.pin === true
    if (canPin) {
      if (interactionIsPinned()) {
        pinnedKey = null
        pinChanged = true
        if (binding) cursorSession?.clear()
      } else if (point) {
        pinnedKey = point.key
        pinChanged = true
      }
    }
    if (!(binding && canPin && pinChanged && !pinnedKey)) {
      updateFocus(points, pinChanged)
    }
    options.definition.selection?.change(point, 'pointer')
    options.onSelect?.(point)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (controlContains(event.target)) return
    const binding = cursorBinding()
    if (event.key === 'Escape' && cursorSession?.getState()) {
      event.preventDefault()
      dismissTooltip()
      return
    }
    if (event.key === 'Escape' && pinnedKey) {
      event.preventDefault()
      dismissTooltip()
      return
    }
    if (options.definition.keyboard === false || binding?.mode === 'free') {
      return
    }
    const points = interactionPoints()
    if (!points.length) return
    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedPoint) return
      event.preventDefault()
      const point = focusedPoint
      const canPin = tooltipIsSticky() || binding?.pin === true
      if (binding?.mode === 'focus' && canPin) {
        if (interactionIsPinned()) {
          pinnedKey = null
          cursorSession?.clear()
        } else {
          pinnedKey = point.key
          publishFocusCursor(focusPointsForPoint(point), true)
        }
      } else if (tooltipIsSticky()) {
        pinnedKey = pinnedKey ? null : point.key
        paintFocus(point, focusPointsForPoint(point))
      }
      options.definition.selection?.change(point, 'keyboard')
      options.onSelect?.(point)
      return
    }
    const focus = resolveRendererFocusStrategy(options.definition.focus)
    const point = focus
      ? chartPointFromNavigationOrder(
          focus.navigation(points),
          focusedPoint,
          event.key,
        )
      : chartPointFromSceneOrder(points, focusedPoint, event.key)
    if (point === undefined) return
    event.preventDefault()
    pointerPosition = null
    focusOwner = 'keyboard'
    focusSource = 'keyboard'
    updateFocus(point ? focusPointsForPoint(point) : [])
  }
  const handleFocus = (event: FocusEvent) => {
    if (controlContains(event.target)) {
      if (!pinnedKey) {
        pointerPosition = null
        updateFocus([])
      }
      return
    }
    if (event.target === surface?.element && suppressNextSurfaceFocus) {
      suppressNextSurfaceFocus = false
      return
    }
    if (
      options.definition.keyboard !== false &&
      cursorBinding()?.mode !== 'free' &&
      event.target === surface?.element &&
      !focusedPoint
    ) {
      const focus = resolveRendererFocusStrategy(options.definition.focus)
      const points = interactionPoints()
      const point = focus
        ? focus.navigation(points)[0]
        : chartPointFromSceneOrder(points, null, 'Home')
      pointerPosition = null
      focusOwner = 'keyboard'
      focusSource = 'keyboard'
      updateFocus(point ? focusPointsForPoint(point) : [])
    }
  }
  container.addEventListener('pointermove', handlePointerMove)
  container.addEventListener('pointerdown', handlePointerDown)
  container.addEventListener('pointercancel', clearPointerFocus)
  container.addEventListener('mouseleave', clearPointerFocus)
  container.addEventListener('click', handleClick)
  container.addEventListener('keydown', handleKeyDown)
  container.addEventListener('focusin', handleFocus)
  container.addEventListener('focusout', clearKeyboardFocus)
  fontSet?.addEventListener?.('loadingdone', handleFontLoad)
  configureCursorController()
  render()
  configureObserver()

  return {
    interaction,
    update(nextOptions) {
      if (destroyed) return
      resolveTooltipInput(nextOptions.definition.tooltip)
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
      const pointerDisabled =
        options.definition.pointer !== false &&
        nextOptions.definition.pointer === false &&
        focusOwner === 'pointer'
      options = nextOptions
      configureCursorController()
      syncTooltip()
      if (pointerDisabled) {
        pointerPosition = null
        pinnedKey = null
        focusOwner = null
        updateFocus([])
      }
      if (!tooltipIsSticky()) pinnedKey = null
      if (needsRender) {
        render(
          false,
          layoutChanged ? 'layout' : sizeChanged ? 'resize' : 'update',
        )
      } else {
        if (cursorBinding()) {
          applyCursorState(false)
        } else if (focusedPoint) {
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
      unsubscribeCursor?.()
      unsubscribeCursor = undefined
      cursorSession?.destroy()
      cursorSession = undefined
      cursorMode = undefined
      cursorMatch = undefined
      cursorExtension = undefined
      fontSet?.removeEventListener?.('loadingdone', handleFontLoad)
      if (renderFrame !== undefined) {
        view?.cancelAnimationFrame?.(renderFrame)
      }
      destroyTooltip()
      destroyHostControls()
      unsubscribePresentation?.()
      unsubscribePresentation = undefined
      surface?.destroy()
      runtime.destroy()
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointercancel', clearPointerFocus)
      container.removeEventListener('mouseleave', clearPointerFocus)
      container.removeEventListener('click', handleClick)
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focusin', handleFocus)
      container.removeEventListener('focusout', clearKeyboardFocus)
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
      {
        measureText: options.measureText ?? domText.measureText,
        typography: domText.typography(),
      },
    )
  }

  function syncHostControls() {
    const retained = new Set<string>()
    for (const control of scene.controls ?? []) {
      const extension = control.extension as ChartHostControlExtension
      const identity = `${extension.id}:${control.key}`
      retained.add(identity)
      let current = controlInstances.get(identity)
      if (current && current.extension !== extension) {
        current.instance.destroy()
        controlInstances.delete(identity)
        current = undefined
      }
      if (!current) {
        current = {
          extension,
          instance: extension.create({ container, surface: surface! }),
        }
        controlInstances.set(identity, current)
      }
      current.instance.update(control, scene)
    }
    for (const [identity, current] of controlInstances) {
      if (retained.has(identity)) continue
      current.instance.destroy()
      controlInstances.delete(identity)
    }
  }

  function destroyHostControls() {
    for (const current of controlInstances.values()) {
      current.instance.destroy()
    }
    controlInstances.clear()
  }

  function controlContains(target: EventTarget | null) {
    for (const current of controlInstances.values()) {
      if (current.instance.contains?.(target)) return true
    }
    return false
  }

  function resolvePointerFocus(
    x: number,
    y: number,
    maxDistance: number,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
    const points = interactionPoints()
    const focus = resolveRendererFocusStrategy(options.definition.focus)
    const focused = resolveChartPointerFocus(
      interactionScene,
      focus,
      x,
      y,
      maxDistance,
      points,
    )
    if (focused) return focused
    const presentationPoints = surface?.getPresentationPoints?.()
    const candidate =
      presentationPoints !== undefined
        ? nearestPoint(points, x, y, maxDistance)
        : spatialIndex && interactionScene === scene
          ? spatialIndex.findNearest(x, y, maxDistance)
          : findNearestPoint(interactionScene, x, y, maxDistance, points)
    const point = candidate ? restoreChartFocusPoint(points, candidate) : null
    return point ? [point] : []
  }

  function interactionPoints() {
    const points = (surface?.getPresentationPoints?.() ??
      interactionScene.points) as readonly ChartPoint<
      TDatum,
      TXValue,
      TYValue
    >[]
    return viewportInteractionPoints(scene, points)
  }

  function focusPointsForPoint(
    point: ChartPoint<TDatum, TXValue, TYValue>,
    points = interactionPoints(),
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[] {
    return (
      resolveRendererFocusStrategy(options.definition.focus)?.group(points, {
        point,
      }) ?? [point]
    )
  }

  function subscribeToPresentation() {
    unsubscribePresentation = surface?.subscribePresentationPoints?.(
      handlePresentationPoints,
    )
  }

  function handlePresentationPoints(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) {
    if (destroyed || renderingSurface || paintingFocus) return
    if (cursorBinding()) {
      applyCursorState(false)
      return
    }
    const visiblePoints = viewportInteractionPoints(scene, points)
    if (pointerPosition && pinnedKey === null) {
      updateFocus(
        resolvePointerFocus(
          pointerPosition.x,
          pointerPosition.y,
          maxDistance(),
        ),
        true,
      )
      return
    }
    if (!focusedPoint) return
    const point = restoreChartFocusPoint(visiblePoints, focusedPoint)
    updateFocus(point ? focusPointsForPoint(point, visiblePoints) : [], true)
  }

  function maxDistance() {
    return options.definition.maxFocusDistance ?? 48
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
      tooltipInstance = input.extension.create(
        connectRendererTooltipMotion(
          surface.renderer,
          {
            container,
            dismiss: dismissTooltip,
            bodyChange: () => options.onTooltipBodyChange,
          },
          resolveTooltipMotion,
        ),
      )
    }
    const instance = tooltipInstance
    instance.update(input.options)
    instance.paint({
      point,
      points,
      scene,
      surface,
      pointer: pointerPosition,
      focus: {
        primary: point,
        group: points,
        source: focusSource,
        pinned: interactionIsPinned(),
      },
      pinned: interactionIsPinned(),
    })
  }

  function resolveTooltipMotion(): false | ChartMotionTransition | undefined {
    const definition = options.definition.motion
    if (definition === false) return false
    return typeof definition === 'function' ? undefined : definition?.transition
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
    return (
      anchor === 'pointer' ||
      typeof anchor === 'function' ||
      (typeof anchor === 'object' &&
        (anchor.x === 'pointer' || anchor.y === 'pointer'))
    )
  }
}

const emptyTooltipOptions: ChartTooltipOptions<any, any, any> = {}

function createHostedScene<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
): ChartScene<TDatum, TXValue, TYValue> {
  const fallbackKeys = new Set(
    (scene.controls ?? []).flatMap((control: ChartHostControl) =>
      control.fallbackNodeKey ? [control.fallbackNodeKey] : [],
    ),
  )
  if (!fallbackKeys.size) return scene
  return {
    ...scene,
    nodes: scene.nodes.filter((node) => !fallbackKeys.has(node.key)),
  }
}

function isPointerResolution<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  target:
    | ChartPointerResolution<TDatum, TXValue, TYValue>
    | ChartPoint<TDatum, TXValue, TYValue>,
): target is ChartPointerResolution<TDatum, TXValue, TYValue> {
  return 'position' in target && 'point' in target && 'points' in target
}

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
  const extension = 'create' in input ? input : input.use
  if (extension.__chartTooltipHost !== 'dom') {
    throw new TypeError(
      'DOM chart hosts require a tooltip extension from @tanstack/charts/tooltip.',
    )
  }
  const domExtension = extension as ChartTooltipExtension
  return 'create' in input
    ? {
        extension: domExtension,
        options: emptyTooltipOptions,
      }
    : {
        extension: domExtension,
        options: input,
      }
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function resolveRendererFocusStrategy<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  focus: ChartFocusMode<TDatum, TXValue, TYValue> | undefined,
): ChartFocusStrategy<TDatum, TXValue, TYValue> | undefined {
  if (focus === false) return focusDisabled
  return resolveChartFocusStrategy(focus)
}

function plotContains(
  scene: ChartScene,
  position: Readonly<{ x: number; y: number }>,
) {
  return (
    position.x >= scene.chart.x &&
    position.x <= scene.chart.x + scene.chart.width &&
    position.y >= scene.chart.y &&
    position.y <= scene.chart.y + scene.chart.height
  )
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
