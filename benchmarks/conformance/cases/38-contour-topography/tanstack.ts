import { createMark, defineChart } from '@tanstack/charts'
import { contours } from 'd3-contour'
import { geoPath, geoTransform } from 'd3-geo'
import { contourColor, contourGrid, contourThresholds } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ContourMultiPolygon } from 'd3-contour'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const grid = contourGrid(input.revision)
  const geometry = contours()
    .size([grid.width, grid.height])
    .thresholds([...contourThresholds])(grid.values)

  return {
    marks: [contourMark(geometry, grid.width, grid.height)],
    x: null,
    y: null,
    guides: false,
    margin: 12,
  }
})

function contourMark(
  geometry: readonly ContourMultiPolygon[],
  gridWidth: number,
  gridHeight: number,
) {
  return createMark<ContourMultiPolygon, never, never>(({ markIndex }) => {
    const id = `contour-${markIndex}`

    return {
      id,
      channels: {},
      render: ({ chart }) => {
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
              fill: contourColor(contour.value),
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

export const mount = tanstackMount(definition, 'Filled topographic contours')
