/** @jsxImportSource @solidjs/web */
import { resolve } from 'node:path'
import { hydrate, render } from '@solidjs/web'
import { createSignal, flush } from 'solid-js'
import { createServer } from 'vite'
import type { Element } from 'solid-js'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal as tooltipPortal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'
import {
  loadSolid2VitePlugin,
  solid2CompatRoot,
  solid2RuntimeResolver,
  solid2SourceRoot,
} from '../../../../scripts/solid-2-compat.mjs'

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
  const typedTooltipBody = (
    <Chart
      definition={definition}
      ariaLabel="Typed tooltip"
      renderTooltipBody={(context) => {
        expectTypeOf(context.points).items.toMatchTypeOf<{
          datum: (typeof rows)[number]
          xValue: number
          yValue: number
        }>()
        expectTypeOf(context.content).toEqualTypeOf<
          ChartTooltipContent | string
        >()
        expectTypeOf(context.defaultBody).toEqualTypeOf<Element>()
        expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
        expectTypeOf(context.dismiss).toEqualTypeOf<() => void>()
        return context.defaultBody
      }}
    />
  )
  void typedTooltipBody
}

describe('Solid 2 adapter', () => {
  it('hydrates server markup in place and cleans up after updates', async () => {
    const solid = await loadSolid2VitePlugin()
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      root: solid2CompatRoot,
      plugins: [solid2RuntimeResolver(), solid({ ssr: true })],
      server: { middlewareMode: true },
      ssr: { noExternal: ['@tanstack/charts', 'solid-js', '@solidjs/web'] },
    })
    const target = document.createElement('div')
    document.body.append(target)
    const globalHydration = Object.getOwnPropertyDescriptor(globalThis, '_$HY')
    const windowHydration = Object.getOwnPropertyDescriptor(window, '_$HY')
    try {
      const { Chart: ServerChart } = await server.ssrLoadModule(
        resolve(solid2SourceRoot, 'Chart.tsx'),
      )
      const { renderToString, generateHydrationScript } =
        await server.ssrLoadModule('@solidjs/web')
      const { createComponent } = await server.ssrLoadModule('solid-js')
      target.innerHTML = renderToString(() =>
        createComponent(ServerChart, {
          definition,
          width: 480,
          height: 260,
          ariaLabel: 'Revenue',
        }),
      )
      const svg = target.querySelector('svg')
      const line = target.querySelector('.ts-chart__line')
      expect(svg).not.toBeNull()
      expect(line).not.toBeNull()
      const script = document.createElement('div')
      script.innerHTML = generateHydrationScript({ eventNames: [] })
      const bootstrap = script.querySelector('script')?.textContent
      if (!bootstrap) throw new Error('Expected Solid hydration bootstrap')
      new Function(bootstrap)()
      let setLabel!: (label: string) => void
      const dispose = hydrate(() => {
        const [label, set] = createSignal('Revenue')
        setLabel = set
        return (
          <Chart
            definition={definition}
            width={480}
            height={260}
            ariaLabel={label()}
          />
        )
      }, target)
      try {
        expect(target.querySelector('svg')).toBe(svg)
        expect(target.querySelector('.ts-chart__line')).toBe(line)
        setLabel('Updated revenue')
        flush()
        expect(target.querySelector('svg')).toBe(svg)
        expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
      } finally {
        dispose()
      }
      expect(target.childElementCount).toBe(0)
    } finally {
      target.remove()
      // Solid 2 clears its hydration event queue through _$HY on the next
      // delegated event, so a bootstrap-created _$HY stays for later tests.
      if (globalHydration)
        Object.defineProperty(globalThis, '_$HY', globalHydration)
      if (windowHydration)
        Object.defineProperty(window, '_$HY', windowHydration)
      await server.close()
    }
  })

  it('mounts and cleans up the shared host', () => {
    const target = document.createElement('div')
    let setLabel!: (label: string) => void
    const dispose = render(() => {
      const [label, set] = createSignal('Revenue')
      setLabel = set
      return (
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel={label()}
        />
      )
    }, target)

    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    setLabel('Updated revenue')
    flush()
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    dispose()
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
    const dispose = render(
      () => (
        <Chart
          definition={tooltipDefinition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          renderTooltipBody={(context) => (
            <div data-testid="rich-tooltip">
              {context.defaultBody}
              <span data-testid="tooltip-point">
                {context.points[0]?.datum.id}
              </span>
              <span data-testid="tooltip-pinned">{String(context.pinned)}</span>
              <Chart
                definition={definition}
                width={120}
                height={80}
                ariaLabel="Nested trend"
              />
              <button type="button" onClick={context.dismiss}>
                Close
              </button>
            </div>
          )}
        />
      ),
      target,
    )

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
    flush()

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

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    flush()

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

    body
      ?.querySelector<HTMLButtonElement>('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flush()

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBeNull()

    dispose()
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    target.remove()
  })
})
