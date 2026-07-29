import { geoShape } from '@tanstack/charts/geo'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { geoIdentity } from 'd3-geo'

const regions = [
  {
    type: 'Feature' as const,
    properties: { id: 'west' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [40, 0],
          [40, 40],
          [0, 40],
          [0, 0],
        ],
      ],
    },
  },
  {
    type: 'Feature' as const,
    properties: { id: 'east' },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [50, 0],
          [100, 0],
          [100, 40],
          [50, 40],
          [50, 0],
        ],
      ],
    },
  },
]

const collection = {
  type: 'FeatureCollection' as const,
  features: regions,
}

const definition = defineChart({
  marks: [
    geoShape(regions, {
      key: (region) => region.properties.id,
      projection: ({ chart }) =>
        geoIdentity().fitExtent(
          [
            [chart.x, chart.y],
            [chart.x + chart.width, chart.y + chart.height],
          ],
          collection,
        ),
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeWidth: 1,
    }),
  ],
  guides: false,
  margin: 8,
  x: null,
  y: null,
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Projected regions',
  })
}
