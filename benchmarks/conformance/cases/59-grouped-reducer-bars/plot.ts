import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'
import {
  aggregateCategories,
  aggregateData,
  aggregateValueDomain,
} from './data'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = aggregateData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Category totals aggregated from raw events',
      x: {
        domain: aggregateCategories,
        label: null,
      },
      y: {
        domain: aggregateValueDomain,
        nice: false,
        grid: true,
        label: 'Total amount',
      },
      marks: [
        Plot.barY(
          rows,
          Plot.groupX(
            { y: 'sum' },
            {
              x: 'category',
              y: 'amount',
              fill: '#0ea5e9',
              inset: 1,
            },
          ),
        ),
        Plot.text(
          rows,
          Plot.groupX(
            { y: 'sum', text: 'sum' },
            {
              x: 'category',
              y: 'amount',
              text: 'amount',
              fill: '#0c4a6e',
              dy: -8,
            },
          ),
        ),
      ],
    })
  })
