import * as Plot from '@observablehq/plot'
import { aapl } from '@charts-poc/demo-data/aapl'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'
import { selectPointerTooltipData } from './selection'

export const mount: ConformanceMount = (container, input) => {
  let rows = selectPointerTooltipData(aapl, input.revision)
  let targetDate: string | null = null
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = selectPointerTooltipData(aapl, nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Interactive Apple closing price',
      x: { type: 'utc', label: null },
      y: { grid: true, label: 'Apple close (USD)' },
      marks: [
        Plot.line(rows, {
          x: 'Date',
          y: 'Close',
          stroke: '#2563eb',
        }),
        Plot.dot(rows, {
          x: 'Date',
          y: 'Close',
          fill: '#2563eb',
          r: 3,
        }),
        Plot.tip(
          rows,
          Plot.pointerX({
            x: 'Date',
            y: 'Close',
            title: (row) =>
              `Apple: ${row.Close.toLocaleString('en-US', {
                maximumFractionDigits: 2,
              })}`,
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
      const index = rows.findIndex((row) => dateKey(row.Date) === date)
      const circle =
        index < 0
          ? undefined
          : container.querySelectorAll<SVGCircleElement>(
              '[aria-label="dot"] circle',
            )[index]
      if (!circle) return null
      targetDate = date
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
      const visible = Boolean(
        tooltip &&
        bounds &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        style?.display !== 'none' &&
        style?.visibility !== 'hidden' &&
        style?.opacity !== '0',
      )
      return {
        focus: {
          dates: visible && targetDate ? [targetDate] : [],
        },
        tooltip: {
          visible,
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
