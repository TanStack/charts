import { measureSceneLabelBounds } from './guide-layout'
import type {
  ChartBounds,
  ChartTextMeasurer,
  SceneLabel,
  SceneNode,
  SceneStyle,
} from './types'

export interface ResolvedGuideRule {
  readonly style: SceneStyle
}

export interface ResolvedGuideMarker {
  readonly radius: number
  readonly style: SceneStyle
}

export interface ResolvedGuideLabel {
  readonly text: string
  readonly side?: 'start' | 'end'
  readonly offset?: number
  readonly paddingX?: number
  readonly paddingY?: number
  readonly radius?: number
  readonly fontSize?: number
  readonly fontWeight?: number
  readonly style: SceneStyle
  readonly boxStyle: SceneStyle
}

export interface GuideNodesOptions {
  readonly id: string
  readonly classPrefix: string
  readonly chart: ChartBounds
  readonly x: number
  readonly y: number
  readonly xRule?: false | ResolvedGuideRule
  readonly yRule?: false | ResolvedGuideRule
  readonly marker?: false | ResolvedGuideMarker
  readonly xLabel?: false | ResolvedGuideLabel
  readonly yLabel?: false | ResolvedGuideLabel
  readonly measureText?: ChartTextMeasurer
}

/** Builds the shared renderer-neutral geometry for focus and free cursors. */
export function createGuideNodes(options: GuideNodesOptions): {
  readonly nodes: readonly SceneNode[]
  readonly labels: readonly SceneLabel[]
} {
  const nodes: SceneNode[] = []
  const labels: SceneLabel[] = []

  if (options.xRule !== false && options.xRule !== undefined) {
    nodes.push({
      kind: 'rule',
      key: `${options.id}:x-rule`,
      className: `${options.classPrefix}-x-rule`,
      x1: options.x,
      x2: options.x,
      y1: options.chart.y,
      y2: options.chart.y + options.chart.height,
      style: options.xRule.style,
    })
  }
  if (options.yRule !== false && options.yRule !== undefined) {
    nodes.push({
      kind: 'rule',
      key: `${options.id}:y-rule`,
      className: `${options.classPrefix}-y-rule`,
      x1: options.chart.x,
      x2: options.chart.x + options.chart.width,
      y1: options.y,
      y2: options.y,
      style: options.yRule.style,
    })
  }
  if (options.marker !== false && options.marker !== undefined) {
    nodes.push({
      kind: 'dot',
      key: `${options.id}:marker`,
      className: `${options.classPrefix}-marker`,
      x: options.x,
      y: options.y,
      radius: finiteNonNegative(options.marker.radius, 5),
      style: options.marker.style,
    })
  }

  if (options.xLabel !== false && options.xLabel !== undefined) {
    const result = createLabel('x', options.xLabel, options)
    nodes.push(...result.nodes)
    labels.push(result.label)
  }
  if (options.yLabel !== false && options.yLabel !== undefined) {
    const result = createLabel('y', options.yLabel, options)
    nodes.push(...result.nodes)
    labels.push(result.label)
  }

  return { nodes, labels }
}

function createLabel(
  axis: 'x' | 'y',
  options: ResolvedGuideLabel,
  context: GuideNodesOptions,
): { readonly nodes: readonly SceneNode[]; readonly label: SceneLabel } {
  const side = options.side ?? 'end'
  const offset = finiteNonNegative(options.offset, axis === 'x' ? 16 : 22)
  const x =
    axis === 'x'
      ? context.x
      : side === 'start'
        ? context.chart.x - offset
        : context.chart.x + context.chart.width + offset
  const y =
    axis === 'y'
      ? context.y
      : side === 'start'
        ? context.chart.y - offset
        : context.chart.y + context.chart.height + offset
  const label: SceneLabel = {
    kind: 'label',
    key: `${context.id}:${axis}-label:text`,
    className: `${context.classPrefix}-${axis}-label-text`,
    x,
    y,
    text: options.text,
    anchor: 'middle',
    baseline: 'middle',
    fontSize: finiteNonNegative(options.fontSize, 10),
    fontWeight: finiteNonNegative(options.fontWeight, 700),
    style: options.style,
  }
  const bounds = measureSceneLabelBounds(label, context.measureText)
  const paddingX = finiteNonNegative(options.paddingX, 5)
  const paddingY = finiteNonNegative(options.paddingY, 4)

  return {
    label,
    nodes: [
      {
        kind: 'rect',
        key: `${context.id}:${axis}-label:box`,
        className: `${context.classPrefix}-${axis}-label-box`,
        x: bounds.x - paddingX,
        y: bounds.y - paddingY,
        width: bounds.width + paddingX * 2,
        height: bounds.height + paddingY * 2,
        radius: finiteNonNegative(options.radius, 4),
        style: options.boxStyle,
      },
      label,
    ],
  }
}

function finiteNonNegative(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}
