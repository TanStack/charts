import * as Plot from '@observablehq/plot'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const annotationColor = '#dc2626'
const label = (prefix: string) => (point: AaplRow) =>
  `${prefix} $${point.Close.toFixed(2)}`

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Apple closing price with minimum and maximum annotations',
      x: {
        type: 'utc',
        label: 'Date',
      },
      y: {
        grid: true,
        label: 'Apple close (USD)',
      },
      marks: [
        Plot.lineY(aapl, {
          x: 'Date',
          y: 'Close',
          stroke: '#2563eb',
          strokeWidth: 2.25,
        }),
        Plot.dot(
          aapl,
          Plot.selectMinY({
            x: 'Date',
            y: 'Close',
            fill: annotationColor,
            r: 5,
          }),
        ),
        Plot.dot(
          aapl,
          Plot.selectMaxY({
            x: 'Date',
            y: 'Close',
            fill: annotationColor,
            r: 5,
          }),
        ),
        Plot.text(
          aapl,
          Plot.selectMinY({
            x: 'Date',
            y: 'Close',
            text: label('Low'),
            fill: annotationColor,
            dy: 13,
          }),
        ),
        Plot.text(
          aapl,
          Plot.selectMaxY({
            x: 'Date',
            y: 'Close',
            text: label('High'),
            fill: annotationColor,
            textAnchor: 'end',
            dx: -7,
            dy: -13,
          }),
        ),
      ],
    })
  })
