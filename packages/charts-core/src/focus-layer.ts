import { measureSceneLabelBounds } from './guide-layout'
import { valueKey } from './scales'
import type {
  ChartBounds,
  ChartCursorPresentation,
  ChartFocusAnchor,
  ChartFocusPresentation,
  ChartFocusState,
  ChartScene,
  ChartTooltipPosition,
  ChartValue,
  SceneFocusGuide,
  SceneGroup,
  SceneLabel,
  SceneNode,
} from './types'

export function resolveFocusPresentation(
  scene: ChartScene,
  focus: ChartFocusState | null,
  pointer?: ChartTooltipPosition | null,
  cursor?: ChartCursorPresentation | null,
): ChartFocusPresentation {
  const focusedUnder = focusedSceneNodes(scene, focus, 'under')
  const focusedOver = focusedSceneNodes(scene, focus, 'over')
  const guides = resolveFocusGuides(scene, focus, pointer, cursor)
  // SVG keeps guide shells outside the static mark tree. Match that stable
  // renderer contract in every painter: under-guides precede authored
  // underlays, while over-guides follow authored overlays.
  return {
    under: [...guides.under, ...focusedUnder],
    over: [...focusedOver, ...guides.over],
  }
}

/** Resolves only renderer-native guide marks, excluding authored focus layers. */
export function resolveFocusGuides(
  scene: ChartScene,
  focus: ChartFocusState | null,
  pointer?: ChartTooltipPosition | null,
  cursor?: ChartCursorPresentation | null,
): ChartFocusPresentation {
  void pointer
  const under: SceneNode[] = []
  const over: SceneNode[] = []
  if (!cursor && !focus) return { under, over }

  for (const guide of scene.focusGuides ?? []) {
    const localFocus = focus && guideOwnsFocus(guide, focus) ? focus : null
    if (!cursor && focus && !localFocus) continue
    const target = resolveGuideTarget(guide, localFocus, cursor)
    if (!target) continue
    const node = resolveFocusGuide(scene, guide, target)
    if (!node) continue
    ;(guide.placement === 'under' ? under : over).push(node)
  }

  return { under, over }
}

function resolveGuideTarget(
  guide: SceneFocusGuide,
  focus: ChartFocusState | null,
  cursor: ChartCursorPresentation | null | undefined,
) {
  const local = focus
    ? {
        x: focus.primary.x,
        y: focus.primary.y,
        xValue: focus.primary.xValue,
        yValue: focus.primary.yValue,
        color: focus.primary.color,
      }
    : undefined
  if (!cursor) return local

  if (
    cursor.state.anchor === 'value'
      ? !cursorValueBelongsToGuide(cursor, guide)
      : !cursorPositionBelongsToGuide(cursor, guide)
  ) {
    return undefined
  }

  const x = resolveGuideCursorAxis('x', guide, cursor, local?.x, local?.xValue)
  const y = resolveGuideCursorAxis('y', guide, cursor, local?.y, local?.yValue)
  if (!x && !y) return undefined
  return {
    x: x?.position,
    y: y?.position,
    xValue: x?.value,
    yValue: y?.value,
    color: local?.color,
  }
}

function cursorValueBelongsToGuide(
  cursor: ChartCursorPresentation,
  guide: SceneFocusGuide,
) {
  if (cursor.state.anchor !== 'value') return false
  const values = cursor.state.value
  return (['x', 'y'] as const).every((axis) => {
    if (!(cursor.axes === 'xy' || cursor.axes === axis)) return true
    const value = values[axis]
    if (value === undefined) return true
    const project = axis === 'x' ? guide.projectX : guide.projectY
    const position = project ? project(value) : cursor[axis]?.position
    return (
      typeof position === 'number' &&
      Number.isFinite(position) &&
      guideContainsAxisPosition(guide, axis, position)
    )
  })
}

