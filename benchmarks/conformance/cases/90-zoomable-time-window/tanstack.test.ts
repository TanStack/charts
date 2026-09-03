import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@tanstack/charts-data/aapl'
import { createChartScene } from '@tanstack/charts'
import { act } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  initialZoomWindow,
  selectZoomRows,
  visibleZoomData,
  visibleZoomLineData,
  zoomSpanDays,
} from './model'
import { mount, zoomTimeWindowDefinition } from './tanstack'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneNode,
  ScenePolyline,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput
const rows = selectZoomRows(aapl)

describe('definition-owned zoomable time window', () => {
  it('keeps the visible observations and zoom behavior in one typed definition', () => {
    const definition = zoomTimeWindowDefinition(initialZoomWindow, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height,
    })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<AaplRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<AaplRow, Date, number>
    >()
    expect(definition.marks).toHaveLength(2)
    expect(scene.points).toHaveLength(rows.length)
    expect(
      scene.points.every(({ markId }) => markId === 'zoom-series-points'),
    ).toBe(true)
    const controls = scene.controls ?? []
    expect(controls).toHaveLength(1)
    expect(controls[0]).toMatchObject({ kind: 'zoom-x' })
  })

  it('keeps the line continuous through both viewport edges', () => {
    const window = {
      start: new Date(Date.UTC(2018, 0, 6)),
      end: new Date(Date.UTC(2018, 0, 14)),
    }
    const definition = zoomTimeWindowDefinition(window, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height,
    })
    const line = scenePolylines(scene.nodes).find((node) =>
      node.key.startsWith('zoom-series-line:'),
    )
    const marks = scene.nodes.find(
      (node) => node.kind === 'group' && node.key === 'marks',
    )

    expect(definition.clip).toBe(true)
    expect(marks?.kind === 'group' ? marks.clip : undefined).toEqual(
      scene.chart,
    )
    expect(scene.points).toHaveLength(5)
    expect(
      scene.points.every(({ markId }) => markId === 'zoom-series-points'),
    ).toBe(true)
    expect(line?.points).toHaveLength(7)
    expect(line?.points[0]?.[0]).toBeCloseTo(scene.chart.x)
    expect(line?.points.at(-1)?.[0]).toBeCloseTo(
      scene.chart.x + scene.chart.width,
    )
  })

  it('draws a bracketing segment through an observation-free window', () => {
    const window = {
      start: new Date(Date.UTC(2018, 0, 6)),
      end: new Date(Date.UTC(2018, 0, 7)),
    }
    const definition = zoomTimeWindowDefinition(window, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height,
    })
    const lineRows = visibleZoomLineData(rows, window)
    const line = scenePolylines(scene.nodes).find((node) =>
      node.key.startsWith('zoom-series-line:'),
    )

    expect(scene.points).toEqual([])
    expect(line?.points).toHaveLength(2)
    expect(line?.points[0]?.[0]).toBeCloseTo(scene.chart.x)
    expect(line?.points[1]?.[0]).toBeCloseTo(scene.chart.x + scene.chart.width)
    expect(scene.scales.y.domain).toEqual(
      lineRows.map((row) => row.Close).sort((left, right) => left - right),
    )
    expect(
      scene.nodes.find((node) => node.kind === 'group' && node.key === 'marks'),
    ).toMatchObject({ clip: scene.chart })
  })

  it('accepts keyboard changes, external reset, and responsive updates', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let handle!: ReturnType<typeof mount>
    act(() => {
      handle = mount(container, input)
    })
    const driver = handle.driver
    const surface = container.querySelector<SVGElement>(
      '[data-chart-zoom-surface]',
    )
    const reset = container.querySelector<HTMLButtonElement>(
      '[data-conformance-zoom-reset]',
    )
    if (!driver || !surface || !reset) {
      throw new Error('Expected a mounted horizontal zoom behavior')
    }

    expect(driver.readState()).toMatchObject({
      viewport: {
        start: '2018-01-02',
        end: '2018-01-18',
        spanDays: 16,
      },
      visible: { count: rows.length },
      interaction: { active: false, last: 'none' },
    })

    surface.focus()
    act(() => {
      surface.dispatchEvent(
        new KeyboardEvent('keydown', { key: '+', bubbles: true }),
      )
    })
    expect(driver.readState()).toMatchObject({
      viewport: {
        start: '2018-01-06',
        end: '2018-01-14',
        spanDays: 8,
      },
      interaction: { active: true, last: 'zoom' },
    })
    expect(document.activeElement).toBe(surface)

    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected a rendered chart SVG')
    svg.getBoundingClientRect = () =>
      ({ left: 100, top: 200, width: 640, height: 360 }) as DOMRect
    const lineGeometry = driver.geometry?.({ view: 'main', role: 'line' })[0]
    if (!lineGeometry) throw new Error('Expected clipped line geometry')
    expect(driver.geometry?.({ view: 'main', role: 'dot' })).toHaveLength(5)
    const narrowedScene = createChartScene(
      zoomTimeWindowDefinition(
        {
          start: new Date(Date.UTC(2018, 0, 6)),
          end: new Date(Date.UTC(2018, 0, 14)),
        },
        () => {},
      ),
      { width: input.width, height: input.height },
    )
    expect(lineGeometry.x).toBeCloseTo(100 + narrowedScene.chart.x)
    expect(lineGeometry.width).toBeCloseTo(narrowedScene.chart.width)
    expect(lineGeometry.y).toBeGreaterThanOrEqual(200 + narrowedScene.chart.y)
    expect(lineGeometry.y + lineGeometry.height).toBeLessThanOrEqual(
      200 + narrowedScene.chart.y + narrowedScene.chart.height,
    )

    act(() => {
      handle.update({ ...input, revision: 1 })
    })
    expect(driver.readState()).toMatchObject({
      viewport: { start: '2018-01-06', end: '2018-01-14' },
    })
    expect(document.activeElement).toBe(surface)

    act(() => {
      reset.click()
    })
    expect(driver.readState()).toMatchObject({
      viewport: {
        start: '2018-01-02',
        end: '2018-01-18',
        spanDays: 16,
      },
      interaction: { active: true, last: 'reset' },
    })
    expect(document.activeElement).toBe(surface)
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      '2018-01-02 → 2018-01-18',
    )

    act(() => {
      handle.destroy()
    })
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('keeps viewport filtering as application policy', () => {
    const halfWindow = {
      start: new Date(Date.UTC(2018, 0, 6)),
      end: new Date(Date.UTC(2018, 0, 14)),
    }

    expect(zoomSpanDays(halfWindow)).toBe(8)
    expect(visibleZoomData(rows, halfWindow)).toHaveLength(5)
  })

  it('contains no copied scale, case-owned zoom overlay, or gesture lifecycle', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/90-zoomable-time-window',
    )
    const source = readFileSync(resolve(directory, 'example.tsx'), 'utf8')

    const view = readFileSync(resolve(directory, 'view.tsx'), 'utf8')
    for (const forbidden of [
      "from 'd3-zoom'",
      "from 'd3-selection'",
      'createElementNS',
      'data-conformance-overlay',
      '.copy()',
      '.invert(',
      'createZoomController',
      'transformForWindow',
      'windowFromTransform',
      "addEventListener('wheel'",
      "addEventListener('keydown'",
      "addEventListener('pointermove'",
      "addEventListener('pointercancel'",
      "addEventListener('touch",
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/interaction/zoom'")
    expect(source).toContain('zoomX({')
    expect(source).toContain('controlledSignal<')
    expect(source).toContain('(next, { reason }) => onChange(next, reason)')
    expect(source).toContain('decorative(')
    expect(view).toContain("from '@tanstack/charts/react'")
    expect(view).toContain('data-conformance-zoom-reset')
  })
})

function scenePolylines(nodes: readonly SceneNode[]): ScenePolyline[] {
  const result: ScenePolyline[] = []
  for (const node of nodes) {
    if (node.kind === 'polyline') result.push(node)
    if (node.kind === 'group') result.push(...scenePolylines(node.children))
  }
  return result
}
