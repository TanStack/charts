import { barY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { waterfallData } from './data'
import type { WaterfallPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const labels = [
  'Revenue',
  'Services',
  'Returns',
  'Infrastructure',
  'People',
  'Other',
  'Net',
]
const kinds: readonly WaterfallPoint['kind'][] = [
  'increase',
  'decrease',
  'total',
]
const colors = ['#10b981', '#ef4444', '#2563eb']

const definition = defineChart<ConformanceInput>()(({ input, width }) => ({
  marks: [
    barY(waterfallData(input.revision), {
      x: 'label',
      y1: 'start',
      y2: 'end',
      color: 'kind',
      key: 'id',
      inset: 1,
    }),
    ruleY([0], { stroke: '#64748b', strokeOpacity: 0.6 }),
  ],
  x: {
    scale: scaleBand<string>().domain(labels).padding(0.14),
    tickRotate: width < 560 ? -32 : 0,
  },
  y: {
    scale: scaleLinear().domain([0, 130]),
    grid: true,
    label: 'Amount',
  },
  color: {
    scale: scaleOrdinal<WaterfallPoint['kind'], string>()
      .domain(kinds)
      .range(colors),
    legend: colorLegend({ label: 'Contribution' }),
  },
}))

export const mount = tanstackMount(definition, 'Contribution waterfall chart')
