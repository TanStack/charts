import { colorLegend, defineChart, rect, text } from '@tanstack/charts'
import { format } from 'd3-format'
import { scaleLinear } from 'd3-scale'
import { survey } from '@charts-poc/demo-data/survey'
import { mosaicLayout, mosaicResponses } from './layout'
import { tanstackMount } from '../../shared/mount'

const percent = format('.0%')
const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

const definition = () => {
  const layout = mosaicLayout(survey)

  return defineChart({
    marks: [
      rect(layout.cells, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        color: 'Response',
        inset: 1,
      }),
      text(layout.labels, {
        x: 'x',
        y: 'y',
        text: 'Question',
        fill: '#334155',
        fontSize: 11,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 1]),
      axis: { ticks: { format: percent }, label: 'Share of responses' },
    },
    y: {
      scale: scaleLinear().domain([0, 1.12]),
      axis: { ticks: { format: percent }, label: 'Within-question share' },
    },
    color: {
      domain: mosaicResponses,
      range: colors,
      legend: colorLegend({ label: 'Response' }),
    },
  })
}

export const mount = tanstackMount(definition, 'Marimekko survey composition')
