import {
  layoutCategoricalLegendFlow,
  layoutCategoricalLegendItems,
  resolveCategoricalLegendItems,
} from './legend-layout-internal'
import { valueKey } from './scales'
import { estimateTextWidth } from './text-estimate-internal'
import type {
  ChartBounds,
  ChartColorLegend,
  ChartKey,
  ChartLegendPlacement,
  ResolvedColorScaleKind,
  SceneLabel,
  SceneNode,
} from './types'

export interface ColorLegendItemContext {
  color: string
  index: number
  label: string
}

export type ColorLegendIndicatorShape = 'dot' | 'square' | 'line' | 'line-dot'

export type ColorLegendItemValue<TValue extends ChartKey, TResult> =
  TResult | ((value: TValue, context: ColorLegendItemContext) => TResult)

export interface ColorLegendIndicatorRenderContext extends ColorLegendItemContext {
  bounds: ChartBounds
}

export interface ColorLegendIndicatorOptions<
  TValue extends ChartKey = ChartKey,
> {
  shape?: ColorLegendItemValue<TValue, ColorLegendIndicatorShape>
  width?: number
  height?: number
  gap?: number
  render?: (
    value: TValue,
    context: ColorLegendIndicatorRenderContext,
  ) => SceneNode | readonly SceneNode[]
}

export interface ColorLegendLabelOptions<TValue extends ChartKey = ChartKey> {
  format?: (value: TValue) => string
  fontSize?: number
  fontWeight?: number
  fill?: ColorLegendItemValue<TValue, string>
  fillOpacity?: number
}

export interface ColorLegendItemOptions<TValue extends ChartKey = ChartKey> {
  justify?: 'start' | 'center' | 'stretch'
  gap?: number
  rowGap?: number
  indicator?: ColorLegendIndicatorOptions<TValue>
  label?: ColorLegendLabelOptions<TValue>
}

export interface ColorLegendOptions<TValue extends ChartKey = ChartKey> {
  label?: string
  itemWidth?: number
  items?: ColorLegendItemOptions<TValue>
  width?: number
  format?: (value: number) => string
  placement?: ChartLegendPlacement
}

export interface ColorGradientLegendOptions {
  label?: string
  steps?: number
  width?: number
  format?: (value: number) => string
  placement?: ChartLegendPlacement
}

export function colorLegend<TValue extends ChartKey = ChartKey>(
  options: ColorLegendOptions<TValue> = {},
): ChartColorLegend {
  const gradient = colorGradientLegend({
    label: options.label,
    width: options.width,
    format: options.format,
    placement: options.placement,
  })
  const minimumItemWidth = Math.max(64, options.itemWidth ?? 110)
  const labelOffset = options.label ? 13 : 0
  return {
    placement: options.placement,
    height(itemCount, context) {
      if (isQuantitativeLegend(context.colors.kind)) {
        return gradient.height(itemCount, context)
      }
      const presentation = resolveCategoricalLegendPresentation(
        options,
        context,
        minimumItemWidth,
      )
      return 18 + labelOffset + presentation.rows * presentation.rowHeight
    },
    render(context) {
      if (isContinuousLegend(context.colors.kind)) {
        return gradient.render(context)
      }
      if (isSteppedLegend(context.colors.kind)) {
        return renderSteppedLegend(options, context)
      }
      const { bounds, theme } = context
      const presentation = resolveCategoricalLegendPresentation(
        options,
        context,
        minimumItemWidth,
      )
      const children: SceneNode[] = []
      if (options.label) {
        children.push({
          kind: 'label',
          key: 'legend-label',
          x: bounds.x,
          y: bounds.y + 11,
          text: options.label,
          fontSize: 11,
          fontWeight: 600,
          style: { fill: theme.foreground, fillOpacity: 0.78 },
        })
      }
      presentation.items.forEach(({ item, row, x }) => {
        const y = bounds.y + 10 + labelOffset + row * presentation.rowHeight
        const indicatorBounds = {
          x: bounds.x + x,
          y: y - presentation.indicatorHeight / 2,
          width: presentation.indicatorWidth,
          height: presentation.indicatorHeight,
        }
        children.push(
          ...renderCategoricalLegendIndicator(
            options.items?.indicator,
            item.value,
            item.context,
            indicatorBounds,
            theme.background,
          ),
          {
            kind: 'label',
            key: `legend-label:${item.key}`,
            x:
              indicatorBounds.x +
              indicatorBounds.width +
              presentation.indicatorGap,
            y,
            text: item.label,
            baseline: 'middle',
            fontSize: presentation.fontSize,
            fontWeight: presentation.fontWeight,
            style: {
              fill: resolveItemValue(
                options.items?.label?.fill,
                item.value,
                item.context,
                theme.foreground,
              ),
              fillOpacity:
                options.items?.label?.fillOpacity ??
                (options.items?.label?.fill === undefined ? 0.76 : 1),
            },
          } satisfies SceneLabel,
        )
      })

      return {
        kind: 'group',
        key: 'legend',
        className: 'ts-chart__legend',
        ariaHidden: true,
        children,
      }
    },
  }
}

