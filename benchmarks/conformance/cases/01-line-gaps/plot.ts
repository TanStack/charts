import * as Plot from '@observablehq/plot'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'
import { timeDomain } from '../../shared/data'
import { gapData, gapValueDomain } from './data'

function render(input: ConformanceInput) {
  const rows = gapData(input.revision)

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Time-series line with two missing-value gaps',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: gapValueDomain,
      nice: false,
      grid: true,
      label: 'Index',
    },
    marks: [
      Plot.lineY(rows, {
        x: 'date',
        y: 'value',
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
