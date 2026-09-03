import * as Plot from '@observablehq/plot'
import { industries } from '@tanstack/charts-data/industries'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'
import { industryNames, selectGroupedTooltipData } from './selection'

const colors = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) => {
  let rows = selectGroupedTooltipData(industries, input.revision)
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = selectGroupedTooltipData(industries, nextInput.revision)
    const tooltipRows = rows.filter((row) => row.industry === industryNames[0])
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Grouped industry unemployment tooltip',
      x: { type: 'utc', label: null },
      y: { grid: true, label: 'Unemployed (thousands)' },
      color: { domain: industryNames, range: colors },
      marks: [
        Plot.line(rows, {
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          stroke: 'industry',
        }),
        Plot.dot(rows, {
          x: 'date',
          y: 'unemployed',
          fill: 'industry',
          r: 2.5,
        }),
        Plot.tip(
          tooltipRows,
          Plot.pointerX({
            x: 'date',
            y: 'unemployed',
            title: (row) => {
              const atDate = rows.filter(
                (candidate) => candidate.date.getTime() === row.date.getTime(),
              )
              return industryNames
                .map((industry) => {
                  const observation = atDate.find(
                    (candidate) => candidate.industry === industry,
                  )
                  return `${industry}: ${(observation?.unemployed ?? 0).toLocaleString()}`
                })
                .join('\n')
            },
            maxRadius: Number.POSITIVE_INFINITY,
          }),
        ),
      ],
    })
  })

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const date = target.anchor.startsWith('date:')
        ? target.anchor.slice('date:'.length)
        : null
      const index = rows.findIndex(
        (row) =>
          dateKey(row.date) === date && row.industry === industryNames[0],
      )
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

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
