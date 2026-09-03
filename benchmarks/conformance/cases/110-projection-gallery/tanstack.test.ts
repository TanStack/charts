import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { geoPath } from 'd3-geo'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { worldLand, worldSphere } from '@tanstack/charts-data/country-atlas'
import { projectionGalleryData } from './projection'
import { createExampleChart } from './tanstack'
import type { LandFeature } from '@tanstack/charts-data/country-atlas'
import type {
  ChartScene,
  ChartSpecDatum,
  SceneArea,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import type { GeoSphere } from 'd3-geo'
import type { ConformanceInput } from '../../types'

const palettes = [
  ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'],
  ['#1d4ed8', '#6d28d9', '#0e7490', '#c2410c'],
] as const

describe('declarative projection gallery', () => {
  it.each([
    { width: 640, height: 400 },
    { width: 321, height: 241 },
  ])('facets four fitted geo charts at $width×$height', ({ width, height }) => {
    const scene = render(width, height, 0)
    const cells = facetCells(scene)
    const projections = projectionGalleryData()
    const cellWidth = width / 2
    const cellHeight = height / 2

    expect(cells).toHaveLength(4)
    expect(
      cells.map(({ translateX, translateY }) => [translateX, translateY]),
    ).toEqual([
      [0, 0],
      [cellWidth, 0],
      [0, cellHeight],
      [cellWidth, cellHeight],
    ])

    const allAreas = cells.flatMap((cell) => sceneAreas(cell.children))
    expect(allAreas).toHaveLength(8)
    expect(new Set(allAreas.map(({ key }) => key)).size).toBe(8)

    projections.forEach((entry, index) => {
      const cell = cells[index]!
      const areas = sceneAreas(cell.children)
      const path = geoPath(
        entry.create().fitExtent(
          [
            [8, 8],
            [cellWidth - 8, cellHeight - 8],
          ],
          worldSphere,
        ),
      )

      expect(cell.key).toContain(entry.id)
      expect(areas).toHaveLength(2)
      expect(areas.map(({ path: pathData }) => pathData)).toEqual([
        path(worldSphere),
        path(worldLand),
      ])
      expect(areas.every(({ key }) => key.includes(entry.id))).toBe(true)
    })
  })

  it('changes only land paint across revisions', () => {
    const first = render(640, 400, 0)
    const revised = render(640, 400, 1)
    const firstAreas = sceneAreas(first.nodes)
    const revisedAreas = sceneAreas(revised.nodes)
    const firstLandFills = firstAreas
      .map(({ style }) => style?.fill)
      .filter((fill) => fill !== 'none')
    const revisedLandFills = revisedAreas
      .map(({ style }) => style?.fill)
      .filter((fill) => fill !== 'none')

    expect(revisedAreas.map(({ key }) => key)).toEqual(
      firstAreas.map(({ key }) => key),
    )
    expect(revisedAreas.map(({ path }) => path)).toEqual(
      firstAreas.map(({ path }) => path),
    )
    expect(firstLandFills).toEqual(palettes[0])
    expect(revisedLandFills).toEqual(palettes[1])
  })

  it('preserves child geo datum types and identity through the facet', () => {
    const scene = render(640, 400, 0)
    type Datum = ChartSpecDatum<ReturnType<typeof createExampleChart>>

    expectTypeOf<Datum>().toEqualTypeOf<GeoSphere | LandFeature>()
    expect(
      scene.points.filter(({ datum }) => datum === worldLand),
    ).toHaveLength(4)
  })

  it('uses current facet and geo descriptors without manual pane math', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/110-projection-gallery/example.tsx',
      ),
      'utf8',
    )
    const projectionSource = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/110-projection-gallery/projection.ts',
      ),
      'utf8',
    )

    expect(source).toContain('facetChart(projections, {')
    expect(source).toContain("fit: 'sphere'")
    expect(source).toContain('inset: 8')
    expect(source).toContain('columns: 2')
    expect(source).toContain('gap: 0')
    expect(source).toContain('label: false')
    expect(source).not.toContain('projectionPane')
    expect(source).not.toContain('fitGalleryProjection')
    expect(source).not.toContain('fitExtent')
    expect(source).not.toContain('({ chart })')
    expect(projectionSource).not.toContain('projectionPane')
    expect(projectionSource).not.toContain('fitGalleryProjection')
    expect(projectionSource).not.toContain('fitExtent')
  })
})

function render(width: number, height: number, revision: number) {
  const input = { width, height, revision } satisfies ConformanceInput
  return createChartRuntime().render(createExampleChart(input), input)
}

function facetCells(scene: ChartScene): SceneGroup[] {
  return flatten(scene.nodes).filter(
    (node): node is SceneGroup =>
      node.kind === 'group' && node.className === 'ts-chart__facet-cell',
  )
}

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
