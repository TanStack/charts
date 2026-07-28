import * as Plot from '@observablehq/plot'
import { timeDomain, timeSeries } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'

const series = [
  'Atlas',
  'Beacon',
  'Comet',
] satisfies readonly TimePoint['series'][]
const colors = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) => {
  let rows = timeSeries(input.revision)
  const handle = mountObservablePlot(container, input, (nextInput) => {
    rows = timeSeries(nextInput.revision)
    const tooltipRows = rows
      .filter((row) => row.series === 'Atlas')
      .map((atlas) => {
        const atDate = rows.filter(
          (row) => row.date.getTime() === atlas.date.getTime(),
        )
        return {
          date: atlas.date,
          value: atlas.value,
          title: series
            .map((seriesName) => {
              const row = atDate.find(
                (candidate) => candidate.series === seriesName,
              )
              return `${seriesName}: ${(row?.value ?? 0).toLocaleString()}`
            })
            .join('\n'),
        }
      })
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Grouped series tooltip',
      x: { type: 'utc', domain: timeDomain, label: null },
      y: { domain: [10, 85], grid: true, label: 'Value' },
      color: { domain: series, range: colors },
      marks: [
        Plot.line(rows, {
          x: 'date',
          y: 'value',
          z: 'series',
          stroke: 'series',
        }),
        Plot.dot(rows, {
          x: 'date',
          y: 'value',
          fill: 'series',
          r: 2.5,
        }),
        Plot.tip(
          tooltipRows,
          Plot.pointerX({
            x: 'date',
            y: 'value',
            title: 'title',
            maxRadius: Number.POSITIVE_INFINITY,
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
