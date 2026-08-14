import { describe, expect, it } from 'vitest'
import { createChartScene, type SceneNode } from '@tanstack/charts'
import { activeDonutArcs, activeDonutDefinition, donutSummary } from './example'
import { activeDonutLayout } from './layout'
import { mount as rechartsMount, sectorAngles } from './recharts'
import { mount as tanstackMount } from './view'

const input = {
  width: 420,
  height: 360,
  revision: 0,
  interactive: true,
  preview: false,
}

describe('active donut metric', () => {
  it('keeps selected geometry and center copy derived from one row', () => {
    const definition = activeDonutDefinition(input, 'safari')
    const scene = createChartScene(definition, input)
    const summary = donutSummary(input, 'safari')

    expect(summary).toMatchObject({
      selected: { id: 'safari', visitors: 200 },
      total: 925,
    })
    expect(definition.focusRing).toBe(false)
    expect(visitorPoints(scene.points)).toHaveLength(5)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(7)
    expect(scene.colors.domain).toEqual([
      'chrome',
      'safari',
      'firefox',
      'edge',
      'other',
    ])
  })

  it('rekeys both center rows when the selected browser changes', () => {
    const chrome = createChartScene(
      activeDonutDefinition(input, 'chrome'),
      input,
    )
    const safari = createChartScene(
      activeDonutDefinition(input, 'safari'),
      input,
    )
    const centerKeys = (nodes: readonly SceneNode[]) =>
      flatten(nodes)
        .filter(
          (node) =>
            node.kind === 'label' && node.key.startsWith('donut-center-'),
        )
        .map((node) => node.key)

    expect(centerKeys(chrome.nodes)).toEqual([
      expect.stringContaining('chrome:value'),
      expect.stringContaining('chrome:label'),
    ])
    expect(centerKeys(safari.nodes)).toEqual([
      expect.stringContaining('safari:value'),
      expect.stringContaining('safari:label'),
    ])
    expect(centerKeys(safari.nodes)).not.toEqual(centerKeys(chrome.nodes))
  })

  it('keeps fallback overlays and center rows on the same browser', () => {
    const scene = createChartScene(
      activeDonutDefinition(input, 'unknown-browser'),
      input,
    )
    const nodes = flatten(scene.nodes)
    const overlays = nodes.filter(
      (node) =>
        node.kind === 'area' && node.key.startsWith('selected-browser-'),
    )
    const centerRows = nodes.filter(
      (node) => node.kind === 'label' && node.key.startsWith('donut-center-'),
    )

    expect(overlays).toHaveLength(2)
    expect(overlays.every((node) => node.key.endsWith(':chrome'))).toBe(true)
    expect(centerRows).toHaveLength(2)
    expect(centerRows.every((node) => node.key.includes('chrome:'))).toBe(true)
  })

  it('renders the same native active composition in compact previews', () => {
    const scene = createChartScene(
      activeDonutDefinition(
        { ...input, width: 288, height: 192, preview: true },
        'chrome',
      ),
      { width: 288, height: 192 },
    )

    expect(visitorPoints(scene.points)).toHaveLength(5)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(7)
    expect(scene.nodes).toHaveLength(1)
  })

  it('aligns active overlays with Recharts padding-aware sector angles', () => {
    const rows = [
      { id: 'first', label: 'First', visitors: 10 },
      { id: 'empty', label: 'Empty', visitors: 0 },
      { id: 'last', label: 'Last', visitors: 30 },
    ]

    const first = sectorAngles(rows, 0)
    const empty = sectorAngles(rows, 1)
    const last = sectorAngles(rows, 2)

    rows.forEach((row, index) => {
      if (row.visitors === 0) return
      const native = activeDonutArcs(rows, row.id).active[0]
      const reference = sectorAngles(rows, index)

      expect(native).toBeDefined()
      expect(90 - (native!.startAngle * 180) / Math.PI).toBeCloseTo(
        reference.start,
      )
      expect(90 - (native!.endAngle * 180) / Math.PI).toBeCloseTo(reference.end)
    })

    expect(first.start).toBe(90)
    expect(first.end).toBeCloseTo(1.4)
    expect(empty.start).toBeCloseTo(1.4)
    expect(empty.end).toBeCloseTo(1.4)
    expect(last.start).toBeCloseTo(-1.4)
    expect(last.end).toBeCloseTo(-267.2)
  })

  it.each([
    ['TanStack', tanstackMount],
    ['Recharts', rechartsMount],
  ] as const)(
    'fits the %s card at 390 by 480 with a two-column button group',
    async (_name, mount) => {
      const layout = activeDonutLayout(390, 480)
      const container = document.createElement('div')
      document.body.append(container)
      const handle = mount(container, {
        width: 390,
        height: 480,
        revision: 0,
        interactive: true,
        preview: false,
      })

      try {
        const content = container.querySelector<HTMLElement>(
          '[data-donut-content]',
        )
        const legend = container.querySelector<HTMLElement>(
          '[data-browser-legend]',
        )
        const buttons = [...(legend?.querySelectorAll('button') ?? [])]

        expect(layout).toMatchObject({
          chartSize: 271,
          legendColumns: 2,
          legendHeight: 122,
        })
        expect(layout.occupiedHeight).toBeLessThanOrEqual(474)
        expect(content?.dataset.chartSize).toBe('271')
        expect(legend?.getAttribute('role')).toBe('group')
        expect(legend?.style.gridTemplateColumns).toBe(
          'repeat(2, minmax(0, 1fr))',
        )
        expect(buttons).toHaveLength(5)
        expect(
          buttons.every((button) => button.getAttribute('role') === null),
        ).toBe(true)
        if (_name === 'TanStack') {
          container
            .querySelector('svg.ts-chart')
            ?.setAttribute('data-ts-motion-state', 'finished')
          const settled = handle.driver?.settle?.()
          expect(settled).toBeInstanceOf(Promise)
          await settled
        }
      } finally {
        handle.destroy()
        container.remove()
      }
    },
  )
})

function visitorPoints(points: readonly { datum: unknown }[]) {
  return points.filter(
    (point) =>
      typeof point.datum === 'object' &&
      point.datum !== null &&
      'visitors' in point.datum,
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
