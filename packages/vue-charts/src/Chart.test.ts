import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import type { VNodeChild } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'
import type { ChartTooltipBodySlotContext } from './types'

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
const TemplateDefaultBody = defineComponent({
  props: {
    defaultBody: { type: Function, required: true },
  },
  template: '<component :is="defaultBody" />',
})

describe('Vue adapter', () => {
  it('server-renders complete SVG', async () => {
    const app = createSSRApp({
      render: () =>
        h(Chart, {
          definition,
          width: 480,
          height: 260,
          ariaLabel: 'Revenue',
          className: 'revenue-surface',
        }),
    })
    const html = await renderToString(app)

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('class="ts-chart revenue-surface"')
  })

  it('mounts and cleans up the shared host', async () => {
    const target = document.createElement('div')
    const label = ref('Revenue')
    const app = createSSRApp({
      render: () =>
        h(Chart, {
          definition,
          width: 480,
          height: 260,
          ariaLabel: label.value,
          className: 'revenue-surface',
        }),
    })

    app.mount(target)
    await nextTick()
    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('revenue-surface')).toBe(true)
    label.value = 'Updated revenue'
    await nextTick()
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    app.unmount()
    expect(target.childElementCount).toBe(0)
  })

  it('composes a scoped tooltip body and cleans up nested content', async () => {
    const target = document.createElement('div')
    document.body.append(target)
    const app = createSSRApp({
      render: () =>
        h(
          Chart,
          {
            definition: tooltipDefinition,
            width: 480,
            height: 260,
            ariaLabel: 'Revenue',
          },
          {
            tooltipBody: (
              context: ChartTooltipBodySlotContext<
                (typeof rows)[number],
                number,
                number
              >,
            ) => {
              expectTypeOf(context.points).items.toMatchTypeOf<{
                datum: (typeof rows)[number]
                xValue: number
                yValue: number
              }>()
              expectTypeOf(context.defaultBody).toEqualTypeOf<
                () => VNodeChild
              >()
              expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
              expectTypeOf(context.dismiss).toEqualTypeOf<() => void>()
              return h('div', { 'data-testid': 'rich-tooltip' }, [
                h(TemplateDefaultBody, {
                  defaultBody: context.defaultBody,
                }),
                h(
                  'span',
                  { 'data-testid': 'tooltip-point' },
                  context.points[0]?.datum.id,
                ),
                h(
                  'span',
                  { 'data-testid': 'tooltip-pinned' },
                  String(context.pinned),
                ),
                h(Chart, {
                  definition,
                  width: 120,
                  height: 80,
                  ariaLabel: 'January trend',
                }),
                h(
                  'button',
                  { type: 'button', onClick: context.dismiss },
                  'Close',
                ),
              ])
            },
          },
        ),
    })

    app.mount(target)
    await nextTick()
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
    await nextTick()

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    expect(portal).not.toBeNull()
    expect(target.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).not.toBeNull()
    expect(body?.querySelector('.ts-chart-tooltip__title')?.textContent).toBe(
      'January',
    )
    expect(body?.querySelector('.ts-chart-tooltip__row')?.textContent).toBe(
      'Revenue$2',
    )
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
    await nextTick()

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
    await nextTick()

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="January trend"]')).toBeNull()

    app.unmount()
    await nextTick()
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    target.remove()
  })
})
