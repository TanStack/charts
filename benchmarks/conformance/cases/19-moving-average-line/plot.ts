import * as Plot from '@observablehq/plot'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  movingAverageData,
  movingAverageValueDomain,
  seriesColors,
  seriesNames,
} from './data'

const windowSize = 7

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Seven-week moving averages for three time series',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: movingAverageValueDomain,
      nice: false,
      grid: true,
      label: 'Moving average',
    },
    color: {
      domain: seriesNames,
      range: seriesNames.map((series) => seriesColors[series]),
      legend: true,
    },
    marks: [
      Plot.lineY(
        movingAverageData(input.revision),
        Plot.windowY(
          {
            k: windowSize,
            reduce: 'mean',
            anchor: 'end',
            strict: true,
          },
          {
            x: 'date',
            y: 'value',
            z: 'series',
            stroke: 'series',
            strokeWidth: 2.25,
          },
        ),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
