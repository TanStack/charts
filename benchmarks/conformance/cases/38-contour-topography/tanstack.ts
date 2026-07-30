import { createMark, defineChart } from '@tanstack/charts'
import { contours } from 'd3-contour'
import { geoPath, geoTransform } from 'd3-geo'
import { scaleThreshold } from 'd3-scale'
import { contourThresholds, windSpeedGrid } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ContourMultiPolygon } from 'd3-contour'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const colors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

const definition = (input: ConformanceInput) => {
  const grid = windSpeedGrid(input.revision)
  const geometry = contours()
    .size([grid.width, grid.height])
    .thresholds([...contourThresholds])(grid.values)

  return defineChart({
    marks: [contourMark(geometry, grid.width, grid.height)],
    color: {
      scale: scaleThreshold<number, string>,
      domain: contourThresholds.slice(1),
      range: colors,
    },
    margin: 12,
  })
}

function contourMark(
  geometry: readonly ContourMultiPolygon[],
  gridWidth: number,
  gridHeight: number,
) {
  return createMark<ContourMultiPolygon, never, never>(({ markIndex }) => {
    const id = `contour-${markIndex}`

    return {
      id,
      channels: {
        color: {
          scale: 'color',
          values: geometry.map((contour) => contour.value),
        },
      },
      render: ({ chart, color }) => {
        const projection = geoTransform({
          point(x, y) {
            this.stream.point(
              chart.x + (x / gridWidth) * chart.width,
              chart.y + chart.height - (y / gridHeight) * chart.height,
            )
          },
        })
        const path = geoPath(projection)
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
              fill: color(contour.value),
              stroke: '#ffffff',
              strokeWidth: 0.75,
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

export const mount = tanstackMount(definition, 'Filled wind-speed contours')
