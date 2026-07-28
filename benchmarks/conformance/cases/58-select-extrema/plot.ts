import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'
import { extremumData, extremumDateDomain, extremumValueDomain } from './data'
import type { ExtremumPoint } from './data'

const annotationColor = '#dc2626'
const label = (prefix: string) => (point: ExtremumPoint) =>
  `${prefix} ${point.value}`

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = extremumData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Time series with minimum and maximum annotations',
      x: {
        type: 'utc',
        domain: extremumDateDomain,
        label: 'Week',
      },
      y: {
        domain: extremumValueDomain,
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
        Plot.dot(
          rows,
          Plot.selectMinY({
            x: 'date',
            y: 'value',
            fill: annotationColor,
            r: 5,
          }),
        ),
        Plot.dot(
          rows,
          Plot.selectMaxY({
            x: 'date',
            y: 'value',
            fill: annotationColor,
            r: 5,
          }),
        ),
        Plot.text(
          rows,
          Plot.selectMinY({
            x: 'date',
            y: 'value',
            text: label('Low'),
            fill: annotationColor,
            dy: 13,
          }),
        ),
        Plot.text(
          rows,
          Plot.selectMaxY({
            x: 'date',
            y: 'value',
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
