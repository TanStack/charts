import { colorLegend, defineChart, rect, text } from '@tanstack/charts'
import { format } from 'd3-format'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { mosaicColors, mosaicLayout, mosaicSegments } from './data'
import { tanstackMount } from '../../shared/mount'
import type { MosaicSegment } from './data'
import type { ConformanceInput } from '../../types'

const percent = format('.0%')

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const { cells, labels } = mosaicLayout(input.revision)

  return {
    marks: [
      rect(cells, {
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        z: 'segment',
        key: 'id',
        inset: 1,
      }),
      text(labels, {
        x: 'x',
        y: 'y',
        text: 'market',
        fill: '#334155',
        fontSize: 11,
      }),
    ],
    x: {
      scale: scaleLinear().domain([0, 1]),
      format: percent,
      label: 'Share of total market',
    },
    y: {
      scale: scaleLinear().domain([0, 1.12]),
      format: percent,
      label: 'Within-market share',
    },
    color: {
      scale: scaleOrdinal<MosaicSegment, string>()
        .domain(mosaicSegments)
        .range(mosaicSegments.map((segment) => mosaicColors[segment])),
      legend: colorLegend({ label: 'Segment' }),
    },
  }
})

export const mount = tanstackMount(definition, 'Marimekko market composition')
