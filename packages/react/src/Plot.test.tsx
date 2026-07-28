import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { definePlot } from '@plot-poc/observable'
import { Plot } from './Plot'

describe('React Plot', () => {
  it('keeps a stateful surface and ignores shallow-equivalent inline input', async () => {
    const target = document.createElement('div')
    const prepare = vi.fn((input: { value: number }) => input.value)
    const definition = definePlot<{ value: number }, unknown, number>({
      prepare,
      plot: ({ prepared }) => ({
        ariaLabel: `Value ${prepared}`,
        marks: [],
      }),
    })
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <Plot
          definition={definition}
          input={{ value: 1 }}
          sizing={{ height: 240 }}
          initialSize={{ width: 480, height: 240 }}
          ariaLabel="Dynamic plot"
        />,
      )
    })

    const surface = target.querySelector('.ts-plot__surface')
    expect(surface).not.toBeNull()
    expect(prepare).toHaveBeenCalledOnce()

    await act(async () => {
      root.render(
        <Plot
          definition={definition}
          input={{ value: 1 }}
          sizing={{ height: 240 }}
          initialSize={{ width: 480, height: 240 }}
          ariaLabel="Dynamic plot"
        />,
      )
    })

    expect(prepare).toHaveBeenCalledOnce()
    expect(target.querySelector('.ts-plot__surface')).toBe(surface)

    await act(async () => {
      root.render(
        <Plot
          definition={definition}
          input={{ value: 2 }}
          sizing={{ height: 240 }}
          initialSize={{ width: 480, height: 240 }}
          ariaLabel="Dynamic plot"
        />,
      )
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 24))
    })
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(target.querySelector('.ts-plot__surface')).toBe(surface)

    await act(async () => root.unmount())
  })
})
