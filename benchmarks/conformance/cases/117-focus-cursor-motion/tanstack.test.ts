import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createChartRuntime,
  resolveFocusPresentation,
  type ChartDefinition,
  type ChartFocusState,
  type ChartPoint,
  type ChartScene,
  type ChartSpecDatum,
  type SceneNode,
} from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { focusMotionRows } from './model'
import { focusCursorMotionDefinition, mount } from './tanstack'
import type { ConformanceInput } from '../../types'
import type { FocusMotionRow } from './model'

describe('definition-owned focus cursor motion', () => {
  it('keeps exact source types and excludes the crosshair from hit testing', () => {
    const definition = focusCursorMotionDefinition()
    const scene = render()
    type Datum = ChartSpecDatum<ReturnType<typeof focusCursorMotionDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<FocusMotionRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<FocusMotionRow, string, number>
    >()
    expect(scene.points).toHaveLength(focusMotionRows.length * 2)
    expect(
      scene.points.some(({ markId }) => markId === 'focus-motion-crosshair'),
    ).toBe(false)
    expect(scene.focusGuides).toHaveLength(1)
    expect(scene.focusGuides?.[0]).toMatchObject({
      key: 'focus-motion-crosshair',
      markId: 'focus-motion-crosshair',
      motion: {
        transition: {
          type: 'spring',
          stiffness: 320,
          damping: 28,
          mass: 0.72,
          restDelta: 0.02,
          restSpeed: 0.02,
        },
      },
    })
    expect(
      flatten(scene.nodes).some(({ key }) => key === 'focus-motion-crosshair'),
    ).toBe(false)
  })

  it('retargets one stable rule, marker, and label structure', () => {
    const scene = render()
    const monday = sourcePoint(scene, 'Alpha:Mon')
    const saturday = sourcePoint(scene, 'Alpha:Sat')
    const first = resolveFocusPresentation(scene, focusState(monday))
    const second = resolveFocusPresentation(scene, focusState(saturday))
    const firstGuide = nodeByKey(first.over, 'focus-motion-crosshair', 'group')
    const secondGuide = nodeByKey(
      second.over,
      'focus-motion-crosshair',
      'group',
    )
    const firstKeys = flatten(firstGuide.children).map(({ key }) => key)
    const secondKeys = flatten(secondGuide.children).map(({ key }) => key)
    const firstRule = nodeByKey(
      firstGuide.children,
      'focus-motion-crosshair:x-rule',
      'rule',
    )
    const secondRule = nodeByKey(
      secondGuide.children,
      'focus-motion-crosshair:x-rule',
      'rule',
    )
    const firstXLabel = nodeByKey(
      firstGuide.children,
      'focus-motion-crosshair:x-label:text',
      'label',
    )
    const secondYLabel = nodeByKey(
      secondGuide.children,
      'focus-motion-crosshair:y-label:text',
      'label',
    )

    expect(firstKeys).toEqual(secondKeys)
    expect(firstRule.x1).toBe(monday.x)
    expect(secondRule.x1).toBe(saturday.x)
    expect(firstXLabel.text).toBe('Mon')
    expect(secondYLabel.text).toBe('84')
    expect(first.under).toEqual([])
    expect(second.under).toEqual([])
  })

  it('owns guide and focus-state spring policy in the definition', () => {
    const definition = focusCursorMotionDefinition()
    const guide = definition.marks[2]

    expect(guide?.motion).toEqual({
      transition: {
        type: 'spring',
        stiffness: 320,
        damping: 28,
        mass: 0.72,
        restDelta: 0.02,
        restSpeed: 0.02,
      },
    })
    expect(definition.focusRing).toBe(false)
    expect(
      definition.marks[0]?.initialize({ markIndex: 0 }).states,
    ).toBeDefined()
    expect(
      definition.marks[1]?.initialize({ markIndex: 1 }).states,
    ).toBeDefined()
  })

  it('keeps the visible live status outside the reconciled chart root', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const input = {
      width: 640,
      height: 400,
      revision: 0,
    } satisfies ConformanceInput
    const mounted = mount(container, input)
    const status = container.querySelector<HTMLOutputElement>(
      'output[aria-live="polite"]',
    )
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!status || !svg) throw new Error('Expected chart and live status')

    expect(status.textContent).toBe('Hover or use ← →')
    expect(status.isConnected).toBe(true)
    expect(status.parentElement).not.toBe(svg.parentElement)
    expect(status.style.display).toBe('')

    mounted.update({ ...input, width: 720, revision: 1 })
    expect(
      container.querySelector<HTMLOutputElement>('output[aria-live="polite"]'),
    ).toBe(status)
    expect(status.isConnected).toBe(true)

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(status.textContent).toMatch(/^Mon · (Alpha|Beta|Gamma) · 3 grouped$/)
    expect(status.isConnected).toBe(true)

    mounted.destroy()
    expect(status.isConnected).toBe(false)
    container.remove()
  })

  it('keeps only application status and renderer hosting outside the definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/117-focus-cursor-motion/tanstack.ts',
      ),
      'utf8',
    )
    const definitionStart = source.indexOf(
      'export function focusCursorMotionDefinition()',
    )
    const shellStart = source.indexOf(
      'function createFocusStatus',
      definitionStart,
    )
    const definitionSource = source.slice(definitionStart, shellStart)

    expect(definitionSource).toContain('crosshair<string, number>({')
    expect(definitionSource).toContain("id: 'focus-motion-crosshair'")
    expect(definitionSource).toContain('restDelta: 0.02')
    expect(definitionSource).toContain('focusRing: false')
    expect(definitionSource).not.toContain('querySelector')
    expect(definitionSource).not.toContain('document.')
    expect(definitionSource).not.toContain('mountChartRenderer')
    expect(source).not.toContain('createChartSpring')
    expect(source).not.toContain('requestAnimationFrame')
    expect(source).not.toContain('createElementNS')
    expect(source).not.toContain('CrosshairOverlay')
    expect(source).toContain('onRender(context')
  })
})

function render() {
  return createChartRuntime<FocusMotionRow, string, number>().render(
    focusCursorMotionDefinition(),
    { width: 640, height: 400 },
  )
}

function sourcePoint(
  scene: ChartScene<FocusMotionRow, string, number>,
  id: string,
) {
  const point = scene.points.find(
    ({ datum, markId }) => datum.id === id && markId === 'series-points',
  )
  if (!point) throw new Error(`Expected ${id} source point`)
  return point
}

function focusState(
  primary: ChartPoint<FocusMotionRow, string, number>,
): ChartFocusState<FocusMotionRow, string, number> {
  return {
    primary,
    group: [primary],
    source: 'pointer',
    pinned: false,
  }
}

function nodeByKey<TKind extends SceneNode['kind']>(
  nodes: readonly SceneNode[],
  key: string,
  kind: TKind,
): Extract<SceneNode, { kind: TKind }> {
  const node = flatten(nodes).find(
    (candidate) => candidate.key === key && candidate.kind === kind,
  )
  if (!node || node.kind !== kind) throw new Error(`Expected ${key}`)
  return node as Extract<SceneNode, { kind: TKind }>
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
