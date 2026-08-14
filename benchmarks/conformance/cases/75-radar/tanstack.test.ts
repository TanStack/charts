import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { decathlon } from '@charts-poc/demo-data/decathlon'
import { describe, expect, it } from 'vitest'
import { catalogPreviewDefinition } from '../../shared/preview'
import { radarEvents, timedEvents } from './selection'
import {
  foldedDecathlon,
  normalizedDecathlon,
  radarDefinition,
  radarProfile,
} from './tanstack'
import type { ConformanceInput } from '../../types'
import type { SceneNode } from '@tanstack/charts'

const input = {
  width: 640,
  height: 400,
  revision: 0,
} satisfies ConformanceInput

describe('folded radar profile', () => {
  it('folds and normalizes all rows before selecting the first profile', () => {
    expect(foldedDecathlon).toHaveLength(decathlon.length * 4)
    expect(foldedDecathlon.slice(0, 4).map(({ event }) => event)).toEqual(
      radarEvents,
    )
    expect(normalizedDecathlon).toHaveLength(decathlon.length * 4)
    expect(radarProfile).toHaveLength(4)
    expect(radarProfile.map(({ event }) => event)).toEqual(radarEvents)

    for (const point of radarProfile) {
      expect(point.Country).toBe(decathlon[0]?.Country)
      expect(point.source[0]?.source[0]).toBe(decathlon[0])
      expect(point.relativePerformance).toBeGreaterThanOrEqual(0)
      expect(point.relativePerformance).toBeLessThanOrEqual(1)
    }

    for (const event of radarEvents) {
      const rows = normalizedDecathlon.filter((row) => row.event === event)
      const minimum = rows.reduce((left, right) =>
        left.result < right.result ? left : right,
      )
      const maximum = rows.reduce((left, right) =>
        left.result > right.result ? left : right,
      )
      expect(minimum.relativePerformance).toBe(timedEvents.has(event) ? 1 : 0)
      expect(maximum.relativePerformance).toBe(timedEvents.has(event) ? 0 : 1)
    }
  })

  it('renders one stable native area on a zero-to-one radius scale', () => {
    const first = render()
    const repeated = render()
    const points = first.points.filter(
      ({ markId }) => markId === 'athlete-profile',
    )
    const labels = flatten(first.nodes).filter((node) => node.kind === 'label')

    expect(points).toHaveLength(4)
    expect(points.map(({ yValue }) => yValue)).toEqual(
      radarProfile.map(({ relativePerformance }) => relativePerformance),
    )
    expect(
      flatten(first.nodes).filter((node) => node.kind === 'area'),
    ).toHaveLength(1)
    expect(
      labels.map((node) => (node.kind === 'label' ? node.text : '')),
    ).toEqual(expect.arrayContaining(['20', '40', '60', '80', '100']))
    expect(repeated.points.map(({ key }) => key)).toEqual(
      first.points.map(({ key }) => key),
    )
  })

  it('maximizes the rings, spokes, and area without preview labels', () => {
    const previewInput = {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    } satisfies ConformanceInput
    const scene = createChartRuntime().render(
      catalogPreviewDefinition(radarDefinition(previewInput)),
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
    expect(nodes.filter((node) => node.kind === 'area')).toHaveLength(1)
  })

  it('keeps the transform composition visible and removes D3 extent preparation', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/75-radar/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("from '@tanstack/charts/transform/fold'")
    expect(source).toContain('normalize(foldedDecathlon')
    expect(source).toContain('select(normalizedDecathlon')
    expect(source).not.toMatch(/from ['"]\.\/transform['"]/u)
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('extent(')
    expect(source).not.toContain('angleLabelBaseline')
  })
})

function render() {
  return createChartRuntime().render(radarDefinition(input), input)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
