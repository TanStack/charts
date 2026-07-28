import * as Plot from '@observablehq/plot'
import { connectedData, directionSegments } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = connectedData(nextInput.revision)
    const arrows = directionSegments(rows)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Directed connected scatterplot over time',
      x: {
        domain: [48, 86],
        grid: true,
        label: 'Activity index',
      },
      y: {
        domain: [25, 92],
        grid: true,
        label: 'Cost index',
      },
      marks: [
        Plot.line(rows, {
          x: 'activity',
          y: 'cost',
          curve: 'catmull-rom',
          stroke: '#64748b',
          strokeWidth: 2.25,
        }),
        Plot.dot(rows, {
          x: 'activity',
          y: 'cost',
          fill: '#0f766e',
          r: 3.25,
        }),
        Plot.arrow(arrows, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: '#0f766e',
          strokeWidth: 1.5,
          headLength: 7,
        }),
        Plot.text(
          rows.filter((row) => row.year % 4 === 0 || row.year === 2014),
          {
            x: 'activity',
            y: 'cost',
            text: (row) => `${row.year}`,
            fill: '#0f172a',
            dy: -9,
          },
        ),
      ],
    })
  })
