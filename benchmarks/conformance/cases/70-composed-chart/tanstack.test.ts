import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { loadTanStackSources } from '../../native-catalog'
import { composedChartDefinition } from './tanstack'
import type { SceneNode } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('native composed-chart bar sizing', () => {
  it('caps wide precipitation bars from the final resolved band', () => {
    const scene = render(input)
    const points = scene.points.filter(
      ({ markId }) => markId === 'precipitation-bars',
    )
    const bars = flatten(scene.nodes).filter((node) => node.kind === 'rect')

    expect(points).toHaveLength(6)
    expect(bars).toHaveLength(6)
    bars.forEach((bar, index) => {
      expect(bar).toMatchObject({ kind: 'rect', width: 20 })
      if (bar.kind !== 'rect') return
      expect(bar.x + bar.width / 2).toBeCloseTo(points[index]!.x, 8)
    })
  })

  it('keeps narrower responsive bands instead of forcing 20 pixels', () => {
    const scene = render({ ...input, width: 180 })
    const bars = flatten(scene.nodes).filter((node) => node.kind === 'rect')

    expect(scene.scales.x.bandwidth).toBeLessThan(20)
    expect(bars).toHaveLength(6)
    bars.forEach((bar) => {
      expect(bar).toMatchObject({
        kind: 'rect',
        width: expect.closeTo(scene.scales.x.bandwidth, 8),
      })
    })
  })

  it('does not hide responsive bar geometry outside the definition', async () => {
    const closure = await loadTanStackSources('70-composed-chart')
    const source = closure.files.map((file) => file.source).join('\n')

    expect(closure.files.map((file) => file.path)).toEqual(['tanstack.ts'])
    expect(closure.roles.support.files).toBe(0)
    expect(source).toContain('maxThickness: 20')
    expect(source).not.toContain('defineChart(({')
    expect(source).not.toContain('innerWidth')
    expect(source).not.toContain('categoryBandwidth')
    expect(source).not.toContain('barInset')
    expect(source).not.toContain('width - 100')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(
    composedChartDefinition(nextInput),
    nextInput,
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
