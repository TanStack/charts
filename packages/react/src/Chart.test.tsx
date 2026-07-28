import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from './Chart'
import type { ChartRenderer } from '@plot-poc/host-core'

describe('React Chart', () => {
  it('server-renders a stable, labeled host without running the renderer', () => {
    const renderer = vi.fn()
    const html = renderToString(
      <Chart
        data={[]}
        renderer={renderer}
        sizing={{ height: 280 }}
        initialSize={{ width: 640, height: 280 }}
        ariaLabel="Server chart"
      />,
    )

    expect(html).toContain('class="ts-plot"')
    expect(html).toContain('aria-label="Server chart"')
    expect(html).toContain('min-height:280px')
    expect(renderer).not.toHaveBeenCalled()
  })

  it('mounts through the shared controller and cleans up in Strict Mode', async () => {
    const target = document.createElement('div')
    const destroy = vi.fn()
    const renderer: ChartRenderer<string[]> = vi.fn(() => ({
      element: document.createElement('svg'),
      destroy,
    }))
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <React.StrictMode>
          <Chart
            data={['one']}
            renderer={renderer}
            sizing={{ height: 240 }}
            initialSize={{ width: 480, height: 240 }}
            ariaLabel="Client chart"
          />
        </React.StrictMode>,
      )
    })

    expect(target.querySelectorAll('.ts-plot')).toHaveLength(1)
    expect(target.querySelectorAll('svg')).toHaveLength(1)
    expect(renderer).toHaveBeenCalled()

    await act(async () => root.unmount())
    expect(destroy).toHaveBeenCalled()
    expect(target.childElementCount).toBe(0)
  })
})
