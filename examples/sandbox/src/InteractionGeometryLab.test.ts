import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createChartScene, findNearestPoint } from '@tanstack/charts'
import type { ChartPoint, SceneNode } from '@tanstack/charts'
import { focusX, focusY } from '@tanstack/charts/focus'
import {
  animatedDestinationDefinition,
  curvedPathLimitCases,
  facetFocusDefinitions,
  InteractionGeometryLab,
  legacyPointFocus,
  proofCases,
  type ProofDatum,
} from './InteractionGeometryLab'

describe('interaction geometry source disclosure', () => {
  it('renders contextual source beneath every before and after chart', () => {
    const markup = renderToStaticMarkup(createElement(InteractionGeometryLab))
    const groupedProofs = proofCases.filter((proof) => proof.grouped)

    expect(markup.match(/class="hit-region-proof__source"/g)).toHaveLength(
      proofCases.length * 2 + groupedProofs.length + 7,
    )
    expect(groupedProofs).toHaveLength(3)
    expect(proofCases).toHaveLength(30)
    expect(
      proofCases.filter((proof) => proof.renderer === 'canvas'),
    ).toHaveLength(15)
    expect(proofCases.filter((proof) => proof.renderer === 'svg')).toHaveLength(
      15,
    )
    expect(markup.match(/data-proof-renderer="canvas"/g)).toHaveLength(32)
    expect(markup.match(/data-proof-renderer="svg"/g)).toHaveLength(31)
    expect(markup.match(/data-animation-renderer=/g)).toHaveLength(2)
    expect(markup).toContain('data-animation-renderer="svg"')
    expect(markup).toContain('data-animation-renderer="canvas"')
    expect(markup.match(/data-curved-path-case=/g)).toHaveLength(2)
    expect(markup).toContain('data-curved-path-renderer="svg"')
    expect(markup).toContain('data-curved-path-renderer="canvas"')
    expect(markup).toContain('class="ts-chart-canvas__scene"')
    expect(markup).toContain('&lt;CanvasChart')
    expect(markup).toContain('&lt;Chart')
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
    expect(markup).toContain(
      'interaction: { point, affinity: &#x27;geometry&#x27; }',
    )
    expect(markup).toContain('facetedBarsDefinition(&#x27;x&#x27;)')
    expect(markup).toContain('facetedBarsDefinition(&#x27;y&#x27;)')
    expect(markup).toContain('{ match: &#x27;x&#x27; }')
    expect(markup).toContain('{ match: &#x27;y&#x27; }')
    expect(markup).toContain('layout: group({ padding: 0.16 })')
    expect(markup).toContain('facet(facetedGroupedBars, {')
    expect(markup).toContain('facet(facetedStackedBars, {')
    expect(markup).toContain('facet(facetedBubbles, {')
    expect(markup).toContain('dot(scatterRows, {')
    expect(markup).toContain('hexagon(hexbinCells, {')
    expect(markup).toContain('dot(nestedBubbles, {')
    expect(markup).toContain('barY(mixedVerticalBars, {')
    expect(markup).toContain('barX(mixedHorizontalBars, {')
    expect(markup).toContain('areaY(mixedAreaRows, {')
    expect(markup).toContain('rect(mixedCell, {')
    expect(markup).toContain('bar x · line x · dot xy')
    expect(markup).toContain('bar y · dot xy')
    expect(markup).toContain('area x · line x · dot xy')
    expect(markup).toContain('rect xy · dot xy · paint order')
    expect(markup.match(/data-proof-group-result=/g)).toHaveLength(3)
    expect(markup).toContain(
      'groupedInteractiveDefinition(mixedVerticalBase, &#x27;x&#x27;)',
    )
    expect(markup).toContain(
      'groupedInteractiveDefinition(mixedHorizontalBase, &#x27;y&#x27;)',
    )
    expect(markup).toContain(
      'groupedInteractiveDefinition(mixedAreaBase, &#x27;x&#x27;)',
    )
    expect(markup).toContain(
      'normalizedPolygonMark(&#x27;sankey&#x27;, sankey)',
    )
    expect(markup).toContain(
      'transition: { type: &#x27;tween&#x27;, duration: 700, easing: &#x27;ease-out&#x27; }',
    )
    expect(markup).toContain(
      'authoredCurveMark(&#x27;authored-curved-line&#x27;, curvedLineDatum, &#x27;line&#x27;)',
    )
    expect(markup).toContain(
      'authoredCurveMark(&#x27;authored-curved-area&#x27;, curvedAreaDatum, &#x27;area&#x27;)',
    )
    expect(markup).toContain('pathGeometry: scenePath((path) =&gt; {')
    expect(markup).not.toContain('packages/charts-core/src/nearest.ts')
  })
})

