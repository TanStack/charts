import { colorLegend, defineChart, dot, lineY } from '@tanstack/charts'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { scaleBand, scaleLinear } from 'd3-scale'
import { decathlonEvents, selectRepresentativeDecathletes } from './selection'
import { normalizeDecathlonResults } from './transform'
import { tanstackMount } from '../../shared/mount'

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

const definition = () =>
  defineChart({
    marks: [
      lineY(rows, {
        x: 'event',
        y: 'relativePerformance',
        color: 'Country',
        strokeWidth: 1.75,
      }),
      dot(rows, {
        x: 'event',
        y: 'relativePerformance',
        color: 'Country',
        r: 2.75,
      }),
    ],
    x: {
      scale: scaleBand<string>().domain(decathlonEvents).padding(0.1),
    },
    y: {
      scale: scaleLinear().domain([0, 100]),
      grid: true,
      label: 'Relative performance within sample',
    },
    color: {
      range: colors,
      legend: colorLegend({ label: 'Country' }),
    },
  })

export const mount = tanstackMount(
  definition,
  'Parallel coordinates model comparison',
)
