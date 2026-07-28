import * as Plot from '@observablehq/plot'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  seriesColors,
  seriesNames,
  streamData,
  streamValueDomain,
} from './data'

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Three-series streamgraph',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: streamValueDomain,
      nice: false,
      grid: true,
      label: 'Stream offset',
    },
    color: {
      domain: seriesNames,
      range: seriesNames.map((series) => seriesColors[series]),
      legend: true,
    },
    marks: [
      Plot.areaY(
        streamData(input.revision),
        Plot.stackY(
          { offset: 'wiggle', order: 'inside-out' },
          {
            x: 'date',
            y: 'value',
            z: 'series',
            fill: 'series',
            fillOpacity: 0.85,
          },
        ),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
