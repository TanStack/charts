import { createElement } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { selectRadarProfiles } from './selection'
import { comparativeRadarData } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const radarProfiles = selectRadarProfiles(decathlon)

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
      data: comparativeRadarData(decathlon, radarProfiles),
      outerRadius: '78%',
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
        key: 'usa',
        name: 'USA',
        dataKey: 'USA',
        stroke: '#7c3aed',
        strokeWidth: 2,
        fill: '#7c3aed',
        fillOpacity: 0.18,
        isAnimationActive: false,
      }),
      createElement(Radar, {
        key: 'gbr',
        name: 'GBR',
        dataKey: 'GBR',
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
