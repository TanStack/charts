import * as Plot from '@observablehq/plot'
import { industries } from '@charts-poc/demo-data/industries'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Monthly industry unemployment distribution',
      x: {
        type: 'utc',
        label: 'Month',
      },
      y: {
        grid: true,
        label: 'Unemployed people by industry (thousands)',
      },
      marks: [
        Plot.areaY(
          industries,
          Plot.groupX(
            { y1: 'p10', y2: 'p90' },
            {
              x: 'date',
              y: 'unemployed',
              fill: '#0ea5e9',
              fillOpacity: 0.22,
            },
          ),
        ),
        Plot.lineY(
          industries,
          Plot.groupX(
            { y: 'median' },
            {
              x: 'date',
              y: 'unemployed',
              stroke: '#0369a1',
              strokeWidth: 2.25,
            },
          ),
        ),
      ],
    })
  })