function resolveGuideCursorAxis(
  axis: 'x' | 'y',
  guide: SceneFocusGuide,
  cursor: ChartCursorPresentation,
  fallbackPosition: number | undefined,
  fallbackValue: ChartValue | undefined,
): { position: number; value?: ChartValue } | undefined {
  const enabled = cursor.axes === 'xy' || cursor.axes === axis
  const presented = cursor[axis]
  if (enabled && cursor.state.anchor === 'value') {
    const values = cursor.state.value
    const value = values[axis]
    const project = axis === 'x' ? guide.projectX : guide.projectY
    const position = value === undefined ? undefined : project?.(value)
    if (
      typeof position === 'number' &&
      Number.isFinite(position) &&
      guideContainsAxisPosition(guide, axis, position)
    ) {
      return { position, value }
    }
    if (
      !project &&
      presented &&
      Number.isFinite(presented.position) &&
      guideContainsAxisPosition(guide, axis, presented.position)
    ) {
      return { position: presented.position, value: presented.value ?? value }
    }
  } else if (enabled && presented) {
    return { position: presented.position, value: presented.value }
  }

  return typeof fallbackPosition === 'number' &&
    Number.isFinite(fallbackPosition)
    ? { position: fallbackPosition, value: fallbackValue }
    : undefined
}

function cursorPositionBelongsToGuide(
  cursor: ChartCursorPresentation,
  guide: SceneFocusGuide,
) {
  return (['x', 'y'] as const).every((axis) => {
    if (!(cursor.axes === 'xy' || cursor.axes === axis)) return true
    const presented = cursor[axis]
    return (
      !presented || guideContainsAxisPosition(guide, axis, presented.position)
    )
  })
}

function guideContainsAxisPosition(
  guide: SceneFocusGuide,
  axis: 'x' | 'y',
  position: number,
) {
  const start = axis === 'x' ? guide.chart.x : guide.chart.y
  const length = axis === 'x' ? guide.chart.width : guide.chart.height
  return position >= start && position <= start + length
}

export function focusedSceneNodes(
  scene: ChartScene,
  focus: ChartFocusState | null,
  placement: 'under' | 'over',
): SceneNode[] {
  if (!focus) return []
  return collectFocusedNodes(scene.nodes, focus, placement)
}

export function focusedNodeKeys(
  layer: SceneGroup,
  focus: ChartFocusState | null,
): Set<string> {
  if (!layer.focus || !focus) return new Set()
  const anchors = focusAnchors(layer.focus).filter((anchor) =>
    matchesFocusAnchor(anchor, focus, layer.focus!.match),
  )
  const filtered = filterNodes(layer.children, anchors)
  const keys = new Set<string>()
  visitNodes(filtered, (node) => keys.add(node.key))
  return keys
}

function collectFocusedNodes(
  nodes: readonly SceneNode[],
  focus: ChartFocusState,
  placement: 'under' | 'over',
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.focus) {
      if (node.focus.placement !== placement) continue
      const anchors = focusAnchors(node.focus).filter((anchor) =>
        matchesFocusAnchor(anchor, focus, node.focus!.match),
      )
      const children = filterNodes(node.children, anchors)
      if (children.length) output.push({ ...node, focus: undefined, children })
      continue
    }
    const children = collectFocusedNodes(node.children, focus, placement)
    if (children.length) output.push({ ...node, children })
  }
  return output
}

function filterNodes(
  nodes: readonly SceneNode[],
  anchors: readonly ChartFocusAnchor[],
): SceneNode[] {
  const output: SceneNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'group') {
      if (anchors.some((anchor) => keysRelate(node.key, anchor.key))) {
        output.push(node)
      }
      continue
    }
    const children = filterNodes(node.children, anchors)
    if (children.length) {
      output.push({ ...node, children })
    } else if (
      anchors.some((anchor) => anchor.key.startsWith(`${node.key}:`))
    ) {
      output.push(node)
    }
  }
  return output
}

function focusAnchors(focus: NonNullable<SceneGroup['focus']>) {
  return focus.anchors ?? focus.points
}

