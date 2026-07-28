import { describe, expect, it } from 'vitest'
import { createChartRuntime, createChartScene } from '@tanstack/charts'
import type { SceneNode } from '@tanstack/charts'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsLatestInput,
  statsHistoryChart,
  statsLatestChart,
} from './stats-parity'
import type {
  StatsHistoryInput,
  StatsHistoryInterval,
  StatsHistoryPoint,
  StatsLatestInput,
  StatsLatestInterval,
  StatsLatestPoint,
} from './stats-parity'

describe('TanStack Stats parity fixtures', () => {
  it('covers line, absolute stack, share, stream, zoom, and partial data', () => {
    const runtime = createChartRuntime<
      number | StatsHistoryPoint | StatsHistoryInterval,
      StatsHistoryInput
    >()
    const line = runtime.render(
      statsHistoryChart,
      createStatsHistoryInput('line'),
      { width: 760, height: 420 },
    )
    const stacked = runtime.render(
      statsHistoryChart,
      createStatsHistoryInput('stacked'),
      { width: 760, height: 420 },
    )
    const share = runtime.render(
      statsHistoryChart,
      createStatsHistoryInput('share'),
      { width: 760, height: 420 },
    )
    const stream = runtime.render(
      statsHistoryChart,
      createStatsHistoryInput('stream'),
      { width: 760, height: 420 },
    )
    const zoomed = runtime.render(
      statsHistoryChart,
      createStatsHistoryInput('stacked', 0, true),
      { width: 760, height: 420 },
    )
    const lineSvg = renderChartSvgWithResources(line, {
      ariaLabel: 'Stats history line',
    })

    expect(
      flatten(line.nodes).filter((node) => node.kind === 'polyline'),
    ).toHaveLength(6)
    expect(lineSvg).toContain('stroke-dasharray="2 4"')
    expect(
      flatten(stacked.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(3)
    expect(share.scales.y.domain).toEqual([0, 1])
    expect(Number(stream.scales.y.domain[0])).toBeLessThan(0)
    expect(Number(stream.scales.y.domain[1])).toBeGreaterThan(0)
    expect(
      flatten(zoomed.nodes).some(
        (node) => node.kind === 'group' && node.clip !== undefined,
      ),
    ).toBe(true)
    runtime.destroy()
  })

  it('covers grouped and stacked bars in both orientations with stable keys', () => {
    const variants = [
      createStatsLatestInput('vertical', false),
      createStatsLatestInput('horizontal', false),
      createStatsLatestInput('vertical', true),
      createStatsLatestInput('horizontal', true),
    ] as const
    const runtime = createChartRuntime<
      number | StatsLatestPoint | StatsLatestInterval,
      StatsLatestInput
    >()
    const scenes = variants.map((input) =>
      runtime.render(statsLatestChart, input, { width: 760, height: 420 }),
    )
    const updated = runtime.render(
      statsLatestChart,
      createStatsLatestInput('vertical', true, 1),
      { width: 760, height: 420 },
    )
    const firstStackedKeys = new Set(
      flatten(scenes[2]?.nodes ?? [])
        .filter((node) => node.kind === 'rect')
        .map((node) => node.key),
    )
    const updatedKeys = new Set(
      flatten(updated.nodes)
        .filter((node) => node.kind === 'rect')
        .map((node) => node.key),
    )

    expect(
      flatten(scenes[0]?.nodes ?? []).filter((node) => node.kind === 'rect'),
    ).toHaveLength(5)
    expect(
      flatten(scenes[1]?.nodes ?? []).filter((node) => node.kind === 'rect'),
    ).toHaveLength(5)
    expect(
      flatten(scenes[2]?.nodes ?? []).filter((node) => node.kind === 'rect'),
    ).toHaveLength(10)
    expect(
      flatten(scenes[3]?.nodes ?? []).filter((node) => node.kind === 'rect'),
    ).toHaveLength(10)
    expect(firstStackedKeys).toEqual(updatedKeys)
    runtime.destroy()
  })

  it('keeps explicit interval endpoints and gradient fills in static output', () => {
    const input = createStatsLatestInput('vertical', true)
    const scene = createChartScene(
      statsLatestChart.chart({
        input,
        prepared: input,
        width: 760,
        height: 420,
        theme: {
          foreground: 'currentColor',
          muted: 'currentColor',
          grid: 'currentColor',
          background: 'transparent',
          palette: [],
        },
      }),
      { width: 760, height: 420 },
    )
    const rectangles = flatten(scene.nodes).filter(
      (node) => node.kind === 'rect',
    )
    const svg = renderChartSvgWithResources(scene, {
      ariaLabel: 'Stats stacked bars',
    })

    expect(rectangles[0]).toMatchObject({
      kind: 'rect',
      width: rectangles[1]?.kind === 'rect' ? rectangles[1].width : undefined,
    })
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('fill="url(#stats-latest-')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
