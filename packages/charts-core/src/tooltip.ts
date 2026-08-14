import { placeTooltip } from './tooltip-position'
import { tooltipMotionController } from './renderer-motion-internal'
import {
  createChartTooltipContent,
  orderChartTooltipPoints,
  resolveChartTooltipAnchor,
} from './tooltip-model'
import type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
  ChartTooltipPortalExtension,
  ChartTooltipPortalExtensionInstance,
} from './dom-types'
import type {
  ChartPoint,
  ChartFocusState,
  ChartScene,
  ChartTooltipChannelItem,
  ChartTooltipContent,
  ChartTooltipContentContext,
  ChartTooltipItem,
  ChartTooltipOptions,
  ChartTooltipPortalOptions,
  ChartValue,
} from './types'

export const tooltip: ChartTooltipExtension = {
  id: 'tooltip',
  __chartExtensionType: 'tooltip',
  __chartTooltipHost: 'dom',
  create: createTooltipExtension,
}

export type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
} from './dom-types'

export type {
  ChartTooltipAnchor,
  ChartTooltipAnchorContext,
  ChartTooltipChannelItem,
  ChartTooltipContent,
  ChartTooltipContentContext,
  ChartTooltipDatumItem,
  ChartTooltipDerivedItem,
  ChartTooltipInput,
  ChartTooltipItem,
  ChartTooltipItemBase,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPosition,
  ChartTooltipRow,
  ChartTooltipSort,
} from './types'

