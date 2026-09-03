import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@tanstack/charts-data/aapl'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  focusContextDetailDefinition,
  focusContextOverviewDefinition,
  mount,
} from './tanstack'
import {
  initialFocusContextWindow,
  monthlyAaplRows,
  rowsInWindow,
} from './model'
import type { AaplRow } from '@tanstack/charts-data/aapl'
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

  it('renders both native chart hosts and the selected brush window in the catalog preview', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })

    expect(container.querySelectorAll('svg.ts-chart')).toHaveLength(2)
    expect(
      container.querySelector('[data-chart-brush="focus-window"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-chart-brush-selection]'),
    ).not.toBeNull()
    expect(
      container.querySelector(
        '.ts-chart__dot[data-ts-key$="selected-point"] circle',
      ),
    ).not.toBeNull()

    handle.destroy()
    container.remove()
  })

  it('audits the transitive view implementation and keeps each behavior in its own host', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/83-focus-context-window',
    )
    const entry = readFileSync(resolve(directory, 'example.tsx'), 'utf8')
    const source = readFileSync(resolve(directory, 'view.tsx'), 'utf8')

    expect(source).toContain("from './example'")
    expect(entry).toContain('focusContextDetailDefinition')
    expect(entry).toContain('focusContextOverviewDefinition')

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
      expect(entry).not.toContain(forbidden)
      expect(source).not.toContain(forbidden)
    }
    expect(entry).toContain("from '@tanstack/charts/interaction/brush'")
    expect(entry).toContain("from '@tanstack/charts/selection'")
    expect(entry).toContain('controls: [')
    expect(entry).toContain('brushX({')
    expect(entry).toContain('keyedSelection<')
    expect(entry).toContain('whenSelected(')
    expect(source).toContain('if (input.preview)')
    expect(source.match(/<Chart\b/g)).toHaveLength(4)
    expect(source.match(/definition=\{detailDefinition\}/g)).toHaveLength(1)
    expect(source.match(/definition=\{overviewDefinition\}/g)).toHaveLength(1)
    expect(source).toContain(
      'definition={catalogPreviewDefinition(detailDefinition)}',
    )
    expect(source).toContain(
      'definition={catalogPreviewDefinition(overviewDefinition)}',
    )
    expect(entry).not.toContain("from '@tanstack/charts/view'")
    expect(entry).not.toContain('viewGrid(')
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
