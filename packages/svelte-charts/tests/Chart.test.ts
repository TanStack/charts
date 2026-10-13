import { hydrate, mount, tick, unmount } from 'svelte'
import { createServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Snippet } from 'svelte'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import {
  Chart,
  type ChartTooltipBodySnippetContext,
} from '@tanstack/charts/svelte'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from 'd3-scale'
import TooltipBodyFixture from './TooltipBodyFixture.svelte'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  scales: {
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  },
})
const tooltipDefinition = defineChart(definition, {
  maxFocusDistance: 1_000,
  tooltip: {
    use: tooltip,
    portal,
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
  it('hydrates server markup without replacing chart nodes', async () => {
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      plugins: [svelte({ configFile: false })],
      server: { middlewareMode: true },
      ssr: { noExternal: ['@tanstack/charts', 'svelte'] },
    })
    const props = { definition, width: 480, height: 260, ariaLabel: 'Revenue' }
    const target = document.createElement('div')
    document.body.append(target)
    try {
      const { default: ServerChart } = await server.ssrLoadModule(
        '/packages/svelte-charts/src/Chart.svelte',
      )
      const { render } = await server.ssrLoadModule('svelte/server')
      target.innerHTML = render(ServerChart, { props }).body
      const svg = target.querySelector('svg')
      const line = target.querySelector('.ts-chart__line')
      expect(svg).not.toBeNull()
      expect(line).not.toBeNull()
      const warnings = vi.spyOn(console, 'warn')
      let component: ReturnType<typeof hydrate> | undefined
      try {
        component = hydrate(Chart, { target, props, recover: false })
        await tick()
        expect(target.querySelector('svg')).toBe(svg)
        expect(target.querySelector('.ts-chart__line')).toBe(line)
        expect(warnings).not.toHaveBeenCalled()
      } finally {
        if (component) await unmount(component)
        warnings.mockRestore()
      }
      expect(target.childElementCount).toBe(0)
    } finally {
      target.remove()
      await server.close()
    }
  })

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
