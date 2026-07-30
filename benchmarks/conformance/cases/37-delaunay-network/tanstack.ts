import { defineChart, dot, link } from '@tanstack/charts'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { spatialData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface DelaunayEdge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function delaunayEdges(
  points: ReturnType<typeof spatialData>,
): readonly DelaunayEdge[] {
  const delaunay = Delaunay.from(
    points,
    (point) => point.x,
    (point) => point.y,
  )
  const edges: DelaunayEdge[] = []

  const addEdge = (sourceIndex: number, targetIndex: number) => {
    const source = points[sourceIndex]
    const target = points[targetIndex]
    if (!source || !target) return
    edges.push({
      id: `${source.id}:${target.id}`,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
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

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const points = spatialData(input.revision)
    const edges = delaunayEdges(points)
    return {
      marks: [
        link(edges, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#94a3b8',
          strokeOpacity: 0.75,
          strokeWidth: 1,
        }),
        dot(points, {
          x: 'x',
          y: 'y',
          key: 'id',
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'X',
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'Y',
      },
    }
  })

export const mount = tanstackMount(definition, 'Delaunay spatial network')
