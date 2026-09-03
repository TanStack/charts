import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import { createChartRuntime } from '@tanstack/charts'
import { arc } from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { gaugeBands, gaugeMaximum, gaugeTicks } from './transform'
import { createExampleChart } from './tanstack'
import type { GaugeBand } from './transform'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const startAngle = -Math.PI / 2
const endAngle = Math.PI / 2

describe('native needle-gauge composition', () => {
  it('allocates flat source-linked threshold bands over the authored sweep', () => {
    const scene = render(input)
    const points = bandPoints(scene.points)
    const rows = points.map(({ datum }) => datum)

    expect(points).toHaveLength(3)
    expect(areaNodes(scene.nodes)).toHaveLength(3)
    expect(rows.map(({ id }) => id)).toEqual(['low', 'elevated', 'high'])
    expect(rows.map(({ value }) => value)).toEqual([8, 7, 15])
    expect(rows.map(({ fraction }) => fraction)).toEqual([
      8 / gaugeMaximum,
      7 / gaugeMaximum,
      15 / gaugeMaximum,
    ])
    expect(rows[0]?.startAngle).toBe(startAngle)
    expect(rows[0]?.endAngle).toBeCloseTo(
      startAngle + (8 / gaugeMaximum) * Math.PI,
      12,
    )
    expect(rows[0]?.endAngle).toBe(rows[1]?.startAngle)
    expect(rows[1]?.endAngle).toBe(rows[2]?.startAngle)
    expect(rows[2]?.endAngle).toBe(endAngle)

    rows.forEach((row, index) => {
      expect(row).not.toHaveProperty('data')
      expect(row.source).toEqual([gaugeBands[index]])
      expect(row.source[0]).toBe(gaugeBands[index])
      expect(row.sourceIndexes).toEqual([index])
      expect(points[index]?.key).toContain(row.id)
    })
  })

  it.each([
    { width: 640, height: 400 },
    { width: 240, height: 240 },
  ])(
    'keeps bands, ticks, needle, hub, and readout responsive at $width×$height',
    ({ width, height }) => {
      const nextInput = { ...input, width, height }
      const reading = usCountyUnemployment[0]!
      const scene = render(nextInput)
      const points = bandPoints(scene.points)
      const areas = areaNodes(scene.nodes)
      const nodes = flatten(scene.nodes)
      const tickRules = ruleNodes(nodes, 'gauge-ticks')
      const needle = ruleNodes(nodes, 'gauge-needle')[0]
      const hub = nodes.find(
        (node): node is Extract<SceneNode, { kind: 'dot' }> =>
          node.kind === 'dot' && node.key.includes('gauge-hub'),
      )
      const value = nodes.find(
        (node): node is Extract<SceneNode, { kind: 'label' }> =>
          node.kind === 'label' && node.key.includes('gauge-value'),
      )
      const hubPoint = markPoints(scene.points, 'gauge-hub')[0]
      const valuePoint = markPoints(scene.points, 'gauge-value')[0]
      const radius = (Math.min(width, height) / 2) * 0.82
      const expectedArc = arc<PieDatum<GaugeBand>>()
        .innerRadius(radius * 0.72)
        .outerRadius(radius)

      points.forEach((point, index) => {
        expect(point.yValue).toBeCloseTo(radius * 0.86, 12)
        expect(areas[index]?.path).toBe(expectedArc(point.datum))
      })

      expect(tickRules).toHaveLength(11)
      tickRules.forEach((rule, index) => {
        const tick = gaugeTicks[index]!
        const angle = scaleAngle(tick.value)
        expect(rule).toMatchObject({
          x1: expect.closeTo(Math.sin(angle) * radius * 0.76, 8),
          y1: expect.closeTo(-Math.cos(angle) * radius * 0.76, 8),
          x2: expect.closeTo(Math.sin(angle) * radius * 0.94, 8),
          y2: expect.closeTo(-Math.cos(angle) * radius * 0.94, 8),
        })
      })

      const needleAngle = scaleAngle(reading.rate)
      expect(needle).toMatchObject({
        kind: 'rule',
        x1: expect.closeTo(0, 8),
        y1: expect.closeTo(0, 8),
        x2: expect.closeTo(Math.sin(needleAngle) * radius * 0.64, 8),
        y2: expect.closeTo(-Math.cos(needleAngle) * radius * 0.64, 8),
      })
      expect(hub).toMatchObject({
        kind: 'dot',
        x: expect.closeTo(0, 8),
        y: expect.closeTo(0, 8),
        radius: 8,
      })
      expect(value).toMatchObject({
        kind: 'label',
        x: expect.closeTo(0, 8),
        y: expect.closeTo(34, 8),
        text: `${reading.rate}%`,
      })
      expect(hubPoint).toMatchObject({
        datum: reading,
        xValue: reading.rate,
        yValue: 0,
        x: expect.closeTo(width / 2, 8),
        y: expect.closeTo(height / 2, 8),
      })
      expect(valuePoint).toMatchObject({
        datum: reading,
        xValue: reading.rate,
        yValue: 0,
        x: expect.closeTo(width / 2, 8),
        y: expect.closeTo(height / 2 + 34, 8),
      })
    },
  )

  it('uses semantic band, tick, and county keys across data revisions', () => {
    const first = render(input)
    const repeated = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstNodes = flatten(first.nodes)
    const repeatedNodes = flatten(repeated.nodes)
    const revisedNodes = flatten(revised.nodes)
    const firstReading = usCountyUnemployment[0]!
    const revisedReading = usCountyUnemployment[2]!

    expect(bandPoints(repeated.points).map(({ key }) => key)).toEqual(
      bandPoints(first.points).map(({ key }) => key),
    )
    expect(bandPoints(revised.points).map(({ key }) => key)).toEqual(
      bandPoints(first.points).map(({ key }) => key),
    )
    expect(nodeKeys(repeatedNodes, 'gauge-ticks')).toEqual(
      nodeKeys(firstNodes, 'gauge-ticks'),
    )
    expect(nodeKeys(revisedNodes, 'gauge-ticks')).toEqual(
      nodeKeys(firstNodes, 'gauge-ticks'),
    )

    for (const markId of ['gauge-hub', 'gauge-value']) {
      const firstKey = markPoints(first.points, markId)[0]?.key
      const repeatedKey = markPoints(repeated.points, markId)[0]?.key
      const revisedKey = markPoints(revised.points, markId)[0]?.key

      expect(repeatedKey).toBe(firstKey)
      expect(firstKey).toContain(String(firstReading.id))
      expect(revisedKey).toContain(String(revisedReading.id))
      expect(revisedKey).not.toBe(firstKey)
    }
    expect(nodeKeys(firstNodes, 'gauge-needle')[0]).toContain(
      String(firstReading.id),
    )
    expect(nodeKeys(revisedNodes, 'gauge-needle')[0]).toContain(
      String(revisedReading.id),
    )
  })

  it('keeps shared plotting work in the public polar definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/98-needle-gauge/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/polar'")
    expect(source).toContain('pie(gaugeBands, {')
    expect(source).toContain("value: 'value'")
    expect(source).toContain('startAngle,')
    expect(source).toContain('endAngle,')
    expect(source).toContain("id: 'gauge-bands'")
    expect(source).toContain("id: 'gauge-ticks'")
    expect(source).toContain("id: 'gauge-needle'")
    expect(source).toContain("id: 'gauge-hub'")
    expect(source).toContain("id: 'gauge-value'")
    expect(source.match(/key: 'id'/g)).toHaveLength(5)
    expect(source).toContain('datum.label')
    expect(source).toContain('datum.value')
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('pieLayout')
    expect(source).not.toContain('.data')
    expect(source).not.toContain('Math.sin')
    expect(source).not.toContain('Math.cos')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(createExampleChart(nextInput), nextInput)
}

function scaleAngle(value: number) {
  return startAngle + (value / gaugeMaximum) * (endAngle - startAngle)
}

function bandPoints(points: readonly ChartPoint<unknown>[]) {
  return points.filter(
    (point): point is ChartPoint<PieDatum<GaugeBand>, number, number> =>
      point.markId === 'gauge-bands',
  )
}

function markPoints(points: readonly ChartPoint<unknown>[], markId: string) {
  return points.filter((point) => point.markId === markId)
}

function areaNodes(nodes: readonly SceneNode[]) {
  return flatten(nodes).filter(
    (node): node is Extract<SceneNode, { kind: 'area' }> =>
      node.kind === 'area',
  )
}

function ruleNodes(nodes: readonly SceneNode[], markId: string) {
  return nodes.filter(
    (node): node is Extract<SceneNode, { kind: 'rule' }> =>
      node.kind === 'rule' && node.key.includes(markId),
  )
}

function nodeKeys(nodes: readonly SceneNode[], markId: string) {
  return nodes
    .filter((node) => node.key.includes(markId) && node.kind !== 'group')
    .map(({ key }) => key)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
