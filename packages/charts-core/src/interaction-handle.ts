import { createInteractionAxis } from './interaction-axis-internal'
import type { InteractionAxis } from './interaction-axis-internal'
import { cloneInteractionValue } from './interaction-range-internal'
import type { ControlledSignal } from './interaction-signal'
import type {
  ChartBehavior,
  ChartBehaviorContext,
  ChartBounds,
  ChartHostControl,
  ChartScene,
  ChartValue,
  SceneNode,
  SceneStyle,
} from './types'
import type {
  ChartHostControlExtension,
  ChartHostControlInstance,
} from './dom-types'

export type HandleXPointerSource = 'pointer' | 'touch'
export type HandleXSource = HandleXPointerSource | 'keyboard'

export type HandleXChange<TValue extends ChartValue> =
  | HandleXChangeEvent<TValue, 'preview', HandleXPointerSource>
  | HandleXChangeEvent<TValue, 'commit', HandleXSource>
  | HandleXChangeEvent<TValue, 'cancel', HandleXSource>

interface HandleXChangeEvent<
  TValue extends ChartValue,
  TType extends 'preview' | 'commit' | 'cancel',
  TSource extends HandleXSource,
> {
  readonly type: TType
  readonly value: TValue
  readonly origin: TValue
  readonly source: TSource
}

export type HandleXCross<TValue extends ChartValue = ChartValue> =
  | {
      readonly edge: 'top' | 'bottom'
      readonly offset?: number
      readonly value?: never
    }
  | {
      readonly value: TValue
      readonly edge?: never
      readonly offset?: never
    }

export interface HandleXOptions<
  TXValue extends ChartValue,
  TYValue extends ChartValue = any,
> {
  id?: string
  value: ControlledSignal<TXValue, HandleXChange<TXValue>>
  /** Ordered candidates used for snapping and indexed keyboard movement. */
  values: readonly TXValue[]
  cross: HandleXCross<TYValue>
  trackStyle?: SceneStyle
  ruleStyle?: SceneStyle | false
  handleStyle?: SceneStyle
  hitSize?: number
  ariaLabel?: string
  format?: (value: TXValue) => string
  keyboard?: boolean
}

interface HandleXControl<TValue extends ChartValue> extends ChartHostControl {
  readonly kind: 'handle-x'
  readonly id: string
  readonly bounds: ChartBounds
  readonly width: number
  readonly height: number
  readonly axis: InteractionAxis<TValue>
  readonly value: TValue
  readonly cross: number
  readonly ruleStart: number
  readonly trackStart: number
  readonly trackEnd: number
  readonly trackStyle: SceneStyle
  readonly ruleStyle: SceneStyle | false
  readonly handleStyle: SceneStyle
  readonly hitSize: number
  readonly ariaLabel: string
  readonly format: (value: TValue) => string
  readonly keyboard: boolean
  readonly change: (value: TValue, reason: HandleXChange<TValue>) => void
}

const defaultId = 'handle-x'
const classPrefix = 'ts-chart__handle-x'
const handleRadius = 9
const trackThickness = 4
const ruleThickness = 2

/** A controlled, candidate-bound horizontal scale handle. */
export function handleX<
  TXValue extends ChartValue,
  TYValue extends ChartValue = any,
