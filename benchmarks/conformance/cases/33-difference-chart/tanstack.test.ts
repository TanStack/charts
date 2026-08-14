import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { differenceDefinition, differenceRows } from './tanstack'
import type { SceneArea, SceneNode, ScenePolyline } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned difference chart', () => {
  it('uses the shared window transform for the rolling metric and lineage', () => {
    const rows = differenceRows(input)

    expect(rows).toHaveLength(101)
    expect(rows[0]?.Date).toBeInstanceOf(Date)
    expect(Number.isFinite(rows[0]?.average)).toBe(true)
    expect(rows.every(({ average }) => Number.isFinite(average))).toBe(true)
    expect(rows[0]?.source).toHaveLength(20)
    expect(rows[0]?.sourceIndexes).toEqual(
      Array.from({ length: 20 }, (_value, index) => index),
    )
  })

  it('renders native sign lobes while both boundary lines retain raw identity', () => {
    const rows = differenceRows(input)
    const scene = render(input)
    const nodes = flatten(scene.nodes)
    const areas = nodes.filter(isArea)
    const lines = nodes.filter(isPolyline)
    const comparison = scene.points.filter(
      ({ markId }) => markId === 'difference:comparison',
    )
    const primary = scene.points.filter(
      ({ markId }) => markId === 'difference:primary',
    )

    expect(areas).toHaveLength(10)
    expect(new Set(areas.map(({ style }) => style?.fill))).toEqual(
      new Set(['#16a34a', '#dc2626']),
    )
    expect(areas.every(({ interaction }) => interaction === undefined)).toBe(
      true,
    )
    expect(lines).toHaveLength(2)
    expect(lines.every(({ interaction }) => interaction !== undefined)).toBe(
      true,
    )
    expect(comparison).toHaveLength(rows.length)
    expect(primary).toHaveLength(rows.length)
    expect(scene.points.map(({ datum }) => datum)).toEqual([...rows, ...rows])
    comparison.forEach((point, index) => {
      expect(point.datum).toBe(primary[index]?.datum)
      expect(point.datum).toEqual(rows[index])
    })
    expect(scene.colors.domain).toEqual([])
  })

  it('recomputes the metric window and difference geometry on revision', () => {
    const firstRows = differenceRows(input)
    const revisedRows = differenceRows({ ...input, revision: 1 })
    const first = render(input)
    const revised = render({ ...input, revision: 1 })
    const firstPrimary = first.points.filter(
      ({ markId }) => markId === 'difference:primary',
    )
    const primary = revised.points.filter(
      ({ markId }) => markId === 'difference:primary',
    )

    expect(revisedRows).toHaveLength(101)
    expect(revisedRows[0]).not.toBe(firstRows[0])
    expect(primary).toHaveLength(revisedRows.length)
    expect(primary[0]?.datum).not.toBe(firstPrimary[0]?.datum)
    expect(primary[0]?.datum).toEqual(revisedRows[0])
    expect(primary.at(-1)?.datum).toEqual(revisedRows.at(-1))
  })

  it('keeps the rolling metric visible and removes case-owned lobe geometry', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/33-difference-chart/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('rollingWindow(aapl.slice(')
    expect(source).toContain("average: { value: 'Close', reduce: 'mean' }")
    expect(source).toContain('differenceY(rows')
    expect(source).not.toContain('rollingCloseAverage')
    expect(source).not.toContain("from './transform'")
    expect(source).not.toContain('differenceAreas')
    expect(source).not.toContain('function crossing')
    expect(source).not.toContain('areaY(')
    expect(source).not.toContain('lineY(')
  })
})

function render(nextInput: ConformanceInput) {
  return createChartRuntime().render(differenceDefinition(nextInput), {
    width: nextInput.width,
    height: nextInput.height,
  })
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function isArea(node: SceneNode): node is SceneArea {
  return node.kind === 'area'
}

function isPolyline(node: SceneNode): node is ScenePolyline {
  return node.kind === 'polyline'
}
