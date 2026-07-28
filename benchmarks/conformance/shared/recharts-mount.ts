import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import type { ConformanceInput, ConformanceMount } from '../types'

export function rechartsMount(
  render: (input: ConformanceInput) => ReactNode,
  ariaLabel: string,
): ConformanceMount {
  return (container, input) => {
    const surface = container.ownerDocument.createElement('div')
    container.append(surface)
    const root = createRoot(surface)

    flushSync(() => {
      root.render(render(input))
    })
    applyRechartsAccessibility(surface, ariaLabel)

    return {
      update(nextInput) {
        flushSync(() => {
          root.render(render(nextInput))
        })
        applyRechartsAccessibility(surface, ariaLabel)
      },
      destroy() {
        flushSync(() => {
          root.unmount()
        })
        surface.remove()
      },
    }
  }
}

export function applyRechartsAccessibility(
  surface: HTMLDivElement,
  ariaLabel: string,
) {
  surface.removeAttribute('role')
  surface.removeAttribute('aria-label')
  const svg = surface.querySelector<SVGSVGElement>('svg')
  if (!svg) return
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', ariaLabel)
}
