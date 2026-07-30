import { defineChart, dot, mountChart } from '@tanstack/charts'
import type {
  ChartPoint,
  ChartSpatialIndex,
  ChartSpatialIndexFactory,
} from '@tanstack/charts'
import { quadtree } from 'd3-quadtree'
import { scaleLinear } from 'd3-scale'

const createQuadtreePointIndex: ChartSpatialIndexFactory<
  { x: number; y: number },
  number,
  number
> = (points): ChartSpatialIndex<{ x: number; y: number }, number, number> => {
  const index = quadtree<ChartPoint<{ x: number; y: number }, number, number>>()
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
  spatialIndex: createQuadtreePointIndex,
})

export function mount(element: HTMLElement) {
  return mountChart(element, {
    definition,
    ariaLabel: 'Dense points',
  })
}
