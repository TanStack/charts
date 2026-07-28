import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { categoryData, categoryValueDomain } from '../../shared/data'
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
      ariaLabel: 'Grouped bars',
      marginBottom: nextInput.width < 640 ? 72 : 48,
      fx: {
        domain: categoryDomain,
        label: null,
        padding: 0.08,
        tickRotate: nextInput.width < 640 ? -32 : 0,
      },
      x: {
        axis: null,
        paddingOuter: 0.16,
      },
      y: {
        domain: categoryValueDomain,
        nice: false,
        grid: true,
        label: 'Value',
      },
      color: {
        domain: seriesDomain,
        range: seriesColors,
        legend: true,
      },
      marks: [
        Plot.barY(rows, {
          fx: 'category',
          x: 'series',
          y: 'value',
          fill: 'series',
          inset: 1,
        }),
      ],
    })
  })