export function matchesFocusAnchor(
  candidate: ChartFocusAnchor,
  focus: ChartFocusState,
  match: NonNullable<SceneGroup['focus']>['match'],
) {
  if (match === 'x') {
    return (
      candidate.xValue !== undefined &&
      sameValue(candidate.xValue, focus.primary.xValue)
    )
  }
  if (match === 'y') {
    return (
      candidate.yValue !== undefined &&
      sameValue(candidate.yValue, focus.primary.yValue)
    )
  }
  if (match === 'series') {
    return sameValue(candidate.group, focus.primary.group)
  }
  if (match === 'key') {
    return (
      candidate.key === focus.primary.key ||
      candidate.datum === focus.primary.datum
    )
  }
  if (match === 'group') {
    return focus.group.some((point) => sameFocusedPoint(candidate, point))
  }
  return sameFocusedPoint(candidate, focus.primary)
}

function sameFocusedPoint(left: ChartFocusAnchor, right: ChartFocusAnchor) {
  if (left === right || left.key === right.key) return true
  return isReference(left.datum) && left.datum === right.datum
}

function sameValue(left: unknown, right: unknown) {
  return valueKey(left) === valueKey(right)
}

function keysRelate(left: string, right: string) {
  return (
    left === right ||
    left.startsWith(`${right}:`) ||
    right.startsWith(`${left}:`)
  )
}

function isReference(value: unknown) {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  )
}

function visitNodes(
  nodes: readonly SceneNode[],
  visit: (node: SceneNode) => void,
) {
  for (const node of nodes) {
    visit(node)
    if (node.kind === 'group') visitNodes(node.children, visit)
  }
}

function guideOwnsFocus(
  guide: SceneFocusGuide,
  focus: ChartFocusState,
): boolean {
  return (
    guide.scope === undefined ||
    focus.primary.key === guide.scope ||
    focus.primary.key.startsWith(`${guide.scope}:`)
  )
}

function resolveFocusGuide(
  scene: ChartScene,
  guide: SceneFocusGuide,
  target: {
    x?: number
    y?: number
    xValue?: ChartValue
    yValue?: ChartValue
    color?: string
  },
): SceneNode | undefined {
  const { x, y } = target
  const plotChildren: SceneNode[] = []
  const children: SceneNode[] = []

  if (guide.x && typeof x === 'number' && Number.isFinite(x)) {
    plotChildren.push({
      kind: 'rule',
      key: `${guide.key}:x-rule`,
      className: 'ts-chart__crosshair-rule ts-chart__crosshair-rule--x',
      x1: x,
      x2: x,
      y1: guide.chart.y,
      y2: guide.chart.y + guide.chart.height,
      style: guide.x.style,
    })
    if (guide.x.label && target.xValue !== undefined) {
      children.push(
        ...guideLabels(
          clampLabel(
            {
              kind: 'label',
              key: `${guide.key}:x-label`,
              className:
                'ts-chart__crosshair-label ts-chart__crosshair-label--x',
              x,
              y:
                guide.chart.y +
                guide.chart.height +
                guide.x.label.offset +
                guide.x.label.fontSize * 0.8,
              text: formatGuideValue(
                scene,
                'x',
                target.xValue,
                guide.x.label.format,
              ),
              anchor: 'middle',
              fontSize: guide.x.label.fontSize,
              fontWeight: guide.x.label.fontWeight,
              style: guide.x.label.style,
            },
            guide.surface,
            guide,
          ),
        ),
      )
    }
  }

  if (guide.y && typeof y === 'number' && Number.isFinite(y)) {
    plotChildren.push({
      kind: 'rule',
      key: `${guide.key}:y-rule`,
      className: 'ts-chart__crosshair-rule ts-chart__crosshair-rule--y',
      x1: guide.chart.x,
      x2: guide.chart.x + guide.chart.width,
      y1: y,
      y2: y,
      style: guide.y.style,
    })
    if (guide.y.label && target.yValue !== undefined) {
      children.push(
        ...guideLabels(
          clampLabel(
            {
              kind: 'label',
              key: `${guide.key}:y-label`,
              className:
                'ts-chart__crosshair-label ts-chart__crosshair-label--y',
              x: guide.chart.x - guide.y.label.offset,
              y,
              text: formatGuideValue(
                scene,
                'y',
                target.yValue,
                guide.y.label.format,
              ),
              anchor: 'end',
              baseline: 'middle',
              fontSize: guide.y.label.fontSize,
              fontWeight: guide.y.label.fontWeight,
              style: guide.y.label.style,
            },
            guide.surface,
            guide,
          ),
        ),
      )
    }
  }

  if (
    guide.marker &&
    typeof x === 'number' &&
    Number.isFinite(x) &&
    typeof y === 'number' &&
    Number.isFinite(y)
  ) {
    plotChildren.push({
      kind: 'dot',
      key: `${guide.key}:marker`,
      className: 'ts-chart__crosshair-marker',
      x,
      y,
      radius: guide.marker.radius,
      style: {
        ...guide.marker.style,
        stroke:
          guide.marker.style.stroke ??
          target.color ??
          guide.x?.style.stroke ??
          guide.y?.style.stroke ??
          scene.theme.foreground,
      },
    })
  }

  if (plotChildren.length) {
    children.unshift({
      kind: 'group',
      key: `${guide.key}:plot`,
      className: 'ts-chart__crosshair-plot',
      clip: guide.chart,
      children: plotChildren,
    })
  }
  if (!children.length) return undefined

  return {
    kind: 'group',
    key: guide.key,
    className: 'ts-chart__crosshair',
    ariaHidden: true,
    children,
  }
}

