import * as Plot from '@observablehq/plot'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import {
  multiLineData,
  multiLineValueDomain,
  seriesColors,
  seriesNames,
} from './data'

function render(input: ConformanceInput) {
  const rows = multiLineData(input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    marginRight: 72,
    ariaLabel: 'Three time series with direct end labels',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: multiLineValueDomain,
      nice: false,
      grid: true,
      label: 'Index',
    },
    color: {
      domain: seriesNames,
      range: seriesNames.map((series) => seriesColors[series]),
    },
    marks: [
      Plot.lineY(rows, {
        x: 'date',
        y: 'value',
        z: 'series',
        stroke: 'series',
        strokeWidth: 2.25,
      }),
      Plot.text(
        rows,
        Plot.selectLast({
          x: 'date',
          y: 'value',
          z: 'series',
          text: 'series',
          fill: 'series',
          textAnchor: 'start',
          dx: 5,
        }),
      ),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
