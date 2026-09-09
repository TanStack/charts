import { createChartScene, type SceneNode } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { createExampleChart } from './tanstack'

describe('shadcn stacked bars', () => {
  it('rounds only the exposed endpoint of each positive stack', () => {
    const scene = createChartScene(createExampleChart(), {
      width: 640,
      height: 320,
    })
    const bars = flatten(scene.nodes).filter((node) => node.kind === 'rect')

    expect(bars).toHaveLength(12)
    expect(
      bars.map((bar) => ({
        series: bar.interaction?.point?.group,
        cornerRadii: bar.cornerRadii,
      })),
    ).toEqual(
      Array.from({ length: 6 }, () => [
        { series: 'desktop', cornerRadii: [0, 0, 0, 0] },
        { series: 'mobile', cornerRadii: [4, 4, 0, 0] },
      ]).flat(),
    )
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
