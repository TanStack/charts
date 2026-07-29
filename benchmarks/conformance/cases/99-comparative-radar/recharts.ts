import { createElement } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'
import { comparativeRadarData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  return createElement(
    RadarChart,
    {
      width: input.width,
      height: input.height,
      data: comparativeRadarData(input.revision),
      outerRadius: '78%',
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
        dataKey: 'metric',
      }),
      createElement(PolarRadiusAxis, {
        key: 'radius',
        domain: [0, 100],
        ticks: [20, 40, 60, 80, 100],
        angle: 30,
      }),
      createElement(Radar, {
        key: 'current',
        name: 'Current',
        dataKey: 'current',
        stroke: '#7c3aed',
        strokeWidth: 2,
        fill: '#7c3aed',
        fillOpacity: 0.18,
        isAnimationActive: false,
      }),
      createElement(Radar, {
        key: 'target',
        name: 'Target',
        dataKey: 'target',
        stroke: '#0ea5e9',
        strokeWidth: 2,
        fill: '#0ea5e9',
        fillOpacity: 0.18,
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Comparative radar chart')
