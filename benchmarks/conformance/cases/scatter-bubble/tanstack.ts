import { colorLegend, defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal, scaleSqrt } from 'd3-scale'
import { scatterData } from '../../shared/data'
import type { ScatterPoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const groupDomain: readonly ScatterPoint['group'][] = ['North', 'South', 'West']
const groupRange = ['#2563eb', '#f97316', '#10b981']

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = scatterData(input.revision)

  return {
    marks: [
      dot(rows, {
        x: 'x',
        y: 'y',
        z: 'group',
        key: 'id',
        r: 'size',
        rScale: scaleSqrt().domain([5, 32]).range([3, 11]),
        fillOpacity: 0.78,
        stroke: 'currentColor',
        strokeOpacity: 0.28,
        strokeWidth: 0.75,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 100]),
      grid: true,
      label: 'X value',
    },
    y: {
      scale: scaleLinear().domain([0, 90]),
      grid: true,
      label: 'Y value',
    },
    color: {
      scale: scaleOrdinal<ScatterPoint['group'], string>()
        .domain(groupDomain)
        .range(groupRange),
      legend: colorLegend({ label: 'Group' }),
    },
  }
})

export const mount = tanstackMount(definition, 'Bubble scatterplot')
