import * as Plot from '@observablehq/plot'
import { timeDomain } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { bollingerData, bollingerValueDomain } from './data'

const windowSize = 8
const deviationMultiplier = 2

function render(input: ConformanceInput) {
  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Eight-week Bollinger band',
    x: { type: 'utc', domain: timeDomain, label: 'Week' },
    y: {
      domain: bollingerValueDomain,
      nice: false,
      grid: true,
      label: 'Index',
    },
    marks: [
      Plot.bollingerY(bollingerData(input.revision), {
        x: 'date',
        y: 'value',
        n: windowSize,
        k: deviationMultiplier,
        anchor: 'end',
        strict: true,
        fill: '#7c3aed',
        fillOpacity: 0.18,
        stroke: '#7c3aed',
        strokeWidth: 2.25,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
