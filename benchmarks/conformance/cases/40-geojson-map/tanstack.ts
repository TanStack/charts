import { createMark, defineChart } from '@tanstack/charts'
import { geoIdentity, geoPath } from 'd3-geo'
import { regionCollection } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RegionFeature, RegionFeatureCollection } from './data'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const collection = regionCollection(input.revision)

  return {
    marks: [geoMark(collection)],
    x: null,
    y: null,
    guides: false,
    margin: 10,
  }
})

function geoMark(collection: RegionFeatureCollection) {
  return createMark<RegionFeature, never, never>(({ markIndex }) => {
    const id = `geo-${markIndex}`

    return {
      id,
      channels: {},
      render: ({ chart }) => {
        const projection = geoIdentity().fitExtent(
          [
            [chart.x, chart.y],
            [chart.x + chart.width, chart.y + chart.height],
          ],
          collection,
        )
        const path = geoPath(projection)
        const children: SceneNode[] = []

        for (const feature of collection.features) {
          const pathData = path(feature)
          if (pathData === null) continue
          children.push({
            kind: 'area',
            key: `${id}:${feature.id}`,
            points: [],
            path: pathData,
            style: {
              fill: feature.properties.fill,
              stroke: '#f8fafc',
              strokeWidth: 1.5,
              lineJoin: 'round',
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

export const mount = tanstackMount(definition, 'Regional GeoJSON choropleth')
