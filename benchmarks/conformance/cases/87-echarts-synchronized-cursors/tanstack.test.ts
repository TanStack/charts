import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { travelers } from '@charts-poc/demo-data/travelers'
import { createChartScene, resolveFocusScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { selectSynchronizedCursorData } from './selection'
import { catalogCase, mount, synchronizedCursorDefinition } from './tanstack'
import type {
  ChartDefinition,
  ChartFocusState,
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  SceneDot,
  SceneNode,
  SceneRule,
} from '@tanstack/charts'
import type { TravelersRow } from '@charts-poc/demo-data/travelers'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned synchronized cursors', () => {
  it.each([0, 1])(
    'composes two typed views with one interaction point per row at revision %s',
    (revision) => {
      const definition = synchronizedCursorDefinition({ ...input, revision })
      const rows = selectSynchronizedCursorData(travelers, revision)
      const scene = createChartScene(definition, {
        width: input.width,
        height: input.height - 56,
      })
      type Datum = ChartSpecDatum<typeof definition>

      expectTypeOf<Datum>().toEqualTypeOf<TravelersRow>()
      expectTypeOf(definition).toMatchTypeOf<
        ChartDefinition<TravelersRow, Date, number>
      >()
      expect(scene.points).toHaveLength(rows.length * 2)
      expect(
        scene.points.filter(({ markId }) => markId.endsWith('-line')),
      ).toHaveLength(0)
      expect(new Set(scene.points.map(({ group }) => group))).toEqual(
        new Set(['current', 'previous']),
      )

      for (const row of rows) {
        const group = pointsAtDate(scene, row.date)
        expect(group).toHaveLength(2)
        expect(new Set(group.map(({ group: value }) => value))).toEqual(
          new Set(['current', 'previous']),
        )
        expect(group[0]?.x).toBeCloseTo(group[1]?.x ?? 0, 6)
      }
    },
  )

  it('keeps inferred date identity stable across the overlapping revision', () => {
    const scenes = [0, 1].map((revision) =>
      createChartScene(synchronizedCursorDefinition({ ...input, revision }), {
        width: input.width,
        height: input.height - 56,
      }),
    )
    const keys = scenes.map((scene) =>
      pointsAtDate(scene, new Date('2020-12-13T00:00:00.000Z')).map(
        ({ key }) => key,
      ),
    )

    expect(keys[0]).toEqual(keys[1])
  })

  it('retargets aligned rules and independent-y markers into both views', () => {
    const scene = createChartScene(synchronizedCursorDefinition(input), {
      width: input.width,
      height: input.height - 56,
    })
    const group = pointsAtDate(scene, new Date('2020-12-13T00:00:00.000Z'))
    const primary = group.find(({ group: value }) => value === 'current')
    if (!primary) throw new Error('Expected a current-view focus point')
    const focus: ChartFocusState<TravelersRow, Date, number> = {
      primary,
      group,
      source: 'pointer',
      pinned: false,
    }
    const focused = resolveFocusScene(scene, focus).scene
    const nodes = flatten(focused.nodes)
    const rules = nodes.filter(
      (node): node is SceneRule =>
        node.kind === 'rule' &&
        node.className === 'ts-chart__focus-guide-x-rule',
    )
    const markers = nodes.filter(
      (node): node is SceneDot =>
        node.kind === 'dot' &&
        node.className === 'ts-chart__focus-guide-marker',
    )

    expect(rules).toHaveLength(2)
    expect(markers).toHaveLength(2)
    expect(rules[0]?.x1).toBeCloseTo(rules[1]?.x1 ?? 0, 6)
    expect(markers[0]?.x).toBeCloseTo(markers[1]?.x ?? 0, 6)
    expect(markers[0]?.y).not.toBeCloseTo(markers[1]?.y ?? 0, 2)
  })

  it('uses the native keyboard, pin, leave, update, and Escape lifecycle', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, input)
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg || !handle.driver) throw new Error('Expected a mounted chart')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    for (let index = 0; index < 3; index += 1) {
      svg.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
    }
    expect(handle.driver.readState()).toMatchObject({
      shared: { date: '2020-12-13', pinned: false },
      crosshairs: {
        current: { visible: true },
        previous: { visible: true },
      },
    })
    expect(
      container.querySelectorAll('.ts-chart__focus-guide-x-rule'),
    ).toHaveLength(2)

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    expect(handle.driver.readState()).toMatchObject({
      shared: { date: '2020-12-13', pinned: true },
    })
    expect(
      container.querySelector('[data-conformance-synchronized-date]')
        ?.textContent,
    ).toContain('pinned')
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)

    container.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(handle.driver.readState()).toMatchObject({
      shared: { date: '2020-12-13', pinned: true },
    })

    handle.update({ ...input, revision: 1 })
    expect(handle.driver.readState()).toMatchObject({
      shared: { date: '2020-12-13', pinned: true },
    })

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(handle.driver.readState()).toMatchObject({
      shared: { date: null, pinned: false },
      crosshairs: {
        current: { visible: false },
        previous: { visible: false },
      },
    })
    expect(
      container.querySelector('[data-conformance-synchronized-date]')
        ?.textContent,
    ).toBe('Focus either chart')

    handle.destroy()
    container.remove()
  })

  it('paints aligned native cursors without ordinary guides in previews', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = catalogCase.mount(container, {
      ...input,
      width: 288,
      height: 192,
      interactive: false,
      preview: true,
    })

    expect(
      container.querySelectorAll('.ts-chart__focus-guide-x-rule'),
    ).toHaveLength(2)
    expect(
      container.querySelectorAll('.ts-chart__focus-guide-marker'),
    ).toHaveLength(2)
    expect(container.querySelectorAll('.ts-chart__axes')).toHaveLength(0)
    expect(container.querySelectorAll('.ts-chart__grid')).toHaveLength(0)

    handle.destroy()
    container.remove()
  })

  it('contains one chart host and no application-owned plotting overlay', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/87-echarts-synchronized-cursors',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(existsSync(resolve(directory, 'view.tsx'))).toBe(false)
    for (const forbidden of [
      "from 'react'",
      '@tanstack/charts/react',
      'createElementNS',
      'data-conformance-overlay',
      'scene.scales.x.map',
      'scene.scales.y.map',
      'onKeyDown',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('viewGrid({')
    expect(source).toContain('decorative(')
    expect(source).toContain('focusGuideX(rows')
    expect(source).toContain("focus: 'group-x'")
    expect(source).toContain("visibility: 'pinned'")
  })
})

function pointsAtDate(
  scene: ChartScene<TravelersRow, Date, number>,
  date: Date,
): readonly ChartPoint<TravelersRow, Date, number>[] {
  const timestamp = date.getTime()
  return scene.points.filter(
    (point) => point.datum.date.getTime() === timestamp,
  )
}

function flatten(nodes: readonly SceneNode[]): readonly SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