interface ResolvedCategoricalLegendItem<TValue extends ChartKey> {
  key: string
  value: TValue
  label: string
  context: ColorLegendItemContext
  width: number
}

interface PositionedCategoricalLegendItem<TValue extends ChartKey> {
  item: ResolvedCategoricalLegendItem<TValue>
  row: number
  x: number
}

interface CategoricalLegendPresentation<TValue extends ChartKey> {
  rows: number
  rowHeight: number
  indicatorWidth: number
  indicatorHeight: number
  indicatorGap: number
  fontSize: number
  fontWeight: number | undefined
  items: readonly PositionedCategoricalLegendItem<TValue>[]
}

function resolveCategoricalLegendPresentation<TValue extends ChartKey>(
  options: ColorLegendOptions<TValue>,
  context: Parameters<ChartColorLegend['height']>[1],
  minimumItemWidth: number,
): CategoricalLegendPresentation<TValue> {
  const itemOptions = options.items
  const labelOptions = itemOptions?.label
  const indicatorOptions = itemOptions?.indicator
  const fontSize = finiteNonnegative(labelOptions?.fontSize, 11)
  const fontWeight = labelOptions?.fontWeight
  const indicatorWidth = finiteNonnegative(indicatorOptions?.width, 8)
  const indicatorHeight = finiteNonnegative(indicatorOptions?.height, 8)
  const indicatorGap = finiteNonnegative(indicatorOptions?.gap, 5)
  const rowGap = finiteNonnegative(itemOptions?.rowGap, 8)
  const resolvedItems = resolveCategoricalLegendItems<TValue>(
    context.colors,
    labelOptions?.format,
  )
  const items = resolvedItems.map((item, index) => {
    const itemContext = { color: item.color, index, label: item.label }
    return {
      ...item,
      context: itemContext,
      width:
        indicatorWidth +
        indicatorGap +
        estimateTextWidth(item.label, fontSize, fontWeight ?? 400),
    }
  })
  const rowHeight = Math.max(fontSize, indicatorHeight) + rowGap
  const justify = itemOptions?.justify ?? 'stretch'
  if (justify === 'stretch') {
    const layout = layoutCategoricalLegendItems(
      items.length,
      context.bounds.width,
      minimumItemWidth,
    )
    return {
      rows: layout.rows,
      rowHeight,
      indicatorWidth,
      indicatorHeight,
      indicatorGap,
      fontSize,
      fontWeight,
      items: items.map((item, index) => ({
        item,
        row: Math.floor(index / layout.columns),
        x: (index % layout.columns) * layout.itemWidth,
      })),
    }
  }

  const layout = layoutCategoricalLegendFlow(
    items.map((item) => item.width),
    context.bounds.width,
    finiteNonnegative(itemOptions?.gap, 16),
    justify,
  )
  return {
    rows: layout.rows,
    rowHeight,
    indicatorWidth,
    indicatorHeight,
    indicatorGap,
    fontSize,
    fontWeight,
    items: layout.items.map(({ index, row, x }) => ({
      item: items[index]!,
      row,
      x,
    })),
  }
}

