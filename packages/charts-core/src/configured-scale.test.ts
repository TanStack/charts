import {
  scaleBand,
  scaleIdentity,
  scaleLinear,
  scaleLog,
  scaleQuantize,
  scaleUtc,
} from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { barY } from './bar'
import { createChartScene, defineChart } from './scene'
import { lineY } from './line'
import { ruleY } from './rule'
import { resolveScaleInput } from './scale-input'
import type {
  ChartPositionScaleOptions,
  ChartScale,
  ChartSpec,
  ConfiguredScaleLike,
} from './types'

describe('configured scales', () => {
  it('requires explicit positional scale decisions in chart definitions', () => {
    // @ts-expect-error Both positional dimensions must supply a scale or null.
    const invalid = defineChart({ marks: [lineY([1, 2, 3])] })

    expect(invalid.marks).toHaveLength(1)
  })

  it('accepts D3 scales directly', () => {
    const definition = defineChart({
      marks: [lineY([4, 9, 7])],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 10]) },
    })
    const scene = createChartScene(definition, {
      width: 480,
      height: 260,
    })

    expect(scene.scales.x.domain).toEqual([0, 2])
    expect(scene.scales.x.map(2)).toBe(scene.chart.x + scene.chart.width)
    expect(scene.scales.y.map(10)).toBe(scene.chart.y)
  })

  it('infers factory domains from materialized mark channels', () => {
    const rows = [
      { category: 'Beta', value: 4 },
      { category: 'Alpha', value: 9 },
      { category: 'Beta', value: 7 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'category', y: 'value' })],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual(['Beta', 'Alpha'])
    expect(scene.scales.y.domain).toEqual([4, 9])
  })

  it('supports factory options and post-domain nicening', () => {
    const rows = [
      { date: new Date('2026-01-03T00:00:00Z'), value: 4.2 },
      { date: new Date('2026-01-08T00:00:00Z'), value: 8.7 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'date', y: 'value' })],
        x: { scale: scaleUtc, nice: true },
        y: { scale: () => scaleLinear().clamp(true), nice: true },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain[0]).toBeInstanceOf(Date)
    expect(scene.scales.x.domain[1]).toBeInstanceOf(Date)
    expect(scene.scales.y.domain).toEqual([4, 9])
  })

  it('keeps configured instance domains authoritative', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([10, 20, 30])],
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 100]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 100])
  })

  it('maps a continuous semantic viewport while retaining its content domain', () => {
    const rows = [0, 10, 20, 30].map((x) => ({ x, y: x / 3 }))
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y' })],
        x: {
          scale: scaleLinear,
          viewport: { domain: [10, 20], translate: 24 },
          axis: { ticks: { count: 3 } },
        },
        y: { scale: scaleLinear().domain([0, 10]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([10, 20])
    expect(scene.scales.x.viewport?.contentDomain).toEqual([0, 30])
    expect(scene.scales.x.viewport?.domain).toEqual([10, 20])
    expect(scene.scales.x.viewport?.translate).toBe(24)
    expect(scene.scales.x.map(10)).toBe(scene.chart.x)
    expect(scene.scales.x.map(20)).toBe(scene.chart.x + scene.chart.width)
    expect(scene.scales.x.viewport?.map(10)).toBe(scene.chart.x + 24)
    expect(
      scene.scales.x.ticks.every(
        (tick) => Number(tick.value) >= 10 && Number(tick.value) <= 20,
      ),
    ).toBe(true)
  })

  it('supports temporal viewport domains without mutating their source scale', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const middle = new Date('2026-01-08T00:00:00Z')
    const end = new Date('2026-01-15T00:00:00Z')
    const source = scaleUtc().domain([start, end])
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { at: start, value: 1 },
              { at: middle, value: 2 },
              { at: end, value: 3 },
            ],
            { x: 'at', y: 'value' },
          ),
        ],
        x: { scale: source, viewport: { domain: [middle, end] } },
        y: { scale: scaleLinear().domain([0, 3]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([middle, end])
    expect(scene.scales.x.viewport?.contentDomain).toEqual([start, end])
    expect(source.domain()).toEqual([start, end])
  })

  it('snapshots authored viewport dates and maps reversed x and y ranges', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const middle = new Date('2026-01-08T00:00:00Z')
    const end = new Date('2026-01-15T00:00:00Z')
    const viewportDomain: [Date, Date] = [middle, end]
    const temporal = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { at: start, value: 0 },
              { at: middle, value: 1 },
              { at: end, value: 2 },
            ],
            { x: 'at', y: 'value' },
          ),
        ],
        x: {
          scale: scaleUtc().domain([start, end]),
          viewport: { domain: viewportDomain, translate: -10 },
          reverse: true,
        },
        y: { scale: scaleLinear().domain([0, 2]) },
      }),
      { width: 480, height: 260 },
    )
    const captured = temporal.scales.x.viewport?.domain
    const expectedDomain = captured?.map(Number)
    viewportDomain[0].setUTCFullYear(2030)
    viewportDomain[1] = new Date('2031-01-01T00:00:00Z')

    expect(captured?.map(Number)).toEqual(expectedDomain)
    expect(temporal.scales.x.map(captured?.[0])).toBe(
      temporal.chart.x + temporal.chart.width,
    )
    expect(temporal.scales.x.map(captured?.[1])).toBe(temporal.chart.x)
    expect(temporal.scales.x.viewport?.map(captured?.[0])).toBe(
      temporal.chart.x + temporal.chart.width - 10,
    )

    const numeric = createChartScene(
      defineChart({
        marks: [lineY([0, 10, 20, 30])],
        x: { scale: scaleLinear().domain([0, 3]) },
        y: {
          scale: scaleLinear().domain([0, 30]),
          viewport: { domain: [10, 20], translate: 12 },
          reverse: true,
        },
      }),
      { width: 480, height: 260 },
    )
    expect(numeric.scales.y.map(10)).toBe(numeric.chart.y)
    expect(numeric.scales.y.map(20)).toBe(
      numeric.chart.y + numeric.chart.height,
    )
    expect(numeric.scales.y.viewport?.map(10)).toBe(numeric.chart.y + 12)
  })

  it('rejects categorical and invalid viewport configurations', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            lineY([{ category: 'A', value: 1 }], {
              x: 'category',
              y: 'value',
            }),
          ],
          x: {
            scale: scaleBand<string>,
            viewport: { domain: ['A', 'B'] },
          } as unknown as ChartPositionScaleOptions<any>,
          y: { scale: scaleLinear().domain([0, 1]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('requires a continuous numeric or temporal scale')

    for (const viewport of [
      { domain: [1, 1] as const },
      { domain: [0, Number.NaN] as const },
      { domain: [0, 1] as const, translate: Number.POSITIVE_INFINITY },
    ]) {
      expect(() =>
        createChartScene(
          defineChart({
            marks: [lineY([0, 1])],
            x: { scale: scaleLinear, viewport },
            y: { scale: scaleLinear().domain([0, 1]) },
          }),
          { width: 480, height: 260 },
        ),
      ).toThrow(/viewport/)
    }
  })

  it('requires an invertible unclamped viewport scale', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 100])],
          x: {
            scale: scaleQuantize<number>().domain([0, 100]),
            viewport: { domain: [20, 80] },
          },
          y: { scale: scaleLinear().domain([0, 100]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('requires a continuous numeric or temporal scale')

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 100])],
          x: {
            scale: scaleLinear().domain([0, 100]).clamp(true),
            viewport: { domain: [20, 80] },
          },
          y: { scale: scaleLinear().domain([0, 100]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('does not support a clamped scale')

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 100])],
          x: {
            scale: scaleIdentity().domain([0, 100]),
            viewport: { domain: [20, 80] },
          },
          y: { scale: scaleLinear().domain([0, 100]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('requires independent configurable domain and range capabilities')
  })

  it('supports positive, reversed, and negative logarithmic viewports', () => {
    for (const [contentDomain, viewportDomain] of [
      [
        [1, 100],
        [10, 50],
      ],
      [
        [100, 1],
        [50, 10],
      ],
      [
        [-100, -1],
        [-50, -10],
      ],
    ] as const) {
      const scene = createChartScene(
        defineChart({
          marks: [
            lineY(
              contentDomain.map((x) => ({ x, y: Math.abs(x) })),
              { x: 'x', y: 'y' },
            ),
          ],
          x: {
            scale: scaleLog().domain(contentDomain),
            viewport: { domain: viewportDomain },
          },
          y: { scale: scaleLinear().domain([0, 100]) },
        }),
        { width: 480, height: 260 },
      )

      expect(scene.scales.x.viewport?.contentDomain).toEqual(contentDomain)
      expect(scene.scales.x.domain).toEqual(viewportDomain)
      expect(scene.scales.x.map(viewportDomain[0])).toBe(scene.chart.x)
      expect(scene.scales.x.map(viewportDomain[1])).toBe(
        scene.chart.x + scene.chart.width,
      )
    }
  })

  it('rejects logarithmic viewport domains at or across the wrong side of zero', () => {
    for (const [contentDomain, viewportDomain] of [
      [
        [1, 100],
        [-100, -1],
      ],
      [
        [-100, -1],
        [1, 100],
      ],
      [
        [1, 100],
        [0, 10],
      ],
      [
        [0, 100],
        [1, 10],
      ],
      [
        [-10, 10],
        [1, 10],
      ],
    ] as const) {
      expect(() =>
        createChartScene(
          defineChart({
            marks: [lineY([1, 10])],
            x: {
              scale: scaleLog().domain(contentDomain),
              viewport: { domain: viewportDomain },
            },
            y: { scale: scaleLinear().domain([0, 10]) },
          }),
          { width: 480, height: 260 },
        ),
      ).toThrow('same side of zero')
    }
  })

  it('snapshots aliased content domains before configuring the viewport', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([0, 100])],
        x: {
          scale: mutableDomainScale(),
          viewport: { domain: [20, 80] },
        },
        y: { scale: scaleLinear().domain([0, 100]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.viewport?.contentDomain).toEqual([0, 100])
    expect(scene.scales.x.domain).toEqual([20, 80])
  })

  it('rejects a getter-only domain even when it already equals the viewport', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 100])],
          x: {
            scale: mutableDomainScale(true),
            viewport: { domain: [0, 100] },
          },
          y: { scale: scaleLinear().domain([0, 100]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('requires a scale with a configurable domain')
  })

  it('rejects viewports on opaque custom scale resolvers', () => {
    const customScale: ChartScale = {
      id: 'custom',
      resolve() {
        throw new Error('The custom resolver must not run')
      },
    }

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([0, 1])],
          x: {
            scale: customScale,
            viewport: { domain: [0, 1] },
          },
          y: { scale: scaleLinear().domain([0, 1]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('requires a configured or inferable continuous scale')
  })

  it('lets a custom scale resolver return a fully resolved viewport', () => {
    const customScale: ChartScale = {
      id: 'custom-viewport',
      resolve(context) {
        const map = (value: unknown) =>
          context.range[0] +
          (Number(value) / 10) * (context.range[1] - context.range[0])
        return {
          id: context.id,
          type: 'custom',
          domain: [2, 8],
          map,
          ticks: [],
          bandwidth: 0,
          viewport: {
            contentDomain: [0, 10],
            domain: [2, 8],
            translate: 18,
            map: (value) => map(value) + 18,
          },
        }
      },
    }
    const scene = createChartScene(
      defineChart({
        marks: [lineY([0, 10])],
        x: { scale: customScale },
        y: { scale: scaleLinear().domain([0, 10]) },
        guides: false,
      }),
      { width: 480, height: 260 },
    )
    const marks = scene.nodes.find((node) => node.key === 'marks')
    const viewportClip = marks?.kind === 'group' ? marks.children[0] : undefined
    const viewportContent =
      viewportClip?.kind === 'group' ? viewportClip.children[0] : undefined

    expect(scene.scales.x.viewport).toMatchObject({
      contentDomain: [0, 10],
      domain: [2, 8],
      translate: 18,
    })
    expect(
      viewportContent?.kind === 'group' && viewportContent.translateX,
    ).toBe(18)
  })

  it('includes implicit mark baselines in inferred domains', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          barY([{ category: 'Alpha', value: 12 }], {
            x: 'category',
            y: 'value',
          }),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.y.domain).toEqual([0, 12])
  })

  it('rejects inferred log scales with implicit zero baselines', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [barY([12])],
          x: { scale: scaleBand<number> },
          y: { scale: scaleLog },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('An inferred log scale cannot include an implicit zero baseline')
  })

  it('retains native factory domains for empty channels', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([])],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 1])
  })

  it('rejects factories that do not return a scale', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 2, 3])],
          x: { scale: (() => 42) as never },
          y: { scale: scaleLinear },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(
      'A scale factory must return a copyable scale with domain and range methods',
    )
  })

  it('rejects factory and channel type mismatches at runtime', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            lineY([{ category: 'Alpha', value: 3 }], {
              x: 'category',
              y: 'value',
            }),
          ],
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('A quantitative scale factory requires numeric values')

    expect(() =>
      resolveScaleInput(scaleLinear, { values: [1, 'high'] }),
    ).toThrow('A quantitative scale factory requires numeric values')
    expect(() =>
      resolveScaleInput(scaleUtc, {
        values: [new Date('2026-01-01T00:00:00Z'), 'not-a-date'],
      }),
    ).toThrow('A temporal scale factory requires Date channel values')
  })

  it('requires inferred log domains to stay strictly on one side of zero', () => {
    expect(resolveScaleInput(scaleLog, { values: [1, 10] }).domain()).toEqual([
      1, 10,
    ])
    expect(resolveScaleInput(scaleLog, { values: [-10, -1] }).domain()).toEqual(
      [-10, -1],
    )

    for (const values of [[0], [0, 10], [-10, 0], [-10, 10]]) {
      expect(() => resolveScaleInput(scaleLog, { values })).toThrow(
        'cannot include or cross zero',
      )
    }
  })

  it('adopts configured D3 domains while owning responsive ranges', () => {
    const xSource = scaleLinear().domain([0, 10])
    const definition = defineChart({
      marks: [
        lineY(
          [
            { x: 0, y: 4 },
            { x: 10, y: 9 },
          ],
          {
            x: 'x',
            y: 'y',
          },
        ),
      ],
      x: {
        scale: xSource,
      },
      y: {
        scale: scaleLinear().domain([0, 10]),
      },
    })
    const scene = createChartScene(definition, {
      width: 480,
      height: 260,
    })

    expect(scene.scales.x.domain).toEqual([0, 10])
    expect(scene.scales.x.map(0)).toBe(scene.chart.x)
    expect(scene.scales.x.map(10)).toBe(scene.chart.x + scene.chart.width)
    expect(scene.scales.y.map(0)).toBe(scene.chart.y + scene.chart.height)
    expect(scene.scales.y.map(10)).toBe(scene.chart.y)

    const wider = createChartScene(definition, { width: 800, height: 260 })
    expect(wider.scales.x.map(10)).toBe(wider.chart.x + wider.chart.width)
    expect(xSource.range()).toEqual([0, 1])
  })

  it('propagates inversion from responsive continuous scale copies', () => {
    const xSource = scaleLinear().domain([0, 10])
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2026-01-11T00:00:00Z')
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { at: start, value: 0 },
              { at: end, value: 10 },
            ],
            {
              x: 'at',
              y: 'value',
            },
          ),
        ],
        x: { scale: scaleUtc().domain([start, end]) },
        y: { scale: xSource },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.invert?.(scene.scales.x.map(start))).toEqual(start)
    expect(scene.scales.x.invert?.(scene.scales.x.map(end))).toEqual(end)
    expect(scene.scales.y.invert?.(scene.scales.y.map(0))).toBeCloseTo(0)
    expect(scene.scales.y.invert?.(scene.scales.y.map(10))).toBeCloseTo(10)
    expect(xSource.range()).toEqual([0, 1])
  })

  it('does not expose inversion for band scales', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { category: 'A', value: 1 },
              { category: 'B', value: 2 },
            ],
            {
              x: 'category',
              y: 'value',
            },
          ),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 320, height: 180 },
    )

    expect(scene.scales.x.invert).toBeUndefined()
  })

  it('rejects missing scales in the scene compiler', () => {
    const invalidDefinition = {
      marks: [lineY([1, 2, 3])],
    } as unknown as ChartSpec

    expect(() =>
      createChartScene(invalidDefinition, {
        width: 480,
        height: 260,
      }),
    ).toThrow(/requires a configured scale/)
  })

  it('supports explicit null axes only for unused dimensions', () => {
    const positionless = createChartScene(
      defineChart({
        marks: [],
        guides: false,
        x: null,
        y: null,
      }),
      { width: 480, height: 260 },
    )

    expect(positionless.scales.x.type).toBe('none')
    expect(positionless.scales.y.type).toBe('none')

    const oneDimensional = createChartScene(
      defineChart({
        marks: [ruleY([1, 2])],
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )
    expect(oneDimensional.scales.x.type).toBe('none')
    expect(oneDimensional.scales.y.type).toBe('configured')
    expect(JSON.stringify(oneDimensional.nodes)).not.toContain('x-axis')
    expect(JSON.stringify(oneDimensional.nodes)).toContain('y-tick')

    expect(() =>
      createChartScene(
        // @ts-expect-error Materialized x channels cannot omit their scale.
        defineChart({
          marks: [lineY([])],
          x: null,
          y: { scale: scaleLinear().domain([0, 1]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/cannot be null/)
  })
})

function mutableDomainScale(
  getterOnly = false,
  initialDomain: readonly number[] = [0, 100],
): ConfiguredScaleLike<number> {
  const domain = [...initialDomain]
  let range = [0, 1]
  const scale = ((value: number) => {
    const span = (domain.at(-1) ?? 1) - (domain[0] ?? 0)
    const progress = span ? (value - (domain[0] ?? 0)) / span : 0
    return (range[0] ?? 0) + progress * ((range.at(-1) ?? 1) - (range[0] ?? 0))
  }) as ConfiguredScaleLike<number> & {
    invert(value: number): number
  }
  scale.copy = () => mutableDomainScale(getterOnly, domain)
  const domainMethod = ((values?: Iterable<number>) => {
    if (values && !getterOnly) domain.splice(0, domain.length, ...values)
    return domain
  }) as ConfiguredScaleLike<number>['domain']
  if (getterOnly) {
    Object.defineProperty(scale, 'domain', {
      configurable: false,
      writable: false,
      value: domainMethod,
    })
  } else {
    scale.domain = domainMethod
  }
  scale.range = (values) => {
    range = [...values]
    return scale
  }
  scale.ticks = () => [...domain]
  scale.invert = (value) => {
    const span = (range.at(-1) ?? 1) - (range[0] ?? 0)
    const progress = span ? (value - (range[0] ?? 0)) / span : 0
    return (
      (domain[0] ?? 0) + progress * ((domain.at(-1) ?? 1) - (domain[0] ?? 0))
    )
  }
  return scale
}
