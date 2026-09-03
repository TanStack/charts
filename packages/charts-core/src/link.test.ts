import { describe, expect, expectTypeOf, it } from 'vitest'
import { link } from './link'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { bandXAxes, linearAxes } from './test-scales'
import { tickX, tickY } from './tick'
import type { ChartDefinition, SceneNode } from './types'

describe('link and tick marks', () => {
  it('maps independent typed endpoints and exposes one midpoint per link', () => {
    const data = [
      { id: 'a', x1: 1, y1: 2, x2: 4, y2: 7, weight: 2 },
      { id: 'b', x1: 2, y1: 8, x2: 6, y2: 3, weight: 5 },
    ]
    const definition = defineChart({
      marks: [
        link(data, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#2563eb',
          strokeOpacity: (_datum, { index, data: rows }) =>
            0.25 + index * (0.5 / rows.length),
          strokeWidth: (datum) => datum.weight,
          lineCap: 'butt',
        }),
      ],
      ...linearAxes([0, 8], [0, 10]),
    })
    const scene = createChartScene(definition, { width: 480, height: 260 })
    const linkGroup = flatten(scene.nodes).find(
      (node) => node.kind === 'group' && node.className === 'ts-chart__link',
    )
    const rules =
      linkGroup?.kind === 'group'
        ? linkGroup.children.filter((node) => node.kind === 'rule')
        : []
    const svg = renderChartSvg(scene, { ariaLabel: 'Links' })

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<(typeof data)[number]>
    >()
    expect(rules).toHaveLength(2)
    expect(rules.map((rule) => rule.style)).toMatchObject([
      { strokeOpacity: 0.25, strokeWidth: 2, lineCap: 'butt' },
      { strokeOpacity: 0.5, strokeWidth: 5, lineCap: 'butt' },
    ])
    expect(scene.points).toHaveLength(2)
    expect(scene.points[0]).toMatchObject({
      datum: data[0],
      xValue: 4,
      yValue: 7,
    })
    expect(svg).toContain('class="ts-chart__link"')
    expect(svg).toContain('stroke-linecap="butt"')
  })

  it('sizes ticks from the perpendicular band and accepts an explicit length', () => {
    const data = [
      { id: 'a', category: 'Alpha', low: 3, high: 8 },
      { id: 'b', category: 'Beta', low: 4, high: 9 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          tickY(data, {
            x: 'category',
            y: 'low',
            key: 'id',
            stroke: '#0f172a',
          }),
          tickY(data, {
            x: 'category',
            y: 'high',
            key: 'id',
            stroke: '#0f172a',
          }),
          tickX([{ id: 'threshold', category: 'Alpha', value: 5 }], {
            x: 'category',
            y: 'value',
            key: 'id',
            length: 12,
            stroke: '#dc2626',
          }),
        ],
        ...bandXAxes(['Alpha', 'Beta'], [0, 10]),
      }),
      { width: 480, height: 260 },
    )
    const tickGroups = flatten(scene.nodes).filter(
      (node) =>
        node.kind === 'group' &&
        node.className?.split(' ').includes('ts-chart__tick'),
    )
    const tickRules = tickGroups.flatMap((node) =>
      node.kind === 'group'
        ? node.children.filter((child) => child.kind === 'rule')
        : [],
    )
    const explicit = tickRules.at(-1)

    expect(tickRules).toHaveLength(5)
    expect(explicit).toMatchObject({ kind: 'rule' })
    if (explicit?.kind !== 'rule') throw new Error('Expected a tick rule')
    expect(explicit.y2 - explicit.y1).toBeCloseTo(12)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
