import { createElement } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'
import { radarData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  return createElement(
    RadarChart,
    {
      width: input.width,
      height: input.height,
      data: radarData(input.revision),
      outerRadius: '80%',
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
    },
    [
      createElement(PolarGrid, {
        key: 'grid',
        gridType: 'polygon',
        stroke: '#cbd5e1',
      }),
      createElement(PolarAngleAxis, {
        key: 'angle',
        dataKey: 'subject',
      }),
      createElement(PolarRadiusAxis, {
        key: 'radius',
        domain: [0, 150],
        ticks: [30, 60, 90, 120, 150],
        angle: 30,
      }),
      createElement(Radar, {
        key: 'profile',
        name: 'Student',
        dataKey: 'score',
        stroke: '#8884d8',
        strokeWidth: 2,
        fill: '#8884d8',
        fillOpacity: 0.6,
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Simple radar chart')
