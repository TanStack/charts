import * as Plot from '@observablehq/plot'
import { distributionGroups, facetedDistributionData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const boundaries = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = facetedDistributionData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Faceted distribution comparison',
      marginLeft: 116,
      marginRight: 92,
      facet: {
        data: rows,
        y: 'group',
      },
      fy: {
        domain: distributionGroups,
        label: null,
      },
      x: {
        domain: [0, 100],
        grid: true,
        label: 'Observed value',
      },
      y: {
        domain: [0, 25],
        grid: true,
        ticks: 3,
        label: 'Proportion',
        percent: true,
      },
      marks: [
        Plot.frame(),
        Plot.rectY(rows, {
          ...Plot.binX(
            { y: 'proportion-facet' },
            {
              x: 'value',
              thresholds: boundaries,
            },
          ),
          fill: '#8b5cf6',
          inset: 0.75,
        }),
      ],
    })
  })
