import { areaX, d3AreaXCurve, defineChart, dot, link } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { violinCohorts, violinColors, violinData, violinMedians } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ViolinCohort } from './data'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = violinData(input.revision)
  const summaries = violinMedians(input.revision)

  return {
    marks: [
      areaX(rows, {
        x1: 'x1',
        x2: 'x2',
        y: 'value',
        z: 'cohort',
        key: 'id',
        fillOpacity: 0.58,
        stroke: (row) => violinColors[row.cohort],
        curve: d3AreaXCurve(curveBasis),
      }),
      link(summaries, {
        x1: 'x1',
        x2: 'x2',
        y1: 'median',
        y2: 'median',
        key: 'id',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
      dot(summaries, {
        x: 'center',
        y: 'median',
        z: 'cohort',
        key: 'id',
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 3.5,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0.5, 3.5]),
      ticks: violinCohorts.length,
      format: (value) => violinCohorts[Math.round(value) - 1] ?? '',
    },
    y: {
      scale: scaleLinear().domain([40, 100]),
      grid: true,
      label: 'Score',
    },
    color: {
      scale: scaleOrdinal<ViolinCohort, string>()
        .domain(violinCohorts)
        .range(violinCohorts.map((cohort) => violinColors[cohort])),
    },
  }
})

export const mount = tanstackMount(definition, 'Violin distribution comparison')