function renderCategoricalLegendIndicator<TValue extends ChartKey>(
  options: ColorLegendIndicatorOptions<TValue> | undefined,
  value: TValue,
  context: ColorLegendItemContext,
  bounds: ChartBounds,
  background: string,
): readonly SceneNode[] {
  if (options?.render) {
    const rendered = options.render(value, { ...context, bounds })
    return 'kind' in rendered ? [rendered] : rendered
  }

  const shape = resolveItemValue(options?.shape, value, context, 'dot')
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const size = Math.min(bounds.width, bounds.height)
  if (shape === 'square') {
    return [
      {
        kind: 'rect',
        key: `legend-square:${valueKey(value)}`,
        x: centerX - size / 2,
        y: centerY - size / 2,
        width: size,
        height: size,
        style: { fill: context.color },
      },
    ]
  }
  if (shape === 'line' || shape === 'line-dot') {
    const nodes: SceneNode[] = [
      {
        kind: 'rule',
        key: `legend-line:${valueKey(value)}`,
        x1: bounds.x,
        x2: bounds.x + bounds.width,
        y1: centerY,
        y2: centerY,
        style: { stroke: context.color, strokeWidth: 3 },
      },
    ]
    if (shape === 'line-dot') {
      const radius = Math.min(4, size / 2)
      nodes.push({
        kind: 'dot',
        key: `legend-line-dot:${valueKey(value)}`,
        x: centerX,
        y: centerY,
        radius,
        style: {
          fill: background === 'transparent' ? '#fff' : background,
          stroke: context.color,
          strokeWidth: Math.min(2, radius),
        },
      })
    }
    return nodes
  }
  return [
    {
      kind: 'dot',
      key: `legend-dot:${valueKey(value)}`,
      x: centerX,
      y: centerY,
      radius: size / 2,
      style: { fill: context.color },
    },
  ]
}

function resolveItemValue<TValue extends ChartKey, TResult extends string>(
  input: ColorLegendItemValue<TValue, TResult> | undefined,
  value: TValue,
  context: ColorLegendItemContext,
  fallback: TResult,
): TResult {
  return typeof input === 'function'
    ? input(value, context)
    : (input ?? fallback)
}

function finiteNonnegative(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback
}

function isContinuousLegend(kind: ResolvedColorScaleKind | undefined): boolean {
  return kind === 'continuous'
}

function isSteppedLegend(kind: ResolvedColorScaleKind | undefined): boolean {
  return kind === 'quantile' || kind === 'quantize' || kind === 'threshold'
}

function isQuantitativeLegend(
  kind: ResolvedColorScaleKind | undefined,
): boolean {
  return isContinuousLegend(kind) || isSteppedLegend(kind)
}

function renderSteppedLegend(
  options: Pick<ColorLegendOptions, 'label' | 'width' | 'format'>,
  { colors, bounds, theme }: Parameters<ChartColorLegend['render']>[0],
): SceneNode {
  const width = Math.min(bounds.width, Math.max(80, options.width ?? 240))
  const x = bounds.x
  const y = bounds.y + (options.label ? 20 : 7)
  const itemWidth = width / Math.max(1, colors.range.length)
  const format = options.format ?? ((value: number) => String(value))
  const children: SceneNode[] = []

  if (options.label) {
    children.push({
      kind: 'label',
      key: 'legend-label',
      x,
      y: bounds.y + 10,
      text: options.label,
      fontSize: 11,
      fontWeight: 600,
      style: { fill: theme.foreground, fillOpacity: 0.78 },
    })
  }

  colors.range.forEach((fill, index) => {
    children.push({
      kind: 'rect',
      key: `legend-step:${index}`,
      x: x + index * itemWidth,
      y,
      width: itemWidth + 0.5,
      height: 8,
      style: { fill },
    })
  })

  const thresholds = legendThresholds(colors)
  const first = colors.domain[0]
  const last = colors.domain.at(-1)
  const boundaries =
    colors.kind === 'threshold'
      ? thresholds.map((value, index) => ({
          value,
          index: index + 1,
          anchor: 'middle' as const,
        }))
      : [
          ...(typeof first === 'number'
            ? [{ value: first, index: 0, anchor: 'start' as const }]
            : []),
          ...thresholds.map((value, index) => ({
            value,
            index: index + 1,
            anchor: 'middle' as const,
          })),
          ...(typeof last === 'number'
            ? [
                {
                  value: last,
                  index: colors.range.length,
                  anchor: 'end' as const,
                },
              ]
            : []),
        ]

  boundaries.forEach(({ value, index, anchor }) => {
    children.push({
      kind: 'label',
      key: `legend-step-label:${index}:${value}`,
      x: x + index * itemWidth,
      y: y + 21,
      text: format(value),
      anchor,
      fontSize: 10,
      style: { fill: theme.muted, fillOpacity: 0.72 },
    })
  })

  return {
    kind: 'group',
    key: 'legend',
    className: 'ts-chart__legend ts-chart__legend--stepped',
    ariaHidden: true,
    children,
  }
}

