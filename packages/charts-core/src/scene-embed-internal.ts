import { sceneChildId } from './scene-child-id-internal'
import type {
  ChartBounds,
  ChartFocusAnchor,
  ChartPoint,
  ChartScene,
  SceneFocusGuide,
  SceneNode,
} from './types'

export { sceneChildId } from './scene-child-id-internal'

interface EmbedChartSceneOptions {
  ownerId: string
  childId: string
  x: number
  y: number
}

/**
 * Adopts a complete child chart scene inside another scene.
 *
 * Geometry remains local to the translated child group. Interaction points are
 * moved into the outer coordinate system and every point reference is remapped
 * to the same adopted object.
 */
export function embedChartScene<TDatum>(
  scene: ChartScene<TDatum>,
  options: EmbedChartSceneOptions,
): {
  nodes: readonly SceneNode[]
  points: readonly ChartPoint<TDatum>[]
  focusGuides: readonly SceneFocusGuide[]
} {
  const namespace = childNamespace(options.ownerId, options.childId)
  const pointMap = new Map<ChartFocusAnchor, ChartPoint<TDatum>>()
  const mapPoint = (point: ChartPoint): ChartPoint<TDatum> => {
    const existing = pointMap.get(point)
    if (existing) return existing
    const mapped = {
      ...point,
      key: namespace.identity(point.key),
      markId: namespace.identity(point.markId),
      x: point.x + options.x,
      y: point.y + options.y,
    } as ChartPoint<TDatum>
    pointMap.set(point, mapped)
    return mapped
  }
  const mapFocusAnchor = (anchor: ChartFocusAnchor): ChartFocusAnchor =>
    pointMap.get(anchor) ?? {
      ...anchor,
      key: namespace.identity(anchor.key),
      markId: namespace.identity(anchor.markId),
    }
  const points = scene.points.map(mapPoint)

  return {
    nodes: mapScenePoints(
      withoutDefaultFocusLayers(scene.nodes),
      mapPoint,
      mapFocusAnchor,
      namespace,
    ),
    points,
    focusGuides: (scene.focusGuides ?? []).map((guide) => ({
      ...guide,
      key: namespace.identity(guide.key),
      markId: namespace.identity(guide.markId),
      chart: offsetBounds(guide.chart, options.x, options.y),
      surface: offsetBounds(guide.surface, options.x, options.y),
      projectX: guide.projectX
        ? (value) => offsetProjection(guide.projectX!(value), options.x)
        : undefined,
      projectY: guide.projectY
        ? (value) => offsetProjection(guide.projectY!(value), options.y)
        : undefined,
      scope: guide.scope ? namespace.identity(guide.scope) : namespace.prefix,
    })),
  }
}

function offsetProjection(value: number | undefined, offset: number) {
  return value === undefined ? undefined : value + offset
}

function offsetBounds(bounds: ChartBounds, x: number, y: number): ChartBounds {
  return { ...bounds, x: bounds.x + x, y: bounds.y + y }
}

interface ChildNamespace {
  prefix: string
  identity: (value: string) => string
}

function childNamespace(ownerId: string, childId: string): ChildNamespace {
  const prefix = sceneChildId(ownerId, childId)
  return {
    prefix,
    identity: (value) => {
      if (value === childId) return prefix
      if (value.startsWith(`${childId}:`)) {
        return `${prefix}${value.slice(childId.length)}`
      }
      if (value === prefix || value.startsWith(`${prefix}:`)) return value
      return `${prefix}:${value}`
    },
  }
}

function withoutDefaultFocusLayers(
  nodes: readonly SceneNode[],
): readonly SceneNode[] {
  return nodes.flatMap((node): readonly SceneNode[] => {
    if (node.kind !== 'group') return [node]
    if (
      node.focus &&
      node.className?.includes('ts-chart__focus-layer--default')
    ) {
      return []
    }
    return [
      {
        ...node,
        children: withoutDefaultFocusLayers(node.children),
      },
    ]
  })
}

function mapScenePoints(
  nodes: readonly SceneNode[],
  mapPoint: (point: ChartPoint) => ChartPoint,
  mapFocusAnchor: (anchor: ChartFocusAnchor) => ChartFocusAnchor,
  namespace: ChildNamespace,
  prefixKeys = false,
): readonly SceneNode[] {
  return nodes.map((node): SceneNode => {
    const shouldPrefixKeys =
      prefixKeys ||
      (node.kind === 'group' &&
        (node.focus !== undefined || node.className === 'ts-chart__marks'))
    const key = shouldPrefixKeys ? namespace.identity(node.key) : node.key
    if (node.kind === 'group') {
      return {
        ...node,
        key,
        ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
        children: mapScenePoints(
          node.children,
          mapPoint,
          mapFocusAnchor,
          namespace,
          shouldPrefixKeys,
        ),
        ...(node.focus
          ? {
              focus: {
                ...node.focus,
                points: node.focus.points.map(mapPoint),
                anchors: (node.focus.anchors ?? node.focus.points).map(
                  mapFocusAnchor,
                ),
                ...(node.focus.candidates
                  ? {
                      candidates: mapScenePoints(
                        node.focus.candidates,
                        mapPoint,
                        mapFocusAnchor,
                        namespace,
                        shouldPrefixKeys,
                      ),
                    }
                  : {}),
                ...(node.focus.activePoints
                  ? { activePoints: node.focus.activePoints.map(mapPoint) }
                  : {}),
              },
            }
          : {}),
        ...(node.states
          ? {
              states: {
                ...node.states,
                points: node.states.points.map(mapPoint),
              },
            }
          : {}),
      }
    }
    if (node.kind === 'label' || !node.interaction) {
      if (!shouldPrefixKeys && !node.pointOwner) return node
      return {
        ...node,
        key,
        ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
      }
    }
    return {
      ...node,
      key,
      ...(node.pointOwner ? { pointOwner: mapPoint(node.pointOwner) } : {}),
      interaction: node.interaction.point
        ? { ...node.interaction, point: mapPoint(node.interaction.point) }
        : {
            ...node.interaction,
            points: node.interaction.points.map(mapPoint),
          },
    }
  })
}
