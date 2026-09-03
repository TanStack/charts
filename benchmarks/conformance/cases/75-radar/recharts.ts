import { createElement } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { selectRadarAthlete } from './selection'
import { radarProfile } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const radarAthlete = selectRadarAthlete(decathlon)

function chart(input: ConformanceInput) {
  const compact = input.width < 480
  const margin = compact
    ? { top: 20, right: 55, bottom: 20, left: 105 }
    : { top: 20, right: 20, bottom: 20, left: 20 }
  const centerX = input.width / 2 + (margin.left - margin.right) / 2

  return createElement(
    RadarChart,
    {
      width: input.width,
      height: input.height,
      data: radarProfile(decathlon, radarAthlete),
      outerRadius: '80%',
      cx: centerX,
      margin,
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
        dataKey: 'event',
      }),
      createElement(PolarRadiusAxis, {
        key: 'radius',
        domain: [0, 100],
        ticks: [20, 40, 60, 80, 100],
        angle: 30,
      }),
      createElement(Radar, {
        key: 'profile',
        name: radarAthlete.Country,
        dataKey: 'relativePerformance',
        stroke: '#8884d8',
        strokeWidth: 2,
        fill: '#8884d8',
        fillOpacity: 0.6,
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Decathlon radar chart')
