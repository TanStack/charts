import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  angleGrid,
  polar,
  radialArc,
  radialArea,
  radialBarAngle,
  radialBarRadius,
  radialDot,
  radialGrid,
  radialLine,
  radialRule,
  radialText,
} from './polar'
import { createChartScene, defineChart } from './scene'
import type {
  PolarLayoutContext,
  PolarLength,
  PolarMark,
  PolarOptions,
} from './polar'
import type { SceneNode } from './types'

interface Row {
  id: string
  angle: number
  radius: number
}

interface ExtendedPolarOptions extends PolarOptions {
  applicationTag?: string
}

describe('polar scale registry', () => {
  it('exposes named scales to responsive length callbacks', () => {
    let observedScaleId: string | undefined
    const outerRadius: PolarLength = (layout) => {
      expectTypeOf(layout).toEqualTypeOf<PolarLayoutContext>()
      const namedRadius = layout.scales.namedRadius
      observedScaleId = namedRadius?.id
      return namedRadius?.map(1) ?? layout.radius
    }

    createChartScene(
      defineChart({
        marks: [
          polar({
            scales: {
              angle: null,
              radius: null,
              namedRadius: {
                channel: 'radius',
                scale: scaleLinear().domain([0, 1]),
              },
            },
            marks: [
              radialArc([{ startAngle: 0, endAngle: Math.PI }], {
                outerRadius,
              }),
            ],
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
      }),
      { width: 200, height: 200 },
    )

    expect(observedScaleId).toBe('namedRadius')
  })

  it('binds every scale-backed mark and both guides to named scales', () => {
    const angleLinear = scaleLinear().domain([0, 1])
    const angleBand = scaleBand<string>().domain(['A'])
    const radiusLinear = scaleLinear().domain([0, 1])
    const radiusBand = scaleBand<string>().domain(['ring'])
    const rows: readonly Row[] = [{ id: 'point', angle: 0.25, radius: 0.5 }]
    const definition = defineChart({
      marks: [
        polar({
          scales: {
            angle: null,
            radius: null,
            angleLinear: { channel: 'angle', scale: angleLinear },
            angleBand: { channel: 'angle', scale: angleBand },
            radiusLinear: { channel: 'radius', scale: radiusLinear },
            radiusBand: { channel: 'radius', scale: radiusBand },
          },
          guides: [
            angleGrid({
              scale: 'angleLinear',
              values: [0.25],
              labels: false,
            }),
            radialGrid({
              scale: 'radiusLinear',
              values: [0.5],
              labels: true,
            }),
            radialGrid({
              scale: 'radiusLinear',
              angleScale: 'angleBand',
              values: [0.75],
              shape: 'polygon',
            }),
          ],
          marks: [
            radialDot(rows, {
              id: 'named-dot',
              angle: 'angle',
              radius: 'radius',
              angleScale: 'angleLinear',
              radiusScale: 'radiusLinear',
            }),
            radialLine(rows, {
              angle: 'angle',
              radius: 'radius',
              angleScale: 'angleLinear',
              radiusScale: 'radiusLinear',
            }),
            radialArea(rows, {
              angle: 'angle',
              radius: 'radius',
              angleScale: 'angleLinear',
              radiusScale: 'radiusLinear',
            }),
            radialText(rows, {
              angle: 'angle',
              radius: 'radius',
              text: 'id',
              angleScale: 'angleLinear',
              radiusScale: 'radiusLinear',
            }),
            radialRule(rows, {
              angle: 'angle',
              radius1: 0,
              radius2: 'radius',
              angleScale: 'angleLinear',
              radiusScale: 'radiusLinear',
            }),
            radialBarRadius([{ id: 'radius-bar', angle: 'A', radius: 0.8 }], {
              angle: 'angle',
              radius: 'radius',
              angleScale: 'angleBand',
              radiusScale: 'radiusLinear',
            }),
            radialBarAngle([{ id: 'angle-bar', angle: 0.8, radius: 'ring' }], {
              angle: 'angle',
              radius: 'radius',
              angleScale: 'angleLinear',
              radiusScale: 'radiusBand',
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
    })

    const scene = createChartScene(definition, { width: 200, height: 200 })
    const nodes = flatten(scene.nodes)

    expect(scene.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          markId: 'named-dot',
          x: expect.closeTo(150, 6),
          y: expect.closeTo(100, 6),
        }),
      ]),
    )
    expect(nodes.some((node) => node.kind === 'rule')).toBe(true)
    expect(
      nodes.some((node) => node.kind === 'label' && node.text === '0.5'),
    ).toBe(true)
    expect(nodes.filter((node) => node.kind === 'area').length).toBeGreaterThan(
      2,
    )
    expect(angleLinear.range()).toEqual([0, 1])
    expect(angleBand.range()).toEqual([0, 1])
    expect(radiusLinear.range()).toEqual([0, 1])
    expect(radiusBand.range()).toEqual([0, 1])
  })

  it('validates reserved, missing, and cross-channel scale bindings', () => {
    const render = (options: PolarOptions) =>
      createChartScene(
        defineChart({
          marks: [polar(options)],
          scales: { x: null, y: null },
          guides: false,
        }),
        { width: 200, height: 200 },
      )
    const mark = radialDot([{ angle: 0.5, radius: 0.5 }], {
      id: 'selected-scale',
      angle: 'angle',
      radius: 'radius',
      angleScale: 'selected',
      radiusScale: 'radius',
    })

    expect(() =>
      render({
        scales: {
          angle: null,
          radius: { scale: scaleLinear().domain([0, 1]) },
        },
        marks: [mark],
      }),
    ).toThrow(
      /Polar mark "selected-scale" requires a configured angle scale "selected" in polar\.scales/,
    )

    expect(() =>
      render({
        scales: {
          angle: null,
          radius: { scale: scaleLinear().domain([0, 1]) },
          selected: {
            channel: 'radius',
            scale: scaleLinear().domain([0, 1]),
          },
        },
        marks: [mark],
      }),
    ).toThrow(/uses scale "selected" as angle, but it is configured for radius/)

    expect(() =>
      render({
        scales: {
          angle: null,
          radius: null,
          selected: { scale: scaleLinear().domain([0, 1]) },
        } as any,
        marks: [],
      }),
    ).toThrow(/Named polar scale "selected" requires channel/)

    expect(() =>
      render({
        scales: {
          angle: {
            channel: 'radius',
            scale: scaleLinear().domain([0, 1]),
          },
          radius: null,
        } as any,
        marks: [],
      }),
    ).toThrow(/reserved for angle but declares channel: "radius"/)

    expect(() =>
      render({
        scales: { angle: null } as any,
        marks: [],
      }),
    ).toThrow(/must define reserved `angle` and `radius` entries/)
  })

  it('keeps raw arcs scale-free with explicit reserved nulls', () => {
    const mark = radialArc([{ startAngle: 0, endAngle: Math.PI }])
    const scene = createChartScene(
      defineChart({
        marks: [
          polar({
            scales: { angle: null, radius: null },
            marks: [mark],
          }),
        ],
        scales: { x: null, y: null },
        guides: false,
      }),
      { width: 200, height: 200 },
    )

    expect(scene.points).toHaveLength(1)
    expectTypeOf(mark).toMatchTypeOf<
      PolarMark<unknown, number, number, never, never>
    >()
  })
})

if (false) {
  const namedDot = radialDot([{ angle: 1, radius: 0.5 }], {
    angle: 'angle',
    radius: 'radius',
    angleScale: 'quadrant',
    radiusScale: 'percent',
  })
  const defaultDot = radialDot([{ angle: 'A', radius: 0.5 }], {
    angle: 'angle',
    radius: 'radius',
  })
  const explicitUndefined = radialDot([{ angle: 1, radius: 0.5 }], {
    angle: 'angle',
    radius: 'radius',
    angleScale: undefined,
    radiusScale: undefined,
  })

  expectTypeOf(namedDot).toMatchTypeOf<
    PolarMark<unknown, number, number, 'quadrant', 'percent'>
  >()
  expectTypeOf(defaultDot).toMatchTypeOf<
    PolarMark<unknown, string, number, 'angle', 'radius'>
  >()
  expectTypeOf(explicitUndefined).toMatchTypeOf<
    PolarMark<unknown, number, number, 'angle', 'radius'>
  >()

  polar({
    scales: {
      // @ts-expect-error Scale-free marks require a null reserved angle entry.
      angle: { scale: scaleLinear() },
      radius: null,
    },
    marks: [radialArc([{ startAngle: 0, endAngle: Math.PI }])],
  })

  polar({
    scales: {
      // @ts-expect-error Scale-backed marks require a configured angle entry.
      angle: null,
      // @ts-expect-error Scale-backed marks require a configured radius entry.
      radius: null,
    },
    marks: [defaultDot],
  })

  const extended: ExtendedPolarOptions = {
    applicationTag: 'extended',
    scales: {
      angle: { scale: scaleBand<string>().domain(['A']) },
      radius: { scale: scaleLinear().domain([0, 1]) },
    },
    marks: [defaultDot],
  }
  polar(extended)

  polar({
    scales: {
      angle: { scale: scaleBand<string>().domain(['A']) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      quadrant: { channel: 'angle', scale: scaleLinear().domain([0, 4]) },
      percent: { channel: 'radius', scale: scaleLinear().domain([0, 1]) },
    },
    marks: [defaultDot, namedDot],
  })
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.kind === 'group') result.push(...flatten(node.children))
  }
  return result
}
