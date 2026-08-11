import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { themedInteractiveAreaDefinition } from './chart'
import { themedAreaRows } from './model'
import { catalogCase, mount } from './tanstack'
import type { ConformanceInput } from '../../types'

describe('themed interactive area', () => {
  it('keeps overlapping date identities stable across every range', () => {
    const seven = themedAreaRows('7d')
    const thirty = themedAreaRows('30d')
    const ninety = themedAreaRows('90d')

    expect(seven.map(({ id }) => id)).toEqual(
      thirty.slice(-7).map(({ id }) => id),
    )
    expect(thirty.map(({ id }) => id)).toEqual(
      ninety.slice(-30).map(({ id }) => id),
    )
    expect(seven.at(-1)?.id).toBe('2026-06-30')
  })

  it('owns its gradient, smooth geometry, sparse guides, and focus cursor', () => {
    const rows = themedAreaRows('30d')
    const definition = themedInteractiveAreaDefinition(rows, {
      width: 288,
      height: 192,
      preview: true,
    })
    const scene = createChartRuntime<
      (typeof rows)[number],
      Date,
      number
    >().render(definition, { width: 288, height: 192 })

    expect(definition.gradients).toEqual([
      expect.objectContaining({
        id: 'themed-area-fill',
        stops: expect.arrayContaining([
          expect.objectContaining({ offset: 0, opacity: 0.34 }),
          expect.objectContaining({ offset: 1, opacity: 0.015 }),
        ]),
      }),
    ])
    expect(definition.motion).toMatchObject({
      transition: { type: 'spring', stiffness: 190, damping: 24 },
    })
    expect(definition.x?.axis).toMatchObject({
      line: false,
      ticks: { values: expect.any(Array), size: 0 },
    })
    expect(definition.x?.axis).toMatchObject({
      ticks: { values: expect.objectContaining({ length: 3 }) },
    })
    expect(definition.y?.axis).toMatchObject({
      line: false,
      ticks: { values: expect.arrayContaining([0]), size: 0 },
      tickLabels: false,
    })
    expect(scene.points).toHaveLength(rows.length)
    expect(
      scene.points.every(({ markId }) => markId === 'visitor-points'),
    ).toBe(true)
    expect(scene.focusGuides).toHaveLength(1)
    expect(scene.chart.width).toBeGreaterThan(240)
    expect(scene.chart.height).toBeGreaterThan(130)
  })

  it('renders a focused, legible 288 by 192 catalog preview', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = catalogCase.mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      interactive: false,
      preview: true,
    })

    expect(
      container.querySelector('linearGradient[id*="themed-area-fill"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-ts-key="visitor-crosshair:x-rule"]'),
    ).not.toBeNull()
    const points = [
      ...container.querySelectorAll<SVGCircleElement>('.ts-chart__dot circle'),
    ]
    expect(points).toHaveLength(30)
    expect(
      points.every((point) => point.getAttribute('fill-opacity') === '0'),
    ).toBe(true)
    expect(container.querySelectorAll('.ts-chart__grid line')).toHaveLength(4)
    expect(
      container.querySelectorAll('.ts-chart__axes text').length,
    ).toBeLessThanOrEqual(3)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 288 192',
    )

    handle.destroy()
    container.remove()
  })

  it('updates the card range without replacing its chart or controls', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const input = {
      width: 640,
      height: 380,
      revision: 0,
      interactive: true,
    } satisfies ConformanceInput
    const handle = mount(container, input)
    const svg = container.querySelector('svg.ts-chart')
    const seven = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Last 7 days"]',
    )
    const ninety = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Last 90 days"]',
    )
    const card = container.querySelector<HTMLElement>('.themed-area-card')
    svg?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!seven || !ninety || !card || !tooltip || !handle.driver) {
      throw new Error(
        'Expected card, tooltip, controls, and conformance driver',
      )
    }

    expect(
      getComputedStyle(card).getPropertyValue('--ts-chart-tooltip-background'),
    ).toContain('var(--themed-area-surface)')
    const styles = card.querySelector('style')?.textContent ?? ''
    expect(styles).toContain('light-dark(#ffffff, #09090b)')
    expect(styles).toContain('[data-theme="dark"]')
    expect(styles).not.toContain('color-scheme: light dark')
    expect(tooltip.style.background).toBe(
      'var(--ts-chart-tooltip-background, Canvas)',
    )
    expect(tooltip.style.borderRadius).toBe(
      'var(--ts-chart-tooltip-border-radius, 0.45rem)',
    )

    seven.click()
    expect(handle.driver.readState()).toMatchObject({
      range: '7d',
      rowCount: 7,
      firstId: '2026-06-24',
      lastId: '2026-06-30',
    })
    expect(seven.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('svg.ts-chart')).toBe(svg)

    ninety.click()
    expect(handle.driver.readState()).toMatchObject({
      range: '90d',
      rowCount: 90,
      firstId: '2026-04-02',
      lastId: '2026-06-30',
    })
    expect(ninety.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('svg.ts-chart')).toBe(svg)
    expect(container.querySelector('.themed-area-card')).not.toBeNull()

    handle.destroy()
    expect(container.querySelector('.themed-area-card')).toBeNull()
    container.remove()
  })

  it('scopes gradient resources per vanilla chart mount', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    first.style.setProperty('--chart-accent', '#2563eb')
    second.style.setProperty('--chart-accent', '#f97316')
    document.body.append(first, second)
    const input = {
      width: 640,
      height: 380,
      revision: 0,
      interactive: true,
    } satisfies ConformanceInput
    const firstHandle = mount(first, input)
    const secondHandle = mount(second, input)

    try {
      const firstGradient = first.querySelector('linearGradient')
      const secondGradient = second.querySelector('linearGradient')
      const firstArea = first.querySelector<SVGPathElement>(
        '.ts-chart__area path',
      )
      const secondArea = second.querySelector<SVGPathElement>(
        '.ts-chart__area path',
      )
      const firstId = firstGradient?.id
      const secondId = secondGradient?.id

      expect(firstId).toMatch(/^themed-area-\d+-themed-area-fill$/u)
      expect(secondId).toMatch(/^themed-area-\d+-themed-area-fill$/u)
      expect(secondId).not.toBe(firstId)
      expect(firstArea?.getAttribute('fill')).toBe(`url(#${firstId})`)
      expect(secondArea?.getAttribute('fill')).toBe(`url(#${secondId})`)
      expect(
        getComputedStyle(
          first.querySelector('.themed-area-card')!,
        ).getPropertyValue('--themed-area-accent'),
      ).toContain('var(--chart-accent')
      expect(
        getComputedStyle(
          second.querySelector('.themed-area-card')!,
        ).getPropertyValue('--themed-area-accent'),
      ).toContain('var(--chart-accent')
    } finally {
      firstHandle.destroy()
      secondHandle.destroy()
      first.remove()
      second.remove()
    }
  })

  it('snaps range updates when reduced motion is requested', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }),
    })
    const container = document.createElement('div')
    document.body.append(container)
    let handle: ReturnType<typeof mount> | undefined

    try {
      handle = mount(container, {
        width: 640,
        height: 380,
        revision: 0,
        interactive: true,
      })
      const seven = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Last 7 days"]',
      )
      if (!seven || !handle.driver) {
        throw new Error('Expected range control and conformance driver')
      }

      seven.click()
      expect(handle.driver.readState()).toMatchObject({
        range: '7d',
        rowCount: 7,
        motionState: null,
      })
    } finally {
      handle?.destroy()
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      })
      container.remove()
    }
  })
})
