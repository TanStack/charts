import { lineY } from '@observablehq/plot'
import { describe, expect, it, vi } from 'vitest'
import { createPlotRenderer, definePlot } from './index'
import type {
  ChartRenderContext,
  ResolvedChartTheme,
} from '@plot-poc/host-core'

const theme: ResolvedChartTheme = {
  mode: 'dark',
  background: 'transparent',
  foreground: '#fafafa',
  muted: '#a1a1aa',
  grid: '#3f3f46',
  axis: '#a1a1aa',
  tooltipBackground: '#18181b',
  tooltipForeground: '#fafafa',
  focus: '#60a5fa',
  selection: '#172554',
  positive: '#4ade80',
  negative: '#f87171',
  warning: '#fbbf24',
  neutral: '#a1a1aa',
  categorical: ['#60a5fa'],
}

describe('createPlotRenderer', () => {
  it('lets the host own dimensions and document while preserving Plot options', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]
    const definition = definePlot<typeof data>(() => ({
      width: 1,
      height: 1,
      marks: [lineY(data, { x: 'x', y: 'y' })],
    }))
    const renderer = createPlotRenderer(definition)
    const context: ChartRenderContext<typeof data> = {
      container: document.createElement('div'),
      data,
      document,
      reducedMotion: false,
      signal: new AbortController().signal,
      theme,
      width: 640,
      height: 320,
    }

    const result = renderer(context)
    const svg = result.element

    expect(svg.getAttribute('width')).toBe('640')
    expect(svg.getAttribute('height')).toBe('320')
    expect(svg.classList.contains('ts-plot__plot')).toBe(true)
    expect((svg as HTMLElement).style.color).toBe('rgb(250, 250, 250)')
    expect(
      (svg as HTMLElement).style.getPropertyValue('--plot-background'),
    ).toBe('#18181b')
  })

  it('bridges Plot input values without wrapping Plot interactions', () => {
    const renderer = createPlotRenderer<[], { id: string }>(() => ({
      marks: [],
    }))
    const result = renderer({
      container: document.createElement('div'),
      data: [],
      document,
      reducedMotion: false,
      signal: new AbortController().signal,
      theme,
      width: 400,
      height: 200,
    })
    const listener = vi.fn()
    const unsubscribe = result.subscribeValue?.(listener)
    const plot = result.element as Element & { value?: { id: string } }

    plot.value = { id: 'nearest' }
    plot.dispatchEvent(new Event('input'))
    expect(listener).toHaveBeenCalledWith({ id: 'nearest' })

    unsubscribe?.()
    plot.value = { id: 'ignored' }
    plot.dispatchEvent(new Event('input'))
    expect(listener).toHaveBeenCalledOnce()
  })

  it('memoizes preparation and exposes previous and next plots to transitions', () => {
    type Input = {
      label: string
      values: readonly number[]
    }

    const prepare = vi.fn((input: Input) =>
      input.values.map((value, index) => ({ index, value })),
    )
    const transition = vi.fn()
    const firstValues = [2, 4, 8]
    const definition = definePlot<Input, unknown, ReturnType<typeof prepare>>({
      prepare,
      plot: ({ input, prepared }) => ({
        ariaLabel: input.label,
        marks: [lineY(prepared, { x: 'index', y: 'value' })],
      }),
      transition,
    })
    const renderer = createPlotRenderer(definition)
    const firstInput = { label: 'Dynamic line', values: firstValues }
    const firstContext: ChartRenderContext<Input> = {
      container: document.createElement('div'),
      data: firstInput,
      document,
      reducedMotion: false,
      signal: new AbortController().signal,
      theme,
      width: 640,
      height: 320,
    }
    const result = renderer(firstContext)
    const surface = result.element
    const firstPlot = surface.firstElementChild

    expect(surface.classList.contains('ts-plot__surface')).toBe(true)
    expect(prepare).toHaveBeenCalledOnce()
    expect(
      renderer.inputEqual?.(firstInput, {
        label: 'Dynamic line',
        values: firstValues,
      }),
    ).toBe(true)

    result.update?.(
      {
        ...firstContext,
        width: 480,
        signal: new AbortController().signal,
      },
      { reason: 'resize' },
    )

    expect(prepare).toHaveBeenCalledOnce()
    expect(surface.firstElementChild).not.toBe(firstPlot)
    expect(transition).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previous: firstPlot,
        next: surface.firstElementChild,
        reason: 'resize',
      }),
    )

    const nextValues = [3, 6, 12]
    result.update?.(
      {
        ...firstContext,
        data: { label: 'Updated line', values: nextValues },
        signal: new AbortController().signal,
      },
      { reason: 'update' },
    )

    expect(prepare).toHaveBeenCalledTimes(2)
    expect(prepare).toHaveBeenLastCalledWith({
      label: 'Updated line',
      values: nextValues,
    })
    expect(transition).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'update' }),
    )
  })
})
