import { crimeanWar } from '@tanstack/charts-data/crimean-war'
import * as Plot from '@observablehq/plot'
import type { ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

const causes = ['disease', 'wounds', 'other'] as const
const causeColors = ['#4269d0', '#ff725c', '#efb118']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = crimeanWar.slice(nextInput.revision)
    const deathsByCause = causes.flatMap((cause) =>
      rows.map(({ date, [cause]: deaths }) => ({ date, cause, deaths })),
    )

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Crimean War deaths by cause',
      x: {
        tickFormat: '%b',
        label: null,
      },
      y: { grid: true, label: 'Deaths' },
      color: { domain: causes, range: causeColors },
      marks: [
        Plot.rectY(deathsByCause, {
          x: 'date',
          interval: 'month',
          y: 'deaths',
          fill: 'cause',
          reverse: true,
        }),
        Plot.ruleY([0]),
      ],
    })
  })
