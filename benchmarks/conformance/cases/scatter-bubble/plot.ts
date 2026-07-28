import * as Plot from '@observablehq/plot'
import { scatterData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const groupDomain = ['North', 'South', 'West']
const groupRange = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = scatterData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Bubble scatterplot',
      marginTop: 16,
      marginRight: 20,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        domain: [0, 100],
        grid: true,
        label: 'X value',
      },
      y: {
        domain: [0, 90],
        grid: true,
        label: 'Y value',
      },
      r: {
        domain: [5, 32],
        range: [3, 11],
      },
      color: {
        domain: groupDomain,
        range: groupRange,
        legend: true,
      },
      marks: [
        Plot.dot(rows, {
          x: 'x',
          y: 'y',
          r: 'size',
          fill: 'group',
          fillOpacity: 0.78,
          stroke: 'currentColor',
          strokeOpacity: 0.28,
          strokeWidth: 0.75,
        }),
      ],
    })
  })
