import * as Plot from '@observablehq/plot'
import { timelineData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const tasks = [
  'Research',
  'Schema',
  'Prototype',
  'Core API',
  'Adapters',
  'Documentation',
  'Hardening',
  'Release',
]
const phases = ['Plan', 'Build', 'Ship']
const colors = ['#2563eb', '#f97316', '#10b981']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Project interval timeline',
      marginLeft: 104,
      x: { domain: [0, 40], grid: true, label: 'Project day' },
      y: { domain: tasks, label: null },
      color: { domain: phases, range: colors, legend: true },
      marks: [
        Plot.barX(timelineData(nextInput.revision), {
          x1: 'start',
          x2: 'end',
          y: 'task',
          fill: 'phase',
          inset: 1,
        }),
      ],
    }),
  )
