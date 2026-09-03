import * as Plot from '@observablehq/plot'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { decathlonEvents, selectRepresentativeDecathletes } from './selection'
import { normalizeDecathlonResults } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = [
  '#2563eb',
  '#ea580c',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ca8a04',
]
const representativeDecathletes = selectRepresentativeDecathletes(decathlon)
const rows = normalizeDecathlonResults(decathlon, representativeDecathletes)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Parallel coordinates model comparison',
      x: {
        domain: decathlonEvents,
        label: null,
      },
      y: {
        domain: [0, 100],
        grid: true,
        label: 'Relative performance within sample',
      },
      color: {
        range: colors,
        legend: true,
      },
      marks: [
        Plot.line(rows, {
          x: 'event',
          y: 'relativePerformance',
          z: 'Country',
          stroke: 'Country',
          strokeWidth: 1.75,
        }),
        Plot.dot(rows, {
          x: 'event',
          y: 'relativePerformance',
          fill: 'Country',
          r: 2.75,
        }),
      ],
    }),
  )
