import { defineChart, dot, mountChart } from '@tanstack/charts'
import type {
  ChartPoint,
  ChartSpatialIndex,
  ChartSpatialIndexFactory,
} from '@tanstack/charts'
import { quadtree } from 'd3-quadtree'
import { scaleLinear } from 'd3-scale'

const createQuadtreePointIndex: ChartSpatialIndexFactory<unknown> = (
  points,
): ChartSpatialIndex<unknown> => {
  const index = quadtree<ChartPoint<unknown>>()
    .x((point) => point.x)
    .y((point) => point.y)
    .addAll([...points])

  return {
    findNearest: (x, y, maxDistance = Infinity) =>
      index.find(x, y, maxDistance) ?? null,
  }
}

const definition = defineChart({
  marks: [dot([{ x: 0, y: 0 }], { x: 'x', y: 'y' })],
  x: { scale: scaleLinear().domain([-1, 1]) },
  y: { scale: scaleLinear().domain([-1, 1]) },
})

export function mount(element: HTMLElement) {
  return mountChart(element, {
    definition,
    ariaLabel: 'Dense points',
    spatialIndex: createQuadtreePointIndex,
  })
}
