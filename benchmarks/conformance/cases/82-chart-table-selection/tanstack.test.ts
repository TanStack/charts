import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@charts-poc/demo-data/penguins'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  selectionRowId,
  selectionRows,
  type CompletePenguin,
  type SelectionId,
} from './model'
import { chartTableSelectionDefinition } from './tanstack'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneNode,
} from '@tanstack/charts'

describe('definition-owned chart selection', () => {
  it.each([0, 1])(
    'keeps five raw base points and stable semantic keys for revision %s',
    (revision) => {
      const rows = selectionRows(penguins, revision)
      const definition = chartTableSelectionDefinition(revision, null, () => {})
      const scene = createChartScene(definition, {
        width: 640,
        height: 260,
      })
      type Datum = ChartSpecDatum<typeof definition>

      expectTypeOf<Datum>().toEqualTypeOf<CompletePenguin>()
      expectTypeOf(definition).toMatchTypeOf<
        ChartDefinition<CompletePenguin, number, number>
      >()
      expect(definition.marks).toHaveLength(2)
      expect(scene.points).toHaveLength(5)
      expect(markPrimitives(scene.nodes, 'selected-observation')).toHaveLength(
        0,
      )
      scene.points.forEach((point) => {
        expect(rows).toContain(point.datum)
        expect(point.markId).toBe('observations')
        expect(point.key).toContain(selectionRowId(point.datum))
      })
    },
  )

  it.each([
    'adelie-dream-female',
    'chinstrap-dream-male',
  ] satisfies readonly SelectionId[])(
    'paints one decorative overlay for %s without changing domains or points',
    (selectedId) => {
      const unselected = createChartScene(
        chartTableSelectionDefinition(0, null, () => {}),
        { width: 640, height: 260 },
      )
      const selected = createChartScene(
        chartTableSelectionDefinition(0, selectedId, () => {}),
        { width: 640, height: 260 },
      )
      const overlay = markPrimitives(selected.nodes, 'selected-observation')

      expect(selected.scales.x.domain).toEqual(unselected.scales.x.domain)
      expect(selected.scales.y.domain).toEqual(unselected.scales.y.domain)
      expect(selected.points).toHaveLength(5)
      expect(overlay).toHaveLength(1)
      expect(overlay[0]).toMatchObject({
        kind: 'dot',
        radius: 7,
        style: { fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 },
      })
      expect(overlay[0]).not.toHaveProperty('interaction')
    },
  )

  it('resolves a persisted semantic key against reordered revised rows', () => {
    const selectedId = 'adelie-biscoe-female' satisfies SelectionId
    const initial = createChartScene(
      chartTableSelectionDefinition(0, selectedId, () => {}),
      { width: 640, height: 260 },
    )
    const revised = createChartScene(
      chartTableSelectionDefinition(1, selectedId, () => {}),
      { width: 640, height: 260 },
    )
    const initialPoint = initial.points.find(
      (point) => selectionRowId(point.datum) === selectedId,
    )
    const revisedPoint = revised.points.find(
      (point) => selectionRowId(point.datum) === selectedId,
    )

    expect(initialPoint?.key).toBe(revisedPoint?.key)
    expect(initialPoint?.datum).toBe(revisedPoint?.datum)
    expect(revisedPoint?.datum.body_mass_g).toBe(3400)
    expect(initialPoint?.datumIndex).not.toBe(revisedPoint?.datumIndex)
    expect(markPrimitives(revised.nodes, 'selected-observation')).toHaveLength(
      1,
    )
  })

  it('keeps the semantic table in the app and removes selection plumbing', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/82-chart-table-selection/view.tsx',
      ),
      'utf8',
    )

    for (const forbidden of [
      'rows.filter(',
      'dot(selectedRows',
      '...(selectedRows',
      'onSelect=',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('keyedSelection')
    expect(source).toContain('whenSelected')
    expect(source).toContain('<table')
    expect(source).toContain('data-clear-selection')
  })
})

function markPrimitives(nodes: readonly SceneNode[], markId: string) {
  const output: SceneNode[] = []
  const visit = (children: readonly SceneNode[]) => {
    for (const node of children) {
      if (node.kind !== 'group') continue
      if (node.key === markId) output.push(...node.children)
      else visit(node.children)
    }
  }
  visit(nodes)
  return output
}
