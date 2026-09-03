import { cars } from '@tanstack/charts-data/cars'
import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'

const colors = ['#2563eb', '#0d9488', '#d97706']

export const mount: ConformanceMount = (container, input) => {
  let rows = completeCars(input.revision)
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = completeCars(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Voronoi nearest-point interaction',
      x: { grid: true, label: 'Weight (lb)' },
      y: { grid: true, label: 'Fuel economy (mpg)' },
      color: {
        range: colors,
      },
      marks: [
        Plot.voronoi(rows, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          fill: cylinderLabel,
          fillOpacity: 0.14,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        Plot.dot(rows, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          fill: cylinderLabel,
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: 'weight (lb)',
            y: 'economy (mpg)',
            title: (row) => `${row.name} · ${cylinderLabel(row)}`,
          }),
        ),
      ],
    })
  })

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const key = target.anchor.startsWith('car:')
        ? target.anchor.slice('car:'.length)
        : ''
      const index = rows.findIndex((row) => carKey(row) === key)
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

function completeCars(revision: number) {
  return cars
    .filter((row) => row['economy (mpg)'] !== null)
    .slice(revision * 3, revision * 3 + 18)
}

function cylinderLabel(row: (typeof cars)[number]): string {
  return `${row.cylinders} cylinders`
}

function carKey(row: (typeof cars)[number]): string {
  return `${row.name}:${row.year}:${row['weight (lb)']}`
}
