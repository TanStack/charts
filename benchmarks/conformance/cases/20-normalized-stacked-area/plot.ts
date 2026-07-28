import * as Plot from '@observablehq/plot'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  normalizedStackData,
  normalizedValueDomain,
  seriesColors,
  seriesNames,
} from './data'

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Normalized stacked area composition',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: normalizedValueDomain,
      nice: false,
      grid: true,
      label: 'Share',
      tickFormat: '.0%',
    },
    color: {
      domain: seriesNames,
      range: seriesNames.map((series) => seriesColors[series]),
      legend: true,
    },
    marks: [
      Plot.areaY(
        normalizedStackData(input.revision),
        Plot.stackY(
          { offset: 'normalize' },
          {
            x: 'date',
            y: 'value',
            z: 'series',
            fill: 'series',
            fillOpacity: 0.82,
          },
        ),
      ),
      Plot.ruleY([0]),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
