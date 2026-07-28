import * as Plot from '@observablehq/plot'
import { voronoiColors, voronoiData, voronoiGroups } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'

export const mount: ConformanceMount = (container, input) => {
  let rows = voronoiData(input.revision)
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = voronoiData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Voronoi nearest-point interaction',
      x: { domain: [0, 100], grid: true, label: 'X' },
      y: { domain: [0, 100], grid: true, label: 'Y' },
      color: {
        domain: voronoiGroups,
        range: voronoiGroups.map((group) => voronoiColors[group]),
      },
      marks: [
        Plot.voronoi(rows, {
          x: 'x',
          y: 'y',
          fill: 'group',
          fillOpacity: 0.14,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        Plot.dot(rows, {
          x: 'x',
          y: 'y',
          fill: 'group',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: 'x',
            y: 'y',
            title: (row) => `${row.label} · ${row.group}`,
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
