import * as Plot from '@observablehq/plot'
import { timeDomain, timeSeries } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'

export const mount: ConformanceMount = (container, input) => {
  let rows = timeSeries(input.revision).filter((row) => row.series === 'Atlas')
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = timeSeries(nextInput.revision).filter(
      (row) => row.series === 'Atlas',
    )
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Interactive Atlas trend',
      x: { type: 'utc', domain: timeDomain, label: null },
      y: { domain: [10, 60], grid: true, label: 'Value' },
      marks: [
        Plot.line(rows, {
          x: 'date',
          y: 'value',
          stroke: '#2563eb',
        }),
        Plot.dot(rows, {
          x: 'date',
          y: 'value',
          fill: '#2563eb',
          r: 3,
        }),
        Plot.tip(
          rows,
          Plot.pointerX({
            x: 'date',
            y: 'value',
            title: (row) => `Atlas: ${row.value.toLocaleString()}`,
          }),
        ),
      ],
    })
  })

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const id = target.anchor.startsWith('point:')
        ? target.anchor.slice('point:'.length)
        : null
      const index = rows.findIndex((row) => row.id === id)
      const circle =
        index < 0
          ? undefined
          : container.querySelectorAll<SVGCircleElement>(
              '[aria-label="dot"] circle',
            )[index]
      if (!circle) return null
      const bounds = circle.getBoundingClientRect()
      const svg = container.querySelector('svg')
      const resolved = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      }
      return svg ? { ...resolved, focusElement: svg } : resolved
    },
    readState() {
      const tooltip = container.querySelector('[aria-label="tip"]')
      const bounds = tooltip?.getBoundingClientRect()
      const style =
        tooltip &&
        container.ownerDocument.defaultView?.getComputedStyle(tooltip)
      return {
        tooltip: {
          visible: Boolean(
            tooltip &&
            bounds &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            style?.display !== 'none' &&
            style?.visibility !== 'hidden' &&
            style?.opacity !== '0',
          ),
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
  }

  return { ...handle, driver }
}
