import { defineChart, dot, mountChart } from '@tanstack/charts'
import type {
  ChartPoint,
  ChartSpatialIndex,
  ChartSpatialIndexFactory,
} from '@tanstack/charts'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'

const createDelaunayPointIndex: ChartSpatialIndexFactory<
  { x: number; y: number },
  number,
  number
> = (points): ChartSpatialIndex<{ x: number; y: number }, number, number> => {
  const data = [...points]
  const index = Delaunay.from(
    data,
    (point) => point.x,
    (point) => point.y,
  )

  return {
    findNearest(x, y, maxDistance = Infinity) {
      const point = data[index.find(x, y)]
      if (!point) return null
      const dx = point.x - x
      const dy = point.y - y
      return dx * dx + dy * dy <= maxDistance * maxDistance ? point : null
    },
  }
}

const definition = defineChart({
  marks: [dot([{ x: 0, y: 0 }], { x: 'x', y: 'y' })],
  scales: {
    x: { scale: scaleLinear().domain([-1, 1]) },
    y: { scale: scaleLinear().domain([-1, 1]) },
  },

  spatialIndex: createDelaunayPointIndex,
})

export function mount(element: HTMLElement) {
  return mountChart(element, {
    definition,
    ariaLabel: 'Dense points',
  })
}
