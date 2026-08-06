import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { industries } from '@charts-poc/demo-data/industries'
import { createChartScene } from '@tanstack/charts'
import { act } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { legendRows, legendSeries } from './model'
import { interactiveLegendDefinition, mount } from './tanstack'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type { ChartDefinition, ChartSpecDatum } from '@tanstack/charts'
import type { LegendSeriesId } from './model'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

const allSeries = legendSeries.map((series) => series.id)

describe('definition-owned interactive legend', () => {
  it.each([0, 1])(
    'uses one grouped raw-row mark for revision %s',
    (revision) => {
      const rows = legendRows(industries, revision)
      const definition = interactiveLegendDefinition(
        revision,
        allSeries,
        () => {},
      )
      const scene = createChartScene(definition, {
        width: input.width,
        height: input.height,
      })
      type Datum = ChartSpecDatum<typeof definition>

      expectTypeOf<Datum>().toEqualTypeOf<IndustriesRow>()
      expectTypeOf(definition).toMatchTypeOf<
        ChartDefinition<IndustriesRow, Date, number>
      >()
      expect(definition.marks).toHaveLength(1)
      expect(rows).toHaveLength(12)
      expect(scene.points).toHaveLength(rows.length)
      scene.points.forEach((point) => {
        expect(rows).toContain(point.datum)
        expect(point.xValue).toBe(point.datum.date)
        expect(point.yValue).toBe(point.datum.unemployed)
        expect(point.group).toBe(point.datum.industry)
      })
      expect(scene.colors.domain).toEqual(allSeries)
      expect(scene.scales.y.domain).toEqual([0, 900])
      expect(scene.controls).toHaveLength(1)
      expect(scene.nodes.some((node) => node.key === 'legend')).toBe(true)
    },
  )

  it.each([
    [['Manufacturing'], 6],
    [['Construction'], 6],
    [[], 0],
  ] as const)(
    'renders %j after domain resolution',
    (visibleSeries, expectedPoints) => {
      const definition = interactiveLegendDefinition(0, visibleSeries, () => {})
      const scene = createChartScene(definition, {
        width: input.width,
        height: input.height,
      })

      expect(scene.points).toHaveLength(expectedPoints)
      expect(scene.colors.domain).toEqual(allSeries)
      expect(scene.scales.y.domain).toEqual([0, 900])
      expect(new Set(scene.points.map((point) => point.group))).toEqual(
        new Set<LegendSeriesId>(visibleSeries),
      )
    },
  )

  it('keeps native legend state and focus through data revisions', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    let handle!: ReturnType<typeof mount>
    await act(async () => {
      handle = mount(container, input)
    })
    const button = container.querySelector<HTMLButtonElement>(
      '[data-series-id="Manufacturing"]',
    )
    if (!button || !handle.driver) throw new Error('Expected legend controls')

    button.focus()
    await act(async () => {
      button.click()
    })
    expect(handle.driver.readState()).toMatchObject({
      visibleSeries: ['Construction'],
      renderedSeries: ['Construction'],
      focusedSeries: 'Manufacturing',
      yDomain: [0, 900],
    })

    await act(async () => {
      handle.update({ ...input, revision: 1 })
    })
    expect(handle.driver.readState()).toMatchObject({
      visibleSeries: ['Construction'],
      renderedSeries: ['Construction'],
      focusedSeries: 'Manufacturing',
      yDomain: [0, 900],
    })
    expect(container.querySelector('[data-series-id="Manufacturing"]')).toBe(
      button,
    )

    await act(async () => {
      handle.destroy()
    })
    container.remove()
  })

  it('contains no case-owned legend layout, toggling, or data filtering', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/81-recharts-interactive-legend',
    )
    const source = readFileSync(resolve(directory, 'view.tsx'), 'utf8')

    for (const forbidden of [
      'flatMap(',
      'rows.filter(',
      '<button',
      'data-series-swatch',
      'toggleLegendSeries',
      'input.height -',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('lineY(rows')
    expect(source).toContain('interactiveColorLegend')
    expect(source).toContain('controlledSignal')
  })
})
