import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { defineChart, dot } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear } from 'd3-scale'
import { Chart } from './tooltip'

const { updates } = vi.hoisted(() => ({ updates: vi.fn() }))
vi.mock('@tanstack/charts/adapter/renderer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/charts/adapter/renderer')>()
  return {
    ...actual,
    createChartRendererAdapter: (
      ...args: Parameters<typeof actual.createChartRendererAdapter>
    ) => {
      const adapter = actual.createChartRendererAdapter(...args)
      const update = adapter.update
      adapter.update = (options) => {
        updates()
        update(options)
      }
      return adapter
    },
  }
})

describe('tooltip state ownership', () => {
  it.each([false, true])(
    'updates only the body and still accepts parent props, strict=%s',
    async (strict) => {
      const definition = defineChart({
        marks: [
          dot(
            [
              { x: 0, y: 1 },
              { x: 1, y: 2 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 3]) },
        },
        tooltip: { use: tooltip },
      })
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      const render = async (prefix: string, enabled = true, width = 480) => {
        const chart = (
          <Chart
            definition={definition}
            width={width}
            height={260}
            ariaLabel={prefix}
            renderTooltipBody={
              enabled
                ? ({ primaryPoint }) => (
                    <span data-body>
                      {prefix}:{primaryPoint?.datum.y}
                    </span>
                  )
                : undefined
            }
          />
        )
        await act(async () =>
          root.render(
            strict ? <React.StrictMode>{chart}</React.StrictMode> : chart,
          ),
        )
      }
      try {
        await render('first')
        const svg = container.querySelector('svg')
        if (!svg) throw new Error('Missing SVG')
        updates.mockClear()
        for (const [key, value] of [
          ['focus', '1'],
          ['ArrowRight', '2'],
          ['ArrowLeft', '1'],
        ]) {
          await act(async () =>
            svg.dispatchEvent(
              key === 'focus'
                ? new FocusEvent('focusin', { bubbles: true })
                : new KeyboardEvent('keydown', { key, bubbles: true }),
            ),
          )
          expect(container.querySelector('[data-body]')?.textContent).toBe(
            'first:' + value,
          )
        }
        expect(updates).not.toHaveBeenCalled()
        await render('second', true, 520)
        expect(updates).toHaveBeenCalled()
        expect(container.querySelector('svg')).toBe(svg)
        expect(svg.getAttribute('aria-label')).toBe('second')
        expect(container.querySelector('[data-body]')?.textContent).toBe(
          'second:1',
        )
        await render('disabled', false)
        expect(container.querySelector('[data-body]')).toBeNull()
        await render('third')
        await act(async () =>
          svg.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
          ),
        )
        expect(container.querySelector('[data-body]')?.textContent).toBe(
          'third:2',
        )
      } finally {
        await act(async () => root.unmount())
        expect(container.childNodes).toHaveLength(0)
        container.remove()
      }
    },
  )

  it('commits the body before the browser paints an interaction', async () => {
    const definition = defineChart({
      marks: [
        dot(
          [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
          ],
          { x: 'x', y: 'y' },
        ),
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 3]) },
      },
      tooltip: { use: tooltip },
    })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const errors = vi.spyOn(console, 'error')
    const render = (width: number) =>
      act(async () =>
        root.render(
          <Chart
            definition={definition}
            width={width}
            height={260}
            ariaLabel="chart"
            renderTooltipBody={({ primaryPoint }) => (
              <span data-body>{primaryPoint?.datum.y}</span>
            )}
          />,
        ),
      )
    try {
      await render(480)
      const svg = container.querySelector('svg')
      if (!svg) throw new Error('Missing SVG')
      await act(async () =>
        svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true })),
      )
      expect(container.querySelector('[data-body]')?.textContent).toBe('1')
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
      try {
        svg.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        )
      } finally {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
      }
      expect(container.querySelector('[data-body]')?.textContent).toBe('2')
      await render(520)
      expect(container.querySelector('[data-body]')?.textContent).toBe('2')
    } finally {
      try {
        await act(async () => root.unmount())
        expect(errors).not.toHaveBeenCalled()
      } finally {
        errors.mockRestore()
        container.remove()
      }
    }
  })

  it.each(['layout', 'passive'])(
    'accepts a dismissal from the body %s effect',
    async (phase) => {
      const definition = defineChart({
        marks: [
          dot(
            [
              { x: 0, y: 1 },
              { x: 1, y: 2 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 3]) },
        },
        tooltip: { use: tooltip },
      })
      const useEffect =
        phase === 'layout' ? React.useLayoutEffect : React.useEffect
      function Body({ y, dismiss }: { y: unknown; dismiss: () => void }) {
        useEffect(() => {
          if (y === 2) dismiss()
        }, [y, dismiss])
        return <span data-body>{String(y)}</span>
      }
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      const errors = vi.spyOn(console, 'error')
      try {
        await act(async () =>
          root.render(
            <Chart
              definition={definition}
              width={480}
              height={260}
              ariaLabel="chart"
              renderTooltipBody={({ primaryPoint, dismiss }) => (
                <Body y={primaryPoint?.datum.y} dismiss={dismiss} />
              )}
            />,
          ),
        )
        const svg = container.querySelector('svg')
        if (!svg) throw new Error('Missing SVG')
        await act(async () =>
          svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true })),
        )
        expect(container.querySelector('[data-body]')?.textContent).toBe('1')
        await act(async () =>
          svg.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
          ),
        )
        expect(container.querySelector('[data-body]')).toBeNull()
      } finally {
        try {
          await act(async () => root.unmount())
          expect(errors).not.toHaveBeenCalled()
        } finally {
          errors.mockRestore()
          container.remove()
        }
      }
    },
  )
})
