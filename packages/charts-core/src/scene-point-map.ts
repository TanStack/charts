import type { ChartPoint, ChartScene, SceneNode } from './types'

export function viewportTranslationChanged(
  previous: ChartScene,
  next: ChartScene,
) {
  return (['x', 'y'] as const).some(
    (axis) =>
      (previous.scales[axis]?.viewport?.translate ?? 0) !==
      (next.scales[axis]?.viewport?.translate ?? 0),
  )
}

export function mapScenePointReferences(
  nodes: readonly SceneNode[],
  mapPoint: (point: ChartPoint) => ChartPoint,
): readonly SceneNode[] {
  return nodes.map((node): SceneNode => {
    if (node.kind === 'group') {
      return {
        ...node,
        children: mapScenePointReferences(node.children, mapPoint),
        ...(node.focus
          ? {
              focus: {
                ...node.focus,
                points: node.focus.points.map(mapPoint),
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
    if (node.kind === 'label' || !node.interaction) return node
    return {
      ...node,
      interaction: node.interaction.point
        ? { ...node.interaction, point: mapPoint(node.interaction.point) }
        : {
            ...node.interaction,
            points: node.interaction.points.map(mapPoint),
          },
    }
  })
}
