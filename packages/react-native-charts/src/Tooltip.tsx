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
  ChartTooltipContentContext,
  ChartTooltipExtensionToken,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPosition,
  ChartTooltipXAnchor,
  ChartTooltipYAnchor,
  ChartValue,
} from '@tanstack/charts/types'
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
    () => orderTooltipPoints(unorderedPoints, scene, options?.sort),
    [options?.sort, scene, unorderedPoints],
  )
  const point = unorderedPoints[0]
  if (!point) return null
  const content = createNativeTooltipContent(
    points,
    scene,
    pinned,
    options,
    point,
  )
  const sceneAnchor = resolveNativeTooltipAnchor(
    point,
    points,
    scene,
    pointer,
    focusSource,
    pinned,
    options,
    unorderedPoints,
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

export interface NativeChartTooltipExtension extends ChartTooltipExtensionToken {
  readonly __chartExtensionType: 'tooltip'
  readonly __nativeChartHost: 'react-native'
  create: () => NativeChartTooltipComponent
}

export const tooltip: NativeChartTooltipExtension = {
  id: 'react-native-tooltip',
  __chartExtensionType: 'tooltip',
  __nativeChartHost: 'react-native',
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
  const point = points[0]
  if (!point) return { rows: [] }
  const context = createTooltipContentContext(scene, pinned)
  const content = options?.content?.(points, context)
  if (content !== undefined) return content
  const formatted =
    options?.formatGroup?.(points) ?? options?.format?.(primaryPoint ?? point)
  if (formatted !== undefined) return formatted

  const sharedX =
    points.length > 1 &&
    points.every((candidate) => chartValueEqual(candidate.xValue, point.xValue))
  if (sharedX) {
    return {
      title: `${context.xLabel}: ${context.formatX(point.xValue)}`,
      rows: points.map((candidate) => ({
        label: candidate.groupLabel,
        value: context.formatY(candidate.yValue),
        color: candidate.color,
      })),
    }
  }

  return {
    title: point.group == null ? undefined : point.groupLabel,
    color: point.group == null ? undefined : point.color,
    rows: [
      { label: context.xLabel, value: context.formatX(point.xValue) },
      { label: context.yLabel, value: context.formatY(point.yValue) },
    ],
  }
}

function createTooltipContentContext(
  scene: ChartScene,
  pinned: boolean,
): ChartTooltipContentContext {
  return {
    pinned,
    xLabel: findSceneLabel(scene, 'x-label') ?? 'x',
    yLabel: findSceneLabel(scene, 'y-label') ?? 'y',
    formatX: formatValue,
    formatY: formatValue,
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

function findSceneLabel(scene: ChartScene, key: string) {
  const axes = scene.nodes.find(
    (node) => node.kind === 'group' && node.key === 'axes',
  )
  if (axes?.kind !== 'group') return undefined
  const label = axes.children.find((node) => node.key === key)
  return label?.kind === 'label' ? label.text : undefined
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
  const fallback = { x: point.x, y: point.y }
  const anchor = options?.anchor ?? 'point'
  if (anchor === 'point') return fallback
  if (anchor === 'pointer') return pointer ?? fallback
  if (anchor === 'group-center') {
    const x = points.map((candidate) => candidate.x)
    const y = points.map((candidate) => candidate.y)
    return {
      x: (Math.min(...x) + Math.max(...x)) / 2,
      y: (Math.min(...y) + Math.max(...y)) / 2,
    }
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
    focus: {
      primary: point,
      group: focusPoints,
      source: focusSource,
      pinned,
    },
    pointer,
    plot: scene.chart,
    surface: { width: scene.width, height: scene.height },
    scales: scene.scales,
  })
  return resolved && Number.isFinite(resolved.x) && Number.isFinite(resolved.y)
    ? resolved
    : fallback
}

function resolveTooltipCoordinate<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  axis: 'x' | 'y',
  source: ChartTooltipXAnchor | ChartTooltipYAnchor,
  point: ChartPoint<TDatum, TXValue, TYValue>,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
  pointer: ChartTooltipPosition | null,
  fallback: number,
): number {
  if (source === 'point') return axis === 'x' ? point.x : point.y
  if (source === 'pointer') return pointer?.[axis] ?? fallback
  if (source === 'value') {
    const value = axis === 'x' ? point.xValue : point.yValue
    const position = scene.scales[axis]?.map(value)
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
  const edge = 8
  const gap =
    offset !== undefined && Number.isFinite(offset) ? Math.max(0, offset) : 10
  const placements =
    placement === undefined || placement === 'auto'
      ? defaultTooltipPlacements
      : Array.isArray(placement)
        ? placement.length
          ? placement
          : defaultTooltipPlacements
        : [placement as ChartTooltipPlacement]
  const candidates = placements.map((candidate) =>
    tooltipPlacement(candidate, anchor, tooltip, gap),
  )
  let selected = candidates[0]!
  let selectedOverflow = overflow(selected, tooltip, boundary, edge)
  for (const candidate of candidates) {
    const candidateOverflow = overflow(candidate, tooltip, boundary, edge)
    if (candidateOverflow === 0) {
      selected = candidate
      break
    }
    if (candidateOverflow < selectedOverflow) {
      selected = candidate
      selectedOverflow = candidateOverflow
    }
  }
  return {
    left: clamp(
      selected.left,
      edge,
      Math.max(edge, boundary.width - edge - tooltip.width),
    ),
    top: clamp(
      selected.top,
      edge,
      Math.max(edge, boundary.height - edge - tooltip.height),
    ),
    placement: selected.placement,
  }
}

const defaultTooltipPlacements: readonly ChartTooltipPlacement[] = [
  'top',
  'bottom',
  'right',
  'left',
]

function tooltipPlacement(
  placement: ChartTooltipPlacement,
  anchor: ChartTooltipPosition,
  tooltip: { width: number; height: number },
  gap: number,
) {
  const xDirection =
    placement.endsWith('right') || placement === 'right'
      ? 1
      : placement.endsWith('left') || placement === 'left'
        ? -1
        : 0
  const yDirection =
    placement.startsWith('bottom') || placement === 'bottom'
      ? 1
      : placement.startsWith('top') || placement === 'top'
        ? -1
        : 0
  return {
    placement,
    left: anchor.x + ((xDirection - 1) * tooltip.width) / 2 + xDirection * gap,
    top: anchor.y + ((yDirection - 1) * tooltip.height) / 2 + yDirection * gap,
  }
}

function overflow(
  position: { left: number; top: number },
  tooltip: { width: number; height: number },
  boundary: { width: number; height: number },
  edge: number,
) {
  return (
    Math.max(0, edge - position.left) +
    Math.max(0, position.left + tooltip.width + edge - boundary.width) +
    Math.max(0, edge - position.top) +
    Math.max(0, position.top + tooltip.height + edge - boundary.height)
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

function formatValue(value: ChartValue) {
  return value instanceof Date
    ? Number.isNaN(+value)
      ? 'Invalid Date'
      : value.toISOString().replace('T00:00:00.000Z', '')
    : typeof value === 'number'
      ? value.toLocaleString()
      : String(value)
}

function chartValueEqual(left: ChartValue, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
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
