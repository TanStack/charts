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
import { createChartRuntime } from '@tanstack/charts/runtime'
import type {
  ChartDefinition,
  ChartFocusSource,
  ChartPoint,
  ChartScene,
  ChartTextMeasurer,
  ChartTooltipExtensionToken,
  ChartTooltipInput,
  ChartTooltipOptions,
  ChartTooltipPosition,
  ChartValue,
} from '@tanstack/charts/types'
import { NativeChartFocusOverlay } from './FocusOverlay'
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
  const [focusedPoints, setFocusedPoints] = React.useState<
    readonly ChartPoint<TDatum, TXValue, TYValue>[]
  >([])
  const focusedPointsRef = React.useRef(focusedPoints)
  const onFocusChangeRef = React.useRef(onFocusChange)
  const onFocusGroupChangeRef = React.useRef(onFocusGroupChange)
  onFocusChangeRef.current = onFocusChange
  onFocusGroupChangeRef.current = onFocusGroupChange
  const [pinnedKey, setPinnedKey] = React.useState<string | null>(null)
  const [pointer, setPointer] = React.useState<ChartTooltipPosition | null>(
    null,
  )
  const [focusSource, setFocusSource] =
    React.useState<ChartFocusSource>('programmatic')
  const tooltipInput = React.useMemo(
    () => resolveNativeTooltipInput(definition.tooltip),
    [definition.tooltip],
  )
  const TooltipComponent = tooltipInput?.component
  const tooltipOptions = tooltipInput?.options
  const sticky = Boolean(tooltipInput) && tooltipOptions?.sticky !== false
  const interactive = Boolean(scene?.points.length)

  const commitFocus = React.useCallback(
    (points: readonly ChartPoint<TDatum, TXValue, TYValue>[]) => {
      const current = focusedPointsRef.current
      if (samePointReferences(points, current)) return
      focusedPointsRef.current = points
      setFocusedPoints(points)
      onFocusChangeRef.current?.(points[0] ?? null)
      onFocusGroupChangeRef.current?.(points)
    },
    [],
  )

  React.useEffect(() => () => runtime.destroy(), [runtime])
  React.useEffect(() => {
    if (scene) onRender?.({ scene })
  }, [onRender, scene])
  React.useEffect(() => {
    const previous = focusedPointsRef.current[0]
    if (!focusModel || !previous) return
    const restored = focusModel.restore(previous)
    if (restored) {
      const next = focusModel.group(restored)
      const current = focusedPointsRef.current
      if (sameFocusedPointValues(next, current)) {
        if (!samePointReferences(next, current)) {
          focusedPointsRef.current = next
          setFocusedPoints(next)
        }
        return
      }
      setFocusSource('restored')
      commitFocus(next)
    } else {
      setPinnedKey(null)
      commitFocus([])
    }
  }, [commitFocus, focusModel])
  React.useEffect(() => {
    if (!sticky) setPinnedKey(null)
  }, [sticky])

  const dismiss = React.useCallback(() => {
    setPinnedKey(null)
    setPointer(null)
    commitFocus([])
  }, [commitFocus])

  const pointAtEvent = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!scene || !focusModel) return []
      const measuredWidth = layout?.width ?? scene.width
      const measuredHeight = layout?.height ?? scene.height
      if (measuredWidth <= 0 || measuredHeight <= 0) return []
      const position = {
        x: (event.nativeEvent.locationX / measuredWidth) * scene.width,
        y: (event.nativeEvent.locationY / measuredHeight) * scene.height,
      }
      setFocusSource('pointer')
      setPointer(position)
      return focusModel.resolve(position.x, position.y)
    },
    [focusModel, layout?.height, layout?.width, scene],
  )

  const handleResponderGrant = (event: GestureResponderEvent) => {
    if (pinnedKey) return
    commitFocus(pointAtEvent(event))
  }
  const handleResponderMove = (event: GestureResponderEvent) => {
    if (pinnedKey) return
    commitFocus(pointAtEvent(event))
  }
  const handleResponderRelease = (event: GestureResponderEvent) => {
    const points = pointAtEvent(event)
    const point = points[0] ?? null
    if (sticky) setPinnedKey(pinnedKey ? null : (point?.key ?? null))
    commitFocus(points)
    definition.selection?.change(point, 'pointer')
    onSelect?.(point)
  }
  const handleResponderTerminate = () => {
    if (pinnedKey) return
    setPointer(null)
    commitFocus([])
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
    if (!focusModel) return
    setFocusSource('keyboard')
    const point = adjacentFocusPoint(
      focusModel,
      focusedPointsRef.current[0] ?? null,
      direction,
    )
    setPointer(null)
    commitFocus(point ? focusModel.group(point) : [])
  }
  const activate = () => {
    const point = focusedPointsRef.current[0] ?? null
    if (!point) return
    if (sticky) setPinnedKey((current) => (current ? null : point.key))
    definition.selection?.change(point, 'keyboard')
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
    if (definition.keyboard === false || focusedPointsRef.current.length) return
    navigate(1)
  }
  const focusedPoint = focusedPoints[0] ?? null

  return (
    <View
      accessible
      accessibilityActions={
        definition.keyboard === false || !interactive
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
      accessibilityRole={
        definition.keyboard === false || !interactive ? 'image' : 'adjustable'
      }
      accessibilityValue={
        focusedPoint ? { text: describePoint(focusedPoint) } : undefined
      }
      focusable={definition.keyboard !== false && interactive}
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
      onStartShouldSetResponder={() => interactive}
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
          <NativeChartFocusOverlay
            width={scene.width}
            height={scene.height}
            scene={scene}
            points={focusedPoints}
            placement="under"
            source={focusSource}
            pinned={pinnedKey !== null}
            showDefault={definition.focusRing !== false}
            color={color}
            fill={focusFill}
            fontFamily={fontFamily}
            idPrefix={idPrefix}
            resolvePaint={resolvePaint}
          />
          <NativeChartScene
            scene={scene}
            color={color}
            fontFamily={fontFamily}
            idPrefix={idPrefix}
            resolvePaint={resolvePaint}
          />
          <NativeChartFocusOverlay
            width={scene.width}
            height={scene.height}
            scene={scene}
            points={focusedPoints}
            placement="over"
            source={focusSource}
            pinned={pinnedKey !== null}
            showDefault={definition.focusRing !== false}
            color={color}
            fill={focusFill}
            fontFamily={fontFamily}
            idPrefix={idPrefix}
            resolvePaint={resolvePaint}
          />
          {TooltipComponent && focusedPoints.length ? (
            <TooltipComponent
              scene={scene}
              width={layout?.width ?? scene.width}
              height={layout?.height ?? scene.height}
              points={focusedPoints}
              pointer={pointer}
              focusSource={focusSource}
              options={tooltipOptions}
              pinned={pinnedKey !== null}
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
