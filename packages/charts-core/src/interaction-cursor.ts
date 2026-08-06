import { createGuideNodes } from './guide-nodes-internal'
import { createInteractionAxis } from './interaction-axis-internal'
import type { InteractionAxis } from './interaction-axis-internal'
import type { ControlledSignal } from './interaction-signal'
import type {
  ChartBehavior,
  ChartBehaviorContext,
  ChartBounds,
  ChartHostControl,
  ChartScene,
  ChartValue,
  ResolvedScale,
  SceneNode,
  SceneStyle,
} from './types'
import type {
  ChartHostControlExtension,
  ChartHostControlInstance,
} from './dom-types'

export type ContinuousCursorValue = number | Date

export interface ContinuousCursorPosition<
  TXValue extends ContinuousCursorValue = number,
  TYValue extends ContinuousCursorValue = number,
> {
  readonly x: TXValue
  readonly y: TYValue
}

export type ContinuousCursorPointerSource = 'pointer' | 'touch'
export type ContinuousCursorSource = ContinuousCursorPointerSource | 'keyboard'

export type ContinuousCursorChange<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
> =
  | {
      readonly type: 'preview'
      readonly value: ContinuousCursorPosition<TXValue, TYValue> | null
      readonly origin: ContinuousCursorPosition<TXValue, TYValue> | null
      readonly source: ContinuousCursorPointerSource
      readonly cause: 'move' | 'leave' | 'cancel'
    }
  | {
      readonly type: 'commit'
      readonly value: ContinuousCursorPosition<TXValue, TYValue>
      readonly origin: ContinuousCursorPosition<TXValue, TYValue> | null
      readonly source: ContinuousCursorPointerSource
      readonly cause: 'pin'
    }
  | {
      readonly type: 'clear'
      readonly value: null
      readonly origin: ContinuousCursorPosition<TXValue, TYValue> | null
      readonly source: ContinuousCursorSource
      readonly cause: 'toggle' | 'escape'
    }

export interface ContinuousCursorRuleOptions {
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  lineCap?: 'butt' | 'round' | 'square'
}

export interface ContinuousCursorMarkerOptions {
  radius?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
}

export interface ContinuousCursorLabelOptions<
  TValue extends ContinuousCursorValue,
> {
  format?: (value: TValue) => string
  side?: 'start' | 'end'
  offset?: number
  paddingX?: number
  paddingY?: number
  radius?: number
  background?: string
  color?: string
  stroke?: string
  strokeWidth?: number
  fontSize?: number
  fontWeight?: number
}

export interface ContinuousCursorOptions<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
> {
  id?: string
  position: ControlledSignal<
    ContinuousCursorPosition<TXValue, TYValue> | null,
    ContinuousCursorChange<TXValue, TYValue>
  >
  xRule?: false | ContinuousCursorRuleOptions
  yRule?: false | ContinuousCursorRuleOptions
  marker?: false | ContinuousCursorMarkerOptions
  xLabel?: false | ContinuousCursorLabelOptions<TXValue>
  yLabel?: false | ContinuousCursorLabelOptions<TYValue>
}

interface ContinuousCursorControl<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
> extends ChartHostControl {
  readonly kind: 'continuous-cursor'
  readonly id: string
  readonly bounds: ChartBounds
  readonly width: number
  readonly height: number
  readonly xAxis: InteractionAxis<TXValue>
  readonly yAxis: InteractionAxis<TYValue>
  readonly position: ContinuousCursorPosition<TXValue, TYValue> | null
  readonly guide: ResolvedContinuousCursorGuide<TXValue, TYValue>
  readonly change: (
    value: ContinuousCursorPosition<TXValue, TYValue> | null,
    reason: ContinuousCursorChange<TXValue, TYValue>,
  ) => void
}

interface ResolvedContinuousCursorGuide<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
> {
  readonly xRule: false | { readonly style: SceneStyle }
  readonly yRule: false | { readonly style: SceneStyle }
  readonly marker:
    false | { readonly radius: number; readonly style: SceneStyle }
  readonly xLabel: false | ResolvedContinuousCursorLabel<TXValue>
  readonly yLabel: false | ResolvedContinuousCursorLabel<TYValue>
}

interface ResolvedContinuousCursorLabel<TValue extends ContinuousCursorValue> {
  readonly format: (value: TValue) => string
  readonly side?: 'start' | 'end'
  readonly offset?: number
  readonly paddingX?: number
  readonly paddingY?: number
  readonly radius?: number
  readonly fontSize?: number
  readonly fontWeight?: number
  readonly style: SceneStyle
  readonly boxStyle: SceneStyle
}

