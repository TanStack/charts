import type {
  ChartFocusState,
  ChartPoint,
  ChartScene,
  ChartTooltipChannelItem,
  ChartTooltipContent,
  ChartTooltipContentContext,
  ChartTooltipItem,
  ChartTooltipOptions,
  ChartTooltipPosition,
  ChartValue,
} from './types'

export { resolveChartTooltipPlacement } from './tooltip-placement'
export type { TooltipBounds, TooltipSize } from './tooltip-placement'

/** Orders focused points for host tooltip presentation. */
export function orderChartTooltipPoints<
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
      points.every((point) => sameChartTooltipValue(point.xValue, first.xValue))
    const sharedY =
      first !== undefined &&
      points.every((point) => sameChartTooltipValue(point.yValue, first.yValue))
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

/** Resolves authored formatting and the built-in structured tooltip model. */
export function createChartTooltipContent<
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
  const context = createTooltipContentContext(scene, pinned, options)
  const content = options?.content?.(points, context)
  if (content !== undefined) return content
  const formatted =
    options?.formatGroup?.(points, context) ??
    options?.format?.(primaryPoint ?? point, context)
  if (formatted !== undefined) return formatted
  return defaultTooltipContent(points, scene, options, context)
}

/** Resolves a scene-space anchor identically for every tooltip host. */
export function resolveChartTooltipAnchor<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  point: ChartPoint<TDatum, TXValue, TYValue>,
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
  pointer: ChartTooltipPosition | null,
  options?: ChartTooltipOptions<TDatum, TXValue, TYValue>,
  focus: ChartFocusState<TDatum, TXValue, TYValue> = {
    primary: point,
    group: points,
    source: 'programmatic',
    pinned: false,
  },
): ChartTooltipPosition {
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

export function formatChartTooltipValue(value: ChartValue) {
  return value instanceof Date
    ? Number.isNaN(+value)
      ? 'Invalid Date'
      : value.toISOString().replace('T00:00:00.000Z', '')
    : typeof value === 'number'
      ? value.toLocaleString()
      : String(value)
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
    formatX: formatChartTooltipValue,
    formatY: formatChartTooltipValue,
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
    points.every((candidate) =>
      sameChartTooltipValue(candidate.xValue, point.xValue),
    )
  const sharedY =
    points.length > 1 &&
    points.every((candidate) =>
      sameChartTooltipValue(candidate.yValue, point.yValue),
    )

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

function tooltipItemRows(
  point: ChartPoint,
  items: readonly ChartTooltipItem<any, any, any>[],
  context: ChartTooltipContentContext,
) {
  return items.flatMap((item) => {
    if (typeof item === 'string') {
      if (item === 'group') {
        return [{ label: 'Group', value: point.groupLabel, color: point.color }]
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
          value: text ?? formatChartTooltipValue(value),
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
    return formatChartTooltipValue(end - start)
  }
  if (
    interval === 'range' &&
    start !== undefined &&
    end !== undefined &&
    !sameChartTooltipValue(start, end)
  ) {
    return `${formatChartTooltipValue(start)}–${formatChartTooltipValue(end)}`
  }
  return formatChartTooltipValue(axis === 'x' ? point.xValue : point.yValue)
}

function findSceneLabel(scene: ChartScene, key: string) {
  const axes = scene.nodes.find(
    (node) => node.kind === 'group' && node.key === 'axes',
  )
  if (axes?.kind !== 'group') return undefined
  const label = axes.children.find((node) => node.key === key)
  return label?.kind === 'label' ? label.text : undefined
}

function resolveTooltipCoordinate(
  axis: 'x' | 'y',
  source: string,
  point: ChartPoint,
  points: readonly ChartPoint[],
  scene: ChartScene,
  pointer: ChartTooltipPosition | null,
  fallback: number,
) {
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

function colorOrder(scene: ChartScene, group: ChartPoint['group']) {
  const index = group == null ? -1 : scene.colors.domain.indexOf(group)
  return index < 0 ? Number.MAX_SAFE_INTEGER : index
}

function sameChartTooltipValue(left: ChartValue, right: ChartValue) {
  return left instanceof Date && right instanceof Date
    ? left.getTime() === right.getTime()
    : Object.is(left, right)
}
