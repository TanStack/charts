import { scaleBand, scaleLinear, scaleLog, scaleUtc } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { differenceX, differenceY } from './difference'
import type { DifferenceAreaDatum, DifferenceDatum } from './difference'
import { createChartScene, defineChart } from './scene'
import type {
  ChartDefinition,
  ChartMark,
  SceneArea,
  SceneNode,
  ScenePolyline,
} from './types'

interface Row {
  id: string
  series: string
  x: number
  at: Date
  comparison: number
  primary: number
  enabled: boolean
}

const rows: readonly Row[] = [
  {
    id: 'a',
    series: 'A',
    x: 0,
    at: new Date('2026-01-01T00:00:00Z'),
    comparison: 0,
    primary: 2,
    enabled: true,
  },
  {
    id: 'b',
    series: 'A',
    x: 1,
    at: new Date('2026-01-03T00:00:00Z'),
    comparison: 2,
    primary: 0,
    enabled: true,
  },
  {
    id: 'c',
    series: 'A',
    x: 2,
    at: new Date('2026-01-05T00:00:00Z'),
    comparison: 1,
    primary: -1,
    enabled: true,
  },
  {
    id: 'd',
    series: 'A',
    x: 3,
    at: new Date('2026-01-07T00:00:00Z'),
    comparison: 0,
    primary: 2,
    enabled: true,
  },
]

