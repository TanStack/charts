import * as React from 'react'
import type {
  ColorValue,
  LayoutChangeEvent,
  TextStyle,
  ViewStyle,
} from 'react-native'
import { Text, View } from 'react-native'
import type {
  ChartPoint,
  ChartFocusSource,
  ChartScene,
  ChartTooltipContent,
  ChartTooltipExtensionToken,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPosition,
  ChartValue,
} from '@tanstack/charts/types'
import {
  createChartTooltipContent,
  orderChartTooltipPoints,
  resolveChartTooltipAnchor,
  resolveChartTooltipPlacement,
} from '@tanstack/charts/tooltip/model'
import { resolveNativeSolidPaint, type NativePaintResolver } from './paint'

export interface NativeChartTooltipRenderContext<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  content: ChartTooltipContent | string
  pinned: boolean
  dismiss: () => void
  defaultBody: React.ReactNode
}

export interface NativeChartTooltipProps<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  scene: ChartScene<TDatum, TXValue, TYValue>
  width: number
  height: number
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  pointer: ChartTooltipPosition | null
  focusSource: ChartFocusSource
  options?: ChartTooltipOptions<TDatum, TXValue, TYValue>
  pinned: boolean
  color: ColorValue
  resolvePaint: NativePaintResolver
  dismiss: () => void
  render?: (
    context: NativeChartTooltipRenderContext<TDatum, TXValue, TYValue>,
  ) => React.ReactNode
}

export function NativeChartTooltip<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>({
  scene,
  width,
  height,
  points: unorderedPoints,
  pointer,
  focusSource,
  options,
  pinned,
  color,
  resolvePaint,
  dismiss,
  render,
}: NativeChartTooltipProps<TDatum, TXValue, TYValue>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const points = React.useMemo(
    () => orderChartTooltipPoints(unorderedPoints, scene, options?.sort),
    [options?.sort, scene, unorderedPoints],
  )
  const point = unorderedPoints[0]
  if (!point) return null
  const content = createChartTooltipContent(
    points,
    scene,
    pinned,
    options,
    point,
  )
  const sceneAnchor = resolveChartTooltipAnchor(
    point,
    points,
    scene,
    pointer,
    options,
    {
      primary: point,
      group: unorderedPoints,
      source: focusSource,
      pinned,
    },
  )
  const anchor = {
    x: (sceneAnchor.x / scene.width) * width,
    y: (sceneAnchor.y / scene.height) * height,
  }
  const position = placeNativeTooltip(
    anchor,
    size,
    { width, height },
    options?.placement,
    options?.offset,
  )
  const defaultBody = (
    <DefaultNativeTooltipBody
      content={content}
      color={color}
      resolvePaint={resolvePaint}
    />
  )
  const body = render
    ? render({ points, content, pinned, dismiss, defaultBody })
    : defaultBody
  const accessibilityLabel = tooltipAccessibilityLabel(content)
  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout
    if (next.width !== size.width || next.height !== size.height) {
      setSize({ width: next.width, height: next.height })
    }
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={pinned ? 'none' : 'polite'}
      accessibilityRole={pinned ? 'summary' : undefined}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => pinned}
      pointerEvents={pinned ? 'auto' : 'none'}
      style={[tooltipStyle, { left: position.left, top: position.top }]}
    >
      {body}
    </View>
  )
}

export type NativeChartTooltipComponent = typeof NativeChartTooltip

export interface NativeChartTooltipExtension extends ChartTooltipExtensionToken<'react-native'> {
  readonly __chartExtensionType: 'tooltip'
  readonly __chartTooltipHost: 'react-native'
  create: () => NativeChartTooltipComponent
}

export const tooltip: NativeChartTooltipExtension = {
  id: 'react-native-tooltip',
  __chartExtensionType: 'tooltip',
  __chartTooltipHost: 'react-native',
  create: () => NativeChartTooltip,
}

