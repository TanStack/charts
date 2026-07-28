import { createChartRuntime, chartInputsEqual } from './runtime'
import { createDomTextMeasurer } from './dom-text'
import { reconcileChartSvg } from './reconcile'
import { findNearestPoint } from './scene'
import { renderChartSvg } from './svg'
import type {
  ChartHost,
  ChartHostOptions,
  ChartPoint,
  ChartRuntime,
  ChartScene,
  ChartSpatialIndex,
  ChartValue,
} from './types'

/**
 * Mounts a chart and owns the runtime until the returned host is destroyed.
 * Pass a runtime that already rendered initial markup to preserve its prepared
 * data across adapter prerender and DOM mounting.
 */
export function mountChart<
  TDatum,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartHostOptions<TDatum, TInput, TXValue, TYValue>,
  runtime: ChartRuntime<TDatum, TInput, TXValue, TYValue> = createChartRuntime<
    TDatum,
    TInput,
    TXValue,
    TYValue
  >(),
): ChartHost<TDatum, TInput, TXValue, TYValue> {
  assertRequiredInput(initialOptions)
  let options = initialOptions
  let scene!: ChartScene<TDatum, TXValue, TYValue>
  let focusedKey: string | null = null
  let pinnedKey: string | null = null
  let observer: ResizeObserver | undefined
  let renderFrame: number | undefined
  let forceScheduledRender = false
  let destroyed = false
  let hasRendered = false
  let cancelAnimation = () => {}
  let tooltipElement: HTMLDivElement | undefined
  let spatialIndex: ChartSpatialIndex<TDatum, TXValue, TYValue> | undefined
  const previousPosition = container.style.position
  const view = container.ownerDocument.defaultView
  const computedPosition = view?.getComputedStyle(container).position
  const ownsPosition = !computedPosition || computedPosition === 'static'
  const domText = createDomTextMeasurer(container)
  const fontSet = container.ownerDocument.fonts
  if (ownsPosition) container.style.position = 'relative'

  const render = (refreshText = false) => {
    if (destroyed) return
    if (refreshText && !options.measureText) domText.refresh()
    const previousFocusedKey = focusedKey
    scene = createScene()
    cancelAnimation()
    const renderSvg = options.renderSvg ?? renderChartSvg
    cancelAnimation = reconcileChartSvg(
      container,
      renderSvg(scene, {
        ...options,
        tabIndex: options.keyboard === false ? -1 : (options.tabIndex ?? 0),
      }),
      hasRendered ? resolveAnimation(options.animate, container) : undefined,
    )
    hasRendered = true
    spatialIndex = options.spatialIndex?.(scene.points)
    const nextFocusedPoint = previousFocusedKey
      ? (scene.points.find((point) => point.key === previousFocusedKey) ?? null)
      : null
    focusedKey = nextFocusedPoint?.key ?? null
    if (!nextFocusedPoint) pinnedKey = null
    if (previousFocusedKey) {
      const nextFocusedPoints = nextFocusedPoint
        ? focusPointsForPoint(nextFocusedPoint)
        : []
      paintFocus(nextFocusedPoint, nextFocusedPoints)
      options.onFocusChange?.(nextFocusedPoint)
      options.onFocusGroupChange?.(nextFocusedPoints)
    }
    const onRender = options.onRender
    if (onRender) {
      const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
      if (svg) onRender({ container, scene, svg })
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
      scheduleRender()
    })
    observer.observe(container)
  }

  const scheduleRender = (force = false) => {
    forceScheduledRender ||= force
    if (renderFrame !== undefined) return
    if (!view?.requestAnimationFrame) {
      const nextWidth = currentWidth()
      const shouldRender =
        forceScheduledRender ||
        (nextWidth !== undefined && nextWidth !== scene.width)
      forceScheduledRender = false
      if (shouldRender) render(true)
      return
    }
    renderFrame = view.requestAnimationFrame(() => {
      renderFrame = undefined
      const nextWidth = currentWidth()
      const shouldRender =
        forceScheduledRender ||
        (nextWidth !== undefined && nextWidth !== scene.width)
      forceScheduledRender = false
      if (shouldRender) render(true)
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
    const nextKey = point?.key ?? null
    if (nextKey === focusedKey) return
    focusedKey = nextKey
    paintFocus(point, points)
    options.onFocusChange?.(point)
    options.onFocusGroupChange?.(points)
  }

  const paintFocus = (
    point: ChartPoint<TDatum, TXValue, TYValue> | null,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => {
    const focus = container.querySelector<SVGCircleElement>(
      '[data-ts-chart-focus]',
    )
    if (focus) {
      if (point) {
        focus.setAttribute('cx', String(point.x))
        focus.setAttribute('cy', String(point.y))
        focus.setAttribute('stroke', point.color)
        focus.setAttribute('visibility', 'visible')
      } else {
        focus.setAttribute('visibility', 'hidden')
      }
    }
    paintTooltip(point, points)
  }

  const pointsAtPointer = (clientX: number, clientY: number) => {
    const svg = container.querySelector('svg')
    if (!svg) return []
    const bounds = svg.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return []
    const x = ((clientX - bounds.left) / bounds.width) * scene.width
    const y = ((clientY - bounds.top) / bounds.height) * scene.height
    const maxDistance = options.maxFocusDistance ?? 48
    return resolvePointerFocus(x, y, maxDistance)
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
      if (!focusedKey) return
      event.preventDefault()
      options.onSelect?.(
        scene.points.find((point) => point.key === focusedKey) ?? null,
      )
      return
    }
    const points =
      options.focus?.navigation(scene.points) ?? navigationPoints(scene.points)
    const currentIndex = focusedKey
      ? points.findIndex((point) => point.key === focusedKey)
      : -1
    let nextIndex: number | undefined
    switch (event.key) {
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
    }
    if (nextIndex === undefined) return
    event.preventDefault()
    const point = points[nextIndex]
    updateFocus(point ? focusPointsForPoint(point) : [])
  }
  const handleFocus = (event: FocusEvent) => {
    if (
      options.keyboard !== false &&
      event.target === container.querySelector('svg') &&
      !focusedKey
    ) {
      const point = (options.focus?.navigation(scene.points) ??
        navigationPoints(scene.points))[0]
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
      assertRequiredInput(nextOptions)
      const fontChanged =
        nextOptions.measureText === undefined && domText.refresh()
      const needsRender =
        options.definition !== nextOptions.definition ||
        !chartInputsEqual(
          nextOptions.definition,
          options.input as TInput,
          nextOptions.input as TInput,
        ) ||
        options.height !== nextOptions.height ||
        options.aspectRatio !== nextOptions.aspectRatio ||
        options.width !== nextOptions.width ||
        options.initialWidth !== nextOptions.initialWidth ||
        options.ariaLabel !== nextOptions.ariaLabel ||
        options.ariaDescription !== nextOptions.ariaDescription ||
        options.className !== nextOptions.className ||
        options.tabIndex !== nextOptions.tabIndex ||
        options.idPrefix !== nextOptions.idPrefix ||
        options.renderSvg !== nextOptions.renderSvg ||
        options.keyboard !== nextOptions.keyboard ||
        options.measureText !== nextOptions.measureText ||
        fontChanged
      const observerChanged = options.width !== nextOptions.width
      const spatialIndexChanged =
        options.spatialIndex !== nextOptions.spatialIndex
      options = nextOptions
      if (!tooltipIsSticky()) pinnedKey = null
      if (needsRender) render()
      else {
        if (spatialIndexChanged) {
          spatialIndex = options.spatialIndex?.(scene.points)
        }
        if (focusedKey) {
          const point =
            scene.points.find((candidate) => candidate.key === focusedKey) ??
            null
          paintFocus(point, point ? focusPointsForPoint(point) : [])
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
      cancelAnimation()
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
      options.input as TInput,
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
    tooltipElement.style.left = `${clampPercent((point.x / scene.width) * 100)}%`
    tooltipElement.style.top = `${clampPercent((point.y / scene.height) * 100)}%`
    tooltipElement.removeAttribute('hidden')
  }

  function tooltipIsSticky() {
    return (
      typeof options.tooltip === 'object' && options.tooltip.sticky === true
    )
  }
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function assertRequiredInput<
  TDatum,
  TInput,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(options: ChartHostOptions<TDatum, TInput, TXValue, TYValue>) {
  if ('chart' in options.definition && !Object.hasOwn(options, 'input')) {
    throw new TypeError('Dynamic chart definitions require an input value')
  }
}

function resolveAnimation(
  animation: ChartHostOptions['animate'],
  container: HTMLElement,
) {
  const resolved = animation === true ? {} : animation || undefined
  if (!resolved) return undefined
  if (
    (resolved.respectReducedMotion ?? true) &&
    container.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
  ) {
    return undefined
  }
  return resolved
}

function navigationPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) {
  return [...points].sort((left, right) => left.x - right.x || left.y - right.y)
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
    transform: 'translate(-50%, calc(-100% - 10px))',
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

function clampPercent(value: number) {
  return Math.max(8, Math.min(92, value))
}