function legendThresholds(
  colors: Parameters<ChartColorLegend['render']>[0]['colors'],
): readonly number[] {
  if (colors.thresholds) {
    return colors.thresholds.filter(Number.isFinite)
  }
  const numericDomain = colors.domain.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  )
  if (colors.kind === 'threshold') return numericDomain
  const domain = numericDomain.slice().sort((left, right) => left - right)
  const first = domain[0]
  const last = domain.at(-1)
  if (first === undefined || last === undefined) return []
  const count = colors.range.length
  if (colors.kind === 'quantize') {
    return Array.from(
      { length: Math.max(0, count - 1) },
      (_value, index) => first + ((last - first) * (index + 1)) / count,
    )
  }
  if (colors.kind === 'quantile') {
    return Array.from({ length: Math.max(0, count - 1) }, (_value, index) =>
      quantileSorted(domain, (index + 1) / count),
    ).filter(Number.isFinite)
  }
  return []
}

function quantileSorted(values: readonly number[], probability: number) {
  const count = values.length
  if (count === 0) return Number.NaN
  if (probability <= 0 || count < 2) return values[0] ?? Number.NaN
  if (probability >= 1) return values[count - 1] ?? Number.NaN
  const position = (count - 1) * probability
  const lowerIndex = Math.floor(position)
  const lower = values[lowerIndex] ?? Number.NaN
  const upper = values[lowerIndex + 1] ?? lower
  return lower + (upper - lower) * (position - lowerIndex)
}

export function colorGradientLegend(
  options: ColorGradientLegendOptions = {},
): ChartColorLegend {
  return {
    placement: options.placement,
    height() {
      return options.label ? 55 : 42
    },
    render({ colors, bounds, theme }) {
      const first = colors.domain[0]
      const last = colors.domain.at(-1)
      if (typeof first !== 'number' || typeof last !== 'number') {
        throw new TypeError(
          'A gradient legend requires a numeric color-scale domain',
        )
      }
      const steps = Math.max(2, Math.floor(options.steps ?? 32))
      const width = Math.min(bounds.width, Math.max(80, options.width ?? 240))
      const x = bounds.x
      const y = bounds.y + (options.label ? 20 : 7)
      const itemWidth = width / steps
      const format = options.format ?? ((value: number) => String(value))
      const children: SceneNode[] = []

      if (options.label) {
        children.push({
          kind: 'label',
          key: 'legend-label',
          x,
          y: bounds.y + 10,
          text: options.label,
          fontSize: 11,
          fontWeight: 600,
          style: { fill: theme.foreground, fillOpacity: 0.78 },
        })
      }
      for (let index = 0; index < steps; index += 1) {
        const ratio = index / (steps - 1)
        const value = first + (last - first) * ratio
        children.push({
          kind: 'rect',
          key: `legend-gradient:${index}`,
          x: x + index * itemWidth,
          y,
          width: itemWidth + 0.5,
          height: 8,
          style: { fill: colors.map(value) },
        })
      }
      children.push(
        {
          kind: 'label',
          key: 'legend-gradient:min',
          x,
          y: y + 21,
          text: format(first),
          anchor: 'start',
          fontSize: 10,
          style: { fill: theme.muted, fillOpacity: 0.72 },
        },
        {
          kind: 'label',
          key: 'legend-gradient:max',
          x: x + width,
          y: y + 21,
          text: format(last),
          anchor: 'end',
          fontSize: 10,
          style: { fill: theme.muted, fillOpacity: 0.72 },
        },
      )

      return {
        kind: 'group',
        key: 'legend',
        className: 'ts-chart__legend ts-chart__legend--gradient',
        ariaHidden: true,
        children,
      }
    },
  }
}
