import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { penguins } from '@charts-poc/demo-data/penguins'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { nestedTooltipRows, penguinTooltipId } from './model'
import { pinnedNestedTooltipDefinition } from './tanstack'
import type { ChartDefinition, ChartSpecDatum } from '@tanstack/charts'
import type { CompletePenguin } from './model'

describe('definition-owned pinned nested tooltip', () => {
  it.each([0, 1])(
    'keeps one stable keyed point mark for revision %s',
    (revision) => {
      const rows = nestedTooltipRows(penguins, revision)
      const definition = pinnedNestedTooltipDefinition(rows)
      const scene = createChartScene(definition, { width: 640, height: 360 })
      type Datum = ChartSpecDatum<typeof definition>

      expectTypeOf<Datum>().toEqualTypeOf<CompletePenguin>()
      expectTypeOf(definition).toMatchTypeOf<
        ChartDefinition<CompletePenguin, number, number>
      >()
      expect(definition.marks).toHaveLength(1)
      expect(scene.points).toHaveLength(rows.length)
      scene.points.forEach((point) => {
        const id = penguinTooltipId(point.datum)
        expect(id).not.toBeNull()
        expect(point.key).toContain(id)
        expect(rows).toContain(point.datum)
      })
    },
  )

  it('expresses pin styling and pin-only portal policy in the definition', () => {
    const definition = pinnedNestedTooltipDefinition(
      nestedTooltipRows(penguins),
    )
    const mark = definition.marks[0]
    const states = mark?.initialize({ markIndex: 0 }).states?.definitions

    expect(states).toContainEqual({
      when: { focus: 'primary', pinned: true },
      style: {
        r: 9,
        fill: '#f97316',
        stroke: '#ffffff',
        strokeWidth: 3,
      },
    })
    expect(definition.tooltip).toMatchObject({
      visibility: 'pinned',
      sticky: true,
      placement: ['right', 'left', 'top', 'bottom'],
      offset: 14,
    })
  })

  it('retains only nested body composition and domain cohort policy in React', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/84-pinned-nested-chart-tooltip/view.tsx',
      ),
      'utf8',
    )

    for (const forbidden of [
      'useState',
      'useLayoutEffect',
      'tooltipStyle',
      'selectedRows',
      'onSelect=',
      '<aside',
      'role="dialog"',
      'data-placement',
      'mainHeight',
      'panelHeight',
      'narrowLayout',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/tooltip'")
    expect(source).toContain("from '@tanstack/charts/tooltip/portal'")
    expect(source).toContain("from '@tanstack/react-charts/tooltip'")
    expect(source).toContain("visibility: 'pinned'")
    expect(source).toContain("when: { focus: 'primary', pinned: true }")
    expect(source).toContain('renderTooltipBody=')
    expect(source).toContain('penguinCohort(')
    expect(source).toContain('<Chart')
  })
})
