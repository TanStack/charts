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
import type { ChartPoint, SceneNode } from '@tanstack/charts'

export interface DensityContourDatum {
  id: string
  centroidX: number
  centroidY: number
  density: number
}

const densityPercent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const densityCoordinate = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export const densityDefinition = defineChart<ConformanceInput>()(({
  input,
}) => {
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
  return createMark<DensityContourDatum, number, number>(({ markIndex }) => {
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
        const points: ChartPoint<DensityContourDatum, number, number>[] = []
        const centroidXScale = scaleLinear()
          .domain(densityXDomain)
          .range([0, chart.width])
        const centroidYScale = scaleLinear()
          .domain(densityYDomain)
          .range([chart.height, 0])

        for (let index = 0; index < geometry.length; index++) {
          const contour = geometry[index]
          if (contour === undefined) continue
          const pathData = path(contour)
          if (pathData === null) continue
          const key = `${id}:${index}`
          children.push({
            kind: 'area',
            key,
            points: [],
            path: pathData,
            style: {
              fill: '#2563eb',
              fillOpacity: 0.16,
              stroke: '#1e3a8a',
              strokeWidth: 1,
            },
          })

          const [x, y] = path.centroid(contour)
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue
          const centroidX = centroidXScale.invert(x)
          const centroidY = centroidYScale.invert(y)
          points.push({
            key,
            markId: id,
            group: contour.value,
            groupLabel: 'Density contour',
            datum: {
              id: key,
              centroidX,
              centroidY,
              density: contour.value,
            },
            datumIndex: index,
            xValue: centroidX,
            yValue: centroidY,
            x,
            y,
            color: '#2563eb',
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
          points,
        }
      },
    }
  })
}

export const mount = tanstackMount(
  densityDefinition,
  'Point density contours',
  {
    format: (point) =>
      `Density: ${densityPercent.format(point.datum.density)} · Centroid: (${densityCoordinate.format(point.datum.centroidX)}, ${densityCoordinate.format(point.datum.centroidY)})`,
  },
)
