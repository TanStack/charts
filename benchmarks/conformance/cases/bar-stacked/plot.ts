import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { categoryData, categoryTotalDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'

const seriesDomain = ['Desktop', 'Mobile', 'Tablet']
const seriesColors = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = categoryData(nextInput.revision)
    const categoryDomain = [...new Set(rows.map((row) => row.category))]

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Stacked bars',
      x: {
        domain: categoryDomain,
        label: null,
      },
      y: {
        domain: categoryTotalDomain,
        nice: false,
        grid: true,
        label: 'Total value',
      },
      color: {
        domain: seriesDomain,
        range: seriesColors,
        legend: true,
      },
      marks: [
        Plot.barY(
          rows,
          Plot.stackY({
            x: 'category',
            y: 'value',
            fill: 'series',
            inset: 1,
          }),
        ),
        Plot.ruleY([0]),
      ],
    })
  })
