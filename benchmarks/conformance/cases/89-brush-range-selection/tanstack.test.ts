import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@charts-poc/demo-data/aapl'
import { createChartScene } from '@tanstack/charts'
import { act } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { initialBrushRange, monthlyAaplRows, observedBrushDates } from './model'
import { brushRangeDefinition, mount } from './tanstack'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneGroup,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput
const rows = monthlyAaplRows(aapl)
const dates = observedBrushDates(rows)
const initialRange = initialBrushRange(dates)

describe('definition-owned brush range', () => {
  it('keeps raw monthly observations and the brush in one typed definition', () => {
    const definition = brushRangeDefinition(initialRange, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height,
    })
    type Datum = ChartSpecDatum<typeof definition>
    const fallback = scene.nodes.find(
      (node): node is SceneGroup =>
        node.kind === 'group' && node.key === 'behavior:monthly-range:fallback',
    )

    expectTypeOf<Datum>().toEqualTypeOf<AaplRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<AaplRow, Date, number>
    >()
    expect(definition.marks).toHaveLength(2)
    expect(scene.points).toHaveLength(rows.length)
    expect(
      scene.points.every(({ markId }) => markId === 'brush-series-points'),
    ).toBe(true)
    expect(scene.controls).toHaveLength(1)
    expect(fallback).toMatchObject({
      className: 'ts-chart__brush-x-fallback',
    })
    expect(fallback?.children).toHaveLength(3)
  })

  it('accepts semantic handle changes and preserves the range through updates', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let handle!: ReturnType<typeof mount>
    act(() => {
      handle = mount(container, input)
    })
    const driver = handle.driver
    const end = container.querySelector<SVGRectElement>(
      '[data-chart-brush-handle="end"]',
    )
    if (!driver || !end) throw new Error('Expected a mounted range brush')

    expect(driver.readState()).toMatchObject({
      selection: {
        start: '2017-04-28',
        end: '2017-06-30',
        pointCount: 3,
        dragging: false,
      },
    })
    expect(
      container
        .querySelector('[data-conformance-view="main"]')
        ?.getAttribute('role'),
    ).toBe('application')

    end.focus()
    act(() => {
      end.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
    })
    expect(driver.readState()).toMatchObject({
      selection: {
        start: '2017-04-28',
        end: '2017-07-31',
        pointCount: 4,
        dragging: false,
      },
    })
    expect(document.activeElement).toBe(end)
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'avg $147.3',
    )

    act(() => {
      handle.update({ ...input, revision: 1 })
    })
    expect(driver.readState()).toMatchObject({
      selection: { start: '2017-04-28', end: '2017-07-31' },
    })
    expect(document.activeElement).toBe(end)

    act(() => {
      end.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      )
    })
    expect(driver.readState()).toMatchObject({
      selection: {
        start: '2017-04-28',
        end: '2017-04-28',
        pointCount: 1,
      },
    })

    act(() => {
      handle.destroy()
    })
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('contains no copied scale, case-owned brush overlay, or gesture lifecycle', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/89-brush-range-selection',
    )
    const source = readFileSync(resolve(directory, 'example.tsx'), 'utf8')

    const view = readFileSync(resolve(directory, 'view.tsx'), 'utf8')
    for (const forbidden of [
      "from 'd3-brush'",
      "from 'd3-selection'",
      'createElementNS',
      'data-conformance-overlay',
      '.copy()',
      '.invert(',
      'focusDisabled',
      "addEventListener('pointerdown'",
      "addEventListener('pointermove'",
      "addEventListener('pointercancel'",
      'brush.move',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/interaction/brush'")
    expect(source).toContain('brushX({')
    expect(source).toContain('controlledSignal<')
    expect(source).toContain('(next, { reason }) => onChange(next, reason)')
    expect(source).toContain('decorative(')
    expect(view).toContain("from '@tanstack/charts/react'")
    expect(view).toContain('<output')
  })
})
