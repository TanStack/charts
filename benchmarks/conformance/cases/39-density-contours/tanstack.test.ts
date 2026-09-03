import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { createExampleChart, densityThresholds } from './tanstack'
import type { SceneArea, SceneNode } from '@tanstack/charts'

describe('native density contours', () => {
  it('emits six structured contour levels without synthetic focus points', () => {
    const runtime = createChartRuntime()
    const scene = runtime.render(
      createExampleChart({
        revision: 0,
      }),
      { width: 640, height: 400 },
    )
    const areas = sceneAreas(scene.nodes)

    expect(scene.points).toEqual([])
    expect(areas).toHaveLength(densityThresholds.length)
    expect(areas.every((area) => area.path === undefined)).toBe(true)
    expect(areas.every((area) => area.points.length === 0)).toBe(true)
    expect(areas.every((area) => area.polygons?.length)).toBe(true)
    expect(
      areas.map(
        (area) =>
          (
            JSON.parse(area.key) as [
              string,
              string,
              ['explicit', number, number],
            ]
          )[2],
      ),
    ).toEqual(densityThresholds.map((value) => ['explicit', value, 0] as const))
  })
})

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return nodes.flatMap((node): SceneArea[] => {
    if (node.kind === 'area') return [node]
    if (node.kind === 'group') return sceneAreas(node.children)
    return []
  })
}
