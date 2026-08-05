import { penguins } from '@charts-poc/demo-data/penguins'
import { createMark, defineChart } from '@tanstack/charts'
import { contourDensity } from 'd3-contour'
import { geoPath, geoTransform } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import type { ContourMultiPolygon } from 'd3-contour'
import type { ConformanceInput } from '../../types'
import type { ChartPoint, SceneNode } from '@tanstack/charts'

type PenguinBill = PenguinsRow & {
  readonly culmen_length_mm: number
  readonly culmen_depth_mm: number
}

const densityBandwidth = 18
export const densityThresholds = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24]
export const densityXDomain: [number, number] = [30, 62]
export const densityYDomain: [number, number] = [12, 23]

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

export const densityDefinition = (input: ConformanceInput) => {
  const points = penguins
    .filter((row): row is PenguinBill => {
      return row.culmen_length_mm !== null && row.culmen_depth_mm !== null
    })
    .slice(input.revision * 8, input.revision * 8 + 320)

  return defineChart({
    marks: [densityMark(points, input.preview === true)],
    x: {
      scale: scaleLinear().domain(densityXDomain),
    },
    y: {
      scale: scaleLinear().domain(densityYDomain),
    },
    guides: false,
    margin: densityBandwidth * 1.5,
  })
}

function densityMark(data: PenguinBill[], preview: boolean) {
  return createMark<DensityContourDatum, number, number>(({ markIndex }) => {
    const id = `density-${markIndex}`

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: data.map((point) => point.culmen_length_mm),
        },
        y: {
          scale: 'y',
          values: data.map((point) => point.culmen_depth_mm),
        },
      },
      render: ({ chart, scales }) => {
        const estimator = contourDensity<PenguinBill>()
          .x((point) => scales.x.map(point.culmen_length_mm) - chart.x)
          .y((point) => scales.y.map(point.culmen_depth_mm) - chart.y)
          .size([chart.width, chart.height])
          .bandwidth(densityBandwidth)
          .thresholds(densityThresholds.map((threshold) => threshold / 100))
        const geometry: ContourMultiPolygon[] = estimator(data)

        const projection = geoTransform({
          point(x, y) {
            this.stream.point(chart.x + x, chart.y + y)
          },
        })
        const path = geoPath(projection)
        if (preview) path.digits(1)
        const children: SceneNode[] = []
        const points: ChartPoint<DensityContourDatum, number, number>[] = []
        const centroidXScale = scaleLinear()
          .domain(densityXDomain)
          .range([chart.x, chart.x + chart.width])
        const centroidYScale = scaleLinear()
          .domain(densityYDomain)
          .range([chart.y + chart.height, chart.y])

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
      `Density: ${densityPercent.format(point.datum.density)} · Bill centroid: (${densityCoordinate.format(point.datum.centroidX)} mm, ${densityCoordinate.format(point.datum.centroidY)} mm)`,
  },
)
