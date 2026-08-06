import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { contourDefinition } from './tanstack'
import { contourThresholds } from './transform'
import type { ConformanceInput } from '../../types'
import type { SceneArea, SceneNode } from '@tanstack/charts'

describe('native scalar-grid contours', () => {
  it('emits five structured levels without synthetic focus points', () => {
    const scene = createChartRuntime().render(
      contourDefinition({
        width: 640,
        height: 400,
        revision: 0,
        interactive: true,
      } satisfies ConformanceInput),
      { width: 640, height: 400 },
    )
    const areas = sceneAreas(scene.nodes)

    expect(scene.points).toEqual([])
    expect(areas).toHaveLength(contourThresholds.length)
    expect(areas.every((area) => area.path === undefined)).toBe(true)
    expect(areas.every((area) => area.points.length === 0)).toBe(true)
    expect(areas.every((area) => area.polygons?.length)).toBe(true)
    expect(
      areas.map(
        ({ key }) =>
          (JSON.parse(key) as [string, ['explicit', number, number]])[1],
      ),
    ).toEqual(contourThresholds.map((value) => ['explicit', value, 0] as const))
    expect(
      areas.some(
        ({ polygons }) =>
          (polygons?.length ?? 0) > 1 ||
          polygons?.some((polygon) => polygon.length > 1),
      ),
    ).toBe(true)
  })
})

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return nodes.flatMap((node): SceneArea[] => {
    if (node.kind === 'area') return [node]
    if (node.kind === 'group') return sceneAreas(node.children)
    return []
  })
}