function createTooltipExtension<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  extensionContext: ChartTooltipExtensionContext<TDatum, TXValue, TYValue>,
): ChartTooltipExtensionInstance<TDatum, TXValue, TYValue> {
  let options: ChartTooltipOptions<TDatum, TXValue, TYValue> = {}
  let element: HTMLDivElement | undefined
  let bodyElement: HTMLDivElement | undefined
  let activeBodyChange:
    ReturnType<typeof extensionContext.bodyChange> | undefined
  let bodyVisible = false
  let bodyScene: ChartScene<TDatum, TXValue, TYValue> | undefined
  let bodyPoints: readonly ChartPoint<TDatum, TXValue, TYValue>[] = []
  let bodyPinned = false
  let bodyDirty = false
  let paintContext:
    ChartTooltipPaintContext<TDatum, TXValue, TYValue> | undefined
  let anchor: { x: number; y: number } | null = null
  let positionFrame: number | undefined
  let resizeObserver: ResizeObserver | undefined
  let portalExtension: ChartTooltipPortalExtension | undefined
  let portalInstance: ChartTooltipPortalExtensionInstance | undefined
  const { container } = extensionContext
  const view = container.ownerDocument.defaultView
  const tooltipMotion = tooltipMotionController(extensionContext)

  function update(nextOptions: ChartTooltipOptions<TDatum, TXValue, TYValue>) {
    if (options !== nextOptions) bodyDirty = true
    options = nextOptions
    if (element) syncPortal()
  }

  function paint(
    nextContext: ChartTooltipPaintContext<TDatum, TXValue, TYValue>,
  ) {
    paintContext = nextContext
    if (options.visibility === 'pinned' && !nextContext.pinned) {
      hide()
      return
    }
    const tooltipElement = ensureElement()
    syncPortal()
    const motionSnapshot = tooltipMotion?.beforePaint(tooltipElement)
    tooltipElement.style.visibility = 'hidden'
    tooltipElement.removeAttribute('hidden')
    tooltipElement.className = options.className
      ? `ts-chart-tooltip ${options.className}`
      : 'ts-chart-tooltip'
    const points = orderChartTooltipPoints(
      nextContext.points,
      nextContext.scene,
      options.sort,
    )
    const resolvedContent = createChartTooltipContent(
      points,
      nextContext.scene,
      nextContext.pinned,
      options,
      nextContext.point,
    )
    const custom = renderTooltipBody(
      tooltipElement,
      points,
      resolvedContent,
      nextContext.pinned,
    )
    if (!custom) {
      if (typeof resolvedContent === 'string') {
        paintPlainTooltip(tooltipElement, resolvedContent)
      } else {
        paintStructuredTooltip(tooltipElement, resolvedContent)
      }
    }
    configureTooltipSemantics(
      tooltipElement,
      resolvedContent,
      custom,
      nextContext.pinned,
    )
    tooltipElement.style.pointerEvents = nextContext.pinned ? 'auto' : 'none'
    tooltipElement.style.userSelect = nextContext.pinned ? 'text' : 'none'
    tooltipElement.dataset.sticky = String(nextContext.pinned)
    anchor = resolveChartTooltipAnchor(
      nextContext.point,
      points,
      nextContext.scene,
      nextContext.pointer,
      options,
      nextContext.focus,
    )
    position()
    tooltipElement.style.removeProperty('visibility')
    if (motionSnapshot) {
      tooltipMotion?.afterPaint(tooltipElement, motionSnapshot, options.motion)
    }
  }

  function ensureElement() {
    if (element) return element
    element = createTooltip(container.ownerDocument)
    element.addEventListener('keydown', handleKeyDown)
    resizeObserver = view?.ResizeObserver
      ? new view.ResizeObserver(schedulePosition)
      : undefined
    resizeObserver?.observe(element)
    container.append(element)
    return element
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !paintContext?.pinned) return
    event.preventDefault()
    event.stopPropagation()
    extensionContext.dismiss()
  }

  function schedulePosition() {
    if (!paintContext || !anchor || positionFrame !== undefined) return
    if (!view?.requestAnimationFrame) {
      position()
      return
    }
    positionFrame = view.requestAnimationFrame(() => {
      positionFrame = undefined
      position()
    })
  }

  function position() {
    if (!paintContext || !element || !anchor) return
    if (portalInstance) {
      const visible = portalInstance.position({
        scene: paintContext.scene,
        surface: paintContext.surface,
        anchor,
        placement: options.placement,
        offset: options.offset,
      })
      if (!visible) element.setAttribute('hidden', '')
      return
    }
    placeTooltip(
      element,
      anchor.x,
      anchor.y,
      {
        left: 0,
        top: 0,
        right: paintContext.scene.width,
        bottom: paintContext.scene.height,
      },
      options.placement,
      options.offset,
    )
  }

  function syncPortal() {
    if (!element) return
    const input = options.portal
    const nextExtension = (
      input ? ('create' in input ? input : input.use) : undefined
    ) as ChartTooltipPortalExtension | undefined
    const nextOptions: ChartTooltipPortalOptions =
      input && 'use' in input ? input : {}
    if (nextExtension !== portalExtension) {
      portalInstance?.destroy()
      portalInstance = undefined
      portalExtension = nextExtension
      if (nextExtension) {
        portalInstance = nextExtension.create(
          {
            container,
            element,
            schedulePosition,
          },
          nextOptions,
        )
      } else {
        moveToContainer()
      }
    } else {
      portalInstance?.update(nextOptions)
    }
  }

  function moveToContainer() {
    if (!element) return
    if (element.parentNode !== container) container.append(element)
    element.removeAttribute('popover')
    delete element.dataset.tsChartTooltipPortal
    Object.assign(element.style, {
      position: 'absolute',
      zIndex: '1',
      right: 'auto',
      bottom: 'auto',
      margin: '0',
    })
  }

  function renderTooltipBody(
    tooltipElement: HTMLDivElement,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    content: ChartTooltipContent | string,
    pinned: boolean,
  ) {
    const callback = extensionContext.bodyChange()
    if (!callback) {
      deactivateTooltipBody()
      return false
    }
    if (activeBodyChange !== callback) {
      activeBodyChange?.(null)
      activeBodyChange = callback
      bodyVisible = false
      bodyElement = undefined
    }
    if (!bodyElement) {
      bodyElement = tooltipElement.ownerDocument.createElement('div')
      bodyElement.className = 'ts-chart-tooltip__body'
      tooltipElement.replaceChildren(bodyElement)
    }
    bodyElement.toggleAttribute('inert', !pinned)
    setTooltipContentAccessibility(tooltipElement, content)
    const changed =
      bodyDirty ||
      !bodyVisible ||
      bodyScene !== paintContext?.scene ||
      bodyPinned !== pinned ||
      !samePointList(points, bodyPoints)
    bodyDirty = false
    bodyVisible = true
    bodyScene = paintContext?.scene
    bodyPoints = points
    bodyPinned = pinned
    if (changed) {
      callback({
        element: bodyElement,
        points,
        content,
        pinned,
        dismiss: extensionContext.dismiss,
      })
    }
    return true
  }

  function hideTooltipBody() {
    if (!bodyVisible) return
    bodyVisible = false
    activeBodyChange?.(null)
  }

  function deactivateTooltipBody() {
    hideTooltipBody()
    activeBodyChange = undefined
    bodyElement = undefined
    bodyScene = undefined
    bodyPoints = []
  }

  function hide() {
    paintContext = undefined
    anchor = null
    const currentElement = element
    if (!currentElement || currentElement.hidden) {
      portalInstance?.hide()
      hideTooltipBody()
      return
    }
    const complete = () => {
      portalInstance?.hide()
      currentElement.setAttribute('hidden', '')
      hideTooltipBody()
    }
    if (tooltipMotion?.hide(currentElement, options.motion, complete)) return
    complete()
  }

  function destroy() {
    hide()
    deactivateTooltipBody()
    portalInstance?.destroy()
    portalInstance = undefined
    portalExtension = undefined
    if (positionFrame !== undefined) {
      view?.cancelAnimationFrame?.(positionFrame)
      positionFrame = undefined
    }
    tooltipMotion?.destroy(element)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    element?.remove()
    element = undefined
  }

  return {
    update,
    paint,
    hide,
    contains: (target) => Boolean(target && element?.contains(target as Node)),
    destroy,
  }
}

