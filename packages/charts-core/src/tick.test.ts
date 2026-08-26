import { scaleLinear, scalePoint } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { tickX, tickY } from './tick'
import type { SceneNode, SceneRule } from './types'

describe('tick marks', () => {
  it('sizes tickY from the complete orthogonal category domain', () => {
    const rows = [
      { id: 'a', category: 'A', value: 2 },
      { id: 'c', category: 'C', value: 4 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          tickY(rows, {
            id: 'summary',
            x: 'category',
            y: 'value',
            key: 'id',
            span: 0.4,
          }),
        ],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scalePoint<string>().domain(['A', 'B', 'C']) },
          y: { scale: scaleLinear().domain([0, 5]) },
        },
      }),
      { width: 400, height: 240 },
    )
    const rules = sceneRules(scene.nodes)
    const step = scene.scales.x.map('B') - scene.scales.x.map('A')

    expect(rules).toHaveLength(2)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
    rules.forEach((rule, index) => {
      expect(rule.x2 - rule.x1).toBeCloseTo(step * 0.4)
      expect((rule.x1 + rule.x2) / 2).toBe(
        scene.scales.x.map(rows[index]!.category),
      )
      expect(rule.y1).toBe(scene.scales.y.map(rows[index]!.value))
      expect(rule.y2).toBe(rule.y1)
    })
  })

  it('transposes category-step spans for tickX', () => {
    const rows = [
      { id: 'a', category: 'A', value: 2 },
      { id: 'b', category: 'B', value: 4 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          tickX(rows, {
            x: 'value',
            y: 'category',
            key: 'id',
            span: 0.5,
          }),
        ],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scaleLinear().domain([0, 5]) },
          y: { scale: scalePoint<string>().domain(['A', 'B']) },
        },
      }),
      { width: 400, height: 240 },
    )
    const rules = sceneRules(scene.nodes)
    const step = Math.abs(scene.scales.y.map('B') - scene.scales.y.map('A'))

    expect(rules).toHaveLength(2)
    rules.forEach((rule, index) => {
      expect(rule.y2 - rule.y1).toBeCloseTo(step * 0.5)
      expect((rule.y1 + rule.y2) / 2).toBe(
        scene.scales.y.map(rows[index]!.category),
      )
      expect(rule.x1).toBe(scene.scales.x.map(rows[index]!.value))
      expect(rule.x2).toBe(rule.x1)
    })
  })

  it('bounds a singleton point-scale span to the final plot', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          tickY([{ category: 'A', value: 2 }], {
            x: 'category',
            y: 'value',
            span: 0.5,
          }),
        ],
        guides: false,
        focusRing: false,
        scales: {
          x: { scale: scalePoint<string>().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 5]) },
        },
      }),
      { width: 400, height: 240 },
    )
    const rule = sceneRules(scene.nodes)[0]!

    expect(rule.x1).toBeGreaterThanOrEqual(scene.chart.x)
    expect(rule.x2).toBeLessThanOrEqual(scene.chart.x + scene.chart.width)
  })

  it('rejects conflicting, invalid, and continuous-axis spans', () => {
    const rows = [{ category: 'A', value: 2 }]
    expect(() =>
      tickY(rows, {
        x: 'category',
        y: 'value',
        length: 20,
        span: 0.5,
      }),
    ).toThrow('length and span are mutually exclusive')
    expect(() => tickY(rows, { x: 'category', y: 'value', span: 0 })).toThrow(
      'span must be a positive finite number',
    )
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            tickY([{ category: 1, value: 2 }], {
              x: 'category',
              y: 'value',
              span: 0.5,
            }),
          ],
          guides: false,
          focusRing: false,
          scales: {
            x: { scale: scaleLinear().domain([0, 2]) },
            y: { scale: scaleLinear().domain([0, 5]) },
          },
        }),
        { width: 400, height: 240 },
      ),
    ).toThrow('span requires a point or band scale')
  })
})

function sceneRules(nodes: readonly SceneNode[]): SceneRule[] {
  return flatten(nodes).filter(
    (node): node is SceneRule => node.kind === 'rule',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
