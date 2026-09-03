import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import { createChartRuntime } from '@tanstack/charts'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createExampleChart } from './tanstack'
import {
  projectedUnemploymentCounties,
  unemploymentCountyCollection,
} from './transform'
import type { UnemploymentCounty } from './transform'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneArea,
  SceneNode,
} from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned Albers USA choropleth', () => {
  it('fits every county through the public explicit-geometry descriptor', () => {
    const definition = createExampleChart(input)
    const scene = createChartRuntime<
      UnemploymentCounty,
      number,
      number
    >().render(definition, input)
    const points = scene.points
    const areas = areaNodes(scene.nodes)
    const expectedPath = geoPath(
      geoAlbersUsa().fitExtent(
        [
          [10, 10],
          [input.width - 10, input.height - 10],
        ],
        unemploymentCountyCollection,
      ),
    )
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<UnemploymentCounty>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<UnemploymentCounty, number, number>
    >()
    expect(points).toHaveLength(projectedUnemploymentCounties.length)
    expect(areas).toHaveLength(projectedUnemploymentCounties.length)
    expect(points.map(({ datum }) => datum)).toEqual(
      projectedUnemploymentCounties,
    )

    for (const index of [0, 1_570, projectedUnemploymentCounties.length - 1]) {
      const county = projectedUnemploymentCounties[index]!
      expect(points[index]?.datum).toBe(county)
      expect(areas[index]?.path).toBe(expectedPath(county))
    }
  })

  it('preserves the joined BLS row identity fields on every rendered county', () => {
    const sourceByFips = new Map(
      usCountyUnemployment.map((row) => [String(row.id).padStart(5, '0'), row]),
    )

    for (const county of projectedUnemploymentCounties) {
      const source = sourceByFips.get(String(county.id))
      if (!source) throw new Error(`Expected BLS row for county ${county.id}`)
      expect(county.properties).toMatchObject(source)
    }
  })

  it('keeps projection fitting in the public geo definition surface', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/109-us-state-choropleth/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("import { geoShape } from '@tanstack/charts/geo'")
    expect(source).toContain("import { geoAlbersUsa } from 'd3-geo'")
    expect(source).toContain('type: geoAlbersUsa')
    expect(source).toContain('fit: unemploymentCountyCollection')
    expect(source).not.toContain('fitUnemploymentProjection')
    expect(source).not.toContain('fitExtent(')
    expect(source).not.toContain('projection: ({ chart })')
  })
})

function areaNodes(nodes: readonly SceneNode[]) {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
