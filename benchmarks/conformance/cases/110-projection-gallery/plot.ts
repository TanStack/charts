import * as Plot from '@observablehq/plot'
import { worldLand, worldSphere } from '@charts-poc/demo-data/country-atlas'
import { projectionGalleryData } from './projection'
import type { ConformanceInput, ConformanceMount } from '../../types'
import type { GeoProjection } from 'd3-geo'

const svgNamespace = 'http://www.w3.org/2000/svg'
const projectionColors = [
  ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'],
  ['#1d4ed8', '#6d28d9', '#0e7490', '#c2410c'],
]

function render(input: ConformanceInput): SVGSVGElement {
  const root = document.createElementNS(svgNamespace, 'svg')
  root.setAttribute('width', String(input.width))
  root.setAttribute('height', String(input.height))
  root.setAttribute('viewBox', `0 0 ${input.width} ${input.height}`)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'Standard world projection gallery')
  root.style.color = 'inherit'

  const projections = projectionGalleryData()
  const projectionColorDomain = projections.map(({ id }) => id)

  projections.forEach((entry, index) => {
    const pane = projectionPane(
      { x: 0, y: 0, width: input.width, height: input.height },
      index,
    )
    const plot = Plot.plot({
      width: pane.width,
      height: pane.height,
      margin: 0,
      projection: {
        type: ({ width, height }: { width: number; height: number }) =>
          fitGalleryProjection(entry.create(), { x: 0, y: 0, width, height }),
        clip: false,
      },
      color: {
        domain: projectionColorDomain,
        range: projectionColors[input.revision % 2] ?? projectionColors[0],
      },
      marks: [
        Plot.geo([worldSphere], {
          fill: 'none',
          stroke: 'currentColor',
          strokeOpacity: 0.5,
          strokeWidth: 0.8,
        }),
        Plot.geo([worldLand], {
          fill: () => entry.id,
          fillOpacity: 0.78,
          stroke: 'currentColor',
          strokeOpacity: 0.28,
          strokeWidth: 0.45,
        }),
      ],
    })
    plot.setAttribute('x', String(pane.x))
    plot.setAttribute('y', String(pane.y))
    plot.setAttribute('aria-hidden', 'true')
    plot.removeAttribute('aria-label')
    plot.removeAttribute('role')
    plot.removeAttribute('style')
    root.append(plot)
  })

  return root
}

export const mount: ConformanceMount = (container, input) => {
  let root = render(input)
  container.append(root)

  return {
    update(nextInput) {
      const nextRoot = render(nextInput)
      root.replaceWith(nextRoot)
      root = nextRoot
    },
    destroy() {
      root.remove()
    },
  }
}

interface ProjectionPane {
  x: number
  y: number
  width: number
  height: number
}

function projectionPane(bounds: ProjectionPane, index: number): ProjectionPane {
  const leftWidth = Math.floor(bounds.width / 2)
  const topHeight = Math.floor(bounds.height / 2)
  const column = index % 2
  const row = Math.floor(index / 2)
  const width = column === 0 ? leftWidth : bounds.width - leftWidth
  const height = row === 0 ? topHeight : bounds.height - topHeight

  return {
    x: bounds.x + (column === 0 ? 0 : leftWidth),
    y: bounds.y + (row === 0 ? 0 : topHeight),
    width,
    height,
  }
}

function fitGalleryProjection(
  projection: GeoProjection,
  { x, y, width, height }: ProjectionPane,
  inset = 8,
): GeoProjection {
  return projection.fitExtent(
    [
      [x + inset, y + inset],
      [x + width - inset, y + height - inset],
    ],
    worldSphere,
  )
}