const defaultId = 'continuous-cursor'
const classPrefix = 'ts-chart__continuous-cursor'

/**
 * Tracks an arbitrary invertible x/y plot position without snapping to data.
 * A non-null controlled position is pinned; pointer previews remain host-local.
 */
export function continuousCursor<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  options: ContinuousCursorOptions<TXValue, TYValue>,
): ChartBehavior<TXValue, TYValue> {
  const id = options.id?.trim() || defaultId
  if (options.id !== undefined && !options.id.trim()) {
    throw new TypeError('continuousCursor id cannot be empty')
  }

  return {
    id,
    resolve(context) {
      const input = options.position.value
      const xAxis = cursorAxis(
        'x',
        context.scales.x,
        [context.chart.x, context.chart.x + context.chart.width],
        input?.x,
      )
      const yAxis = cursorAxis(
        'y',
        context.scales.y,
        [context.chart.y, context.chart.y + context.chart.height],
        input?.y,
      )
      const position = input ? normalizePosition(input, xAxis, yAxis) : null
      const guide = resolveGuide(options, context)
      const fallbackKey = `behavior:${id}:fallback`
      const control: ContinuousCursorControl<TXValue, TYValue> = {
        kind: 'continuous-cursor',
        key: id,
        id,
        extension: continuousCursorControlExtension,
        fallbackNodeKey: fallbackKey,
        bounds: context.chart,
        width: context.width,
        height: context.height,
        xAxis,
        yAxis,
        position,
        guide,
        change(value, reason) {
          options.position.onChange(clonePosition(value), cloneChange(reason))
        },
      }
      return {
        nodes: [renderFallback(control, fallbackKey)],
        controls: [control],
      }
    },
  }
}

function cursorAxis<TValue extends ContinuousCursorValue>(
  axis: 'x' | 'y',
  scale: ResolvedScale | undefined,
  extent: readonly [number, number],
  current: TValue | undefined,
) {
  return createInteractionAxis<TValue>({
    axis,
    scale,
    extent,
    sample: current ?? scaleSample<TValue>(scale, axis),
  })
}

function scaleSample<TValue extends ContinuousCursorValue>(
  scale: ResolvedScale | undefined,
  axis: 'x' | 'y',
): TValue {
  const sample = scale?.domain.find(isContinuousCursorValue)
  if (sample === undefined) {
    throw new TypeError(
      `continuousCursor requires a finite numeric or temporal ${axis} scale domain`,
    )
  }
  return cloneValue(sample) as TValue
}

function resolveGuide<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  options: ContinuousCursorOptions<TXValue, TYValue>,
  context: ChartBehaviorContext,
): ResolvedContinuousCursorGuide<TXValue, TYValue> {
  const rule = (input: false | ContinuousCursorRuleOptions | undefined) =>
    input === false
      ? false
      : {
          style: {
            stroke: input?.stroke ?? context.theme.foreground,
            strokeOpacity: finiteNonNegative(input?.strokeOpacity, 0.48),
            strokeWidth: finiteNonNegative(input?.strokeWidth, 1),
            strokeDasharray: input?.strokeDasharray ?? '4 4',
            lineCap: input?.lineCap,
          },
        }
  const marker =
    options.marker === false
      ? false
      : {
          radius: finiteNonNegative(options.marker?.radius, 5),
          style: {
            fill: options.marker?.fill ?? context.theme.background,
            fillOpacity: finiteNonNegative(options.marker?.fillOpacity, 1),
            stroke: options.marker?.stroke ?? context.theme.foreground,
            strokeOpacity: finiteNonNegative(options.marker?.strokeOpacity, 1),
            strokeWidth: finiteNonNegative(options.marker?.strokeWidth, 1.5),
          },
        }
  return {
    xRule: rule(options.xRule),
    yRule: rule(options.yRule),
    marker,
    xLabel: resolveLabel(options.xLabel, context),
    yLabel: resolveLabel(options.yLabel, context),
  }
}

function resolveLabel<TValue extends ContinuousCursorValue>(
  input: false | ContinuousCursorLabelOptions<TValue> | undefined,
  context: ChartBehaviorContext,
): false | ResolvedContinuousCursorLabel<TValue> {
  if (input === false || input === undefined) return false
  return {
    format: input.format ?? defaultFormat,
    side: input.side,
    offset: input.offset,
    paddingX: input.paddingX,
    paddingY: input.paddingY,
    radius: input.radius,
    fontSize: input.fontSize,
    fontWeight: input.fontWeight,
    style: { fill: input.color ?? context.theme.background },
    boxStyle: {
      fill: input.background ?? context.theme.foreground,
      stroke: input.stroke ?? context.theme.background,
      strokeWidth: finiteNonNegative(input.strokeWidth, 1),
    },
  }
}

