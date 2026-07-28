import * as Plot from '@observablehq/plot'
import { mosaicColors, mosaicLayout, mosaicSegments } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const { cells, labels } = mosaicLayout(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Marimekko market composition',
      x: {
        domain: [0, 1],
        tickFormat: '.0%',
        label: 'Share of total market',
      },
      y: {
        domain: [0, 1.12],
        tickFormat: '.0%',
        label: 'Within-market share',
      },
      color: {
        domain: mosaicSegments,
        range: mosaicSegments.map((segment) => mosaicColors[segment]),
        legend: true,
      },
      marks: [
        Plot.rect(cells, {
          x1: 'x1',
          x2: 'x2',
          y1: 'y1',
          y2: 'y2',
          fill: 'segment',
          inset: 1,
        }),
        Plot.text(labels, {
          x: 'x',
          y: 'y',
          text: 'market',
          fill: '#334155',
          fontSize: 11,
        }),
      ],
    })
  })