function DefaultNativeTooltipBody({
  content,
  color,
  resolvePaint,
}: {
  content: ChartTooltipContent | string
  color: ColorValue
  resolvePaint: NativePaintResolver
}) {
  if (typeof content === 'string') {
    return <Text style={tooltipTextStyle}>{content}</Text>
  }
  return (
    <View>
      {content.title ? (
        <View style={titleStyle}>
          {content.color ? (
            <View
              style={[
                swatchStyle,
                {
                  backgroundColor: resolveNativeSolidPaint(
                    content.color,
                    { color },
                    resolvePaint,
                  ),
                },
              ]}
            />
          ) : null}
          <Text style={titleTextStyle}>{content.title}</Text>
        </View>
      ) : null}
      {content.rows.map((row, index) => (
        <View key={`${row.label}:${index}`} style={rowStyle}>
          <View
            style={[
              swatchStyle,
              {
                backgroundColor: row.color
                  ? resolveNativeSolidPaint(row.color, { color }, resolvePaint)
                  : 'transparent',
              },
            ]}
          />
          <Text numberOfLines={1} style={rowLabelStyle}>
            {row.label}
          </Text>
          <Text numberOfLines={1} style={rowValueStyle}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function createNativeTooltipContent<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
  pinned = false,
  options?: ChartTooltipOptions<TDatum, TXValue, TYValue>,
  primaryPoint?: ChartPoint<TDatum, TXValue, TYValue>,
): ChartTooltipContent | string {
  return createChartTooltipContent(points, scene, pinned, options, primaryPoint)
}

export function resolveNativeTooltipAnchor<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  point: ChartPoint<TDatum, TXValue, TYValue>,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
  pointer: ChartTooltipPosition | null,
  focusSource: ChartFocusSource,
  pinned: boolean,
  options?: ChartTooltipOptions<TDatum, TXValue, TYValue>,
  focusPoints: readonly ChartPoint<TDatum, TXValue, TYValue>[] = points,
): ChartTooltipPosition {
  return resolveChartTooltipAnchor(point, points, scene, pointer, options, {
    primary: point,
    group: focusPoints,
    source: focusSource,
    pinned,
  })
}

export function placeNativeTooltip(
  anchor: ChartTooltipPosition,
  tooltip: { width: number; height: number },
  boundary: { width: number; height: number },
  placement:
    | 'auto'
    | ChartTooltipPlacement
    | readonly ChartTooltipPlacement[]
    | undefined,
  offset: number | undefined,
) {
  return resolveChartTooltipPlacement(
    anchor,
    tooltip,
    { left: 0, top: 0, right: boundary.width, bottom: boundary.height },
    placement,
    offset,
  )
}

function tooltipAccessibilityLabel(content: ChartTooltipContent | string) {
  return typeof content === 'string'
    ? content
    : [
        content.title,
        ...content.rows.map((row) => `${row.label}: ${row.value}`),
      ]
        .filter(Boolean)
        .join('\n')
}

const tooltipStyle: ViewStyle = {
  position: 'absolute',
  zIndex: 1,
  maxWidth: '80%',
  paddingHorizontal: 9,
  paddingVertical: 7,
  borderWidth: 1,
  borderColor: 'rgba(17, 24, 39, 0.16)',
  borderRadius: 7,
  backgroundColor: '#ffffff',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.14,
  shadowRadius: 12,
  elevation: 4,
}

const tooltipTextStyle = {
  color: '#111827',
  fontSize: 12,
  fontWeight: '500',
} as const

const titleStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
} as const

const titleTextStyle = {
  color: '#111827',
  fontSize: 12,
  fontWeight: '700',
} as const

const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
} as const

const swatchStyle = {
  width: 9,
  height: 9,
  borderRadius: 2,
} as const

const rowLabelStyle = {
  flexGrow: 1,
  flexShrink: 1,
  color: '#374151',
  fontSize: 12,
} as const

const rowValueStyle: TextStyle = {
  color: '#111827',
  fontSize: 12,
  fontVariant: ['tabular-nums'],
}
