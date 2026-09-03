import * as Plot from '@observablehq/plot'
import { survey } from '@tanstack/charts-data/survey'
import { mosaicLayout, mosaicResponses } from './layout'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const { cells, labels } = mosaicLayout(survey)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Marimekko survey composition',
      x: {
        domain: [0, 1],
        tickFormat: '.0%',
        label: 'Share of responses',
      },
      y: {
        domain: [0, 1.12],
        tickFormat: '.0%',
        label: 'Within-question share',
      },
      color: {
        domain: mosaicResponses,
        range: colors,
        legend: true,
      },
      marks: [
        Plot.rect(cells, {
          x1: 'x1',
          x2: 'x2',
          y1: 'y1',
          y2: 'y2',
          fill: 'Response',
          inset: 1,
        }),
        Plot.text(labels, {
          x: 'x',
          y: 'y',
          text: 'Question',
          fill: '#334155',
          fontSize: 11,
        }),
      ],
    })
  })
