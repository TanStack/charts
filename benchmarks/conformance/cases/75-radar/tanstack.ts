import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import { selectRadarAthlete } from './selection'
import { radarEvents, radarProfile } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { PolarGuideLabelContext } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const ringValues = [20, 40, 60, 80, 100] as const
const radarAthlete = selectRadarAthlete(decathlon)
const angleScale = scalePoint<string>().domain(radarEvents)
const radiusScale = scaleLinear().domain([0, 100])
const profile = radarProfile(decathlon, radarAthlete)

function angleLabelIsTopOrBottom(angle: number): boolean {
  return Math.abs(Math.sin(angle)) <= Math.SQRT1_2
}

function angleLabelBaseline({
  angle,
  y,
}: PolarGuideLabelContext): 'auto' | 'middle' | 'hanging' {
  if (!angleLabelIsTopOrBottom(angle)) return 'middle'
  return y > 0 ? 'hanging' : 'auto'
}

function angleLabelDy({ angle, y }: PolarGuideLabelContext): number {
  if (!angleLabelIsTopOrBottom(angle)) return 1.1
  return y > 0 ? -1.1 : 0
}

const definition = (input: ConformanceInput) => {
  const margin =
    input.width < 480
      ? { top: 20, right: 55, bottom: 20, left: 105 }
      : { top: 20, right: 20, bottom: 20, left: 20 }

  return defineChart({
    marks: [
      polar({
        angle: { scale: angleScale, wrap: true },
        radius: { scale: radiusScale },
        inset: 0,
        radiusRatio: 0.8,
        guides: [
          radialGrid({
            values: ringValues,
            shape: 'polygon',
            labels: true,
            labelAngle: Math.PI / 3,
            labelRotate: 60,
            labelBaseline: 'auto',
            labelFill: '#cccccc',
            stroke: '#cbd5e1',
          }),
          angleGrid({
            values: radarEvents,
            labels: true,
            labelOffset: 8,
            labelBaseline: angleLabelBaseline,
            labelDy: angleLabelDy,
            labelFill: '#808080',
            stroke: '#cbd5e1',
          }),
        ],
        marks: [
          radialArea(profile, {
            angle: 'event',
            radius: 'relativePerformance',
            className: 'ts-chart__radar',
            curve: curveLinearClosed,
            fill: '#8884d8',
            fillOpacity: 0.6,
            stroke: '#8884d8',
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    margin,
  })
}

export const mount = tanstackMount(definition, 'Decathlon radar chart', {
  format: ({ datum }) =>
    `${datum.Country} · ${datum.event} · ${datum.relativePerformance.toFixed(1)} / 100`,
})