function renderFallback<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(control: ContinuousCursorControl<TXValue, TYValue>, key: string): SceneNode {
  return {
    kind: 'group',
    key,
    className: `${classPrefix}-fallback`,
    ariaHidden: true,
    children: control.position ? guideNodes(control, control.position) : [],
  }
}

function guideNodes<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  control: ContinuousCursorControl<TXValue, TYValue>,
  position: ContinuousCursorPosition<TXValue, TYValue>,
) {
  const x = control.xAxis.position(position.x)
  const y = control.yAxis.position(position.y)
  return createGuideNodes({
    id: control.id,
    classPrefix,
    chart: control.bounds,
    x,
    y,
    xRule: control.guide.xRule,
    yRule: control.guide.yRule,
    marker: control.guide.marker,
    xLabel:
      control.guide.xLabel === false
        ? false
        : {
            ...control.guide.xLabel,
            text: control.guide.xLabel.format(position.x),
          },
    yLabel:
      control.guide.yLabel === false
        ? false
        : {
            ...control.guide.yLabel,
            text: control.guide.yLabel.format(position.y),
          },
  }).nodes
}

const continuousCursorControlExtension: ChartHostControlExtension = {
  id: 'continuous-cursor',
  create: createContinuousCursorControl,
}

function createContinuousCursorControl({
  container,
  surface,
}: Parameters<
  ChartHostControlExtension['create']
>[0]): ChartHostControlInstance {
  const namespace = 'http://www.w3.org/2000/svg'
  const root = container.ownerDocument.createElementNS(namespace, 'svg')
  const hitTarget = container.ownerDocument.createElementNS(namespace, 'rect')
  const layer = container.ownerDocument.createElementNS(namespace, 'g')
  root.append(hitTarget, layer)
  root.setAttribute('aria-hidden', 'true')
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '1',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'auto',
    touchAction: 'none',
  })
  hitTarget.setAttribute('fill', 'transparent')
  hitTarget.setAttribute('pointer-events', 'all')
  layer.style.pointerEvents = 'none'

  let control:
    | ContinuousCursorControl<ContinuousCursorValue, ContinuousCursorValue>
    | undefined
  let scene: ChartScene | undefined
  let transient: ContinuousCursorPosition<
    ContinuousCursorValue,
    ContinuousCursorValue
  > | null = null
  let pinned = false
  let awaitingControl = false
  let lastSource: ContinuousCursorPointerSource = 'pointer'

  root.addEventListener('pointermove', handlePointerMove)
  root.addEventListener('pointerdown', handlePointerDown)
  root.addEventListener('pointerleave', handlePointerLeave)
  root.addEventListener('pointercancel', handlePointerCancel)
  root.addEventListener('click', handleClick)
  container.addEventListener('keydown', handleKeyDown, true)

  return {
    update(nextControl, nextScene) {
      const previous = control
      const next = asContinuousCursorControl(nextControl)
      control = next
      scene = nextScene
      root.dataset.chartCursor = next.id
      root.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`)
      root.setAttribute('width', '100%')
      root.setAttribute('height', '100%')
      hitTarget.setAttribute('x', '0')
      hitTarget.setAttribute('y', '0')
      hitTarget.setAttribute('width', String(next.width))
      hitTarget.setAttribute('height', String(next.height))
      if (!root.isConnected || root.parentElement !== container) {
        container.append(root)
      }

      if (awaitingControl) {
        awaitingControl = false
        transient = clonePosition(next.position)
        pinned = next.position !== null
      } else if (next.position) {
        transient = clonePosition(next.position)
        pinned = true
      } else if (previous?.position) {
        transient = null
        pinned = false
      } else if (transient) {
        transient = normalizePosition(transient, next.xAxis, next.yAxis)
      }
      paint(transient)
    },
    contains(target) {
      return Boolean(target && root.contains(target as Node))
    },
    destroy() {
      root.removeEventListener('pointermove', handlePointerMove)
      root.removeEventListener('pointerdown', handlePointerDown)
      root.removeEventListener('pointerleave', handlePointerLeave)
      root.removeEventListener('pointercancel', handlePointerCancel)
      root.removeEventListener('click', handleClick)
      container.removeEventListener('keydown', handleKeyDown, true)
      root.remove()
      control = undefined
      scene = undefined
      transient = null
      pinned = false
      awaitingControl = false
    },
  }

  function handlePointerMove(event: PointerEvent) {
    preview(event, 'move')
  }

  function handlePointerDown(event: PointerEvent) {
    lastSource = pointerSource(event)
    if (isPinned()) return
    preview(event, 'move')
  }

  function preview(
    event: Pick<PointerEvent, 'clientX' | 'clientY' | 'pointerType'>,
    cause: 'move',
  ) {
    lastSource = pointerSource(event)
    if (!control || isPinned()) return
    awaitingControl = false
    const position = positionFromClient(event.clientX, event.clientY)
    transient = position
    paint(position)
    emit(position, {
      type: 'preview',
      value: clonePosition(position),
      origin: clonePosition(control.position),
      source: lastSource,
      cause,
    })
  }

  function handlePointerLeave(event: PointerEvent) {
    clearPreview(pointerSource(event), 'leave')
  }

  function handlePointerCancel(event: PointerEvent) {
    clearPreview(pointerSource(event), 'cancel')
  }

  function clearPreview(
    source: ContinuousCursorPointerSource,
    cause: 'leave' | 'cancel',
  ) {
    if (!control || isPinned() || transient === null) return
    transient = null
    paint(null)
    emit(null, {
      type: 'preview',
      value: null,
      origin: clonePosition(control.position),
      source,
      cause,
    })
  }

  function handleClick(event: MouseEvent) {
    if (!control) return
    const origin = pinnedPosition()
    if (origin) {
      propose(null, {
        type: 'clear',
        value: null,
        origin: clonePosition(origin),
        source: lastSource,
        cause: 'toggle',
      })
      return
    }
    const next = transient ?? positionFromClient(event.clientX, event.clientY)
    if (!next) return
    propose(next, {
      type: 'commit',
      value: clonePosition(next)!,
      origin: null,
      source: lastSource,
      cause: 'pin',
    })
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !control || transient === null) return
    event.preventDefault()
    event.stopPropagation()
    propose(null, {
      type: 'clear',
      value: null,
      origin: clonePosition(pinnedPosition()),
      source: 'keyboard',
      cause: 'escape',
    })
  }

  function propose(
    next: ContinuousCursorPosition<
      ContinuousCursorValue,
      ContinuousCursorValue
    > | null,
    reason: ContinuousCursorChange<
      ContinuousCursorValue,
      ContinuousCursorValue
    >,
  ) {
    if (!control) return
    const changed = control
    awaitingControl = true
    transient = clonePosition(next)
    pinned = next !== null
    paint(transient)
    changed.change(next, reason)
  }

  function emit(
    next: ContinuousCursorPosition<
      ContinuousCursorValue,
      ContinuousCursorValue
    > | null,
    reason: ContinuousCursorChange<
      ContinuousCursorValue,
      ContinuousCursorValue
    >,
  ) {
    control?.change(next, reason)
  }

  function isPinned() {
    return pinned
  }

  function pinnedPosition() {
    return isPinned() ? transient : null
  }

  function positionFromClient(clientX: number, clientY: number) {
    if (!control || !scene) return null
    const point = surface.clientToScene(scene, clientX, clientY)
    if (!point || !containsPoint(control.bounds, point.x, point.y)) return null
    return {
      x: control.xAxis.valueAt(point.x),
      y: control.yAxis.valueAt(point.y),
    }
  }

  function paint(
    position: ContinuousCursorPosition<
      ContinuousCursorValue,
      ContinuousCursorValue
    > | null,
  ) {
    if (!control || !position) {
      root.dataset.visible = 'false'
      root.dataset.pinned = 'false'
      layer.replaceChildren()
      return
    }
    root.dataset.visible = 'true'
    root.dataset.pinned = String(isPinned())
    syncGuideElements(layer, guideNodes(control, position))
  }
}

function asContinuousCursorControl(
  control: ChartHostControl,
): ContinuousCursorControl<ContinuousCursorValue, ContinuousCursorValue> {
  if (!('kind' in control) || control.kind !== 'continuous-cursor') {
    throw new TypeError('Expected a continuous cursor control')
  }
  return control as ContinuousCursorControl<
    ContinuousCursorValue,
    ContinuousCursorValue
  >
}

function syncGuideElements(layer: SVGGElement, nodes: readonly SceneNode[]) {
  const retained = new Set<SVGElement>()
  const current = new Map(
    [...layer.children].flatMap((element) => {
      const key = (element as SVGElement).dataset.guideKey
      return key ? [[key, element as SVGElement] as const] : []
    }),
  )

  for (const node of nodes) {
    const tag = nodeTag(node)
    if (!tag) continue
    let element = current.get(node.key)
    if (!element || element.localName !== tag) {
      element = layer.ownerDocument.createElementNS(
        'http://www.w3.org/2000/svg',
        tag,
      )
      element.dataset.guideKey = node.key
    }
    updateGuideElement(element, node)
    layer.append(element)
    retained.add(element)
  }
  for (const element of [...layer.children]) {
    if (!retained.has(element as SVGElement)) element.remove()
  }
}

function nodeTag(node: SceneNode) {
  if (node.kind === 'rule') return 'line'
  if (node.kind === 'dot') return 'circle'
  if (node.kind === 'rect') return 'rect'
  if (node.kind === 'label') return 'text'
  return null
}

function updateGuideElement(element: SVGElement, node: SceneNode) {
  element.setAttribute('class', node.className ?? '')
  syncStyle(element, node.style)
  if (node.kind === 'rule') {
    setAttribute(element, 'x1', node.x1)
    setAttribute(element, 'y1', node.y1)
    setAttribute(element, 'x2', node.x2)
    setAttribute(element, 'y2', node.y2)
  } else if (node.kind === 'dot') {
    setAttribute(element, 'cx', node.x)
    setAttribute(element, 'cy', node.y)
    setAttribute(element, 'r', node.radius)
  } else if (node.kind === 'rect') {
    setAttribute(element, 'x', node.x)
    setAttribute(element, 'y', node.y)
    setAttribute(element, 'width', node.width)
    setAttribute(element, 'height', node.height)
    setAttribute(element, 'rx', node.radius)
  } else if (node.kind === 'label') {
    setAttribute(element, 'x', node.x)
    setAttribute(element, 'y', node.y)
    setAttribute(element, 'text-anchor', node.anchor)
    setAttribute(element, 'dominant-baseline', node.baseline)
    setAttribute(element, 'font-size', node.fontSize)
    setAttribute(element, 'font-weight', node.fontWeight)
    element.setAttribute('font-family', 'inherit')
    element.textContent = node.text
  }
}

function syncStyle(element: SVGElement, style: SceneStyle | undefined) {
  setAttribute(element, 'fill', style?.fill)
  setAttribute(element, 'fill-opacity', style?.fillOpacity)
  setAttribute(element, 'stroke', style?.stroke)
  setAttribute(element, 'stroke-opacity', style?.strokeOpacity)
  setAttribute(element, 'stroke-width', style?.strokeWidth)
  setAttribute(element, 'opacity', style?.opacity)
  setAttribute(element, 'stroke-linecap', style?.lineCap)
  setAttribute(element, 'stroke-linejoin', style?.lineJoin)
  setAttribute(element, 'stroke-dasharray', style?.strokeDasharray)
}

function setAttribute(
  element: Element,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined) element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

function normalizePosition<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  position: ContinuousCursorPosition<TXValue, TYValue>,
  xAxis: InteractionAxis<TXValue>,
  yAxis: InteractionAxis<TYValue>,
): ContinuousCursorPosition<TXValue, TYValue> {
  return {
    x: xAxis.valueAt(xAxis.position(position.x)),
    y: yAxis.valueAt(yAxis.position(position.y)),
  }
}

function containsPoint(bounds: ChartBounds, x: number, y: number) {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

function pointerSource(
  event: Pick<PointerEvent, 'pointerType'>,
): ContinuousCursorPointerSource {
  return event.pointerType === 'touch' ? 'touch' : 'pointer'
}

function isContinuousCursorValue(
  value: ChartValue,
): value is ContinuousCursorValue {
  return value instanceof Date
    ? Number.isFinite(value.getTime())
    : typeof value === 'number' && Number.isFinite(value)
}

function clonePosition<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  position: ContinuousCursorPosition<TXValue, TYValue> | null,
): ContinuousCursorPosition<TXValue, TYValue> | null {
  return position
    ? { x: cloneValue(position.x), y: cloneValue(position.y) }
    : null
}

function cloneChange<
  TXValue extends ContinuousCursorValue,
  TYValue extends ContinuousCursorValue,
>(
  change: ContinuousCursorChange<TXValue, TYValue>,
): ContinuousCursorChange<TXValue, TYValue> {
  return {
    ...change,
    value: clonePosition(change.value),
    origin: clonePosition(change.origin),
  } as ContinuousCursorChange<TXValue, TYValue>
}

function cloneValue<TValue extends ContinuousCursorValue>(value: TValue) {
  return (value instanceof Date ? new Date(value.getTime()) : value) as TValue
}

function defaultFormat(value: ContinuousCursorValue) {
  return value instanceof Date ? value.toLocaleString() : String(value)
}

function finiteNonNegative(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}
