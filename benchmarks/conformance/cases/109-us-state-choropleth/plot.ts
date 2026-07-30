import * as Plot from '@observablehq/plot'
import {
  fitUnemploymentProjection,
  projectedUnemploymentCounties,
} from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { UnemploymentCounty } from './transform'
import type { ConformanceMount } from '../../types'

const colorRanges = [
  [
    '#f7fbff',
    '#deebf7',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#4292c6',
    '#2171b5',
    '#08519c',
    '#08306b',
  ],
  [
    '#f7fcf5',
    '#e5f5e0',
    '#c7e9c0',
    '#a1d99b',
    '#74c476',
    '#41ab5d',
    '#238b45',
    '#006d2c',
    '#00441b',
  ],
]

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      margin: 10,
      ariaLabel: 'United States county unemployment choropleth',
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          fitUnemploymentProjection({ x: 0, y: 0, width, height }),
        clip: false,
      },
      color: {
        type: 'quantile',
        range: colorRanges[nextInput.revision % 2] ?? colorRanges[0],
      },
      marks: [
        Plot.geo(projectedUnemploymentCounties, {
          fill: (county: UnemploymentCounty) => county.properties.rate,
          stroke: '#f8fafc',
          strokeWidth: 0.35,
        }),
      ],
    }),
  )
