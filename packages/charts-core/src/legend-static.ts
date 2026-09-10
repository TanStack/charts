import {
  layoutCategoricalLegendItems,
  resolveCategoricalLegendItems,
} from './legend-layout-internal'
import { physicalTextAnchor } from './guide-layout'
import type {
  ChartColorLegend,
  ChartLegendPlacement,
  ResolvedColorScaleKind,
  SceneNode,
} from './types'

export interface ColorLegendOptions {
  label?: string
  itemWidth?: number
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

export function colorLegend(
  options: ColorLegendOptions = {},
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
      const layout = layoutCategoricalLegendItems(
        itemCount,
        context.chart.width,
        minimumItemWidth,
      )
      return 18 + labelOffset + layout.rows * 19
    },
    render(context) {
      if (isContinuousLegend(context.colors.kind)) {
        return gradient.render(context)
      }
      if (isSteppedLegend(context.colors.kind)) {
        return renderSteppedLegend(options, context)
      }
      const { colors, bounds, theme, direction } = context
      const items = resolveCategoricalLegendItems(colors)
      const layout = layoutCategoricalLegendItems(
        items.length,
        bounds.width,
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
          anchor: physicalTextAnchor('left', direction),
          fontSize: 11,
          fontWeight: 600,
          style: { fill: theme.foreground, fillOpacity: 0.78 },
        })
      }
      items.forEach((item, index) => {
        const column = index % layout.columns
        const row = Math.floor(index / layout.columns)
        const x = bounds.x + column * layout.itemWidth
        const y = bounds.y + 10 + labelOffset + row * 19
        children.push(
          {
            kind: 'dot',
            key: `legend-dot:${item.key}`,
            x: x + 4,
            y,
            radius: 4,
            style: { fill: item.color },
          },
          {
            kind: 'label',
            key: `legend-label:${item.key}`,
            x: x + 13,
            y,
            text: item.label,
            anchor: physicalTextAnchor('left', direction),
            baseline: 'middle',
            fontSize: 11,
            style: { fill: theme.foreground, fillOpacity: 0.76 },
          },
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
  options: ColorLegendOptions,
  {
    colors,
    bounds,
    theme,
    direction,
  }: Parameters<ChartColorLegend['render']>[0],
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
      anchor: physicalTextAnchor('left', direction),
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
          side: 'middle' as const,
        }))
      : [
          ...(typeof first === 'number'
            ? [{ value: first, index: 0, side: 'left' as const }]
            : []),
          ...thresholds.map((value, index) => ({
            value,
            index: index + 1,
            side: 'middle' as const,
          })),
          ...(typeof last === 'number'
            ? [
                {
                  value: last,
                  index: colors.range.length,
                  side: 'right' as const,
                },
              ]
            : []),
        ]

  boundaries.forEach(({ value, index, side }) => {
    children.push({
      kind: 'label',
      key: `legend-step-label:${index}:${value}`,
      x: x + index * itemWidth,
      y: y + 21,
      text: format(value),
      anchor: physicalTextAnchor(side, direction),
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
    render({ colors, bounds, theme, direction }) {
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
          anchor: physicalTextAnchor('left', direction),
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
          anchor: physicalTextAnchor('left', direction),
          fontSize: 10,
          style: { fill: theme.muted, fillOpacity: 0.72 },
        },
        {
          kind: 'label',
          key: 'legend-gradient:max',
          x: x + width,
          y: y + 21,
          text: format(last),
          anchor: physicalTextAnchor('right', direction),
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