describe('difference marks', () => {
  it('interpolates exact crossings into contiguous positive and negative lobes', () => {
    const firstLobeRows: DifferenceAreaDatum<Row, number>[] = []
    const definition = defineChart({
      marks: [
        differenceY(rows, {
          id: 'difference',
          x: 'x',
          y1: 'comparison',
          y2: 'primary',
          key: 'id',
          positiveFill: (datum) => {
            firstLobeRows.push(datum)
            return '#16a34a'
          },
          negativeFill: (datum) => {
            firstLobeRows.push(datum)
            return '#dc2626'
          },
          fillOpacity: 0.35,
          stroke: '#166534',
          comparisonStroke: '#475569',
        }),
      ],
      x: { scale: scaleLinear().domain([0, 3]) },
      y: { scale: scaleLinear().domain([-1, 2]) },
    })
    const scene = createChartScene(definition, { width: 600, height: 360 })
    const nodes = flatten(scene.nodes)
    const areas = nodes.filter(isArea)
    const lines = nodes.filter(isPolyline)
    const firstCrossing = [scene.scales.x.map(0.5), scene.scales.y.map(1)]
    const secondCrossing = [scene.scales.x.map(2.5), scene.scales.y.map(0.5)]

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<DifferenceDatum<Row, number>, number, number>
    >()
    expect(areas).toHaveLength(3)
    expect(lines).toHaveLength(2)
    expect(
      areas.some(({ points }) => containsPoint(points, firstCrossing)),
    ).toBe(true)
    expect(
      areas.some(({ points }) => containsPoint(points, secondCrossing)),
    ).toBe(true)
    expect(areas.every((area) => area.points.length >= 4)).toBe(true)
    expect(areas.every((area) => area.interaction === undefined)).toBe(true)
    expect(lines.every((line) => line.interaction !== undefined)).toBe(true)
    expect(scene.points).toHaveLength(rows.length * 2)
    expect(scene.points.map(({ datum }) => datum)).toEqual([...rows, ...rows])
    expect(scene.points.map(({ markId }) => markId)).toEqual([
      ...rows.map(() => 'difference:comparison'),
      ...rows.map(() => 'difference:primary'),
    ])
    expect(scene.colors.domain).toEqual([])
    expect(
      firstLobeRows.map(({ crossing, sourceIndexes }) => ({
        crossing,
        sourceIndexes,
      })),
    ).toEqual([
      { crossing: false, sourceIndexes: [0] },
      { crossing: true, sourceIndexes: [2, 3] },
      { crossing: true, sourceIndexes: [0, 1] },
    ])
    firstLobeRows.forEach(({ source, sourceIndexes }) => {
      sourceIndexes.forEach((sourceIndex, index) => {
        expect(source[index]).toBe(rows[sourceIndex])
      })
    })
  })

  it('interpolates Date crossings without changing the source observations', () => {
    const originalDates = rows.map(({ at }) => at)
    const originalRows = [...rows]
    const definition = defineChart({
      marks: [
        differenceY(rows.slice(0, 2), {
          x: 'at',
          y1: 'comparison',
          y2: 'primary',
          key: 'id',
        }),
      ],
      x: { scale: scaleUtc().domain([rows[0]!.at, rows[1]!.at]) },
      y: { scale: scaleLinear().domain([0, 2]) },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    const crossingDate = new Date('2026-01-02T00:00:00Z')
    const crossing = [scene.scales.x.map(crossingDate), scene.scales.y.map(1)]

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<DifferenceDatum<Row, Date>, Date, number>
    >()
    expect(flatten(scene.nodes).filter(isArea)).toHaveLength(2)
    expect(
      flatten(scene.nodes)
        .filter(isArea)
        .every(({ points }) => containsPoint(points, crossing)),
    ).toBe(true)
    expect(rows.map(({ at }) => at)).toEqual(originalDates)
    expect(rows).toEqual(originalRows)
    rows.forEach((row, index) => expect(row).toBe(originalRows[index]))
    expect(rows[0]!.at).toBe(originalDates[0])
    expect(rows[1]!.at).toBe(originalDates[1])
  })

  it('resolves exact crossings after nonlinear independent and dependent scales', () => {
    const nonlinearRows = [
      { id: 'a', x: 1, comparison: 1, primary: 10 },
      { id: 'b', x: 100, comparison: 100, primary: 1 },
    ]
    let derivedCrossing:
      DifferenceAreaDatum<(typeof nonlinearRows)[number], number> | undefined
    const definition = defineChart({
      marks: [
        differenceY(nonlinearRows, {
          x: 'x',
          y1: 'comparison',
          y2: 'primary',
          key: 'id',
          negativeFill: (datum) => {
            if (datum.crossing) derivedCrossing = datum
            return '#dc2626'
          },
        }),
      ],
      x: { scale: scaleLog().domain([1, 100]) },
      y: { scale: scaleLog().domain([1, 100]) },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    const crossingValue = 100 ** (1 / 3)
    const crossing = [
      scene.scales.x.map(crossingValue),
      scene.scales.y.map(crossingValue),
    ]
    const areas = flatten(scene.nodes).filter(isArea)

    expect(areas).toHaveLength(2)
    expect(areas.every(({ points }) => containsPoint(points, crossing))).toBe(
      true,
    )
    expect(derivedCrossing?.independent).toBeCloseTo(crossingValue, 12)
    expect(derivedCrossing?.comparison).toBeCloseTo(crossingValue, 12)
    expect(derivedCrossing?.primary).toBeCloseTo(crossingValue, 12)
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      ...nonlinearRows,
      ...nonlinearRows,
    ])
  })

  it('transposes screen-space crossings through nonlinear scales', () => {
    const nonlinearRows = [
      { id: 'a', y: 1, comparison: 1, primary: 10 },
      { id: 'b', y: 100, comparison: 100, primary: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          differenceX(nonlinearRows, {
            x1: 'comparison',
            x2: 'primary',
            y: 'y',
            key: 'id',
          }),
        ],
        x: { scale: scaleLog().domain([1, 100]) },
        y: { scale: scaleLog().domain([1, 100]) },
      }),
      { width: 480, height: 280 },
    )
    const crossingValue = 100 ** (1 / 3)
    const crossing = [
      scene.scales.x.map(crossingValue),
      scene.scales.y.map(crossingValue),
    ]
    const areas = flatten(scene.nodes).filter(isArea)

    expect(areas).toHaveLength(2)
    expect(areas.every(({ points }) => containsPoint(points, crossing))).toBe(
      true,
    )
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      ...nonlinearRows,
      ...nonlinearRows,
    ])
  })

  it('uses non-finite mapped positions as a shared gap', () => {
    const mappedGapRows = [
      { id: 'a', x: 1, comparison: 1, primary: 10 },
      { id: 'gap', x: 10, comparison: 0, primary: 5 },
      { id: 'b', x: 100, comparison: 100, primary: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          differenceY(mappedGapRows, {
            x: 'x',
            y1: 'comparison',
            y2: 'primary',
            key: 'id',
          }),
        ],
        x: { scale: scaleLog().domain([1, 100]) },
        y: { scale: scaleLog().domain([1, 100]) },
      }),
      { width: 480, height: 280 },
    )
    const nodes = flatten(scene.nodes)

    expect(nodes.filter(isArea)).toHaveLength(0)
    expect(nodes.filter(isPolyline)).toHaveLength(4)
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      mappedGapRows[0],
      mappedGapRows[2],
      mappedGapRows[0],
      mappedGapRows[2],
    ])
  })

  it('requires invertible positional scales in both orientations', () => {
    const horizontal = differenceX(rows.slice(0, 2), {
      x1: 'comparison',
      x2: 'primary',
      y: 'x',
    })
    const vertical = differenceY(rows.slice(0, 2), {
      x: 'x',
      y1: 'comparison',
      y2: 'primary',
    })

    expect(() =>
      createChartScene(
        defineChart({
          marks: [vertical],
          x: { scale: scaleBand<number>().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 2]) },
        }),
        { width: 480, height: 280 },
      ),
    ).toThrow('differenceY: x and y scales must support inversion')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [horizontal],
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleBand<number>().domain([0, 1]) },
        }),
        { width: 480, height: 280 },
      ),
    ).toThrow('differenceX: x and y scales must support inversion')
  })

  it('uses normal area defaults and independently suppresses either fill', () => {
    const render = (
      positiveFill?: string | null,
      negativeFill?: string | null,
    ) =>
      createChartScene(
        defineChart({
          marks: [
            differenceY(rows.slice(0, 2), {
              x: 'x',
              y1: 'comparison',
              y2: 'primary',
              ...(positiveFill !== undefined ? { positiveFill } : {}),
              ...(negativeFill !== undefined ? { negativeFill } : {}),
            }),
          ],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 2]) },
        }),
        { width: 480, height: 280 },
      )

    const defaults = flatten(render().nodes).filter(isArea)
    const negativeOnly = flatten(render(null, '#ef4444').nodes).filter(isArea)
    const linesOnly = flatten(render(null, null).nodes)

    expect(defaults.map(({ style }) => style?.fill)).toEqual([
      '#3ca951',
      '#4269d0',
    ])
    expect(defaults.map(({ style }) => style?.fillOpacity)).toEqual([0.2, 0.2])
    expect(negativeOnly).toHaveLength(1)
    expect(negativeOnly[0]?.style?.fill).toBe('#ef4444')
    expect(linesOnly.filter(isArea)).toHaveLength(0)
    expect(linesOnly.filter(isPolyline)).toHaveLength(2)
  })

  it('uses any invalid shared observation as a gap in fills and both lines', () => {
    const splitRows = [
      { id: 'a', x: 0, comparison: 0, primary: 2 },
      { id: 'b', x: 1, comparison: 1, primary: 3 },
      { id: 'gap', x: 2, comparison: 1, primary: Number.NaN },
      { id: 'c', x: 3, comparison: 2, primary: 0 },
      { id: 'd', x: 4, comparison: 1, primary: -1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          differenceY(splitRows, {
            x: 'x',
            y1: 'comparison',
            y2: 'primary',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([-1, 3]) },
      }),
      { width: 480, height: 280 },
    )
    const areas = flatten(scene.nodes).filter(isArea)
    const lines = flatten(scene.nodes).filter(isPolyline)

    expect(areas).toHaveLength(2)
    expect(areas.every(({ points }) => points.length === 4)).toBe(true)
    expect(lines).toHaveLength(4)
    expect(lines.every(({ points }) => points.length === 2)).toBe(true)
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      splitRows[0],
      splitRows[1],
      splitRows[3],
      splitRows[4],
      splitRows[0],
      splitRows[1],
      splitRows[3],
      splitRows[4],
    ])
  })

  it('keeps exact-zero runs inside a lobe without emitting sample-sized areas', () => {
    const zeroRows = [
      { x: 0, comparison: 0, primary: 1 },
      { x: 1, comparison: 0, primary: 0 },
      { x: 2, comparison: 0, primary: 0 },
      { x: 3, comparison: 0, primary: 1 },
      { x: 4, comparison: 0, primary: -1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          differenceY(zeroRows, {
            x: 'x',
            y1: 0,
            y2: 'primary',
          }),
        ],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([-1, 1]) },
      }),
      { width: 480, height: 280 },
    )
    const areas = flatten(scene.nodes).filter(isArea)

    expect(areas).toHaveLength(2)
    expect(areas[0]?.points).toHaveLength(10)
    expect(areas[1]?.points).toHaveLength(4)
  })

  it('derives lobe identity from stable source boundaries', () => {
    const stableRows = [
      { id: 'a', x: 0, comparison: 0, primary: 2 },
      { id: 'b', x: 1, comparison: 2, primary: 0 },
      { id: 'c', x: 2, comparison: 1, primary: -1 },
      { id: 'd', x: 3, comparison: 0, primary: 2 },
      { id: 'e', x: 4, comparison: 0, primary: 3 },
    ]
    const prepended = [
      { id: 'pre-a', x: -2, comparison: 0, primary: 2 },
      { id: 'pre-b', x: -1, comparison: 2, primary: 0 },
      ...stableRows,
    ]
    const renderKeys = (source: typeof stableRows) => {
      const scene = createChartScene(
        defineChart({
          marks: [
            differenceY(source, {
              id: 'stable',
              x: 'x',
              y1: 'comparison',
              y2: 'primary',
              key: 'id',
            }),
          ],
          x: { scale: scaleLinear().domain([-2, 4]) },
          y: { scale: scaleLinear().domain([-1, 3]) },
        }),
        { width: 480, height: 280 },
      )
      return flatten(scene.nodes)
        .filter(isArea)
        .map(({ key }) => key)
    }
    const laterKey = renderKeys(stableRows).find((key) =>
      key.includes('source:string:1:e'),
    )

    expect(laterKey).toBeDefined()
    expect(renderKeys(prepended)).toContain(laterKey)
  })

  it('transposes the same geometry and interaction semantics through lineX and areaX', () => {
    const definition = defineChart({
      marks: [
        differenceX(rows.slice(0, 2), {
          x1: 'comparison',
          x2: 'primary',
          y: 'at',
          key: 'id',
          strokeWidth: 3,
          comparisonStrokeWidth: 1,
          comparisonStrokeDasharray: '4 2',
          motion: ({ datum }) => {
            expectTypeOf(datum).toEqualTypeOf<
              DifferenceDatum<Row, Date> | undefined
            >()
            return { delay: 4 }
          },
        }),
      ],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleUtc().domain([rows[0]!.at, rows[1]!.at]) },
    })
    const mark = definition.marks[0]!
    const scene = createChartScene(definition, { width: 480, height: 280 })
    const nodes = flatten(scene.nodes)
    const lines = nodes.filter(isPolyline)
    const crossing = [
      scene.scales.x.map(1),
      scene.scales.y.map(new Date('2026-01-02T00:00:00Z')),
    ]

    expectTypeOf(mark).toEqualTypeOf<
      ChartMark<DifferenceDatum<Row, Date>, number, Date>
    >()
    expect(nodes.filter(isArea)).toHaveLength(2)
    expect(
      nodes
        .filter(isArea)
        .every(({ points }) => containsPoint(points, crossing)),
    ).toBe(true)
    expect(lines).toHaveLength(2)
    expect(lines.every((line) => line.interaction?.affinity === 'y')).toBe(true)
    expect(lines.map(({ style }) => style?.strokeWidth)).toEqual([1, 3])
    expect(lines[0]?.style?.strokeDasharray).toBe('4 2')
    expect(typeof mark.initialize({ markIndex: 0 }).motion).toBe('function')
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      rows[0],
      rows[1],
      rows[0],
      rows[1],
    ])
  })

  it('fits interleaved groups independently without creating a color domain', () => {
    const grouped = [
      { id: 'a0', series: 'A', x: 0, comparison: 0, primary: 2 },
      { id: 'b0', series: 'B', x: 0, comparison: 2, primary: 0 },
      { id: 'a1', series: 'A', x: 1, comparison: 0, primary: 3 },
      { id: 'b1', series: 'B', x: 1, comparison: 3, primary: 0 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          differenceY(grouped, {
            id: 'grouped',
            x: 'x',
            y1: 'comparison',
            y2: 'primary',
            z: 'series',
            key: 'id',
          }),
        ],
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 3]) },
      }),
      { width: 480, height: 280 },
    )
    const lines = flatten(scene.nodes).filter(isPolyline)

    expect(flatten(scene.nodes).filter(isArea)).toHaveLength(2)
    expect(lines).toHaveLength(4)
    expect(scene.colors.domain).toEqual([])
    expect(scene.points.map(({ group }) => group)).toEqual([
      'A',
      'A',
      'B',
      'B',
      'A',
      'A',
      'B',
      'B',
    ])
    expect(scene.points.map(({ datum }) => datum)).toEqual([
      grouped[0],
      grouped[2],
      grouped[1],
      grouped[3],
      grouped[0],
      grouped[2],
      grouped[1],
      grouped[3],
    ])
  })

  it('rejects mixed numeric and temporal independent values', () => {
    const mixed = [
      { at: 0 as number | Date, comparison: 0, primary: 1 },
      {
        at: new Date('2026-01-01') as number | Date,
        comparison: 1,
        primary: 0,
      },
    ]
    const mark = differenceY(mixed, {
      x: 'at',
      y1: 'comparison',
      y2: 'primary',
    })

    expect(() => mark.initialize({ markIndex: 0 })).toThrow(
      'differenceY: independent values cannot mix numbers and Dates',
    )

    const mixedAcrossGap = differenceY(
      [
        { at: 0 as number | Date, comparison: 0, primary: 1 },
        {
          at: new Date('2026-01-01') as number | Date,
          comparison: Number.NaN,
          primary: 0,
        },
      ],
      { x: 'at', y1: 'comparison', y2: 'primary' },
    )
    expect(() => mixedAcrossGap.initialize({ markIndex: 0 })).not.toThrow()
  })
})