>(options: HandleXOptions<TXValue, TYValue>): ChartBehavior<TXValue, TYValue> {
  const id = options.id?.trim() || defaultId
  if (options.id !== undefined && !options.id.trim()) {
    throw new TypeError('handleX id cannot be empty')
  }
  const hitSize = finitePositive(options.hitSize ?? 44, 'hitSize')

  return {
    id,
    resolve(context) {
      const axis = createInteractionAxis({
        axis: 'x',
        scale: context.scales.x,
        extent: [context.chart.x, context.chart.x + context.chart.width],
        sample: options.value.value,
        values: options.values,
      })
      const valueIndex = axis.indexOf(options.value.value)
      if (valueIndex < 0) {
        throw new TypeError(
          'handleX controlled value must be one of its explicit values',
        )
      }
      const value = axis.at(valueIndex)
      const cross = resolveCross(options.cross, context)
      const color = context.theme.palette[0] ?? context.theme.foreground
      const trackStyle: SceneStyle = {
        fill: context.theme.foreground,
        fillOpacity: 0.48,
        ...options.trackStyle,
      }
      const ruleStyle: SceneStyle | false =
        options.ruleStyle === false
          ? false
          : {
              fill: color,
              ...options.ruleStyle,
            }
      const handleStyle: SceneStyle = {
        fill: color,
        stroke: context.theme.background,
        strokeWidth: 2,
        ...options.handleStyle,
      }
      const fallbackKey = `behavior:${id}:fallback`
      const control: HandleXControl<TXValue> = {
        kind: 'handle-x',
        key: id,
        id,
        extension: handleXControlExtension,
        fallbackNodeKey: fallbackKey,
        bounds: context.chart,
        width: context.width,
        height: context.height,
        axis,
        value,
        cross: cross.position,
        ruleStart: cross.ruleStart,
        trackStart: axis.position(axis.at(0)),
        trackEnd: axis.position(axis.at(options.values.length - 1)),
        trackStyle,
        ruleStyle,
        handleStyle,
        hitSize,
        ariaLabel: options.ariaLabel ?? 'Horizontal value',
        format: options.format ?? defaultFormat,
        keyboard: options.keyboard !== false,
        change(next, reason) {
          options.value.onChange(
            cloneInteractionValue(next),
            cloneChange(reason),
          )
        },
      }
      return {
        nodes: [renderFallback(control, fallbackKey)],
        controls: [control],
      }
    },
  }
}

function resolveCross<TValue extends ChartValue>(
  cross: HandleXCross<TValue>,
  context: ChartBehaviorContext,
) {
  if (!cross || typeof cross !== 'object') {
    throw new TypeError('handleX cross is required')
  }
  if ('value' in cross) {
    const value = cross.value
    if (value === undefined) {
      throw new TypeError('handleX semantic cross value is required')
    }
    const axis = createInteractionAxis({
      axis: 'y',
      scale: context.scales.y,
      extent: [context.chart.y, context.chart.y + context.chart.height],
      sample: value,
      values: [value],
    })
    return {
      position: axis.position(axis.at(0)),
      ruleStart: context.chart.y,
    }
  }
  if (cross.edge !== 'top' && cross.edge !== 'bottom') {
    throw new TypeError('handleX cross edge must be "top" or "bottom"')
  }
  const offset = finite(cross.offset ?? 0, 'cross offset')
  return cross.edge === 'top'
    ? {
        position: context.chart.y - offset,
        ruleStart: context.chart.y + context.chart.height,
      }
    : {
        position: context.chart.y + context.chart.height + offset,
        ruleStart: context.chart.y,
      }
}

function renderFallback<TValue extends ChartValue>(
  control: HandleXControl<TValue>,
  key: string,
): SceneNode {
  const x = control.axis.position(control.value)
  const children: SceneNode[] = []
  if (control.ruleStyle !== false) {
    const ruleTop = Math.min(control.ruleStart, control.cross)
    children.push({
      kind: 'rect',
      key: `${key}:rule`,
      className: `${classPrefix}-rule`,
      x: x - ruleThickness / 2,
      y: ruleTop,
      width: ruleThickness,
      height: Math.abs(control.cross - control.ruleStart),
      style: control.ruleStyle,
    })
  }
  const trackLeft = Math.min(control.trackStart, control.trackEnd)
  children.push(
    {
      kind: 'rect',
      key: `${key}:track`,
      className: `${classPrefix}-track`,
      x: trackLeft,
      y: control.cross - trackThickness / 2,
      width: Math.abs(control.trackEnd - control.trackStart),
      height: trackThickness,
      style: control.trackStyle,
    },
    {
      kind: 'dot',
      key: `${key}:handle`,
      className: `${classPrefix}-handle`,
      x,
      y: control.cross,
      radius: handleRadius,
      style: control.handleStyle,
    },
  )
  return {
    kind: 'group',
    key,
    className: `${classPrefix}-fallback`,
    ariaHidden: true,
    children,
  }
}

const handleXControlExtension: ChartHostControlExtension = {
  id: 'handle-x',
  create: createHandleXControl,
}

