import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import { comparativeRadarPoints, radarMetrics } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ComparativeRadarPoint, RadarSeries } from './data'
import type { ConformanceInput } from '../../types'
import type { PolarGuideLabelContext } from '@tanstack/charts/polar'

const ringValues = [20, 40, 60, 80, 100] as const
const angleScale = scalePoint<string>().domain(radarMetrics)
const radiusScale = scaleLinear().domain([0, 100])
const seriesColors: Record<RadarSeries, string> = {
  Current: '#7c3aed',
  Target: '#0ea5e9',
}

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

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const points = comparativeRadarPoints(input.revision)

    return {
      marks: [
        polar({
          angle: { scale: angleScale, wrap: true },
          radius: { scale: radiusScale },
          inset: 0,
          radiusRatio: 0.78,
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
              values: radarMetrics,
              labels: true,
              labelOffset: 8,
              labelBaseline: angleLabelBaseline,
              labelDy: angleLabelDy,
              labelFill: '#808080',
              stroke: '#cbd5e1',
            }),
          ],
          marks: [
            radialArea(points, {
              angle: 'metric',
              radius: 'value',
              z: 'series',
              key: 'metric',
              className: 'ts-chart__radar',
              curve: curveLinearClosed,
              fill: (row: ComparativeRadarPoint) => seriesColors[row.series],
              fillOpacity: 0.18,
              stroke: (row: ComparativeRadarPoint) => seriesColors[row.series],
              strokeWidth: 2,
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
      margin: 20,
    }
  })

export const mount = tanstackMount(definition, 'Comparative radar chart')
