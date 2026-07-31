/** @jsxImportSource preact */
import { render } from 'preact'
import type { ComponentChildren } from 'preact'
import renderToString from 'preact-render-to-string'
import { act } from 'preact/test-utils'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal as tooltipPortal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

if (false) {
  const typedTooltipBody = (
    <Chart
      definition={definition}
      ariaLabel="Typed tooltip"
      renderTooltipBody={({
        points,
        content,
        defaultBody,
        pinned,
        dismiss,
      }) => {
        expectTypeOf(points).items.toMatchTypeOf<{
          datum: (typeof rows)[number]
          xValue: number
          yValue: number
        }>()
        expectTypeOf(content).toEqualTypeOf<ChartTooltipContent | string>()
        expectTypeOf(defaultBody).toEqualTypeOf<ComponentChildren>()
        expectTypeOf(pinned).toEqualTypeOf<boolean>()
        expectTypeOf(dismiss).toEqualTypeOf<() => void>()
        return defaultBody
      }}
    />
  )
  void typedTooltipBody
}

describe('Preact adapter', () => {
  it('server-renders complete SVG', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
    )

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Revenue"')
  })

  it('mounts and cleans up the shared host', () => {
    const target = document.createElement('div')
    render(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
      target,
    )

    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    render(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Updated revenue"
      />,
      target,
    )
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    render(null, target)
    expect(target.childElementCount).toBe(0)
  })

  it('composes and cleans up a pinned tooltip body', () => {
    const tooltipDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltip,
        portal: tooltipPortal,
        content: () => ({
          title: 'First',
          color: '#2563eb',
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
    const target = document.createElement('div')
    document.body.append(target)

    act(() => {
      render(
        <Chart
          definition={tooltipDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
            <div data-testid="rich-tooltip">
              {defaultBody}
              <span data-testid="tooltip-point">{points[0]?.datum.id}</span>
              <span data-testid="tooltip-pinned">{String(pinned)}</span>
              <Chart
                definition={definition}
                width={120}
                height={80}
                ariaLabel="Nested trend"
              />
              <button type="button" onClick={dismiss}>
                Close
              </button>
            </div>
          )}
        />,
        target,
      )
    })

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

    act(() => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    expect(portal).not.toBeNull()
    expect(target.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('.ts-chart-tooltip__title')?.textContent).toBe(
      'First',
    )
    expect(body?.querySelector('.ts-chart-tooltip__row')?.textContent).toBe(
      'Value2',
    )
    expect(
      body?.querySelector('[data-testid="tooltip-point"]')?.textContent,
    ).toBe('a')
    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('false')
    const nestedSvg = body?.querySelector('svg[aria-label="Nested trend"]')
    expect(nestedSvg).not.toBeNull()
    expect(body?.hasAttribute('inert')).toBe(true)
    expect(portal?.getAttribute('role')).toBe('status')

    act(() => {
      svg.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('true')
    expect(portal?.dataset.sticky).toBe('true')
    expect(body?.hasAttribute('inert')).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(portal?.querySelector('.ts-chart-tooltip__body')).toBe(body)
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBe(
      nestedSvg,
    )

    act(() => {
      body
        ?.querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBeNull()

    act(() => render(null, target))
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    target.remove()
  })
})
