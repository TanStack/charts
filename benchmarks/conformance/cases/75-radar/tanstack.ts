import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import { radarData, radarSubjects } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { PolarGuideLabelContext } from '@tanstack/charts/polar'

const maximumScore = 150
const ringValues = [30, 60, 90, 120, 150] as const
const angleScale = scalePoint<string>().domain(radarSubjects)
const radiusScale = scaleLinear().domain([0, maximumScore])

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
    const data = radarData(input.revision)

    return {
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
              values: radarSubjects,
              labels: true,
              labelOffset: 8,
              labelBaseline: angleLabelBaseline,
              labelDy: angleLabelDy,
              labelFill: '#808080',
              stroke: '#cbd5e1',
            }),
          ],
          marks: [
            radialArea(data, {
              angle: 'subject',
              radius: 'score',
              key: 'subject',
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
      x: null,
      y: null,
      guides: false,
      margin: 20,
    }
  })

export const mount = tanstackMount(definition, 'Simple radar chart', {
  format: ({ datum }) => `${datum.subject} · ${datum.score} / ${maximumScore}`,
})