function samePointList(
  left: readonly ChartPoint[],
  right: readonly ChartPoint[],
) {
  return (
    left.length === right.length &&
    left.every(
      (point, index) =>
        point.key === right[index]?.key &&
        point.markId === right[index]?.markId &&
        point.datumIndex === right[index]?.datumIndex,
    )
  )
}

function createTooltip(document: Document) {
  const tooltipElement = document.createElement('div')
  tooltipElement.className = 'ts-chart-tooltip'
  tooltipElement.setAttribute('role', 'status')
  tooltipElement.setAttribute('aria-live', 'polite')
  Object.assign(tooltipElement.style, {
    position: 'absolute',
    zIndex: '1',
    maxWidth: 'var(--ts-chart-tooltip-max-width, min(24rem, 80%))',
    padding: 'var(--ts-chart-tooltip-padding, 0.4rem 0.55rem)',
    border:
      'var(--ts-chart-tooltip-border, 1px solid color-mix(in srgb, CanvasText 18%, transparent))',
    borderRadius: 'var(--ts-chart-tooltip-border-radius, 0.45rem)',
    background: 'var(--ts-chart-tooltip-background, Canvas)',
    color: 'var(--ts-chart-tooltip-color, CanvasText)',
    boxShadow: 'var(--ts-chart-tooltip-shadow, 0 6px 24px rgb(0 0 0 / 0.14))',
    font: 'var(--ts-chart-tooltip-font, 500 0.75rem/1.3 system-ui, sans-serif)',
    pointerEvents: 'none',
    overflowWrap: 'anywhere',
  })
  tooltipElement.hidden = true
  return tooltipElement
}

function createTooltipContentContext(
  scene: ChartScene,
  pinned: boolean,
  options?: ChartTooltipOptions<any, any, any>,
): ChartTooltipContentContext {
  const x = findTooltipChannelItem(options?.items, 'x')
  const y = findTooltipChannelItem(options?.items, 'y')
  return {
    pinned,
    xLabel: x?.label ?? findSceneLabel(scene, 'x-label') ?? 'x',
    yLabel: y?.label ?? findSceneLabel(scene, 'y-label') ?? 'y',
    formatX: formatValue,
    formatY: formatValue,
  }
}