function createHandleXControl({
  container,
  surface,
}: Parameters<
  ChartHostControlExtension['create']
>[0]): ChartHostControlInstance {
  const namespace = 'http://www.w3.org/2000/svg'
  const document = container.ownerDocument
  const root = document.createElementNS(namespace, 'svg')
  const rule = document.createElementNS(namespace, 'rect')
  const track = document.createElementNS(namespace, 'rect')
  const handle = document.createElementNS(namespace, 'circle')
  const focusRing = document.createElementNS(namespace, 'circle')
  const hitTarget = document.createElementNS(namespace, 'rect')
  root.append(rule, track, handle, focusRing, hitTarget)
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '1',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  })
  for (const element of [rule, track, handle, focusRing]) {
    element.setAttribute('pointer-events', 'none')
  }
  focusRing.setAttribute('fill', 'none')
  focusRing.setAttribute('stroke', 'currentColor')
  focusRing.setAttribute('stroke-width', '2')
  focusRing.setAttribute('r', String(handleRadius + 4))
  focusRing.style.display = 'none'
  hitTarget.setAttribute('fill', 'transparent')
  hitTarget.setAttribute('pointer-events', 'all')
  hitTarget.setAttribute('role', 'slider')
  hitTarget.setAttribute('aria-orientation', 'horizontal')
  hitTarget.style.cursor = 'ew-resize'
  hitTarget.style.outline = 'none'
  hitTarget.style.touchAction = 'none'

  let control: HandleXControl<ChartValue> | undefined
  let scene: ChartScene | undefined
  let activePointer: number | undefined
  let gestureOrigin: ChartValue | undefined
  let gestureValue: ChartValue | undefined
  let gestureSource: HandleXPointerSource = 'pointer'

  hitTarget.addEventListener('pointerdown', handlePointerDown)
  hitTarget.addEventListener('pointermove', handlePointerMove)
  hitTarget.addEventListener('pointerup', handlePointerUp)
  hitTarget.addEventListener('pointercancel', handlePointerCancel)
  hitTarget.addEventListener('keydown', handleKeyDown)
  hitTarget.addEventListener('focus', handleFocus)
  hitTarget.addEventListener('blur', handleBlur)

  return {
    update(nextControl, nextScene) {
      const next = asHandleXControl(nextControl)
      const preserveGesture = Boolean(
        activePointer !== undefined &&
        gestureValue !== undefined &&
        sameValue(next.axis, next.value, gestureValue),
      )
      control = next
      scene = nextScene
      if (activePointer !== undefined && !preserveGesture) finishGesture(true)

      root.dataset.chartHandleRoot = next.id
      root.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`)
      root.setAttribute('width', '100%')
      root.setAttribute('height', '100%')
      track.dataset.chartHandleTrack = next.id
      track.dataset.chartHandleRole = 'track'
      handle.dataset.chartHandle = next.id
      handle.dataset.chartHandleRole = 'handle'
      hitTarget.dataset.chartHandleSurface = next.id
      hitTarget.setAttribute('aria-label', next.ariaLabel)
      hitTarget.setAttribute('tabindex', next.keyboard ? '0' : '-1')
      if (next.keyboard) {
        hitTarget.setAttribute(
          'aria-keyshortcuts',
          'ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape',
        )
      } else {
        hitTarget.removeAttribute('aria-keyshortcuts')
      }
      syncGeometry(next)
      if (!root.isConnected || root.parentElement !== container) {
        container.append(root)
      }
      paint(preserveGesture ? gestureValue! : next.value)
    },
    contains(target) {
      return Boolean(target && root.contains(target as Node))
    },
    destroy() {
      finishGesture(true)
      hitTarget.removeEventListener('pointerdown', handlePointerDown)
      hitTarget.removeEventListener('pointermove', handlePointerMove)
      hitTarget.removeEventListener('pointerup', handlePointerUp)
      hitTarget.removeEventListener('pointercancel', handlePointerCancel)
      hitTarget.removeEventListener('keydown', handleKeyDown)
      hitTarget.removeEventListener('focus', handleFocus)
      hitTarget.removeEventListener('blur', handleBlur)
      root.remove()
      control = undefined
      scene = undefined
    },
  }

  function syncGeometry(next: HandleXControl<ChartValue>) {
    const trackLeft = Math.min(next.trackStart, next.trackEnd)
    setAttribute(track, 'x', trackLeft)
    setAttribute(track, 'y', next.cross - trackThickness / 2)
    setAttribute(track, 'width', Math.abs(next.trackEnd - next.trackStart))
    setAttribute(track, 'height', trackThickness)
    applyStyle(track, next.trackStyle)

    if (next.ruleStyle === false) {
      rule.remove()
      rule.removeAttribute('data-chart-handle-rule')
      rule.removeAttribute('data-chart-handle-role')
    } else {
      root.insertBefore(rule, track)
      rule.dataset.chartHandleRule = next.id
      rule.dataset.chartHandleRole = 'rule'
      setAttribute(rule, 'y', Math.min(next.ruleStart, next.cross))
      setAttribute(rule, 'width', ruleThickness)
      setAttribute(rule, 'height', Math.abs(next.cross - next.ruleStart))
      applyStyle(rule, next.ruleStyle)
    }

    applyStyle(handle, next.handleStyle)
    setAttribute(handle, 'r', handleRadius)
    const minimum = Math.min(next.trackStart, next.trackEnd)
    const maximum = Math.max(next.trackStart, next.trackEnd)
    setAttribute(hitTarget, 'x', minimum - next.hitSize / 2)
    setAttribute(hitTarget, 'y', next.cross - next.hitSize / 2)
    setAttribute(hitTarget, 'width', maximum - minimum + next.hitSize)
    setAttribute(hitTarget, 'height', next.hitSize)
  }

  function paint(value: ChartValue) {
    if (!control) return
    const x = control.axis.position(value)
    setAttribute(handle, 'cx', x)
    setAttribute(handle, 'cy', control.cross)
    setAttribute(focusRing, 'cx', x)
    setAttribute(focusRing, 'cy', control.cross)
    if (control.ruleStyle !== false) {
      setAttribute(rule, 'x', x - ruleThickness / 2)
    }
    const index = control.axis.indexOf(value)
    hitTarget.setAttribute('aria-valuemin', '0')
    hitTarget.setAttribute(
      'aria-valuemax',
      String((control.axis.values?.length ?? 1) - 1),
    )
    hitTarget.setAttribute('aria-valuenow', String(index))
    hitTarget.setAttribute('aria-valuetext', control.format(value))
  }

  function handlePointerDown(event: PointerEvent) {
    if (
      !control ||
      activePointer !== undefined ||
      event.isPrimary === false ||
      (event.pointerType !== 'touch' && event.button !== 0)
    ) {
      return
    }
    const next = valueFromClient(event.clientX, event.clientY)
    if (next === undefined) return
    event.preventDefault()
    event.stopPropagation()
    hitTarget.focus({ preventScroll: true })
    activePointer = event.pointerId
    gestureOrigin = cloneInteractionValue(control.value)
    gestureValue = cloneInteractionValue(control.value)
    gestureSource = pointerSource(event)
    capturePointer(event.pointerId)
    preview(next)
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    const next = valueFromClient(event.clientX, event.clientY)
    if (next === undefined) return
    event.preventDefault()
    preview(next)
  }

  function handlePointerUp(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    event.preventDefault()
    event.stopPropagation()
    const next = valueFromClient(event.clientX, event.clientY)
    if (next !== undefined) preview(next)
    if (
      event.pointerId !== activePointer ||
      !control ||
      gestureOrigin === undefined ||
      gestureValue === undefined
    ) {
      return
    }
    const origin = cloneInteractionValue(gestureOrigin)
    const value = cloneInteractionValue(gestureValue)
    const source = gestureSource
    const changedControl = control
    finishGesture(true)
    changedControl.change(value, {
      type: 'commit',
      value,
      origin,
      source,
    })
    paint(control === changedControl ? value : control.value)
  }

  function handlePointerCancel(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    event.preventDefault()
    cancel(gestureSource)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && activePointer !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      cancel('keyboard')
      return
    }
    if (!control?.keyboard || activePointer !== undefined) return
    const currentIndex = control.axis.indexOf(control.value)
    let nextIndex: number | undefined
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') {
      nextIndex = (control.axis.values?.length ?? 1) - 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextIndex = currentIndex - 1
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextIndex = currentIndex + 1
    }
    if (nextIndex === undefined) return
    event.preventDefault()
    event.stopPropagation()
    const next = control.axis.at(nextIndex)
    if (sameValue(control.axis, next, control.value)) return
    const origin = cloneInteractionValue(control.value)
    const changedControl = control
    changedControl.change(next, {
      type: 'commit',
      value: next,
      origin,
      source: 'keyboard',
    })
    paint(control === changedControl ? next : control.value)
  }

  function handleFocus() {
    focusRing.style.display = ''
  }

  function handleBlur() {
    if (activePointer !== undefined) cancel(gestureSource)
    focusRing.style.display = 'none'
  }

  function preview(next: ChartValue) {
    if (
      !control ||
      gestureOrigin === undefined ||
      (gestureValue !== undefined &&
        sameValue(control.axis, next, gestureValue))
    ) {
      return
    }
    gestureValue = cloneInteractionValue(next)
    paint(gestureValue)
    const origin = cloneInteractionValue(gestureOrigin)
    const value = cloneInteractionValue(gestureValue)
    const changedControl = control
    changedControl.change(value, {
      type: 'preview',
      value,
      origin,
      source: gestureSource,
    })
    if (control !== changedControl) paint(control.value)
  }

  function cancel(source: HandleXSource) {
    if (!control || gestureOrigin === undefined) return
    const origin = cloneInteractionValue(gestureOrigin)
    const changedControl = control
    finishGesture(true)
    changedControl.change(origin, {
      type: 'cancel',
      value: origin,
      origin,
      source,
    })
    paint(control === changedControl ? origin : control.value)
  }

  function valueFromClient(clientX: number, clientY: number) {
    if (!control || !scene) return undefined
    const position = surface.clientToScene(scene, clientX, clientY)
    return position ? control.axis.valueAt(position.x) : undefined
  }

  function capturePointer(pointerId: number) {
    if (typeof hitTarget.setPointerCapture !== 'function') return
    hitTarget.setPointerCapture(pointerId)
  }

  function finishGesture(release: boolean) {
    const pointer = activePointer
    activePointer = undefined
    gestureOrigin = undefined
    gestureValue = undefined
    gestureSource = 'pointer'
    if (
      release &&
      pointer !== undefined &&
      typeof hitTarget.releasePointerCapture === 'function'
    ) {
      if (
        typeof hitTarget.hasPointerCapture === 'function' &&
        !hitTarget.hasPointerCapture(pointer)
      ) {
        return
      }
      hitTarget.releasePointerCapture(pointer)
    }
  }
}

function asHandleXControl(
  control: ChartHostControl,
): HandleXControl<ChartValue> {
  if (!('kind' in control) || control.kind !== 'handle-x') {
    throw new TypeError('Expected a horizontal handle control')
  }
  return control as HandleXControl<ChartValue>
}

function pointerSource(
  event: Pick<PointerEvent, 'pointerType'>,
): HandleXPointerSource {
  return event.pointerType === 'touch' ? 'touch' : 'pointer'
}

function sameValue<TValue extends ChartValue>(
  axis: InteractionAxis<TValue>,
  left: TValue,
  right: TValue,
) {
  return axis.layoutKey(left) === axis.layoutKey(right)
}

function applyStyle(element: SVGElement, style: SceneStyle) {
  setAttribute(element, 'fill', style.fill)
  setAttribute(element, 'fill-opacity', style.fillOpacity)
  setAttribute(element, 'stroke', style.stroke)
  setAttribute(element, 'stroke-opacity', style.strokeOpacity)
  setAttribute(element, 'stroke-width', style.strokeWidth)
  setAttribute(element, 'opacity', style.opacity)
  setAttribute(element, 'stroke-linecap', style.lineCap)
  setAttribute(element, 'stroke-linejoin', style.lineJoin)
  setAttribute(element, 'stroke-dasharray', style.strokeDasharray)
}

function setAttribute(
  element: Element,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined) element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

function cloneChange<TValue extends ChartValue>(
  change: HandleXChange<TValue>,
): HandleXChange<TValue> {
  return {
    ...change,
    value: cloneInteractionValue(change.value),
    origin: cloneInteractionValue(change.origin),
  }
}

function defaultFormat(value: ChartValue) {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}

function finitePositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`handleX ${name} must be a positive finite number`)
  }
  return value
}

function finite(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`handleX ${name} must be finite`)
  }
  return value
}
