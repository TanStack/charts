import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { describe, expect, it } from 'vitest'
import { catalogPreviewDefinition } from '../../shared/preview'
import { radarCountries, radarEvents } from './selection'
import {
  createExampleChart,
  foldedDecathlon,
  normalizedDecathlon,
  radarProfiles,
} from './tanstack'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('folded comparative radar profiles', () => {
  it('normalizes the full population before selecting the first USA and GBR rows', () => {
    expect(foldedDecathlon).toHaveLength(decathlon.length * 4)
    expect(normalizedDecathlon).toHaveLength(decathlon.length * 4)
    expect(radarProfiles).toHaveLength(8)

    for (const Country of radarCountries) {
      const expected = decathlon.find((row) => row.Country === Country)
      const profile = radarProfiles.filter((row) => row.Country === Country)

      expect(profile.map(({ event }) => event)).toEqual(radarEvents)
      expect(
        profile.every(({ source }) => source[0]?.source[0] === expected),
      ).toBe(true)
      expect(
        profile.every(
          ({ relativePerformance }) =>
            relativePerformance >= 0 && relativePerformance <= 1,
        ),
      ).toBe(true)
    }
  })

  it('renders two stable four-point native areas', () => {
    const first = render()
    const repeated = render()
    const points = first.points.filter(
      ({ markId }) => markId === 'country-profiles',
    )

    expect(points).toHaveLength(8)
    expect(new Set(points.map(({ group }) => group))).toEqual(
      new Set(radarCountries),
    )
    expect(
      flatten(first.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(2)
    expect(new Set(points.map(({ key }) => key)).size).toBe(8)
    expect(repeated.points.map(({ key }) => key)).toEqual(
      first.points.map(({ key }) => key),
    )
  })

  it('maximizes both areas, rings, and spokes without preview labels', () => {
    const previewInput = {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    } satisfies ConformanceInput
    const scene = createChartRuntime().render(
      catalogPreviewDefinition(createExampleChart(previewInput)),
      previewInput,
    )
    const nodes = flatten(scene.nodes)
    expect(nodes.filter((node) => node.kind === 'label')).toHaveLength(0)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'polyline' && node.key.startsWith('ring:number:'),
      ),
    ).toHaveLength(5)
    expect(
      nodes.filter(
        (node) => node.kind === 'rule' && node.key.startsWith('spoke:string:'),
      ),
    ).toHaveLength(radarEvents.length)
    expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(2)
  })

  it('keeps fold, normalization, filtering, and selection beside the definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/99-comparative-radar/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/transform/fold'")
    expect(source).toContain('normalize(foldedDecathlon')
    expect(source).toContain('normalizedDecathlon.filter')
    expect(source).toContain('select(selectedCountries')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('extent(')
    expect(source).not.toContain('angleLabelBaseline')
  })
})

function render() {
  return createChartRuntime().render(createExampleChart(input), input)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
