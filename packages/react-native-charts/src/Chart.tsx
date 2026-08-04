import * as React from 'react'
import type {
  AccessibilityActionEvent,
  ColorValue,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { View } from 'react-native'
import {
  createFocusChartCursorState,
  createFreeChartCursorState,
  resolveChartCursorFocus,
  resolveChartCursorPresentation,
  resolveChartFocusStrategy,
  resolveFocusPresentation,
} from '@tanstack/charts/cursor/host'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { viewportInteractionPoints } from '@tanstack/charts/scene'
import type {
  ChartCursorState,
  ChartDefinition,
  ChartFocusSource,
  ChartFocusState,
  ChartPoint,
  ChartScene,
  ChartTextMeasurer,
  ChartTooltipExtensionToken,
  ChartTooltipInput,
  ChartTooltipOptions,
  ChartTooltipPosition,
  ChartValue,
} from '@tanstack/charts/types'
import {
  adjacentFocusPoint,
  createNativeChartFocusModel,
  samePointIdentity,
  samePointReferences,
} from './interaction'
import { resolveNativePaint, type NativePaintResolver } from './paint'
import { NativeChartScene } from './SvgScene'
import type {
  NativeChartTooltipComponent,
  NativeChartTooltipExtension,
  NativeChartTooltipRenderContext,
} from './Tooltip'

export interface NativeChartRenderContext<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  scene: ChartScene<TDatum, TXValue, TYValue>
}

