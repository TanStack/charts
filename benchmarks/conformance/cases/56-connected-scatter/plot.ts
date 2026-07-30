import * as Plot from '@observablehq/plot'
import { driving } from '@charts-poc/demo-data/driving'
import { directionSegments } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const arrows = directionSegments(driving)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Directed connected scatterplot over time',
      x: { grid: true, label: 'Miles driven per person' },
      y: { grid: true, label: 'Cost of gasoline ($ per gallon)' },
      marks: [
        Plot.line(driving, {
          x: 'miles',
          y: 'gas',
          curve: 'catmull-rom',
          stroke: '#64748b',
          strokeWidth: 2.25,
        }),
        Plot.dot(driving, {
          x: 'miles',
          y: 'gas',
          fill: '#0f766e',
          r: 3.25,
        }),
        Plot.arrow(arrows, {
          x1: 'miles1',
          y1: 'gas1',
          x2: 'miles2',
          y2: 'gas2',
          stroke: '#0f766e',
          strokeWidth: 1.5,
          headLength: 7,
        }),
        Plot.text(
          driving.filter((row) => row.year % 5 === 0),
          {
            x: 'miles',
            y: 'gas',
            text: (row) => `${row.year}`,
            fill: '#0f172a',
            dy: -9,
          },
        ),
      ],
    })
  })