function guideLabels(label: SceneLabel): readonly SceneLabel[] {
  const style = label.style ?? {}
  const halo =
    style.stroke && (style.strokeWidth ?? 0) > 0 && style.strokeOpacity !== 0
      ? [
          {
            ...label,
            key: `${label.key}:halo`,
            className:
              `${label.className ?? ''} ts-chart__crosshair-label-halo`.trim(),
            style: {
              fill: 'none',
              stroke: style.stroke,
              strokeOpacity: style.strokeOpacity,
              strokeWidth: style.strokeWidth,
              opacity: style.opacity,
              lineJoin: 'round' as const,
            },
          },
        ]
      : []
  return [
    ...halo,
    {
      ...label,
      key: `${label.key}:text`,
      className:
        `${label.className ?? ''} ts-chart__crosshair-label-text`.trim(),
      style: {
        fill: style.fill,
        fillOpacity: style.fillOpacity,
        stroke: 'none',
        strokeWidth: 0,
        opacity: style.opacity,
      },
    },
  ]
}

function formatGuideValue(
  scene: ChartScene,
  axis: 'x' | 'y',
  value: ChartValue,
  format: ((value: ChartValue) => string) | undefined,
): string {
  if (format) return format(value)
  const identity = valueKey(value)
  const tick = scene.scales[axis]?.ticks.find(
    (candidate) => valueKey(candidate.value) === identity,
  )
  if (tick) return tick.label
  return value instanceof Date ? value.toLocaleDateString() : String(value)
}

function clampLabel(
  label: SceneLabel,
  surface: ChartBounds,
  guide: SceneFocusGuide,
): SceneLabel {
  const inset = 2
  const bounds = measureSceneLabelBounds(label, guide.measureText)
  const left = surface.x + inset
  const top = surface.y + inset
  const right = surface.x + surface.width - inset
  const bottom = surface.y + surface.height - inset
  const dx =
    bounds.x < left
      ? left - bounds.x
      : bounds.x + bounds.width > right
        ? right - bounds.x - bounds.width
        : 0
  const dy =
    bounds.y < top
      ? top - bounds.y
      : bounds.y + bounds.height > bottom
        ? bottom - bounds.y - bounds.height
        : 0
  return dx || dy ? { ...label, x: label.x + dx, y: label.y + dy } : label
}
