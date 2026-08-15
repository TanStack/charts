import { scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { lineY } from './line'
import { compositeMark } from './mark-composite'
import { decorative } from './mark-decorative'
import { ruleY } from './rule'
import { createChartScene, defineChart } from './scene'
import { text } from './text'
import { waffleY } from './waffle'
import type {
  ChartMarkDatum,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkScaleX,
  ChartMarkScaleY,
  SceneNode,
} from './types'

interface Row {
  id: string
  x: number
  y: number
}

const rows: readonly Row[] = [
  { id: 'a', x: 0, y: 1 },
  { id: 'b', x: 1, y: 9 },
  { id: 'c', x: 2, y: 4 },
]

describe('decorative mark', () => {
  it('keeps line geometry and domains while a dot layer solely owns interaction', () => {
    const trend = decorative(
      lineY(rows, {
        id: 'trend',
        x: 'x',
        y: 'y',
        key: 'id',
      }),
    )
    const scene = createChartScene(
      defineChart({
        marks: [
          trend,
          dot(rows, {
            id: 'observations',
            x: 'x',
            y: 'y',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
      }),
      { width: 360, height: 220 },
    )
    const polylines = flatten(scene.nodes).filter(
      (node) => node.kind === 'polyline',
    )

    expect(scene.scales.x.domain).toEqual([0, 2])
    expect(scene.scales.y.domain).toEqual([1, 9])
    expect(scene.points).toHaveLength(rows.length)
    expect(scene.points.every((point) => point.markId === 'observations')).toBe(
      true,
    )
    expect(polylines).toHaveLength(1)
    expect(polylines[0]).not.toHaveProperty('interaction')
    expectTypeOf<ChartMarkPointX<typeof trend>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkPointY<typeof trend>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkDatum<typeof trend>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkScaleX<typeof trend>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkScaleY<typeof trend>>().toEqualTypeOf<number>()
  })

  it('is idempotent for marks that already emit no points', () => {
    const threshold = decorative(
      decorative(ruleY([4], { id: 'threshold', stroke: '#dc2626' })),
    )
    const scene = createChartScene(
      defineChart({
        marks: [threshold],
        y: { scale: scaleLinear().domain([0, 8]) },
        guides: false,
        focusRing: false,
      }),
      { width: 240, height: 120 },
    )

    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'rule'),
    ).toHaveLength(1)
    expect(scene.points).toHaveLength(0)
  })

  it('runs resolved post-domain work before stripping Waffle interaction', () => {
    const source = waffleY(
      [
        { id: 'a', group: 'Alpha', value: 2 },
        { id: 'b', group: 'Beta', value: 3 },
      ],
      {
        id: 'units',
        y: 'value',
        color: 'group',
        unit: 1,
        columns: 5,
      },
    )
    let pointsBeforeDecoration = -1
    const resolvedPostDomain: typeof source = {
      ...source,
      initialize(context: Parameters<typeof source.initialize>[0]) {
        const initialized = source.initialize(context)
        const resolveLayout = initialized.resolveLayout
        if (!resolveLayout) throw new Error('Expected a resolved-layout mark')
        return {
          ...initialized,
          resolveLayout(layoutContext: Parameters<typeof resolveLayout>[0]) {
            const resolved = resolveLayout(layoutContext)
            return {
              ...resolved,
              postDomain(
                scene: Parameters<NonNullable<typeof resolved.postDomain>>[0],
              ) {
                pointsBeforeDecoration = scene.points?.length ?? 0
                return resolved.postDomain ? resolved.postDomain(scene) : scene
              },
            }
          },
        }
      },
    }
    const scene = createChartScene(
      defineChart({
        marks: [decorative(resolvedPostDomain)],
        guides: false,
        focusRing: false,
      }),
      { width: 240, height: 140 },
    )

    expect(pointsBeforeDecoration).toBe(2)
    expect(scene.points).toHaveLength(0)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'rect'),
    ).toHaveLength(5)
    expect(scene.colors.domain).toEqual(['Alpha', 'Beta'])
  })

  it('preserves label layout participation while removing label points', () => {
    const labels = [{ id: 'edge', x: 10, y: 5, label: 'Edge label' }]
    const source = text(labels, {
      id: 'edge-label',
      x: 'x',
      y: 'y',
      text: 'label',
      key: 'id',
      dx: 28,
    })
    const definition = (mark: typeof source) =>
      defineChart({
        marks: [mark],
        x: { scale: scaleLinear().domain([0, 10]) },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
        focusRing: false,
      })
    const ordinary = createChartScene(definition(source), {
      width: 240,
      height: 120,
    })
    const decoration = createChartScene(definition(decorative(source)), {
      width: 240,
      height: 120,
    })

    expect(decoration.chart).toEqual(ordinary.chart)
    expect(decoration.points).toHaveLength(0)
    expect(
      flatten(decoration.nodes).filter((node) => node.kind === 'label'),
    ).toMatchObject([
      {
        kind: 'label',
        text: 'Edge label',
      },
    ])
  })

  it('rejects focus and state behavior instead of silently disabling it', () => {
    const focused = whenFocused(
      dot(rows, { id: 'focused', x: 'x', y: 'y', key: 'id' }),
      { match: 'primary' },
    )
    expect(() => decorative(focused).initialize({ markIndex: 0 })).toThrow(
      'with focus or state behavior',
    )

    const nested = decorative(
      compositeMark(
        [
          whenFocused(
            dot(rows, { id: 'nested-focus', x: 'x', y: 'y', key: 'id' }),
            { match: 'primary', retarget: true },
          ),
        ],
        { id: 'nested-composite' },
      ),
    )
    expect(() =>
      createChartScene(
        defineChart({
          marks: [nested],
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
          guides: false,
          focusRing: false,
        }),
        { width: 320, height: 180 },
      ),
    ).toThrow('scene geometry with focus or state behavior')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.kind === 'group' ? flatten(node.children) : []),
  ])
}