export interface ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
  accessibilityLabel: string
  accessibilityHint?: string
  width?: number
  height?: number
  aspectRatio?: number
  style?: StyleProp<ViewStyle>
  color?: ColorValue
  focusFill?: ColorValue
  fontFamily?: string
  idPrefix?: string
  testID?: string
  measureText?: ChartTextMeasurer
  resolvePaint?: NativePaintResolver
  onFocusChange?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onFocusGroupChange?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => void
  onSelect?: (point: ChartPoint<TDatum, TXValue, TYValue> | null) => void
  onRender?: (
    context: NativeChartRenderContext<TDatum, TXValue, TYValue>,
  ) => void
  renderTooltip?: (
    context: NativeChartTooltipRenderContext<TDatum, TXValue, TYValue>,
  ) => React.ReactNode
}

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>({
  definition,
  accessibilityLabel,
  accessibilityHint,
  width,
  height,
  aspectRatio,
  style,
  color = '#111827',
  focusFill = '#ffffff',
  fontFamily,
  idPrefix: idPrefixOption,
  testID,
  measureText,
  resolvePaint = resolveNativePaint,
  onFocusChange,
  onFocusGroupChange,
  onSelect,
  onRender,
  renderTooltip,
}: ChartProps<TDatum, TXValue, TYValue>) {
  const generatedId = React.useId()
  const idPrefix =
    idPrefixOption ??
    `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
  const runtime = React.useMemo(
    () => createChartRuntime<TDatum, TXValue, TYValue>(),
    [],
  )
  const [layout, setLayout] = React.useState<{
    width: number
    height: number
  } | null>(null)
  const resolvedAspectRatio = positiveFinite(aspectRatio)
  const explicitWidth = positiveFinite(width)
  const explicitHeight = positiveFinite(height)
  const sceneSize = resolveSceneSize(
    explicitWidth,
    explicitHeight,
    resolvedAspectRatio,
    layout,
  )
  const scene = React.useMemo(
    () =>
      sceneSize ? runtime.render(definition, sceneSize, { measureText }) : null,
    [definition, measureText, runtime, sceneSize?.height, sceneSize?.width],
  )
  const focusModel = React.useMemo(
    () => (scene ? createNativeChartFocusModel(scene, definition) : null),
    [definition, scene],
  )
  const interactionPoints = React.useMemo(
    () => (scene ? viewportInteractionPoints(scene) : emptyChartPoints),
    [scene],
  )
  const cursorBinding = definition.cursor
  const cursorController = cursorBinding?.controller
  const subscribeCursor = React.useCallback(
    (listener: () => void) =>
      cursorController?.subscribe(listener) ?? subscribeEmptyCursor(),
    [cursorController],
  )
  const getCursorState = React.useCallback(
    () => cursorController?.getState() ?? getEmptyCursorState(),
    [cursorController],
  )
  const cursorState = React.useSyncExternalStore<ChartCursorState<
    TXValue,
    TYValue
  > | null>(subscribeCursor, getCursorState, getCursorState)
  const cursorMatch =
    cursorBinding?.mode === 'focus' ? (cursorBinding.match ?? 'xy') : undefined
  const cursorPresentation = React.useMemo(
    () =>
      scene && cursorBinding
        ? resolveChartCursorPresentation(scene, cursorBinding, cursorState)
        : null,
    [cursorBinding, cursorState, scene],
  )
  const controlledFocusedPoints = React.useMemo(() => {
    if (!scene || cursorBinding?.mode !== 'focus') return emptyChartPoints
    return resolveChartCursorFocus(
      interactionPoints,
      cursorBinding,
      cursorState,
      resolveChartFocusStrategy(definition.focus),
    )
  }, [cursorBinding, cursorState, definition.focus, interactionPoints, scene])
  const [localFocusedPoints, setLocalFocusedPoints] = React.useState<
    readonly ChartPoint<TDatum, TXValue, TYValue>[]
  >([])
  const localFocusedPointsRef = React.useRef(localFocusedPoints)
  const previousCursorBindingRef = React.useRef({
    controller: cursorBinding?.controller,
    mode: cursorBinding?.mode,
    match: cursorMatch,
  })
  const cursorBindingChanged =
    previousCursorBindingRef.current.controller !== cursorBinding?.controller ||
    previousCursorBindingRef.current.mode !== cursorBinding?.mode ||
    previousCursorBindingRef.current.match !== cursorMatch
  const focusedPoints = cursorBinding
    ? cursorBinding.mode === 'focus'
      ? controlledFocusedPoints
      : emptyChartPoints
    : cursorBindingChanged
      ? emptyChartPoints
      : localFocusedPoints
  const focusedPointsRef = React.useRef(focusedPoints)
  focusedPointsRef.current = focusedPoints
  const callbackPointsRef =
    React.useRef<readonly ChartPoint<TDatum, TXValue, TYValue>[]>(
      localFocusedPoints,
    )
  const onFocusChangeRef = React.useRef(onFocusChange)
  const onFocusGroupChangeRef = React.useRef(onFocusGroupChange)
  const onRenderRef = React.useRef(onRender)
  onFocusChangeRef.current = onFocusChange
  onFocusGroupChangeRef.current = onFocusGroupChange
  onRenderRef.current = onRender
  const [pinnedKey, setPinnedKey] = React.useState<string | null>(null)
  const [pointer, setPointer] = React.useState<ChartTooltipPosition | null>(
    null,
  )
  const lastPublishedCursorStateRef = React.useRef<
    ChartCursorState<TXValue, TYValue> | null | undefined
  >(undefined)
  const lastPublishedCursorControllerRef = React.useRef(cursorController)
  const [focusSource, setFocusSource] =
    React.useState<ChartFocusSource>('programmatic')
  const tooltipInput = React.useMemo(
    () => resolveNativeTooltipInput(definition.tooltip),
    [definition.tooltip],
  )
  const TooltipComponent = tooltipInput?.component
  const tooltipOptions = tooltipInput?.options
  const sticky = Boolean(tooltipInput) && tooltipOptions?.sticky !== false
  const freeCursor = cursorBinding?.mode === 'free'
  const datumInteractive = Boolean(focusModel?.navigation.length)
  const pointerInteractive =
    definition.pointer !== false &&
    (datumInteractive || Boolean(scene && freeCursor))
  const keyboardInteractive =
    definition.keyboard !== false && datumInteractive && !freeCursor
  const interactionPinned = cursorBinding
    ? cursorState?.pinned === true
    : pinnedKey !== null
  const resolvedFocusSource = cursorBinding
    ? (cursorState?.source ?? focusSource)
    : focusSource
  const resolvedPointer =
    cursorBindingChanged ||
    (cursorBinding &&
      (cursorBinding.controller !== lastPublishedCursorControllerRef.current ||
        cursorState?.source !== 'pointer' ||
        cursorState !== lastPublishedCursorStateRef.current))
      ? null
      : pointer
  const cursorCurrentlyPinned = () =>
    cursorBinding
      ? cursorBinding.controller.getState()?.pinned === true
      : pinnedKey !== null

  const commitLocalFocus = React.useCallback(
    (points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) => {
      const current = localFocusedPointsRef.current
      if (samePointReferences(points, current)) return
      localFocusedPointsRef.current = points
      focusedPointsRef.current = points
      callbackPointsRef.current = points
      setLocalFocusedPoints(points)
      onFocusChangeRef.current?.(points[0] ?? null)
      onFocusGroupChangeRef.current?.(points)
    },
    [],
  )

  React.useEffect(() => () => runtime.destroy(), [runtime])
  React.useEffect(() => {
    const controller = cursorController
    return () => {
      const published = lastPublishedCursorStateRef.current
      if (
        !controller ||
        controller !== lastPublishedCursorControllerRef.current ||
        !published ||
        published.pinned ||
        controller.getState() !== published
      ) {
        return
      }
      lastPublishedCursorControllerRef.current = undefined
      lastPublishedCursorStateRef.current = undefined
      controller.setState(null)
    }
  }, [cursorBinding?.mode, cursorController, cursorMatch])
  React.useEffect(() => {
    if (scene) onRenderRef.current?.({ scene })
  }, [scene])
  React.useEffect(() => {
    if (!cursorBindingChanged) return
    previousCursorBindingRef.current = {
      controller: cursorBinding?.controller,
      mode: cursorBinding?.mode,
      match: cursorMatch,
    }
    localFocusedPointsRef.current = emptyChartPoints
    setLocalFocusedPoints(emptyChartPoints)
    setPinnedKey(null)
    setPointer(null)
    lastPublishedCursorControllerRef.current = cursorController
    lastPublishedCursorStateRef.current = undefined
  }, [
    cursorBinding?.controller,
    cursorBinding?.mode,
    cursorBindingChanged,
    cursorMatch,
  ])
  React.useEffect(() => {
    const previous = callbackPointsRef.current
    if (sameFocusedPointValues(focusedPoints, previous)) {
      callbackPointsRef.current = focusedPoints
      return
    }
    callbackPointsRef.current = focusedPoints
    onFocusChangeRef.current?.(focusedPoints[0] ?? null)
    onFocusGroupChangeRef.current?.(focusedPoints)
  }, [focusedPoints])
  React.useEffect(() => {
    if (cursorBinding) return
    const previous = localFocusedPointsRef.current[0]
    if (!focusModel || !previous) return
    const restored = focusModel.restore(previous)
    if (restored) {
      const next = focusModel.group(restored)
      const current = localFocusedPointsRef.current
      if (sameFocusedPointValues(next, current)) {
        if (!samePointReferences(next, current)) {
          localFocusedPointsRef.current = next
          callbackPointsRef.current = next
          setLocalFocusedPoints(next)
        }
        return
      }
      setFocusSource('restored')
      commitLocalFocus(next)
    } else {
      setPinnedKey(null)
      commitLocalFocus([])
    }
  }, [commitLocalFocus, cursorBinding, focusModel])
  React.useEffect(() => {
    if (!cursorBinding && !sticky) setPinnedKey(null)
  }, [cursorBinding, sticky])
  React.useEffect(() => {
    if (cursorBinding && (!cursorState || cursorState.source !== 'pointer')) {
      setPointer(null)
    }
  }, [cursorBinding, cursorState])

  const clearOwnedTransientCursor = React.useCallback(() => {
    if (!cursorBinding) return false
    const current = cursorBinding.controller.getState()
    if (
      !current ||
      cursorBinding.controller !== lastPublishedCursorControllerRef.current ||
      current !== lastPublishedCursorStateRef.current ||
      current.pinned
    ) {
      return false
    }
    lastPublishedCursorStateRef.current = null
    lastPublishedCursorControllerRef.current = undefined
    focusedPointsRef.current = emptyChartPoints
    cursorBinding.controller.setState(null)
    return true
  }, [cursorBinding])

  const dismiss = React.useCallback(() => {
    setPinnedKey(null)
    setPointer(null)
    if (cursorBinding) {
      lastPublishedCursorStateRef.current = null
      lastPublishedCursorControllerRef.current = undefined
      focusedPointsRef.current = emptyChartPoints
      cursorBinding.controller.setState(null)
    } else commitLocalFocus([])
  }, [commitLocalFocus, cursorBinding])

  const positionAtEvent = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!scene) return null
      const measuredWidth = layout?.width ?? scene.width
      const measuredHeight = layout?.height ?? scene.height
      if (measuredWidth <= 0 || measuredHeight <= 0) return null
      const position = {
        x: (event.nativeEvent.locationX / measuredWidth) * scene.width,
        y: (event.nativeEvent.locationY / measuredHeight) * scene.height,
      }
      setPointer(position)
      return position
    },
    [layout?.height, layout?.width, scene],
  )
  const pointsAtEvent = React.useCallback(
    (event: GestureResponderEvent) => {
      const position = positionAtEvent(event)
      return position && focusModel
        ? focusModel.resolve(position.x, position.y)
        : emptyChartPoints
    },
    [focusModel, positionAtEvent],
  )

  const publishFocusCursor = (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    source: ChartFocusSource,
    pinned: boolean,
  ) => {
    if (!scene || cursorBinding?.mode !== 'focus') return false
    const point = points[0]
    if (!point) {
      clearOwnedTransientCursor()
      return true
    }
    const state = createFocusChartCursorState(scene, cursorBinding, {
      primary: point,
      group: points,
      source,
      pinned,
    })
    lastPublishedCursorStateRef.current = state
    lastPublishedCursorControllerRef.current = cursorBinding.controller
    focusedPointsRef.current = points
    cursorBinding.controller.setState(state)
    return true
  }

  const commitInteractionFocus = (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    source: ChartFocusSource,
    pinned = cursorCurrentlyPinned(),
  ) => {
    if (publishFocusCursor(points, source, pinned)) return
    if (cursorBinding) return
    setFocusSource(source)
    commitLocalFocus(points)
  }

  const updateFreeCursor = (event: GestureResponderEvent, pinned: boolean) => {
    if (!scene || cursorBinding?.mode !== 'free') return false
    const position = positionAtEvent(event)
    if (!position || !plotContains(scene, position)) {
      setPointer(null)
      clearOwnedTransientCursor()
      return true
    }
    const state = createFreeChartCursorState(
      scene,
      cursorBinding,
      position,
      'pointer',
      pinned,
    )
    lastPublishedCursorStateRef.current = state
    lastPublishedCursorControllerRef.current = cursorBinding.controller
    cursorBinding.controller.setState(state)
    return true
  }

  const handleResponderGrant = (event: GestureResponderEvent) => {
    if (cursorCurrentlyPinned()) return
    if (updateFreeCursor(event, false)) return
    commitInteractionFocus(pointsAtEvent(event), 'pointer', false)
  }
  const handleResponderMove = (event: GestureResponderEvent) => {
    if (cursorCurrentlyPinned()) return
    if (updateFreeCursor(event, false)) return
    commitInteractionFocus(pointsAtEvent(event), 'pointer', false)
  }
  const handleResponderRelease = (event: GestureResponderEvent) => {
    if (cursorBinding?.mode === 'free') {
      if (cursorBinding.controller.getState()?.pinned) {
        if (cursorBinding.pin) dismiss()
      } else {
        updateFreeCursor(event, cursorBinding.pin === true)
      }
      onSelect?.(null)
      return
    }
    const points = pointsAtEvent(event)
    const point = points[0] ?? null
    if (cursorBinding?.mode === 'focus') {
      const canPin = cursorBinding.pin === true || sticky
      const currentlyPinned =
        cursorBinding.controller.getState()?.pinned === true
      if (currentlyPinned && canPin) dismiss()
      else
        commitInteractionFocus(
          points,
          'pointer',
          currentlyPinned || (canPin && point !== null),
        )
    } else {
      if (sticky) setPinnedKey(pinnedKey ? null : (point?.key ?? null))
      commitInteractionFocus(points, 'pointer')
    }
    onSelect?.(point)
  }
  const handleResponderTerminate = () => {
    if (cursorCurrentlyPinned()) return
    setPointer(null)
    if (cursorBinding) {
      clearOwnedTransientCursor()
    } else commitLocalFocus([])
  }
  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout
    if (!positiveFinite(next.width) || !positiveFinite(next.height)) return
    setLayout((current) =>
      current?.width === next.width && current.height === next.height
        ? current
        : { width: next.width, height: next.height },
    )
  }

  const navigate = (direction: -1 | 1) => {
    if (!focusModel || freeCursor) return
    const point = adjacentFocusPoint(
      focusModel,
      focusedPointsRef.current[0] ?? null,
      direction,
    )
    setPointer(null)
    commitInteractionFocus(
      point ? focusModel.group(point) : emptyChartPoints,
      'keyboard',
    )
  }
  const activate = () => {
    const point = focusedPointsRef.current[0] ?? null
    if (!point) return
    if (cursorBinding?.mode === 'focus') {
      const canPin = cursorBinding.pin === true || sticky
      if (canPin) {
        if (cursorBinding.controller.getState()?.pinned) dismiss()
        else publishFocusCursor(focusedPointsRef.current, 'keyboard', true)
      }
    } else if (!cursorBinding && sticky) {
      setPinnedKey((current) => (current ? null : point.key))
    }
    onSelect?.(point)
  }
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'increment':
        navigate(1)
        break
      case 'decrement':
        navigate(-1)
        break
      case 'activate':
        activate()
        break
      case 'escape':
        dismiss()
        break
    }
  }
  const handleFocus = () => {
    if (!keyboardInteractive || focusedPointsRef.current.length) return
    navigate(1)
  }
  const focusedPoint = focusedPoints[0] ?? null
  const focus = React.useMemo<ChartFocusState<TDatum, TXValue, TYValue> | null>(
    () =>
      focusedPoint
        ? {
            primary: focusedPoint,
            group: focusedPoints,
            source: resolvedFocusSource,
            pinned: interactionPinned,
          }
        : null,
    [focusedPoint, focusedPoints, interactionPinned, resolvedFocusSource],
  )
  const focusPresentation = React.useMemo(
    () =>
      scene
        ? resolveFocusPresentation(
            scene,
            focus,
            resolvedPointer,
            cursorPresentation,
          )
        : { under: [], over: [] },
    [cursorPresentation, focus, resolvedPointer, scene],
  )

  return (
    <View
      accessible
      accessibilityActions={
        !keyboardInteractive
          ? undefined
          : [
              { name: 'increment' },
              { name: 'decrement' },
              { name: 'activate' },
              { name: 'escape' },
            ]
      }
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={keyboardInteractive ? 'adjustable' : 'image'}
      accessibilityValue={
        focusedPoint ? { text: describePoint(focusedPoint) } : undefined
      }
      focusable={keyboardInteractive}
      onAccessibilityAction={handleAccessibilityAction}
      onBlur={handleResponderTerminate}
      onFocus={handleFocus}
      onLayout={handleLayout}
      onMoveShouldSetResponder={() => false}
      onResponderGrant={handleResponderGrant}
      onResponderMove={handleResponderMove}
      onResponderRelease={handleResponderRelease}
      onResponderTerminate={handleResponderTerminate}
      onResponderTerminationRequest={() => true}
      onStartShouldSetResponder={() => pointerInteractive}
      style={[
        {
          position: 'relative',
          overflow: 'visible',
          width: explicitWidth ?? '100%',
          height:
            explicitHeight ??
            (resolvedAspectRatio === undefined ? 320 : undefined),
          aspectRatio:
            explicitHeight === undefined ? resolvedAspectRatio : undefined,
        },
        style,
      ]}
      testID={testID}
    >
      {scene ? (
        <>
          <NativeChartScene
            scene={scene}
            color={color}
            fontFamily={fontFamily}
            idPrefix={idPrefix}
            resolvePaint={resolvePaint}
            focusFill={focusFill}
            focusPresentation={focusPresentation}
          />
          {TooltipComponent && focusedPoints.length ? (
            <TooltipComponent
              scene={scene}
              width={layout?.width ?? scene.width}
              height={layout?.height ?? scene.height}
              points={focusedPoints}
              pointer={resolvedPointer}
              focusSource={resolvedFocusSource}
              options={tooltipOptions}
              pinned={interactionPinned}
              color={color}
              resolvePaint={resolvePaint}
              dismiss={dismiss}
              render={renderTooltip}
            />
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const emptyChartPoints = [] as const

function subscribeEmptyCursor() {
  return () => {}
}

function getEmptyCursorState() {
  return null
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

function sameFocusedPointValues<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  left: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  right: readonly ChartPoint<TDatum, TXValue, TYValue>[],
) {
  return (
    left.length === right.length &&
    left.every((point, index) => {
      const current = right[index]
      return (
        current !== undefined &&
        samePointIdentity(point, current) &&
        Object.is(point.group, current.group) &&
        point.groupLabel === current.groupLabel &&
        sameChartValue(point.xValue, current.xValue) &&
        sameChartValue(point.yValue, current.yValue) &&
        sameChartValue(point.x1Value, current.x1Value) &&
        sameChartValue(point.x2Value, current.x2Value) &&
        sameChartValue(point.y1Value, current.y1Value) &&
        sameChartValue(point.y2Value, current.y2Value) &&
        point.xInterval === current.xInterval &&
        point.yInterval === current.yInterval &&
        Object.is(point.x, current.x) &&
        Object.is(point.y, current.y) &&
        point.color === current.color
      )
    })
  )
}

function sameChartValue(
  left: ChartValue | undefined,
  right: ChartValue | undefined,
) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}

function resolveNativeTooltipInput<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  input: false | ChartTooltipInput<TDatum, TXValue, TYValue> | undefined,
): {
  component: NativeChartTooltipComponent
  options?: ChartTooltipOptions<TDatum, TXValue, TYValue>
} | null {
  if (!input) return null
  const extension = 'create' in input ? input : input.use
  if (!isNativeTooltipExtension(extension)) {
    throw new Error(
      'React Native charts require a tooltip extension from @tanstack/react-native-charts/tooltip.',
    )
  }
  if (!('create' in input) && input.portal) {
    throw new Error(
      'React Native charts do not support browser tooltip portal extensions.',
    )
  }
  return {
    component: extension.create(),
    options: 'create' in input ? undefined : input,
  }
}

function isNativeTooltipExtension(
  extension: ChartTooltipExtensionToken,
): extension is NativeChartTooltipExtension {
  const candidate = extension as Partial<NativeChartTooltipExtension>
  return (
    candidate.__chartExtensionType === 'tooltip' &&
    candidate.__nativeChartHost === 'react-native'
  )
}

function resolveSceneSize(
  width: number | undefined,
  height: number | undefined,
  aspectRatio: number | undefined,
  layout: { width: number; height: number } | null,
) {
  const resolvedWidth = width ?? layout?.width
  if (!resolvedWidth) return null
  const resolvedHeight =
    height ??
    (aspectRatio === undefined
      ? (layout?.height ?? (width === undefined ? undefined : 320))
      : resolvedWidth / aspectRatio)
  return resolvedHeight
    ? { width: resolvedWidth, height: resolvedHeight }
    : null
}

function positiveFinite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function describePoint(point: ChartPoint) {
  return [
    point.groupLabel,
    formatValue(point.xValue),
    formatValue(point.yValue),
  ]
    .filter(Boolean)
    .join(', ')
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
