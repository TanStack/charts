import { barX, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { timelineData } from './data'
import type { TimelinePoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

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
const phases: readonly TimelinePoint['phase'][] = ['Plan', 'Build', 'Ship']
const colors = ['#2563eb', '#f97316', '#10b981']

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    barX(timelineData(input.revision), {
      x1: 'start',
      x2: 'end',
      y: 'task',
      color: 'phase',
      key: 'id',
      inset: 1,
      radius: 3,
    }),
  ],
  x: {
    scale: scaleLinear().domain([0, 40]),
    grid: true,
    label: 'Project day',
  },
  y: {
    scale: scaleBand<string>().domain(tasks).paddingInner(0.16),
  },
  color: {
    scale: scaleOrdinal<TimelinePoint['phase'], string>()
      .domain(phases)
      .range(colors),
    legend: colorLegend({ label: 'Phase' }),
  },
}))

export const mount = tanstackMount(definition, 'Project interval timeline', {
  format: (point) =>
    `${point.datum.task} · ${point.datum.phase} phase · Project days ${point.datum.start}–${point.datum.end} · Duration: ${point.datum.end - point.datum.start} days`,
})
