import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'
import { quantileData, quantileDateDomain, quantileValueDomain } from './data'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = quantileData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Median trend with tenth-to-ninetieth percentile ribbon',
      x: {
        type: 'utc',
        domain: quantileDateDomain,
        label: 'Month',
      },
      y: {
        domain: quantileValueDomain,
        nice: false,
        grid: true,
        label: 'Observed value',
      },
      marks: [
        Plot.areaY(
          rows,
          Plot.groupX(
            { y1: 'p10', y2: 'p90' },
            {
              x: 'date',
              y: 'value',
              fill: '#0ea5e9',
              fillOpacity: 0.22,
            },
          ),
        ),
        Plot.lineY(
          rows,
          Plot.groupX(
            { y: 'median' },
            {
              x: 'date',
              y: 'value',
              stroke: '#0369a1',
              strokeWidth: 2.25,
            },
          ),
        ),
      ],
    })
  })
