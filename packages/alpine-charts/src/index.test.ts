import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear } from 'd3-scale'
import { charts } from './index'
import type { ChartOptions } from './index'

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
  const options: ChartOptions<(typeof rows)[number], number, number> = {
    definition,
    ariaLabel: 'Values',
    renderTooltipBody({ points, content, defaultBody, pinned, dismiss }) {
      expectTypeOf(points[0]?.datum.id).toEqualTypeOf<string>()
      expectTypeOf(content).toEqualTypeOf<ChartTooltipContent | string>()
      expectTypeOf(defaultBody).toEqualTypeOf<DocumentFragment>()
      expectTypeOf(pinned).toEqualTypeOf<boolean>()
      expectTypeOf(dismiss).toEqualTypeOf<() => void>()
      return defaultBody
    },
  }
  void options
}

describe('Alpine adapter', () => {
  it('registers a reactive chart directive and cleans it up', () => {
    let directive:
      | ((
          element: HTMLElement,
          value: { expression: string },
          utilities: any,
        ) => void)
      | undefined
    charts({
      directive(_name, callback) {
        directive = callback
      },
    })
    const element = document.createElement('div')
    let options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    }
    let cleanup = () => {}
    let update = () => {}

    directive?.(
      element,
      { expression: 'chartOptions' },
      {
        evaluateLater: () => (receiver: (value: unknown) => void) =>
          receiver(options),
        effect: (callback: () => void) => {
          update = callback
          callback()
        },
        cleanup: (callback: () => void) => {
          cleanup = callback
        },
      },
    )

    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Revenue',
    )
    options = { ...options, ariaLabel: 'Updated revenue' }
    update()
    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Updated revenue',
    )
    cleanup()
    expect(element.childElementCount).toBe(0)
    expect(element.classList.contains('ts-chart-host')).toBe(false)
  })

  it('composes a DOM tooltip body in the core-owned surface', () => {
    let directive:
      | ((
          element: HTMLElement,
          value: { expression: string },
          utilities: any,
        ) => void)
      | undefined
    charts({
      directive(_name, callback) {
        directive = callback
      },
    })
    const element = document.createElement('div')
    const tooltipDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltip,
        content: () => ({
          title: 'January',
          rows: [{ label: 'Revenue', value: '$8', color: '#2563eb' }],
        }),
      },
    })
    let cleanup = () => {}
    let update = () => {}
    let options = {
      definition: tooltipDefinition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      renderTooltipBody: ({
        defaultBody,
        points,
      }: {
        defaultBody: DocumentFragment
        points: readonly { datum: { id: string } }[]
      }) => {
        const body = element.ownerDocument.createElement('div')
        body.dataset.richTooltip = ''
        body.append(defaultBody)
        const point = element.ownerDocument.createElement('span')
        point.dataset.tooltipPoint = ''
        point.textContent = points[0]?.datum.id ?? ''
        body.append(point)
        return body
      },
    }

    directive?.(
      element,
      { expression: 'chartOptions' },
      {
        evaluateLater: () => (receiver: (value: unknown) => void) =>
          receiver(options),
        effect: (callback: () => void) => {
          update = callback
          callback()
        },
        cleanup: (callback: () => void) => {
          cleanup = callback
        },
      },
    )

    const svg = element.querySelector('svg')
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

    const body = element.querySelector('.ts-chart-tooltip__body')
    expect(body?.querySelector('[data-rich-tooltip]')).not.toBeNull()
    expect(body?.querySelector('.ts-chart-tooltip__title')?.textContent).toBe(
      'January',
    )
    expect(body?.querySelector('.ts-chart-tooltip__row')?.textContent).toBe(
      'Revenue$8',
    )
    expect(body?.querySelector('[data-tooltip-point]')?.textContent).toBe('a')
    const richBody = body?.querySelector('[data-rich-tooltip]')

    options = { ...options }
    update()
    expect(body?.querySelector('[data-rich-tooltip]')).toBe(richBody)

    cleanup()
    expect(element.childElementCount).toBe(0)
  })
})
