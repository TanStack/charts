import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, link } from '@tanstack/charts'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
  readonly 'power (hp)': number
}

interface DelaunayEdge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function delaunayEdges(
  points: readonly CompleteCar[],
): readonly DelaunayEdge[] {
  const delaunay = Delaunay.from(
    points,
    (point) => point['weight (lb)'],
    (point) => point['economy (mpg)'],
  )
  const edges: DelaunayEdge[] = []

  const addEdge = (sourceIndex: number, targetIndex: number) => {
    const source = points[sourceIndex]
    const target = points[targetIndex]
    if (!source || !target) return
    edges.push({
      id: `${source.name}:${source.year}:${target.name}:${target.year}`,
      x1: source['weight (lb)'],
      y1: source['economy (mpg)'],
      x2: target['weight (lb)'],
      y2: target['economy (mpg)'],
    })
  }

  for (let index = 0; index < delaunay.halfedges.length; index++) {
    const opposite = delaunay.halfedges[index]
    if (opposite > index) {
      addEdge(delaunay.triangles[index], delaunay.triangles[opposite])
    }
  }
  for (let index = 0; index < delaunay.hull.length; index++) {
    addEdge(
      delaunay.hull[index],
      delaunay.hull[(index + 1) % delaunay.hull.length],
    )
  }

  return edges
}

const definition = (input: ConformanceInput) => {
  const points = cars
    .filter((row): row is CompleteCar => {
      return row['economy (mpg)'] !== null && row['power (hp)'] !== null
    })
    .slice(input.revision * 3, input.revision * 3 + 24)
  const edges = delaunayEdges(points)
  return defineChart({
    marks: [
      link(edges, {
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        stroke: '#94a3b8',
        strokeOpacity: 0.75,
        strokeWidth: 1,
      }),
      dot(points, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        fill: '#2563eb',
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 4,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (lb)' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Fuel economy (mpg)' },
    },
  })
}

export const mount = tanstackMount(definition, 'Delaunay spatial network')