if (false) {
  const vertical = differenceY(rows, {
    x: 'at',
    y1: 'comparison',
    y2: 'primary',
  })
  const horizontal = differenceX(rows, {
    x1: 'comparison',
    x2: 'primary',
    y: 'at',
  })

  expectTypeOf(vertical).toEqualTypeOf<
    ChartMark<DifferenceDatum<Row, Date>, Date, number>
  >()
  expectTypeOf(horizontal).toEqualTypeOf<
    ChartMark<DifferenceDatum<Row, Date>, number, Date>
  >()

  // @ts-expect-error Difference independent channels must be numeric or temporal.
  differenceY(rows, { x: 'series', y1: 'comparison', y2: 'primary' })

  // @ts-expect-error Difference value channels must be numeric.
  differenceY(rows, { x: 'at', y1: 'enabled', y2: 'primary' })

  // @ts-expect-error Difference value channels must be numeric.
  differenceX(rows, { x1: 'comparison', x2: 'series', y: 'at' })
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function isArea(node: SceneNode): node is SceneArea {
  return node.kind === 'area'
}

function isPolyline(node: SceneNode): node is ScenePolyline {
  return node.kind === 'polyline'
}

function containsPoint(
  points: readonly (readonly [number, number])[],
  expected: readonly number[],
): boolean {
  return points.some(
    ([x, y]) =>
      Math.abs(x - (expected[0] ?? Number.NaN)) < 1e-8 &&
      Math.abs(y - (expected[1] ?? Number.NaN)) < 1e-8,
  )
}