function defaultTooltipContent(
  points: readonly ChartPoint[],
  scene: ChartScene,
  options: ChartTooltipOptions<any, any, any> | undefined,
  context: ChartTooltipContentContext,
): ChartTooltipContent {
  const point = points[0]
  if (!point) return { rows: [] }
  const x = findTooltipChannelItem(options?.items, 'x')
  const y = findTooltipChannelItem(options?.items, 'y')
  const group = findTooltipChannelItem(options?.items, 'group')
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
      rows: points.map((candidate) => ({
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
      rows: points.map((candidate) => ({
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

function orderTooltipPoints<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
  sort: ChartTooltipOptions<TDatum, TXValue, TYValue>['sort'],
) {
  if (sort === 'focus') return [...points]
  if (typeof sort === 'function') return [...points].sort(sort)
  if (sort !== 'color-domain') {
    const first = points[0]
    const sharedX =
      first !== undefined &&
      points.every((point) => chartValueEqual(point.xValue, first.xValue))
    const sharedY =
      first !== undefined &&
      points.every((point) => chartValueEqual(point.yValue, first.yValue))
    return [...points].sort((left, right) =>
      sharedY && !sharedX
        ? left.x - right.x || left.y - right.y
        : left.y - right.y || left.x - right.x,
    )
  }
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

function paintPlainTooltip(tooltipElement: HTMLElement, text: string) {
  setTooltipContentAccessibility(tooltipElement, text)
  tooltipElement.textContent = text
}

function paintStructuredTooltip(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent,
) {
  const document = tooltipElement.ownerDocument
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
  tooltipElement.replaceChildren(...children)
  setTooltipContentAccessibility(tooltipElement, content)
}

function setTooltipContentAccessibility(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent | string,
) {
  if (typeof content === 'string') {
    tooltipElement.removeAttribute('aria-label')
    tooltipElement.style.whiteSpace = 'pre-wrap'
    return
  }
  tooltipElement.style.whiteSpace = 'normal'
  tooltipElement.setAttribute(
    'aria-label',
    [content.title, ...content.rows.map((row) => `${row.label}: ${row.value}`)]
      .filter(Boolean)
      .join('\n'),
  )
}

function configureTooltipSemantics(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent | string,
  custom: boolean,
  pinned: boolean,
) {
  if (custom && typeof content === 'string') {
    tooltipElement.setAttribute('aria-label', content)
  }
  if (custom && pinned) {
    tooltipElement.setAttribute('role', 'dialog')
    tooltipElement.setAttribute('aria-modal', 'false')
    tooltipElement.removeAttribute('aria-live')
    return
  }
  tooltipElement.setAttribute('role', 'status')
  tooltipElement.setAttribute('aria-live', 'polite')
  tooltipElement.removeAttribute('aria-modal')
  if (!custom && typeof content === 'string') {
    tooltipElement.removeAttribute('aria-label')
  }
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
  pointer: { x: number; y: number } | null,
  options?: ChartTooltipOptions<any, any, any>,
  focus: ChartFocusState = {
    primary: point,
    group: points,
    source: 'programmatic' as const,
    pinned: false,
  },
): { x: number; y: number } {
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
  if (typeof anchor === 'object') {
    return {
      x: resolveTooltipCoordinate(
        'x',
        anchor.x,
        point,
        points,
        scene,
        pointer,
        fallback.x,
      ),
      y: resolveTooltipCoordinate(
        'y',
        anchor.y,
        point,
        points,
        scene,
        pointer,
        fallback.y,
      ),
    }
  }
  const resolved = anchor(points, {
    focus,
    pointer,
    plot: scene.chart,
    surface: { width: scene.width, height: scene.height },
    scales: scene.scales,
  })
  return resolved && Number.isFinite(resolved.x) && Number.isFinite(resolved.y)
    ? resolved
    : fallback
}

function resolveTooltipCoordinate(
  axis: 'x' | 'y',
  source: string,
  point: ChartPoint,
  points: readonly ChartPoint[],
  scene: ChartScene,
  pointer: { x: number; y: number } | null,
  fallback: number,
): number {
  if (source === 'point') return axis === 'x' ? point.x : point.y
  if (source === 'pointer') return pointer?.[axis] ?? fallback
  if (source === 'value') {
    const value = axis === 'x' ? point.xValue : point.yValue
    const scale = scene.scales[axis]
    const position = (scale?.viewport?.map ?? scale?.map)?.(value)
    return position !== undefined && Number.isFinite(position)
      ? position
      : fallback
  }
  if (source === 'group-center') {
    let minimum = axis === 'x' ? point.x : point.y
    let maximum = minimum
    for (const candidate of points) {
      const position = axis === 'x' ? candidate.x : candidate.y
      minimum = Math.min(minimum, position)
      maximum = Math.max(maximum, position)
    }
    return (minimum + maximum) / 2
  }
  const plot = scene.chart
  if (axis === 'x') {
    if (source === 'plot-left') return plot.x
    if (source === 'plot-center') return plot.x + plot.width / 2
    if (source === 'plot-right') return plot.x + plot.width
  } else {
    if (source === 'plot-top') return plot.y
    if (source === 'plot-center') return plot.y + plot.height / 2
    if (source === 'plot-bottom') return plot.y + plot.height
  }
  return fallback
}

function chartValueEqual(left: ChartValue, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : left === right
}
