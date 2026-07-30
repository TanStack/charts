import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import { polarLineData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const angleDomain = [0, 360] as const
const radiusDomain = [0, 100] as const
const angleGridValues = [0, 45, 90, 135, 180, 225, 270, 315] as const
const radiusGridValues = [25, 50, 75, 100] as const
const lineColor = '#0f766e'
const gridColor = '#94a3b8'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = polarLineData(input.revision)

    return {
      marks: [
        polar({
          radiusRatio: 0.72,
          angle: { scale: scaleLinear().domain(angleDomain) },
          radius: { scale: scaleLinear().domain(radiusDomain) },
          guides: [
            radialGrid({
              values: radiusGridValues,
              labels: false,
              stroke: gridColor,
              strokeOpacity: 0.35,
            }),
            angleGrid({
              values: angleGridValues,
              labels: false,
              stroke: gridColor,
              strokeOpacity: 0.35,
            }),
          ],
          marks: [
            radialLine(rows, {
              angle: 'angle',
              radius: 'radius',
              key: 'id',
              stroke: lineColor,
              strokeWidth: 2.5,
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
      margin: 0,
    }
  })

export const mount = tanstackMount(definition, 'Numeric polar line')
