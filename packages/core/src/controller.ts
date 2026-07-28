import { chartThemeSignature, resolveChartTheme } from './theme'
import { resolveChartSize } from './sizing'
import type {
  ChartController,
  ChartControllerOptions,
  ChartControllerUpdate,
  ChartEnvironment,
  ChartRenderMetrics,
  ChartRenderResult,
  ChartRenderer,
  ChartSize,
} from './types'

type RenderReason = ChartRenderMetrics['reason']

interface ResolvedEnvironment {
  document: Document
  ResizeObserver?: typeof ResizeObserver
  MutationObserver?: typeof MutationObserver
  measure: (container: HTMLElement) => ChartSize
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (handle: number) => void
  getComputedStyle: (element: Element) => CSSStyleDeclaration
  matchMedia: (query: string) => MediaQueryList
  now: () => number
}

export function createChartController<TData, TValue = unknown>(
  container: HTMLElement,
  initialOptions: ChartControllerOptions<TData, TValue>,
): ChartController<TData, TValue> {
  const environment = resolveEnvironment(container, initialOptions.environment)
  let options = initialOptions
  let currentResult: ChartRenderResult<TValue, TData> | null = null
  let currentRenderer: ChartRenderer<TData, TValue> | null = null
  let unsubscribeValue: (() => void) | undefined
  let currentAbortController: AbortController | null = null
  let lastSize: ChartSize | null = null
  let lastThemeSignature: string | null = null
  let lastReducedMotion: boolean | null = null
  let contentVersion = 0
  let renderedContentVersion = -1
  let frame: number | null = null
  let destroyed = false
  let renderCount = 0
  let pendingReason: RenderReason = 'resize'

  const mediaQuery = environment.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = () => schedule('theme')
  const reducedMotionQuery = environment.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  const handleReducedMotionChange = () => schedule('preference')

  const resizeObserver = environment.ResizeObserver
    ? new environment.ResizeObserver(() => schedule('resize'))
    : undefined

  const mutationObserver = environment.MutationObserver
    ? new environment.MutationObserver(handleThemeChange)
    : undefined

  resizeObserver?.observe(container)
  observeThemeAncestors(container, mutationObserver)
  mediaQuery.addEventListener?.('change', handleThemeChange)
  reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange)

  function schedule(reason: RenderReason): void {
    if (destroyed) return
    pendingReason = prioritizeReason(pendingReason, reason)
    if (frame !== null) return
    frame = environment.requestAnimationFrame(() => {
      frame = null
      const nextReason = pendingReason
      pendingReason = 'resize'
      try {
        performRender(nextReason)
      } catch (error) {
        if (options.onError) {
          options.onError(error)
        } else {
          queueMicrotask(() => {
            throw error
          })
        }
      }
    })
  }

  function performRender(reason: RenderReason): void {
    if (destroyed) return

    const measured = environment.measure(container)
    const availableSize = withInitialSize(measured, options.initialSize)
    const size = resolveChartSize(availableSize, options.sizing)
    if (size.width <= 0 || size.height <= 0) return

    const theme = resolveChartTheme(container, options.theme, environment)
    const themeSignature = chartThemeSignature(theme)
    const reducedMotion = reducedMotionQuery.matches
    const sizeChanged =
      lastSize?.width !== size.width || lastSize.height !== size.height
    const themeChanged = lastThemeSignature !== themeSignature
    const reducedMotionChanged = lastReducedMotion !== reducedMotion
    const contentChanged = renderedContentVersion !== contentVersion

    if (
      !sizeChanged &&
      !themeChanged &&
      !reducedMotionChanged &&
      !contentChanged &&
      reason !== 'manual'
    ) {
      return
    }

    const nextAbortController = new AbortController()
    const startedAt = environment.now()
    const context = {
      container,
      data: options.data,
      document: environment.document,
      reducedMotion,
      signal: nextAbortController.signal,
      theme,
      ...size,
    }
    const canUpdate =
      currentResult?.update !== undefined &&
      currentRenderer === options.renderer

    if (canUpdate) {
      try {
        currentResult!.update!(context, { reason })
      } catch (error) {
        nextAbortController.abort()
        throw error
      }

      currentAbortController?.abort()
      currentAbortController = nextAbortController
    } else {
      let nextResult: ChartRenderResult<TValue, TData>

      try {
        nextResult = options.renderer(context)
      } catch (error) {
        nextAbortController.abort()
        throw error
      }

      cleanupCurrentRender()
      currentAbortController = nextAbortController
      currentRenderer = options.renderer
      currentResult = nextResult
      container.replaceChildren(nextResult.element)

      if (nextResult.subscribeValue) {
        unsubscribeValue = nextResult.subscribeValue((value) => {
          options.onValueChange?.(value)
        })
      }
    }

    lastSize = size
    lastThemeSignature = themeSignature
    lastReducedMotion = reducedMotion
    renderedContentVersion = contentVersion
    renderCount += 1

    options.onRender?.({
      ...size,
      duration: environment.now() - startedAt,
      reason,
      renderCount,
    })
  }

  function cleanupCurrentRender(): void {
    unsubscribeValue?.()
    unsubscribeValue = undefined
    currentAbortController?.abort()
    currentAbortController = null
    currentResult?.destroy?.()
    currentResult?.element.remove()
    currentResult = null
    currentRenderer = null
  }

  const controller: ChartController<TData, TValue> = {
    get renderCount() {
      return renderCount
    },
    get size() {
      return lastSize
    },
    renderNow() {
      performRender('manual')
    },
    update(nextOptions) {
      const nextRenderer = nextOptions.renderer ?? options.renderer
      const shouldRender =
        ('data' in nextOptions &&
          !inputEqual(nextRenderer, options.data, nextOptions.data as TData)) ||
        ('renderer' in nextOptions &&
          nextOptions.renderer !== options.renderer) ||
        ('sizing' in nextOptions &&
          !chartSizingEqual(nextOptions.sizing, options.sizing)) ||
        ('theme' in nextOptions &&
          !chartThemeInputEqual(nextOptions.theme, options.theme)) ||
        ('initialSize' in nextOptions &&
          !partialSizeEqual(nextOptions.initialSize, options.initialSize))
      options = {
        ...options,
        ...(nextOptions as ChartControllerUpdate<TData, TValue>),
      }
      if (!shouldRender) return
      contentVersion += 1
      schedule('update')
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      mediaQuery.removeEventListener?.('change', handleThemeChange)
      reducedMotionQuery.removeEventListener?.(
        'change',
        handleReducedMotionChange,
      )
      if (frame !== null) environment.cancelAnimationFrame(frame)
      frame = null
      cleanupCurrentRender()
    },
  }

  performRender('initial')
  return controller
}

