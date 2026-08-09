import { brushX as createD3BrushX } from 'd3-brush'
import { select } from 'd3-selection'
import { createInteractionAxis } from './interaction-axis-internal'
import type { InteractionAxis } from './interaction-axis-internal'
import {
  cloneInteractionRange as cloneRange,
  normalizeInteractionRange as normalizeRange,
  sameInteractionRange as sameRange,
} from './interaction-range-internal'
import type { ControlledSignal } from './interaction-signal'
import type {
  ChartControl,
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
import type { BrushSelection, D3BrushEvent } from 'd3-brush'

export interface BrushRange<TValue extends ChartValue> {
  readonly start: TValue
  readonly end: TValue
}

export type BrushXSource = 'pointer' | 'keyboard'
export type BrushXTarget = 'selection' | 'start' | 'end' | 'new'

export type BrushXChange<TValue extends ChartValue> =
  | BrushXChangeEvent<TValue, 'preview', 'pointer'>
  | BrushXChangeEvent<TValue, 'commit', BrushXSource>
  | BrushXChangeEvent<TValue, 'cancel', BrushXSource>

interface BrushXChangeEvent<
  TValue extends ChartValue,
  TType extends 'preview' | 'commit' | 'cancel',
  TSource extends BrushXSource,
> {
  readonly type: TType
  readonly value: BrushRange<TValue>
  readonly origin: BrushRange<TValue>
  readonly source: TSource
  readonly target: BrushXTarget
}

interface BrushXBaseOptions<TValue extends ChartValue> {
  id?: string
  range: ControlledSignal<BrushRange<TValue>, BrushXChange<TValue>>
  ariaLabel?: string
  startAriaLabel?: string
  endAriaLabel?: string
  format?: (value: TValue) => string
  handleSize?: number
  selectionStyle?: SceneStyle
  handleStyle?: SceneStyle
}

export interface BrushXValuesOptions<
  TValue extends ChartValue,
> extends BrushXBaseOptions<TValue> {
  values: readonly TValue[]
  keyboard?: boolean
}

export interface BrushXContinuousOptions<
  TValue extends number | Date,
> extends BrushXBaseOptions<TValue> {
  values?: never
  keyboard: false
}

interface BrushXControl<TValue extends ChartValue> extends ChartHostControl {
  readonly kind: 'brush-x'
  readonly id: string
  readonly bounds: ChartBounds
  readonly width: number
  readonly height: number
  readonly axis: InteractionAxis<TValue>
  readonly range: BrushRange<TValue>
  readonly keyboard: boolean
  readonly ariaLabel: string
  readonly startAriaLabel: string
  readonly endAriaLabel: string
  readonly format: (value: TValue) => string
  readonly handleSize: number
  readonly selectionStyle: SceneStyle
  readonly handleStyle: SceneStyle
  readonly change: (
    value: BrushRange<TValue>,
    reason: BrushXChange<TValue>,
  ) => void
}

const defaultId = 'brush-x'

export function brushX<TValue extends ChartValue>(
  options: BrushXValuesOptions<TValue>,
): ChartControl<TValue, any>
export function brushX<TValue extends number | Date>(
  options: BrushXContinuousOptions<TValue>,
): ChartControl<TValue, any>
export function brushX<TValue extends ChartValue>(
  options: BrushXBaseOptions<TValue> & {
    values?: readonly TValue[]
    keyboard?: boolean
  },
): ChartControl<TValue, any> {
  const id = options.id ?? defaultId
  const handleSize = finitePositive(options.handleSize ?? 24, 'handleSize')
  const keyboard =
    'values' in options && options.values !== undefined
      ? options.keyboard !== false
      : false

  return {
    id,
    resolve(context) {
      const inputRange = options.range.value as BrushRange<TValue>
      const axis = createInteractionAxis({
        axis: 'x',
        scale: context.scales.x,
        extent: [context.chart.x, context.chart.x + context.chart.width],
        sample: inputRange.start,
        ...('values' in options && options.values !== undefined
          ? { values: options.values as readonly TValue[] }
          : {}),
      })
      const range = normalizeRange(axis, inputRange)
      const color = context.theme.palette[0] ?? context.theme.foreground
      const selectionStyle: SceneStyle = {
        fill: color,
        fillOpacity: 0.16,
        stroke: color,
        strokeWidth: 1.5,
        ...options.selectionStyle,
      }
      const handleStyle: SceneStyle = {
        fill: color,
        fillOpacity: 0.9,
        ...options.handleStyle,
      }
      const fallbackKey = `behavior:${id}:fallback`
      const format = options.format ?? defaultFormat
      const control: BrushXControl<TValue> = {
        kind: 'brush-x',
        key: id,
        id,
        extension: brushXControlExtension,
        fallbackNodeKey: fallbackKey,
        bounds: context.chart,
        width: context.width,
        height: context.height,
        axis,
        range,
        keyboard,
        ariaLabel: options.ariaLabel ?? 'Horizontal range',
        startAriaLabel: options.startAriaLabel ?? 'Range start',
        endAriaLabel: options.endAriaLabel ?? 'Range end',
        format,
        handleSize,
        selectionStyle,
        handleStyle,
        change(value, reason) {
          options.range.onChange(cloneRange(value), {
            reason: cloneChange(reason),
          })
        },
      }
      return {
        nodes: [renderFallback(control, fallbackKey)],
        controls: [control],
      }
    },
  }
}

function renderFallback<TValue extends ChartValue>(
  control: BrushXControl<TValue>,
  key: string,
): SceneNode {
  const first = control.axis.position(control.range.start)
  const second = control.axis.position(control.range.end)
  const left = Math.min(first, second)
  const right = Math.max(first, second)
  const visibleHandleWidth = Math.min(8, control.handleSize)
  const handleOffset = visibleHandleWidth / 2
  return {
    kind: 'group',
    key,
    className: 'ts-chart__brush-x-fallback',
    ariaHidden: true,
    children: [
      {
        kind: 'rect',
        key: `${key}:selection`,
        className: 'selection',
        x: left,
        y: control.bounds.y,
        width: right - left,
        height: control.bounds.height,
        style: control.selectionStyle,
      },
      {
        kind: 'rect',
        key: `${key}:start`,
        className: 'handle handle--start',
        x: first - handleOffset,
        y: control.bounds.y,
        width: visibleHandleWidth,
        height: control.bounds.height,
        style: control.handleStyle,
      },
      {
        kind: 'rect',
        key: `${key}:end`,
        className: 'handle handle--end',
        x: second - handleOffset,
        y: control.bounds.y,
        width: visibleHandleWidth,
        height: control.bounds.height,
        style: control.handleStyle,
      },
    ],
  }
}

const brushXControlExtension: ChartHostControlExtension = {
  id: 'brush-x',
  create: createBrushXControl,
}

function createBrushXControl({
  container,
  surface,
}: Parameters<
  ChartHostControlExtension['create']
>[0]): ChartHostControlInstance {
  const root = container.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  )
  const group = container.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'g',
  )
  root.append(group)
  root.style.position = 'absolute'
  root.style.inset = '0'
  root.style.zIndex = '1'
  root.style.width = '100%'
  root.style.height = '100%'
  root.style.overflow = 'visible'
  root.style.touchAction = 'none'
  root.style.pointerEvents = 'auto'
  root.setAttribute('role', 'group')

  let control: BrushXControl<ChartValue> | undefined
  let scene: ChartScene | undefined
  let moving = false
  let active = false
  let origin: BrushRange<ChartValue> | undefined
  let gestureRange: BrushRange<ChartValue> | undefined
  let target: BrushXTarget = 'selection'
  let activeInput: 'mouse' | 'touch' | undefined
  let activeView: (Window & typeof globalThis) | undefined
  let cancelledTouchRange: BrushRange<ChartValue> | undefined
  const brush = createD3BrushX<unknown>()
    .touchable(true)
    .on('start.chart-brush-x', handleStart)
    .on('brush.chart-brush-x', handleBrush)
    .on('end.chart-brush-x', handleEnd)

  root.addEventListener('pointercancel', cancelPointer, true)
  root.addEventListener('touchcancel', cancelPointer, true)
  root.addEventListener('touchmove', restoreCancelledTouchRange, true)
  container.ownerDocument.addEventListener('keydown', cancelWithEscape, true)

  return {
    update(nextControl, nextScene) {
      const next = asBrushXControl(nextControl)
      control = next
      scene = nextScene
      root.dataset.chartBrush = next.id
      root.setAttribute('aria-label', next.ariaLabel)
      root.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`)
      root.setAttribute('width', '100%')
      root.setAttribute('height', '100%')
      if (!root.isConnected || root.parentElement !== container) {
        container.append(root)
      }

      brush
        .extent([
          [next.bounds.x, next.bounds.y],
          [
            next.bounds.x + next.bounds.width,
            next.bounds.y + next.bounds.height,
          ],
        ])
        .handleSize(next.handleSize)
      select(group).call(brush)

      if (
        active &&
        gestureRange &&
        sameRange(next.axis, next.range, gestureRange)
      ) {
        decorate()
        return
      }
      if (active) {
        const cancellingTouch = activeInput === 'touch'
        active = false
        endD3Gesture()
        if (cancellingTouch) cancelledTouchRange = cloneRange(next.range)
        finishGesture()
      } else if (cancelledTouchRange) {
        cancelledTouchRange = cloneRange(next.range)
      }
      moveTo(next.range)
    },
    contains(eventTarget) {
      return Boolean(eventTarget && root.contains(eventTarget as Node))
    },
    destroy() {
      if (active) {
        active = false
        endD3Gesture()
      }
      root.removeEventListener('pointercancel', cancelPointer, true)
      root.removeEventListener('touchcancel', cancelPointer, true)
      root.removeEventListener('touchmove', restoreCancelledTouchRange, true)
      container.ownerDocument.removeEventListener(
        'keydown',
        cancelWithEscape,
        true,
      )
      select(group).on('.brush', null)
      root.remove()
      control = undefined
      scene = undefined
      active = false
      cancelledTouchRange = undefined
    },
  }

  function handleStart(event: D3BrushEvent<unknown>) {
    if (moving || !event.sourceEvent || !control) return
    active = true
    origin = cloneRange(control.range)
    gestureRange = cloneRange(control.range)
    target = eventTarget(event.sourceEvent, control)
    activeInput = isTouchSource(event.sourceEvent) ? 'touch' : 'mouse'
    activeView =
      eventView(event.sourceEvent) ??
      container.ownerDocument.defaultView ??
      undefined
  }

  function handleBrush(event: D3BrushEvent<unknown>) {
    if (moving || !active || !event.sourceEvent || !control || !origin) return
    const next = selectionRange(event.selection, control.axis)
    if (
      !next ||
      (gestureRange && sameRange(control.axis, next, gestureRange))
    ) {
      return
    }
    gestureRange = next
    const changedControl = control
    changedControl.change(next, {
      type: 'preview',
      value: next,
      origin,
      source: 'pointer',
      target,
    })
    decorate(control === changedControl ? next : control.range)
  }

  function handleEnd(event: D3BrushEvent<unknown>) {
    if (moving || !event.sourceEvent || !control) return
    if (!active) {
      if (cancelledTouchRange) {
        const restored = cancelledTouchRange
        cancelledTouchRange = undefined
        moveTo(restored)
      }
      return
    }
    if (!origin) return
    active = false
    let next = selectionRange(event.selection, control.axis)
    if (!next) {
      const position = sourceSceneX(event.sourceEvent)
      if (position == null) return finishGesture()
      const value = control.axis.valueAt(position)
      next = { start: value, end: value }
      target = 'new'
    }
    gestureRange = next
    const started = origin
    const changedControl = control
    changedControl.change(next, {
      type: 'commit',
      value: next,
      origin: started,
      source: 'pointer',
      target,
    })
    moveToControlledRange()
    finishGesture()
  }

  function cancelPointer(event: Event) {
    cancel('pointer', event.type !== 'touchcancel')
  }

  function cancelWithEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !active) return
    event.preventDefault()
    event.stopPropagation()
    cancel('keyboard', true)
  }

  function cancel(source: BrushXSource, endGesture: boolean) {
    if (!active || !control || !origin) return
    const cancellingTouch = activeInput === 'touch'
    active = false
    const restored = cloneRange(origin)
    if (endGesture) endD3Gesture()
    const changedControl = control
    changedControl.change(restored, {
      type: 'cancel',
      value: restored,
      origin,
      source,
      target,
    })
    const displayed = control?.range
    if (displayed && cancellingTouch) {
      cancelledTouchRange = cloneRange(displayed)
    }
    if (displayed) moveTo(displayed)
    finishGesture()
  }

  function finishGesture() {
    origin = undefined
    gestureRange = undefined
    target = 'selection'
    activeInput = undefined
    activeView = undefined
  }

  function endD3Gesture() {
    if (activeInput === 'mouse' && activeView) {
      const end = select(activeView).on('mouseup.brush') as
        ((this: Window, event: MouseEvent) => void) | undefined
      const event = new activeView.MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'view', { value: activeView })
      end?.call(activeView, event)
    }
    activeInput = undefined
    activeView = undefined
  }

  function restoreCancelledTouchRange() {
    if (!cancelledTouchRange) return
    queueMicrotask(() => {
      if (!cancelledTouchRange || !control || !root.isConnected) return
      moveTo(cancelledTouchRange)
    })
  }

  function sourceSceneX(source: unknown) {
    if (!control || !scene) return null
    const client = clientPosition(source)
    if (!client) return null
    return surface.clientToScene?.(scene, client.x, client.y)?.x ?? null
  }

  function moveTo(range: BrushRange<ChartValue>) {
    if (!control) return
    const first = control.axis.position(range.start)
    const second = control.axis.position(range.end)
    moving = true
    select(group).call(brush.move, [
      Math.min(first, second),
      Math.max(first, second),
    ])
    moving = false
    decorate(range)
  }

  function moveToControlledRange() {
    if (control) moveTo(control.range)
  }

  function decorate(range = control?.range) {
    if (!control || !range) return
    const selection = group.querySelector<SVGRectElement>('.selection')
    applyStyle(selection, control.selectionStyle)
    selection?.setAttribute('data-chart-brush-selection', '')

    const startIsWest =
      control.axis.position(range.start) <= control.axis.position(range.end)
    const west = group.querySelector<SVGRectElement>('.handle--w')
    const east = group.querySelector<SVGRectElement>('.handle--e')
    decorateHandle(west, startIsWest ? 'start' : 'end', range)
    decorateHandle(east, startIsWest ? 'end' : 'start', range)
  }

  function decorateHandle(
    element: SVGRectElement | null,
    handleTarget: 'start' | 'end',
    range: BrushRange<ChartValue>,
  ) {
    if (!element || !control) return
    const value = range[handleTarget]
    applyStyle(element, control.handleStyle)
    element.dataset.chartBrushHandle = handleTarget
    if (!control.keyboard || !control.axis.values) {
      element.setAttribute('aria-hidden', 'true')
      for (const attribute of [
        'role',
        'tabindex',
        'aria-orientation',
        'aria-label',
        'aria-valuemin',
        'aria-valuemax',
        'aria-valuenow',
        'aria-valuetext',
        'aria-keyshortcuts',
      ]) {
        element.removeAttribute(attribute)
      }
      element.onkeydown = null
      return
    }
    const index = control.axis.indexOf(value)
    const startIndex = control.axis.indexOf(range.start)
    const endIndex = control.axis.indexOf(range.end)
    element.removeAttribute('aria-hidden')
    element.setAttribute('role', 'slider')
    element.setAttribute('tabindex', '0')
    element.setAttribute('aria-orientation', 'horizontal')
    element.setAttribute(
      'aria-label',
      handleTarget === 'start' ? control.startAriaLabel : control.endAriaLabel,
    )
    element.setAttribute(
      'aria-valuemin',
      String(handleTarget === 'start' ? 0 : startIndex),
    )
    element.setAttribute(
      'aria-valuemax',
      String(
        handleTarget === 'start' ? endIndex : control.axis.values.length - 1,
      ),
    )
    element.setAttribute('aria-valuenow', String(index))
    element.setAttribute('aria-valuetext', control.format(value))
    element.setAttribute(
      'aria-keyshortcuts',
      'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
    )
    element.onkeydown = (event) => handleKey(event, handleTarget)
  }

  function handleKey(event: KeyboardEvent, handleTarget: 'start' | 'end') {
    if (!control?.axis.values) return
    const current = control.range
    const currentIndex = control.axis.indexOf(current[handleTarget])
    const otherIndex = control.axis.indexOf(
      current[handleTarget === 'start' ? 'end' : 'start'],
    )
    let nextIndex: number | undefined
    if (event.key === 'Home')
      nextIndex = handleTarget === 'start' ? 0 : otherIndex
    if (event.key === 'End') {
      nextIndex =
        handleTarget === 'end' ? control.axis.values.length - 1 : otherIndex
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextIndex = currentIndex - 1
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextIndex = currentIndex + 1
    }
    if (nextIndex === undefined) return
    event.preventDefault()
    event.stopPropagation()
    nextIndex = Math.max(0, Math.min(control.axis.values.length - 1, nextIndex))
    nextIndex =
      handleTarget === 'start'
        ? Math.min(nextIndex, otherIndex)
        : Math.max(nextIndex, otherIndex)
    const next = normalizeRange(control.axis, {
      ...current,
      [handleTarget]: control.axis.at(nextIndex),
    })
    const changedControl = control
    changedControl.change(next, {
      type: 'commit',
      value: next,
      origin: current,
      source: 'keyboard',
      target: handleTarget,
    })
    moveToControlledRange()
  }
}

function asBrushXControl(control: ChartHostControl): BrushXControl<ChartValue> {
  if (!('kind' in control) || control.kind !== 'brush-x') {
    throw new TypeError('Expected a horizontal brush control')
  }
  return control as BrushXControl<ChartValue>
}

function selectionRange<TValue extends ChartValue>(
  selection: BrushSelection | null,
  axis: InteractionAxis<TValue>,
): BrushRange<TValue> | null {
  if (
    !selection ||
    typeof selection[0] !== 'number' ||
    typeof selection[1] !== 'number'
  ) {
    return null
  }
  return normalizeRange(axis, {
    start: axis.valueAt(selection[0]),
    end: axis.valueAt(selection[1]),
  })
}

function eventTarget<TValue extends ChartValue>(
  source: unknown,
  control: BrushXControl<TValue>,
): BrushXTarget {
  const element =
    source && typeof source === 'object' && 'target' in source
      ? (source.target as Element | null)
      : null
  if (element?.classList.contains('selection')) return 'selection'
  if (element?.classList.contains('handle--w')) {
    return control.axis.position(control.range.start) <=
      control.axis.position(control.range.end)
      ? 'start'
      : 'end'
  }
  if (element?.classList.contains('handle--e')) {
    return control.axis.position(control.range.start) <=
      control.axis.position(control.range.end)
      ? 'end'
      : 'start'
  }
  return 'new'
}

function clientPosition(source: unknown) {
  if (!source || typeof source !== 'object') return null
  if ('clientX' in source && 'clientY' in source) {
    return { x: Number(source.clientX), y: Number(source.clientY) }
  }
  if ('changedTouches' in source) {
    const touch = (source.changedTouches as TouchList | undefined)?.[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }
  return null
}

function isTouchSource(source: unknown) {
  return Boolean(source && typeof source === 'object' && 'touches' in source)
}

function eventView(source: unknown): (Window & typeof globalThis) | undefined {
  if (!source || typeof source !== 'object' || !('view' in source)) return
  const view = source.view
  return view && typeof view === 'object' && 'document' in view
    ? (view as Window & typeof globalThis)
    : undefined
}

function applyStyle(element: SVGElement | null, style: SceneStyle) {
  if (!element) return
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
  change: BrushXChange<TValue>,
): BrushXChange<TValue> {
  return {
    ...change,
    value: cloneRange(change.value),
    origin: cloneRange(change.origin),
  }
}

function defaultFormat(value: ChartValue) {
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}

function finitePositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`brushX ${name} must be a positive finite number`)
  }
  return value
}