describe('intentional interaction contracts', () => {
  it('keeps grouped tooltip focus explicit on the mixed x and y examples', () => {
    const groupedProofs = proofCases.filter(
      (
        proof,
      ): proof is typeof proof & {
        grouped: NonNullable<typeof proof.grouped>
      } => proof.grouped !== undefined,
    )

    expect(groupedProofs.map((proof) => proof.id)).toEqual([
      'mixed-vertical-bars-line-dots',
      'mixed-horizontal-bars-dots',
      'mixed-area-line-dots',
    ])

    for (const proof of groupedProofs) {
      const scene = createChartScene(proof.grouped.definition, {
        width: 520,
        height: 230,
      })
      const probe = proof.probe(scene)
      expect(probe).not.toBeNull()
      if (!probe) continue

      const strategy = proof.grouped.axis === 'x' ? focusX : focusY
      const points = strategy.resolve(scene.points, probe.x, probe.y, 48)

      expect(proof.grouped.definition.focus).toBe(
        proof.grouped.axis === 'x' ? 'group-x' : 'group-y',
      )
      expect(points.map((point) => point.datum.label)).toEqual(
        proof.grouped.expected,
      )
    }
  })

  it('keeps default, x-sync, and y-sync facet focus separate', () => {
    const primary = createChartScene(facetFocusDefinitions.primary, {
      width: 520,
      height: 230,
    })
    const synchronizedX = createChartScene(facetFocusDefinitions.x, {
      width: 520,
      height: 230,
    })
    const synchronizedY = createChartScene(facetFocusDefinitions.y, {
      width: 520,
      height: 230,
    })

    const primaryLayers = flatten(primary.nodes).filter(
      (node): node is Extract<SceneNode, { kind: 'group' }> =>
        node.kind === 'group' && node.focus !== undefined,
    )
    const synchronizedXLayers = flatten(synchronizedX.nodes).filter(
      (node): node is Extract<SceneNode, { kind: 'group' }> =>
        node.kind === 'group' && node.focus !== undefined,
    )
    const synchronizedYLayers = flatten(synchronizedY.nodes).filter(
      (node): node is Extract<SceneNode, { kind: 'group' }> =>
        node.kind === 'group' && node.focus !== undefined,
    )
    expect(primaryLayers).toHaveLength(1)
    expect(primaryLayers.every((node) => node.focus?.match === 'primary')).toBe(
      true,
    )
    expect(synchronizedXLayers).toHaveLength(3)
    expect(
      synchronizedXLayers.filter((node) => node.focus?.match === 'x'),
    ).toHaveLength(2)
    expect(
      synchronizedXLayers.filter((node) => node.focus?.match === 'primary'),
    ).toHaveLength(1)
    expect(synchronizedYLayers).toHaveLength(3)
    expect(
      synchronizedYLayers.filter((node) => node.focus?.match === 'y'),
    ).toHaveLength(2)
    expect(
      synchronizedYLayers.filter((node) => node.focus?.match === 'primary'),
    ).toHaveLength(1)
  })

  it('keeps the animated case on a deliberately tight fallback threshold', () => {
    const scene = createChartScene(animatedDestinationDefinition, {
      width: 1_120,
      height: 270,
    })
    const middle = findRect(scene.nodes, 'animated-middle')

    expect(animatedDestinationDefinition.maxFocusDistance).toBe(12)
    expect(middle).not.toBeNull()
    expect(middle?.node.width).toBeLessThan(250)
  })

  it('resolves authored curves in both SVG and Canvas examples', () => {
    expect(curvedPathLimitCases.map((proof) => proof.renderer)).toEqual([
      'svg',
      'canvas',
    ])

    for (const proof of curvedPathLimitCases) {
      const scene = createChartScene(proof.definition, {
        width: 520,
        height: 230,
      })
      const probe = proof.probe(scene)
      const target = flatten(scene.nodes).find(
        (node) =>
          (node.kind === 'polyline' || node.kind === 'area') &&
          node.interaction !== undefined,
      )

      expect(probe).not.toBeNull()
      expect(target?.kind === 'polyline' || target?.kind === 'area').toBe(true)
      if (!probe || !target || target.kind === 'group') continue
      if (target.kind !== 'polyline' && target.kind !== 'area') continue

      expect(target.pathGeometry?.data).toContain('C')
      expect(target.pathGeometry?.contours[0]?.points.length).toBeGreaterThan(
        target.points.length,
      )
      expect(target.points).toHaveLength(proof.renderer === 'svg' ? 2 : 4)
      expect(findNearestPoint(scene, probe.x, probe.y, 48)).not.toBeNull()
    }
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

      const before = legacyPointFocus.resolve(
        scene.points,
        probe.x,
        probe.y,
        48,
      )[0]
      const after = findNearestPoint(scene, probe.x, probe.y, 48)

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
    const top = findRect(scene.nodes, 'october-other')
    const bottom = findRect(scene.nodes, 'october-disease')
    expect(top).not.toBeNull()
    expect(bottom).not.toBeNull()
    if (!top || !bottom) return

    const above =
      top.offsetY + Math.min(top.node.y, top.node.y + top.node.height)
    const below =
      bottom.offsetY +
      Math.max(bottom.node.y, bottom.node.y + bottom.node.height)

    expect(
      findNearestPoint(
        scene,
        scene.points.find((point) => point.datum.id === 'october-other')!.x,
        above - 12,
        48,
      )?.datum.id,
    ).toBe('october-other')
    expect(
      findNearestPoint(
        scene,
        scene.points.find((point) => point.datum.id === 'october-disease')!.x,
        below + 12,
        48,
      )?.datum.id,
    ).toBe('october-disease')
  })

  it('selects the painted side of each curved stack boundary', () => {
    for (const { id, orientation } of [
      { id: 'curved-vertical-stack', orientation: 'vertical' },
      { id: 'curved-horizontal-stack', orientation: 'horizontal' },
    ] as const) {
      const proof = proofCases.find((candidate) => candidate.id === id)
      expect(proof).toBeDefined()
      if (!proof) continue

      const scene = createChartScene(proof.after, { width: 520, height: 230 })
      const lower = flatten(scene.nodes).find(
        (node) =>
          node.kind === 'area' &&
          node.interaction !== undefined &&
          interactionPoints(node).some(
            (point) => (point.datum as ProofDatum).series === 'lower',
          ),
      )
      const sample = scene.points.find(
        (point) =>
          point.datum.series === 'upper' &&
          (orientation === 'vertical'
            ? point.datum.x === 2
            : point.datum.y === 2),
      )
      expect(lower?.kind).toBe('area')
      expect(sample).toBeDefined()
      if (!lower || lower.kind !== 'area' || !sample) continue

      const contour = lower.pathGeometry?.contours[0]
      expect(contour).toBeDefined()
      if (!contour) continue

      const boundary =
        orientation === 'vertical'
          ? Math.min(...contourIntersections(contour.points, sample.x, 'x'))
          : Math.max(...contourIntersections(contour.points, sample.y, 'y'))
      const probes =
        orientation === 'vertical'
          ? [
              { x: sample.x, y: boundary + 4, series: 'lower' },
              { x: sample.x, y: boundary, series: 'upper' },
              { x: sample.x, y: boundary - 4, series: 'upper' },
            ]
          : [
              { x: boundary - 4, y: sample.y, series: 'lower' },
              { x: boundary, y: sample.y, series: 'upper' },
              { x: boundary + 4, y: sample.y, series: 'upper' },
            ]

      for (const probe of probes) {
        expect(
          findNearestPoint(scene, probe.x, probe.y, 48)?.datum.series,
        ).toBe(probe.series)
      }
    }
  })

  it('keeps the large rectangle and polygon stress fixtures intact', () => {
    const rectangleProof = proofCases.find(
      (candidate) => candidate.id === 'dense-rectangles',
    )
    const polygonProof = proofCases.find(
      (candidate) => candidate.id === 'complex-polygons',
    )
    expect(rectangleProof).toBeDefined()
    expect(polygonProof).toBeDefined()
    if (!rectangleProof || !polygonProof) return

    const rectangleScene = createChartScene(rectangleProof.after, {
      width: 1_120,
      height: 320,
    })
    const polygonScene = createChartScene(polygonProof.after, {
      width: 1_120,
      height: 320,
    })

    expect(rectangleScene.points).toHaveLength(4_098)
    expect(polygonScene.points).toHaveLength(2_050)
    expect(
      flatten(polygonScene.nodes).reduce(
        (total, node) =>
          total +
          (node.kind === 'area' && node.interaction ? node.points.length : 0),
        0,
      ),
    ).toBe(13_318)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function interactionPoints(
  node: Extract<SceneNode, { kind: 'area' }>,
): readonly ChartPoint[] {
  const interaction = node.interaction
  if (!interaction) return []
  return interaction.point ? [interaction.point] : interaction.points
}

function contourIntersections(
  points: readonly (readonly [number, number])[],
  coordinate: number,
  axis: 'x' | 'y',
): number[] {
  const intersections: number[] = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    if (!start || !end) continue
    const primaryStart = axis === 'x' ? start[0] : start[1]
    const primaryEnd = axis === 'x' ? end[0] : end[1]
    if (
      coordinate < Math.min(primaryStart, primaryEnd) ||
      coordinate > Math.max(primaryStart, primaryEnd)
    ) {
      continue
    }
    if (primaryStart === primaryEnd) {
      intersections.push(axis === 'x' ? start[1] : start[0])
      intersections.push(axis === 'x' ? end[1] : end[0])
      continue
    }
    const amount = (coordinate - primaryStart) / (primaryEnd - primaryStart)
    intersections.push(
      axis === 'x'
        ? start[1] + (end[1] - start[1]) * amount
        : start[0] + (end[0] - start[0]) * amount,
    )
  }
  return intersections
}

function findRect(
  nodes: readonly SceneNode[],
  datumId: string,
  offsetX = 0,
  offsetY = 0,
): {
  node: Extract<SceneNode, { kind: 'rect' }>
  offsetX: number
  offsetY: number
} | null {
  for (const node of nodes) {
    if (node.kind === 'group') {
      const target = findRect(
        node.children,
        datumId,
        offsetX + (node.translateX ?? 0),
        offsetY + (node.translateY ?? 0),
      )
      if (target) return target
      continue
    }
    if (node.kind !== 'rect' || !node.interaction) continue
    const matches = node.interaction.point
      ? (node.interaction.point.datum as ProofDatum).id === datumId
      : node.interaction.points.some(
          (point) => (point.datum as ProofDatum).id === datumId,
        )
    if (matches) return { node, offsetX, offsetY }
  }
  return null
}
