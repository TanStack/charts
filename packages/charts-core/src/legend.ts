import { quantileSorted } from 'd3-array'
import { valueKey } from './scales'
import type {
  ChartColorLegend,
  ResolvedColorScaleKind,
  SceneNode,
} from './types'

export interface ColorLegendOptions {
  label?: string
  itemWidth?: number
  width?: number
  format?: (value: number) => string
}

export interface ColorGradientLegendOptions {
  label?: string
  steps?: number
  width?: number
  format?: (value: number) => string
}

export function colorLegend(
  options: ColorLegendOptions = {},
): ChartColorLegend {
  const gradient = colorGradientLegend({
    label: options.label,
    width: options.width,
    format: options.format,
  })
  const minimumItemWidth = Math.max(64, options.itemWidth ?? 110)
  const labelOffset = options.label ? 13 : 0
  return {
    height(itemCount, width, colors) {
      if (colors && isQuantitativeLegend(colors.kind)) {
        return gradient.height(itemCount, width, colors)
      }
      const columns = Math.max(1, Math.floor(width / minimumItemWidth))
      return 18 + labelOffset + Math.ceil(itemCount / columns) * 19
    },
    render(context) {
      if (isContinuousLegend(context.colors.kind)) {
        return gradient.render(context)
      }
      if (isSteppedLegend(context.colors.kind)) {
        return renderSteppedLegend(options, context)
      }
      const { colors, chart, theme } = context
      const columns = Math.max(1, Math.floor(chart.width / minimumItemWidth))
      const itemWidth =
        chart.width / Math.max(1, Math.min(columns, colors.domain.length))
      const children: SceneNode[] = []
      if (options.label) {
        children.push({
          kind: 'label',
          key: 'legend-label',
          x: chart.x,
          y: 11,
          text: options.label,
          fontSize: 11,
          fontWeight: 600,
          style: { fill: theme.foreground, fillOpacity: 0.78 },
        })
      }
      colors.domain.forEach((value, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        const x = chart.x + column * itemWidth
        const y = 10 + labelOffset + row * 19
        children.push(
          {
            kind: 'dot',
            key: `legend-dot:${valueKey(value)}`,
            x: x + 4,
            y,
            radius: 4,
            style: { fill: colors.map(value) },
          },
          {
            kind: 'label',
            key: `legend-label:${valueKey(value)}`,
            x: x + 13,
            y,
            text: String(value),
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
  { colors, chart, theme }: Parameters<ChartColorLegend['render']>[0],
): SceneNode {
  const width = Math.min(chart.width, Math.max(80, options.width ?? 240))
  const x = chart.x
  const y = options.label ? 20 : 7
  const itemWidth = width / Math.max(1, colors.range.length)
  const format = options.format ?? ((value: number) => String(value))
  const children: SceneNode[] = []

  if (options.label) {
    children.push({
      kind: 'label',
      key: 'legend-label',
      x,
      y: 10,
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
    return Array.from(
      { length: Math.max(0, count - 1) },
      (_value, index) =>
        quantileSorted(domain, (index + 1) / count) ?? Number.NaN,
    ).filter(Number.isFinite)
  }
  return []
}

export function colorGradientLegend(
  options: ColorGradientLegendOptions = {},
): ChartColorLegend {
  return {
    height() {
      return options.label ? 55 : 42
    },
    render({ colors, chart, theme }) {
      const first = colors.domain[0]
      const last = colors.domain.at(-1)
      if (typeof first !== 'number' || typeof last !== 'number') {
        throw new TypeError(
          'A gradient legend requires a numeric color-scale domain',
        )
      }
      const steps = Math.max(2, Math.floor(options.steps ?? 32))
      const width = Math.min(chart.width, Math.max(80, options.width ?? 240))
      const x = chart.x
      const y = options.label ? 20 : 7
      const itemWidth = width / steps
      const format = options.format ?? ((value: number) => String(value))
      const children: SceneNode[] = []

      if (options.label) {
        children.push({
          kind: 'label',
          key: 'legend-label',
          x,
          y: 10,
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
