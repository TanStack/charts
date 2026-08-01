import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createChartScene } from '../../../packages/charts-core/src/scene'
import { nearestPoint } from '../../../packages/charts-core/src/nearest'
import type { ChartPoint } from '@tanstack/charts'
import {
  InteractionGeometryLab,
  proofCases,
  type ProofDatum,
} from './InteractionGeometryLab'

describe('interaction geometry source disclosure', () => {
  it('renders contextual source beneath every before and after chart', () => {
    const markup = renderToStaticMarkup(createElement(InteractionGeometryLab))

    expect(markup.match(/class="hit-region-proof__source"/g)).toHaveLength(
      proofCases.length * 2,
    )
    expect(proofCases).toHaveLength(12)
    expect(markup).toContain('const stackedSeries = [')
    expect(markup).toContain('polarGuideMark(&#x27;polar-sector-guides&#x27;)')
    expect(markup).toContain(
      'normalizedPolygonMark(&#x27;radar&#x27;, radar, &#x27;polar&#x27;)',
    )
    expect(markup).toContain(
      'const beforeDefinition = interactiveDefinition(verticalBase, legacyPointFocus)',
    )
    expect(markup).toContain(
      'const afterDefinition = interactiveDefinition(verticalBase)',
    )
    expect(markup).toContain('focusAffinity: &#x27;geometry&#x27;')
    expect(markup).toContain(
      'hitRegion: { kind: &#x27;polygon&#x27;, points: polygon }',
    )
    expect(markup).not.toContain('packages/charts-core/src/nearest.ts')
  })
})

describe('interaction geometry proof gallery', () => {
  for (const proof of proofCases) {
    it(`${proof.id} demonstrates its before and after result`, () => {
      const scene = createChartScene(proof.after, {
        width: 520,
        height: 230,
      })
      const probe = proof.probe(scene)
      expect(probe).not.toBeNull()
      if (!probe) return

      const before = legacyNearest(scene.points, probe.x, probe.y, 48)
      const after = nearestPoint(scene.points, probe.x, probe.y, 48)

      expect(before?.datum.label ?? 'Nothing focused yet').toBe(
        proof.beforeExpected,
      )
      expect(after?.datum.label ?? 'Nothing focused yet').toBe(
        proof.afterExpected,
      )
    })
  }

  it('selects the nearest stacked segment outside the stack', () => {
    const proof = proofCases.find(
      (candidate) => candidate.id === 'stacked-bars',
    )
    expect(proof).toBeDefined()
    if (!proof) return

    const scene = createChartScene(proof.after, { width: 520, height: 230 })
    const top = scene.points.find((point) => point.datum.id === 'october-other')
    const bottom = scene.points.find(
      (point) => point.datum.id === 'october-disease',
    )
    expect(top?.hitRegion?.kind).toBe('rect')
    expect(bottom?.hitRegion?.kind).toBe('rect')
    if (top?.hitRegion?.kind !== 'rect' || bottom?.hitRegion?.kind !== 'rect')
      return

    const above = Math.min(
      top.hitRegion.y,
      top.hitRegion.y + top.hitRegion.height,
    )
    const below = Math.max(
      bottom.hitRegion.y,
      bottom.hitRegion.y + bottom.hitRegion.height,
    )

    expect(nearestPoint(scene.points, top.x, above - 12, 48)?.datum.id).toBe(
      'october-other',
    )
    expect(nearestPoint(scene.points, bottom.x, below + 12, 48)?.datum.id).toBe(
      'october-disease',
    )
  })
})

function legacyNearest<TDatum>(
  points: readonly ChartPoint<TDatum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  let result: ChartPoint<TDatum, number, number> | undefined
  let distance = Number.POSITIVE_INFINITY
  for (const point of points) {
    const candidate = (point.x - x) ** 2 + (point.y - y) ** 2
    if (candidate < distance) {
      result = point
      distance = candidate
    }
  }
  return distance <= maxDistance ** 2 ? result : null
}
