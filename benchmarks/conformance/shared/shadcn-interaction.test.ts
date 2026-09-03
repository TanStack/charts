import { act, createElement, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AreaInteractive from '../cases/137-shadcn-area-interactive/example'
import BarInteractive from '../cases/146-shadcn-bar-interactive/example'
import LineInteractive from '../cases/156-shadcn-line-interactive/example'
import PieInteractive from '../cases/164-shadcn-pie-interactive/example'

let matchMediaDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: true })),
  })
})

afterEach(() => {
  if (matchMediaDescriptor) {
    Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
  } else {
    Reflect.deleteProperty(window, 'matchMedia')
  }
})

describe('shadcn interactive chart shells', () => {
  it('filters the interactive area chart from its range control', () => {
    const container = document.createElement('div')
    const handle = mountExample(container, AreaInteractive)
    const select = container.querySelector<HTMLSelectElement>('select')
    const path = () =>
      container
        .querySelector<SVGPathElement>('g.ts-chart__area path')
        ?.getAttribute('d')
    const initialPath = path()

    expect(select?.value).toBe('90d')
    act(() => {
      if (!select) return
      select.value = '7d'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(select?.value).toBe('7d')
    expect(path()).not.toBe(initialPath)
    expect(
      [...container.querySelectorAll('g.ts-chart__axes text')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Jun 23', 'Jun 25', 'Jun 27', 'Jun 29'])

    handle.destroy()
  })

  it.each(['bar', 'line'] as const)(
    'switches the interactive %s chart between desktop and mobile',
    (family) => {
      const container = document.createElement('div')
      const handle = mountExample(
        container,
        family === 'bar' ? BarInteractive : LineInteractive,
      )
      const mobile = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Mobile'),
      )
      const geometry = () =>
        family === 'bar'
          ? container
              .querySelector('g.ts-chart__bar-y rect')
              ?.getAttribute('height')
          : container.querySelector('g.ts-chart__line path')?.getAttribute('d')
      const paint = () =>
        family === 'bar'
          ? container
              .querySelector('g.ts-chart__bar-y rect')
              ?.getAttribute('fill')
          : container
              .querySelector('g.ts-chart__line path')
              ?.getAttribute('stroke')
      const initialGeometry = geometry()
      const initialPaint = paint()

      act(() => mobile?.click())

      expect(mobile?.getAttribute('aria-pressed')).toBe('true')
      expect(geometry()).not.toBe(initialGeometry)
      expect(paint()).not.toBe(initialPaint)

      handle.destroy()
    },
  )

  it('changes the active pie slice, swatch, and center value', () => {
    const container = document.createElement('div')
    const handle = mountExample(container, PieInteractive)
    const select = container.querySelector<HTMLSelectElement>('select')

    expect(select?.options).toHaveLength(5)
    expect(container.querySelector('svg.ts-chart')?.textContent).toContain(
      '186Visitors',
    )
    act(() => {
      if (!select) return
      select.value = 'may'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.querySelector('svg.ts-chart')?.textContent).toContain(
      '209Visitors',
    )
    expect(
      container
        .querySelector('g.ts-chart__arc[data-ts-key="active-month"] path')
        ?.getAttribute('fill'),
    ).toContain('--chart-5')
    expect(
      container.querySelector<HTMLElement>('.sc-select-swatch')?.style
        .background,
    ).toContain('--chart-5')

    handle.destroy()
  })
})

function mountExample(
  container: HTMLElement,
  Example: ComponentType<{ width?: number; height?: number }>,
) {
  const root = createRoot(container)
  act(() => root.render(createElement(Example, { width: 600, height: 500 })))
  return {
    destroy() {
      act(() => root.unmount())
    },
  }
}
