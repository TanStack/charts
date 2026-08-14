import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { filterDashboardData } from './data'
import { shadcnDashboardChartDefinition } from './tanstack'
import type { SceneNode } from '@tanstack/charts'

describe('shadcn dashboard TanStack chart', () => {
  it('renders two natural stacked areas with scoped gradients', () => {
    const runtime = createChartRuntime()
    const scene = runtime.render(
      shadcnDashboardChartDefinition(filterDashboardData('90d')),
      { width: 900, height: 250 },
    )
    const areas = flatten(scene.nodes).filter((node) => node.kind === 'area')

    expect(areas).toHaveLength(2)
    expect(scene.points).toHaveLength(182)
    expect(scene.gradients.map((gradient) => gradient.id)).toEqual([
      'fill-mobile',
      'fill-desktop',
    ])
    expect(areas.map((area) => area.style?.fill)).toEqual([
      'url(#fill-mobile)',
      'url(#fill-desktop)',
    ])

    runtime.destroy()
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
