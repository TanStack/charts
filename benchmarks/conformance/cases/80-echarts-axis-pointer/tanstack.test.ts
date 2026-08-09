import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { industries } from '@charts-poc/demo-data/industries'
import { createChartScene, resolveFocusScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { axisPointerData, axisPointerIndustries } from './selection'
import { axisPointerDefinition, catalogCase, mount } from './tanstack'
import type {
  ChartDefinition,
  ChartFocusState,
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  SceneGroup,
  SceneNode,
  SceneRule,
} from '@tanstack/charts'
import type { AxisPointerDatum } from './selection'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned snapped axis pointer', () => {
  it.each([0, 1])(
    'keeps raw observations and guide candidates typed for revision %s',
    (revision) => {
      const definition = axisPointerDefinition({ ...input, revision })
      const rows = axisPointerData(industries, revision)
      const scene = createChartScene(definition, {
        width: input.width,
        height: input.height,
      })
      const guide = focusLayer(scene)
      type Datum = ChartSpecDatum<typeof definition>

      expectTypeOf<Datum>().toEqualTypeOf<AxisPointerDatum>()
      expectTypeOf(definition).toMatchTypeOf<
        ChartDefinition<AxisPointerDatum, Date, number>
      >()
      expect(rows).toHaveLength(24)
      expect(
        scene.points.filter(({ markId }) => markId === 'industry-lines'),
      ).toHaveLength(rows.length)
      expect(
        scene.points.filter(({ markId }) => markId === 'industry-points'),
      ).toHaveLength(rows.length)
      expect(
        scene.points.some(({ markId }) => markId === 'axis-pointer-guide'),
      ).toBe(false)
      expect(guide.children).toEqual([])
      expect(guide.focus).toMatchObject({
        match: 'primary',
        retarget: true,
      })
      expect(guide.focus?.points).toHaveLength(rows.length)
      guide.focus?.points.forEach((point, index) => {
        expect(point.datum).toBe(rows[index])
        expect(point.xValue).toBe(rows[index]?.date)
        expect(point.yValue).toBe(rows[index]?.unemployed)
        expect(point.group).toBe(rows[index]?.industry)
      })
      expect(scene.colors.domain).toEqual(axisPointerIndustries)
      expect(
        flatten(scene.nodes)
          .filter((node) => node.key.startsWith('legend-label:'))
          .map((node) => (node.kind === 'label' ? node.text : null)),
      ).toEqual(axisPointerIndustries)
    },
  )

  it.each([320, 640, 960])(
    'retargets one full-height dashed rule with stable structure at %spx',
    (width) => {
      const scene = createChartScene(
        axisPointerDefinition({ ...input, width }),
        { width, height: input.height },
      )
      const april = resolveAtDate(scene, '2005-04-01')
      const august = resolveAtDate(scene, '2005-08-01')
      const aprilLayer = focusLayer(april)
      const augustLayer = focusLayer(august)
      const aprilRule = guideRule(aprilLayer)
      const augustRule = guideRule(augustLayer)

      expect(flatten(aprilLayer.children).map(({ key }) => key)).toEqual(
        flatten(augustLayer.children).map(({ key }) => key),
      )
      expect(aprilRule).toMatchObject({
        x1: scene.scales.x.map(new Date('2005-04-01T00:00:00.000Z')),
        x2: scene.scales.x.map(new Date('2005-04-01T00:00:00.000Z')),
        y1: scene.chart.y,
        y2: scene.chart.y + scene.chart.height,
        style: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
      })
      expect(augustRule.x1).toBe(
        scene.scales.x.map(new Date('2005-08-01T00:00:00.000Z')),
      )
      expect(augustRule.x1).not.toBe(aprilRule.x1)
    },
  )

  it('uses native grouped tooltip, legend, and focus lifecycle', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, input)
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg || !handle.driver) throw new Error('Expected mounted chart driver')

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: input.width,
      bottom: input.height,
      left: 0,
      width: input.width,
      height: input.height,
      toJSON: () => ({}),
    })
    const target = handle.driver.resolveTarget({
      view: 'main',
      anchor: 'date:2005-01-01',
    })
    if (!target) throw new Error('Expected semantic pointer target')
    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: target.x,
        clientY: target.y,
      }),
    )

    expect(handle.driver.readState()).toMatchObject({
      focus: {
        date: '2005-01-01',
        industries: axisPointerIndustries,
      },
      crosshair: { visible: true },
      tooltip: { visible: true },
    })
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(tooltip?.classList).toContain('conformance-tooltip-grouped')
    expect(
      tooltip?.querySelector('.ts-chart-tooltip__title')?.textContent,
    ).toBe('Jan 2005')
    expect(tooltip?.querySelectorAll('.ts-chart-tooltip__row')).toHaveLength(3)
    expect(tooltip?.querySelectorAll('.ts-chart-tooltip__swatch')).toHaveLength(
      3,
    )
    expect(tooltip?.textContent).toContain('Manufacturing')
    expect(tooltip?.textContent).toContain('Construction')
    expect(tooltip?.textContent).toContain('Finance')
    expect(
      container.querySelectorAll('.ts-chart__focus-guide-x-rule'),
    ).toHaveLength(1)

    container.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(handle.driver.readState()).toMatchObject({
      focus: { date: null, industries: [], values: [] },
      crosshair: { visible: false },
      tooltip: { visible: false },
    })

    handle.destroy()
    container.remove()
  })

  it('paints a deterministic native axis pointer in catalog previews', () => {
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
    ).toHaveLength(1)
    expect(
      container
        .querySelector('[data-ts-focus-guide-layer="over"]')
        ?.getAttribute('visibility'),
    ).not.toBe('hidden')

    handle.destroy()
    container.remove()
  })

  it('contains no application-owned crosshair or tooltip renderer', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/80-echarts-axis-pointer',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(existsSync(resolve(directory, 'view.tsx'))).toBe(false)
    for (const forbidden of [
      "from 'react'",
      '@tanstack/charts/react',
      'useState',
      'onRender',
      'positionTooltip',
      'createElementNS',
      '<svg',
      'data-conformance-overlay',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('focusGuideX(rows')
    expect(source).toContain("focus: 'group-x'")
    expect(source).toContain('legend: colorLegend')
    expect(source).toContain('use: tooltip')
  })
})

function resolveAtDate(
  scene: ChartScene<AxisPointerDatum, Date, number>,
  date: string,
) {
  const group = axisPointerIndustries.map((industry) => {
    const point = scene.points.find(
      (candidate) =>
        candidate.markId === 'industry-points' &&
        candidate.datum.industry === industry &&
        candidate.datum.date.toISOString().slice(0, 10) === date,
    )
    if (!point) throw new Error(`Expected ${industry} at ${date}`)
    return point
  })
  const primary = group[0]!
  const focus: ChartFocusState<AxisPointerDatum, Date, number> = {
    primary,
    group,
    source: 'pointer',
    pinned: false,
  }
  return resolveFocusScene(scene, focus).scene
}

function focusLayer(scene: ChartScene): SceneGroup {
  const layer = flatten(scene.nodes).find(
    (node): node is SceneGroup =>
      node.kind === 'group' && node.key === 'focus:axis-pointer-guide',
  )
  if (!layer?.focus) throw new Error('Expected axis pointer focus layer')
  return layer
}

function guideRule(layer: SceneGroup): SceneRule {
  const rules = flatten(layer.children).filter(
    (node): node is SceneRule =>
      node.kind === 'rule' && node.className === 'ts-chart__focus-guide-x-rule',
  )
  expect(rules).toHaveLength(1)
  return rules[0]!
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
