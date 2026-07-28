import { createMark, defineChart } from '@tanstack/charts'
import { contourDensity } from 'd3-contour'
import { geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import {
  densityBandwidth,
  densityPoints,
  densityThresholds,
  densityXDomain,
  densityYDomain,
} from './data'
import { tanstackMount } from '../../shared/mount'
import type { ContourMultiPolygon } from 'd3-contour'
import type { DensityPoint } from './data'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const points = densityPoints(input.revision)

  return {
    marks: [densityMark(points)],
    x: {
      scale: scaleLinear().domain(densityXDomain),
    },
    y: {
      scale: scaleLinear().domain(densityYDomain),
    },
    guides: false,
    margin: 0,
  }
})

function densityMark(data: DensityPoint[]) {
  return createMark<DensityPoint, number, number>(({ markIndex }) => {
    const id = `density-${markIndex}`

    return {
      id,
      channels: {
        x: { scale: 'x', values: data.map((point) => point.x) },
        y: { scale: 'y', values: data.map((point) => point.y) },
      },
      render: ({ chart, scales }) => {
        const estimator = contourDensity<DensityPoint>()
          .x((point) => scales.x.map(point.x))
          .y((point) => scales.y.map(point.y))
          .size([chart.width, chart.height])
          .bandwidth(densityBandwidth)
          .thresholds(densityThresholds.map((threshold) => threshold / 100))
        const geometry: ContourMultiPolygon[] = estimator(data)

        const path = geoPath()
        const children: SceneNode[] = []
        for (let index = 0; index < geometry.length; index++) {
          const contour = geometry[index]
          if (contour === undefined) continue
          const pathData = path(contour)
          if (pathData === null) continue
          children.push({
            kind: 'area',
            key: `${id}:${index}`,
            points: [],
            path: pathData,
            style: {
              fill: '#2563eb',
              fillOpacity: 0.16,
              stroke: '#1e3a8a',
              strokeWidth: 1,
            },
          })
        }

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__area',
              ariaHidden: true,
              children,
            },
          ],
        }
      },
    }
  })
}

export const mount = tanstackMount(definition, 'Point density contours')
