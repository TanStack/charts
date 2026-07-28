import * as Plot from '@observablehq/plot'
import { waffleCategories, waffleColors, waffleData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const segments = waffleData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'One-hundred-unit adoption waffle chart',
      y: {
        domain: [0, 100],
        axis: null,
      },
      color: {
        domain: waffleCategories,
        range: waffleColors,
        legend: true,
      },
      marks: [
        Plot.waffleY(segments, {
          y: 'value',
          fill: 'category',
          unit: 1,
          gap: 2,
          round: true,
          rx: 2,
        }),
      ],
    })
  })