function resolveEnvironment(
  container: HTMLElement,
  overrides: ChartEnvironment | undefined,
): ResolvedEnvironment {
  const document = overrides?.document ?? container.ownerDocument
  const view = document.defaultView
  const requestAnimationFrame =
    overrides?.requestAnimationFrame ??
    view?.requestAnimationFrame?.bind(view) ??
    ((callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 16) as unknown as number)
  const cancelAnimationFrame =
    overrides?.cancelAnimationFrame ??
    view?.cancelAnimationFrame?.bind(view) ??
    ((handle: number) => clearTimeout(handle))

  return {
    document,
    ResizeObserver:
      overrides?.ResizeObserver ?? view?.ResizeObserver ?? undefined,
    MutationObserver:
      overrides?.MutationObserver ?? view?.MutationObserver ?? undefined,
    measure:
      overrides?.measure ??
      ((element) => {
        const bounds = element.getBoundingClientRect()
        return {
          width: Math.round(bounds.width || element.clientWidth),
          height: Math.round(bounds.height || element.clientHeight),
        }
      }),
    requestAnimationFrame,
    cancelAnimationFrame,
    getComputedStyle:
      overrides?.getComputedStyle ??
      view?.getComputedStyle.bind(view) ??
      (() => {
        throw new Error(
          'TanStack Charts requires getComputedStyle in the chart environment.',
        )
      }),
    matchMedia:
      overrides?.matchMedia ??
      view?.matchMedia?.bind(view) ??
      (() => createFallbackMediaQueryList()),
    now: overrides?.now ?? (() => performance.now()),
  }
}

function withInitialSize(
  measured: ChartSize,
  initialSize: Partial<ChartSize> | undefined,
): ChartSize {
  return {
    width:
      measured.width > 0 ? measured.width : Math.round(initialSize?.width ?? 0),
    height:
      measured.height > 0
        ? measured.height
        : Math.round(initialSize?.height ?? 0),
  }
}

function observeThemeAncestors(
  container: HTMLElement,
  observer: MutationObserver | undefined,
): void {
  if (!observer) return
  let current: HTMLElement | null = container
  while (current) {
    observer.observe(current, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    current = current.parentElement
  }
}

function prioritizeReason(
  current: RenderReason,
  next: RenderReason,
): RenderReason {
  const priority: Record<RenderReason, number> = {
    resize: 0,
    theme: 1,
    preference: 1,
    update: 2,
    initial: 3,
    manual: 4,
  }
  return priority[next] > priority[current] ? next : current
}

function inputEqual<TData, TValue>(
  renderer: ChartRenderer<TData, TValue>,
  previous: TData,
  next: TData,
): boolean {
  return renderer.inputEqual?.(previous, next) ?? Object.is(previous, next)
}

function createFallbackMediaQueryList(): MediaQueryList {
  return {
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  }
}

function chartSizingEqual(
  left: ChartControllerUpdate<unknown>['sizing'],
  right: ChartControllerOptions<unknown>['sizing'],
): boolean {
  if (left === right) return true
  if (!left || !right) return false
  const leftValues = left as Partial<{
    height: number
    aspectRatio: number
    fill: boolean
    minHeight: number
    maxHeight: number
  }>
  const rightValues = right as typeof leftValues
  return (
    leftValues.height === rightValues.height &&
    leftValues.aspectRatio === rightValues.aspectRatio &&
    leftValues.fill === rightValues.fill &&
    leftValues.minHeight === rightValues.minHeight &&
    leftValues.maxHeight === rightValues.maxHeight
  )
}

function partialSizeEqual(
  left: Partial<ChartSize> | undefined,
  right: Partial<ChartSize> | undefined,
): boolean {
  if (left === right) return true
  if (!left || !right) return false
  return left.width === right.width && left.height === right.height
}

function chartThemeInputEqual(
  left: ChartControllerUpdate<unknown>['theme'],
  right: ChartControllerOptions<unknown>['theme'],
): boolean {
  if (left === right) return true
  if (
    !left ||
    !right ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false
  }

  const leftTokens = left.tokens
  const rightTokens = right.tokens
  if (left.mode !== right.mode) return false
  if (leftTokens === rightTokens) return true
  if (!leftTokens || !rightTokens) return false

  const tokenKeys = [
    'background',
    'foreground',
    'muted',
    'grid',
    'axis',
    'tooltipBackground',
    'tooltipForeground',
    'focus',
    'selection',
    'positive',
    'negative',
    'warning',
    'neutral',
  ] as const

  return (
    tokenKeys.every((key) => leftTokens[key] === rightTokens[key]) &&
    arrayEqual(leftTokens.categorical, rightTokens.categorical)
  )
}

function arrayEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (left === right) return true
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}
