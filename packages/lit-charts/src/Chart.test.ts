import { html } from 'lit'
import type { TemplateResult } from 'lit'
import { describe, expect, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal as tooltipPortal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from 'd3-scale'
import { Chart } from './index'
import type { ChartProps } from './index'

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

if (false) {
  const typedOptions: ChartProps<(typeof rows)[number], number, number> = {
    definition,
    ariaLabel: 'Typed tooltip',
    renderTooltipBody: ({ points, content, defaultBody, pinned, dismiss }) => {
      expectTypeOf(points).items.toMatchTypeOf<{
        datum: (typeof rows)[number]
        xValue: number
        yValue: number
      }>()
      expectTypeOf(content).toEqualTypeOf<ChartTooltipContent | string>()
      expectTypeOf(defaultBody).toEqualTypeOf<TemplateResult>()
      expectTypeOf(pinned).toEqualTypeOf<boolean>()
      expectTypeOf(dismiss).toEqualTypeOf<() => void>()
      return defaultBody
    },
  }
  void typedOptions
}

describe('Lit adapter', () => {
  it('mounts, updates, and reconnects the shared host', async () => {
    const tagName = `tanstack-chart-test-${Math.random().toString(36).slice(2)}`
    customElements.define(tagName, class extends Chart {})
    const chart = document.createElement(tagName) as Chart<
      (typeof rows)[number]
    >
    chart.options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    }

    document.body.append(chart)
    await chart.updateComplete
    expect(chart.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Revenue',
    )

    chart.options = { ...chart.options, ariaLabel: 'Updated revenue' }
    await chart.updateComplete
    expect(chart.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Updated revenue',
    )

    chart.remove()
    document.body.append(chart)
    await chart.updateComplete
    expect(chart.querySelector('svg')).not.toBeNull()
    chart.remove()
  })

  it('composes and cleans up a pinned tooltip body', async () => {
    const tooltipDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        content: () => ({
          title: 'First',
          color: 'red;position:fixed;inset:0',
          rows: [
            {
              label: 'Value',
              value: '2',
              color: '#2563eb',
            },
          ],
        }),
      },
    })
    let nestedDisconnects = 0
    const nestedTag = `tanstack-chart-tooltip-nested-${Math.random()
      .toString(36)
      .slice(2)}`
    customElements.define(
      nestedTag,
      class extends Chart {
        disconnectedCallback() {
          nestedDisconnects += 1
          super.disconnectedCallback()
        }
      },
    )
    const outerTag = `tanstack-chart-tooltip-${Math.random()
      .toString(36)
      .slice(2)}`
    customElements.define(outerTag, class extends Chart {})
    const chart = document.createElement(outerTag) as Chart<
      (typeof rows)[number]
    >
    const nestedOptions: ChartProps<(typeof rows)[number]> = {
      definition,
      width: 120,
      height: 80,
      ariaLabel: 'Nested trend',
    }
    const nestedChart = document.createElement(nestedTag) as Chart<
      (typeof rows)[number]
    >
    nestedChart.options = nestedOptions
    chart.options = {
      definition: tooltipDefinition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      renderTooltipBody: ({ points, defaultBody, pinned, dismiss }) => {
        return html`
          <div data-testid="rich-tooltip">
            ${defaultBody}
            <span data-testid="tooltip-point">${points[0]?.datum.id}</span>
            <span data-testid="tooltip-pinned">${String(pinned)}</span>
            ${nestedChart}
            <button type="button" @click=${dismiss}>Close</button>
          </div>
        `
      },
    }

    document.body.append(chart)
    await chart.updateComplete
    const svg = chart.querySelector('svg')
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

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    const nested = body?.querySelector<Chart>(nestedTag)
    await nested?.updateComplete
    expect(portal).not.toBeNull()
    expect(chart.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(
      body?.querySelector('.ts-chart-tooltip__title')?.textContent?.trim(),
    ).toBe('First')
    expect(
      body
        ?.querySelector('.ts-chart-tooltip__row')
        ?.textContent?.replaceAll(/\s/g, ''),
    ).toBe('Value2')
    const swatches = body?.querySelectorAll<HTMLElement>(
      '.ts-chart-tooltip__swatch',
    )
    expect(swatches?.[0]?.style.position).toBe('')
    expect(swatches?.[0]?.style.inset).toBe('')
    expect(swatches?.[1]?.style.background).toBe('rgb(37, 99, 235)')
    expect(
      body?.querySelector('[data-testid="tooltip-point"]')?.textContent,
    ).toBe('a')
    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('false')
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).not.toBeNull()
    expect(body?.hasAttribute('inert')).toBe(true)
    expect(portal?.getAttribute('role')).toBe('status')

    const customBody = body?.querySelector('[data-testid="rich-tooltip"]')
    chart.options = { ...chart.options, ariaLabel: 'Updated revenue' }
    await chart.updateComplete
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBe(customBody)
    expect(body?.querySelector(nestedTag)).toBe(nestedChart)

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )

    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('true')
    expect(portal?.dataset.sticky).toBe('true')
    expect(body?.hasAttribute('inert')).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(portal?.querySelector('.ts-chart-tooltip__body')).toBe(body)

    body
      ?.querySelector<HTMLButtonElement>('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBeNull()
    expect(nestedDisconnects).toBe(1)

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    await nestedChart.updateComplete
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).not.toBeNull()

    chart.remove()
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    expect(nestedDisconnects).toBe(2)

    document.body.append(chart)
    await chart.updateComplete
    const reconnectedSvg = chart.querySelector('svg')
    if (!reconnectedSvg) throw new Error('Expected a reconnected SVG chart')
    vi.spyOn(reconnectedSvg, 'getBoundingClientRect').mockReturnValue({
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
    reconnectedSvg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    await nestedChart.updateComplete
    expect(
      document.querySelector(
        '[data-ts-chart-tooltip-portal] svg[aria-label="Nested trend"]',
      ),
    ).not.toBeNull()

    chart.remove()
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    expect(nestedDisconnects).toBe(3)
  })
})
