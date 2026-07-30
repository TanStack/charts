import { mount, tick, unmount } from 'svelte'
import type { Snippet } from 'svelte'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import Chart from '../src/Chart.svelte'
import type { ChartTooltipBodySnippetContext } from '../src/types'
import TooltipBodyFixture from './TooltipBodyFixture.svelte'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const tooltipDefinition = defineChart(definition, {
  maxFocusDistance: 1_000,
  tooltip: {
    portal: true,
    content: () => ({
      title: 'January',
      color: '#2563eb',
      rows: [
        {
          label: 'Revenue',
          value: '$2',
          color: '#2563eb',
        },
      ],
    }),
  },
})

describe('Svelte adapter', () => {
  it('exposes the native snippet context', () => {
    type Context = ChartTooltipBodySnippetContext<
      (typeof rows)[number],
      number,
      number
    >

    expectTypeOf<Context['points'][number]>().toMatchTypeOf<{
      datum: (typeof rows)[number]
      xValue: number
      yValue: number
    }>()
    expectTypeOf<Context['content']>().toEqualTypeOf<
      ChartTooltipContent | string
    >()
    expectTypeOf<Context['defaultBody']>().toEqualTypeOf<Snippet>()
    expectTypeOf<Context['pinned']>().toEqualTypeOf<boolean>()
    expectTypeOf<Context['dismiss']>().toEqualTypeOf<() => void>()
  })

  it('mounts and cleans up the shared host', async () => {
    const target = document.createElement('div')
    const component = mount(Chart, {
      target,
      props: {
        definition,
        width: 480,
        height: 260,
        ariaLabel: 'Revenue',
      },
    })

    await tick()
    expect(target.querySelector('svg')).not.toBeNull()
    await unmount(component)
    expect(target.childElementCount).toBe(0)
  })

  it('composes a snippet tooltip body and cleans up nested content', async () => {
    const target = document.createElement('div')
    document.body.append(target)
    const component = mount(TooltipBodyFixture, {
      target,
      props: {
        definition: tooltipDefinition,
        nestedDefinition: definition,
      },
    })

    await tick()
    const svg = target.querySelector('svg')
    if (!svg) throw new Error('Expected an SVG chart')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    await tick()

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    expect(portal).not.toBeNull()
    expect(target.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).not.toBeNull()
    expect(
      body?.querySelector('.ts-chart-tooltip__title')?.textContent?.trim(),
    ).toBe('January')
    expect(
      [...(body?.querySelectorAll('.ts-chart-tooltip__row > span') ?? [])].map(
        (element) => element.textContent?.trim(),
      ),
    ).toEqual(['', 'Revenue', '$2'])
    expect(
      body?.querySelector('[data-testid="tooltip-point"]')?.textContent,
    ).toBe('a')
    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('false')
    const nestedSvg = body?.querySelector('svg[aria-label="January trend"]')
    expect(nestedSvg).not.toBeNull()
    expect(body?.hasAttribute('inert')).toBe(true)

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    await tick()

    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('true')
    expect(body?.hasAttribute('inert')).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(portal?.querySelector('.ts-chart-tooltip__body')).toBe(body)
    expect(body?.querySelector('svg[aria-label="January trend"]')).toBe(
      nestedSvg,
    )

    body
      ?.querySelector<HTMLButtonElement>('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="January trend"]')).toBeNull()

    await unmount(component)
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    expect(target.childElementCount).toBe(0)
    target.remove()
  })
})
