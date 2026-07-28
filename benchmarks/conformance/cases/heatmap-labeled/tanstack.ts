import { cell, colorGradientLegend, defineChart, text } from '@tanstack/charts'
import { scaleBand, scaleSequential } from 'd3-scale'
import { heatmapData } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const hours = ['00', '04', '08', '12', '16', '20']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const contrastThreshold = 48

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = heatmapData(input.revision)

  return {
    marks: [
      cell(rows, {
        x: 'hour',
        y: 'day',
        z: 'value',
        key: 'id',
        inset: 1,
      }),
      text(rows, {
        x: 'hour',
        y: 'day',
        text: 'value',
        key: 'id',
        fill: (row) => (row.value < contrastThreshold ? '#0f172a' : '#f8fafc'),
        fontSize: 10,
        fontWeight: 600,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(hours)
        .paddingInner(0.04)
        .paddingOuter(0.02),
      label: 'Hour',
    },
    y: {
      scale: scaleBand<string>()
        .domain(days)
        .paddingInner(0.04)
        .paddingOuter(0.02),
      label: 'Day',
    },
    color: {
      scale: scaleSequential<string>()
        .domain([8, 80])
        .range(['#eff6ff', '#1d4ed8']),
      legend: colorGradientLegend({ label: 'Value', steps: 6 }),
    },
  }
})

export const mount = tanstackMount(definition, 'Labeled day and hour heatmap')
