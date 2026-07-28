import * as Plot from '@observablehq/plot'
import { violinCohorts, violinColors, violinData, violinMedians } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = violinData(nextInput.revision)
    const summaries = violinMedians(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Violin distribution comparison',
      x: {
        domain: [0.5, 3.5],
        ticks: violinCohorts.length,
        tickFormat: (value: number) =>
          violinCohorts[Math.round(value) - 1] ?? '',
        label: null,
      },
      y: {
        domain: [40, 100],
        grid: true,
        label: 'Score',
      },
      color: {
        domain: violinCohorts,
        range: violinCohorts.map((cohort) => violinColors[cohort]),
      },
      marks: [
        Plot.areaX(rows, {
          x1: 'x1',
          x2: 'x2',
          y: 'value',
          z: 'cohort',
          fill: 'cohort',
          fillOpacity: 0.58,
          stroke: 'cohort',
          curve: 'basis',
        }),
        Plot.link(summaries, {
          x1: 'x1',
          x2: 'x2',
          y1: 'median',
          y2: 'median',
          stroke: '#0f172a',
          strokeWidth: 2,
        }),
        Plot.dot(summaries, {
          x: 'center',
          y: 'median',
          fill: 'cohort',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 3.5,
        }),
      ],
    })
  })
