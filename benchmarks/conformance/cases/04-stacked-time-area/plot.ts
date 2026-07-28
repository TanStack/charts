import * as Plot from '@observablehq/plot'
import { timeDomain } from '../../shared/data'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'
import {
  seriesColors,
  seriesNames,
  stackedTimeData,
  stackedTimeValueDomain,
} from './data'

function render(input: ConformanceInput) {
  const rows = stackedTimeData(input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Three stacked time-series areas',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: stackedTimeValueDomain,
      nice: false,
      grid: true,
      label: 'Combined index',
    },
    color: {
      domain: seriesNames,
      range: seriesNames.map((series) => seriesColors[series]),
      legend: true,
    },
    marks: [
      Plot.areaY(
        rows,
        Plot.stackY({
          x: 'date',
          y: 'value',
          z: 'series',
          fill: 'series',
          fillOpacity: 0.78,
        }),
      ),
      Plot.ruleY([0]),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
