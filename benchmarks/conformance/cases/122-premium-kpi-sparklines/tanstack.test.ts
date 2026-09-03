import { createChartScene } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import {
  createPremiumKpiRenderer,
  mount,
  premiumKpiDefinition,
  premiumKpiSpring,
} from './tanstack'
import { premiumKpisForRevision } from './model'
import type { SceneNode } from '@tanstack/charts'

describe('premium KPI sparkline catalog case', () => {
  it('builds three guide-free chart scenes with inherited palette tokens', () => {
    const metrics = premiumKpisForRevision(0)
    const definitions = metrics.map(premiumKpiDefinition)
    const scenes = definitions.map((definition) =>
      createChartScene(definition, {
        width: 240,
        height: 92,
      }),
    )

    expect(scenes.map((scene) => scene.points.length)).toEqual([24, 12, 24])
    expect(definitions.every((definition) => definition.guides === false)).toBe(
      true,
    )
    expect(
      scenes
        .flatMap((scene) => flatten(scene.nodes))
        .some((node) => node.className?.includes('axis')),
    ).toBe(false)
    expect(scenes[0]?.gradients[0]).toMatchObject({
      id: 'revenue-fill',
      stops: [
        {
          color: 'var(--premium-kpi-accent, #6d5dfc)',
          opacity: 0.26,
        },
        { color: 'var(--premium-kpi-accent, #6d5dfc)', opacity: 0 },
      ],
    })
    expect(
      scenes
        .flatMap((scene) => flatten(scene.nodes))
        .some(
          (node) => node.style?.stroke === 'var(--premium-kpi-accent, #6d5dfc)',
        ),
    ).toBe(true)
  })

  it('preserves keyed point identity across spring updates', () => {
    const initial = premiumKpisForRevision(0)[0]
    const update = premiumKpisForRevision(1)[0]
    if (!initial || !update) throw new Error('Expected revenue metrics')

    const first = createChartScene(premiumKpiDefinition(initial), {
      width: 240,
      height: 92,
    })
    const next = createChartScene(premiumKpiDefinition(update), {
      width: 240,
      height: 92,
    })

    expect(first.points.map((point) => point.key)).toEqual(
      next.points.map((point) => point.key),
    )
    expect(premiumKpiSpring).toEqual({
      type: 'spring',
      stiffness: 180,
      damping: 24,
      mass: 0.8,
    })
    expect(createPremiumKpiRenderer(false)).toBeDefined()
  })

  it('composes and settles all three native chart surfaces in the responsive preview', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })

    expect(
      container.querySelector(
        '[data-catalog-preview-composition="premium-kpi-sparklines"]',
      ),
    ).not.toBeNull()
    expect(container.querySelectorAll('[data-premium-kpi]')).toHaveLength(3)
    expect(container.querySelectorAll('svg.ts-chart')).toHaveLength(3)
    expect(handle.driver?.readState()).toMatchObject({ chartCount: 3 })
    expect(container.querySelectorAll('.ts-chart__area')).toHaveLength(2)
    expect(container.querySelectorAll('.ts-chart__line')).toHaveLength(3)
    expect(
      [
        ...container.querySelectorAll<SVGPathElement>('.ts-chart__line path'),
      ].map((path) => path.getAttribute('stroke')),
    ).toEqual([
      'var(--premium-kpi-accent, #6d5dfc)',
      'var(--premium-kpi-accent, #0f91c7)',
      'var(--premium-kpi-accent, #0c9b6c)',
    ])
    container.querySelectorAll('svg.ts-chart').forEach((svg) => {
      svg.setAttribute('data-ts-motion-state', 'finished')
    })
    const settled = handle.driver?.settle?.()
    expect(settled).toBeInstanceOf(Promise)
    await settled

    handle.destroy()
    container.remove()
  })

  it('lets the explicit host color scheme select every paired surface token', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })
    const styles = container.querySelector('style')?.textContent ?? ''

    expect(styles).toContain('color-scheme: inherit')
    expect(styles).toContain(
      '--premium-kpi-canvas: light-dark(#f5f6f8, #09090b)',
    )
    expect(styles).toContain(
      '--premium-kpi-foreground: light-dark(#18181b, #fafafa)',
    )
    expect(styles.match(/light-dark\(/g)).toHaveLength(6)
    expect(styles).not.toContain('prefers-color-scheme')

    handle.destroy()
    container.remove()
  })

  it('scopes resources across multiple mounted KPI grids', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)
    const input = {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    } as const
    const firstHandle = mount(first, input)
    const secondHandle = mount(second, input)
    const ids = [
      ...document.querySelectorAll('linearGradient[id], clipPath[id]'),
    ]
      .filter((element) => first.contains(element) || second.contains(element))
      .map((element) => element.id)

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)

    firstHandle.destroy()
    secondHandle.destroy()
    first.remove()
    second.remove()
  })
})

function flatten(nodes: readonly SceneNode[]): readonly SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
