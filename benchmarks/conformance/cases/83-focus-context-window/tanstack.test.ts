import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@charts-poc/demo-data/aapl'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  focusContextDetailDefinition,
  focusContextOverviewDefinition,
} from './tanstack'
import {
  initialFocusContextWindow,
  monthlyAaplRows,
  rowsInWindow,
} from './model'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneNode,
} from '@tanstack/charts'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'

const rows = monthlyAaplRows(aapl)
const dates = rows.map((row) => row.Date)
const initialWindow = initialFocusContextWindow(dates)

describe('definition-owned focus/context brush', () => {
  it('keeps the overview line, fallback, and behavior in one definition', () => {
    const onChange = (range: BrushRange<Date>, reason: BrushXChange<Date>) => {
      expectTypeOf(range).toEqualTypeOf<BrushRange<Date>>()
      expectTypeOf(reason).toEqualTypeOf<BrushXChange<Date>>()
    }
    const definition = focusContextOverviewDefinition(initialWindow, onChange)
    const scene = createChartScene(definition, { width: 640, height: 100 })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<AaplRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<AaplRow, Date, number>
    >()
    expect(scene.points).toHaveLength(rows.length)
    expect(scene.points.every((point) => rows.includes(point.datum))).toBe(true)
    expect(
      scene.points.every((point) => point.markId === 'overview-line'),
    ).toBe(true)
    expect(scene.nodes).toContainEqual(
      expect.objectContaining({
        kind: 'group',
        key: 'behavior:focus-window:fallback',
        className: 'ts-chart__brush-x-fallback',
      }),
    )
    expect(scene.controls).toHaveLength(1)
    expect(brushControl(scene.controls?.[0])).toMatchObject({
      kind: 'brush-x',
      key: 'focus-window',
      range: { start: initialWindow.start, end: initialWindow.end },
    })
  })

  it('paints the selected detail point from the same four semantic rows', () => {
    const definition = focusContextDetailDefinition(initialWindow)
    const scene = createChartScene(definition, { width: 640, height: 260 })
    const visibleRows = rowsInWindow(rows, initialWindow)
    const selected = markPrimitives(scene.nodes, 'selected-point')

    expect(visibleRows).toHaveLength(4)
    expect(scene.scales.x.domain).toEqual([
      initialWindow.start,
      initialWindow.end,
    ])
    expect(selected).toHaveLength(1)
    expect(selected[0]).toMatchObject({
      kind: 'dot',
      radius: 6,
      style: { fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 },
    })
    expect(selected[0]).not.toHaveProperty('interaction')
  })

  it('audits the transitive view implementation and keeps each behavior in its own host', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/83-focus-context-window',
    )
    const entry = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')
    const source = readFileSync(resolve(directory, 'view.tsx'), 'utf8')

    expect(entry).toContain("from './view'")
    expect(entry).toContain('focusContextDetailDefinition')
    expect(entry).toContain('focusContextOverviewDefinition')
    expect(entry).not.toContain('brushX(')

    for (const forbidden of [
      "from 'd3-brush'",
      "from 'd3-selection'",
      'createFocusBrushController',
      'brushGroupRef',
      'brush.move',
      'useLayoutEffect',
      'data-focus-window',
      '<svg',
      'selectedRows',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/interaction/brush'")
    expect(source).toContain("from '@tanstack/charts/selection'")
    expect(source).toContain('behaviors: [')
    expect(source).toContain('brushX({')
    expect(source).toContain('keyedSelection<')
    expect(source).toContain('whenSelected(')
    expect(source.match(/<Chart\b/g)).toHaveLength(2)
    expect(source).not.toContain("from '@tanstack/charts/view'")
    expect(source).not.toContain('viewGrid(')
  })
})

function brushControl(control: unknown) {
  if (
    !control ||
    typeof control !== 'object' ||
    !('kind' in control) ||
    control.kind !== 'brush-x'
  ) {
    throw new Error('Expected a horizontal brush control')
  }
  return control as {
    kind: 'brush-x'
    range: BrushRange<Date>
  }
}

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
