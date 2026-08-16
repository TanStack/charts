import { describe, expect, it } from 'vitest'
import { stackExtents } from './stack-internal'
import { stackRowsX, stackRowsY } from './transform-stack'

const rows = [
  { id: '0:A', position: 0, series: 'A', value: 10 },
  { id: '0:B', position: 0, series: 'B', value: 2 },
  { id: '0:C', position: 0, series: 'C', value: 1 },
  { id: '1:A', position: 1, series: 'A', value: 3 },
  { id: '1:B', position: 1, series: 'B', value: 8 },
  { id: '1:C', position: 1, series: 'C', value: 2 },
  { id: '1:D', position: 1, series: 'D', value: 1 },
  { id: '2:A', position: 2, series: 'A', value: 1 },
  { id: '2:B', position: 2, series: 'B', value: 4 },
  { id: '2:C', position: 2, series: 'C', value: 9 },
  { id: '2:D', position: 2, series: 'D', value: 2 },
  { id: '3:A', position: 3, series: 'A', value: 2 },
  { id: '3:B', position: 3, series: 'B', value: 1 },
  { id: '3:C', position: 3, series: 'C', value: 3 },
  { id: '3:D', position: 3, series: 'D', value: 10 },
] as const

const anchoredRows = [
  { position: 'Q1', series: 'Disagree', value: 2 },
  { position: 'Q1', series: 'Neutral', value: 2 },
  { position: 'Q1', series: 'Agree', value: 3 },
  { position: 'Q2', series: 'Disagree', value: 1 },
  { position: 'Q2', series: 'Agree', value: 4 },
] as const
const anchoredOrder = ['Disagree', 'Neutral', 'Agree'] as const

describe('stack extensions', () => {
  it('matches the inside-out wiggle geometry and translates its baseline to zero', () => {
    const extents = stackExtents(
      rows.map((row, index) => ({ index, ...row })),
      { order: 'inside-out', offset: 'wiggle' },
    )

    expectExtent(extents, 0, 0.9196428571428572, 10.919642857142858)
    expectExtent(extents, 1, 10.919642857142858, 12.919642857142858)
    expectExtent(extents, 2, 12.919642857142858, 13.919642857142858)
    expectExtent(extents, 3, 4.0625, 7.0625)
    expectExtent(extents, 6, 3.0625, 4.0625)
    expectExtent(extents, 9, 11.59375, 20.59375)
    expectExtent(extents, 14, 0, 10)

    expect(Math.min(...[...extents.values()].map(({ start }) => start))).toBe(0)
    rows.forEach((row, index) => {
      const extent = extents.get(index)
      expect(extent).toBeDefined()
      expect(extent!.end - extent!.start).toBeCloseTo(row.value)
    })
  })

  it('zero-imputes sparse cells for layout without emitting synthetic rows', () => {
    const sparseRows = [
      { position: 0, series: 'A', value: 2 },
      { position: 0, series: 'B', value: 1 },
      { position: 1, series: 'B', value: 4 },
      { position: 1, series: 'C', value: 3 },
      { position: 2, series: 'A', value: 5 },
      { position: 2, series: 'B', value: 2 },
    ] as const
    const extents = stackExtents(
      sparseRows.map((row, index) => ({ index, ...row })),
      { order: 'inside-out', offset: 'wiggle' },
    )

    expect(extents.size).toBe(sparseRows.length)
    expectExtent(extents, 0, 3.7857142857142856, 5.785714285714286)
    expectExtent(extents, 1, 2.7857142857142856, 3.7857142857142856)
    expectExtent(extents, 2, 0, 4)
    expectExtent(extents, 3, 4, 7)
    expectExtent(extents, 4, 4.071428571428571, 9.071428571428573)
    expectExtent(extents, 5, 2.0714285714285716, 4.071428571428571)
  })

  it('uses first-seen position order as the wiggle sequence', () => {
    const unsortedRows = [
      { position: 2, series: 'A', value: 5 },
      { position: 2, series: 'B', value: 2 },
      { position: 0, series: 'A', value: 2 },
      { position: 0, series: 'B', value: 1 },
      { position: 1, series: 'A', value: 0 },
      { position: 1, series: 'B', value: 4 },
    ] as const
    const extents = stackExtents(
      unsortedRows.map((row, index) => ({ index, ...row })),
      { order: 'inside-out', offset: 'wiggle' },
    )

    expectExtent(extents, 0, 0, 5)
    expectExtent(extents, 1, 5, 7)
    expectExtent(extents, 2, 2.1666666666666665, 4.166666666666666)
    expectExtent(extents, 3, 4.166666666666666, 5.166666666666666)
    expectExtent(extents, 4, 2.6666666666666665, 2.6666666666666665)
    expectExtent(extents, 5, 2.6666666666666665, 6.666666666666666)
  })

  it('rejects duplicate position and series pairs', () => {
    expect(() =>
      stackExtents([
        { index: 0, position: 'A', series: 'one', value: 1 },
        { index: 1, position: 'A', series: 'one', value: 2 },
      ]),
    ).toThrow(/duplicate A \/ one/u)
  })

  it('zero-shifts wiggle independently of the selected order', () => {
    const extents = stackExtents(
      rows.map((row, index) => ({ index, ...row })),
      { offset: 'wiggle' },
    )

    expect(Math.min(...[...extents.values()].map(({ start }) => start))).toBe(0)
    rows.forEach((row, index) => {
      const extent = extents.get(index)
      expect(extent!.end - extent!.start).toBeCloseTo(row.value)
    })
  })

  it('reverses the resolved inside-out order without changing source identity', () => {
    const extents = stackExtents(
      rows.map((row, index) => ({ index, ...row })),
      { order: 'inside-out', offset: 'wiggle', reverse: true },
    )

    expectExtent(extents, 0, 9.674107142857142, 19.674107142857142)
    expectExtent(extents, 1, 7.674107142857142, 9.674107142857142)
    expectExtent(extents, 2, 6.674107142857142, 7.674107142857142)
    expectExtent(extents, 9, 0, 9)
    expectExtent(extents, 14, 10.59375, 20.59375)
  })

  it('shares the same policy with materialized vertical and horizontal rows', () => {
    const options = {
      order: 'inside-out' as const,
      offset: 'wiggle' as const,
    }
    const vertical = stackRowsY(rows, {
      x: 'position',
      y: 'value',
      z: 'series',
      ...options,
    })
    const horizontal = stackRowsX(rows, {
      x: 'value',
      y: 'position',
      z: 'series',
      ...options,
    })

    expect(horizontal).toHaveLength(vertical.length)
    vertical.forEach((datum, index) => {
      const transposed = horizontal[index]!
      expect(transposed.source[0]).toBe(rows[index])
      expect(transposed.sourceIndexes).toEqual([index])
      expect(transposed.x1).toBeCloseTo(datum.y1)
      expect(transposed.x2).toBeCloseTo(datum.y2)
    })
  })

  it('keeps reversed materialized rows input-aligned', () => {
    const forward = stackRowsY(rows, {
      x: 'position',
      y: 'value',
      z: 'series',
      order: 'inside-out',
      offset: 'wiggle',
    })
    const reversed = stackRowsY(rows, {
      x: 'position',
      y: 'value',
      z: 'series',
      order: 'inside-out',
      offset: 'wiggle',
      reverse: true,
    })

    expect(
      reversed.some((datum, index) => datum.y1 !== forward[index]!.y1),
    ).toBe(true)
    reversed.forEach((datum, index) => {
      expect(datum.source).toEqual([rows[index]])
      expect(datum.sourceIndexes).toEqual([index])
    })
  })
})

describe('anchored stacks', () => {
  it('keeps an empty input empty while validating anchor options', () => {
    expect(
      stackExtents([], { anchor: { series: 'Neutral', fraction: 0.5 } }),
    ).toEqual(new Map())
    expect(() =>
      stackExtents([], { anchor: { series: 'Neutral', fraction: 2 } }),
    ).toThrow(/fraction must be between zero and one/u)
    expect(() =>
      stackExtents([], {
        offset: 'normalize',
        anchor: { series: 'Neutral' },
      }),
    ).toThrow(/only be used with the diverging offset/u)
  })

  it('places the selected series fraction on zero at every position', () => {
    const extents = stackExtents(
      anchoredRows.map((row, index) => ({ index, ...row })),
      {
        order: anchoredOrder,
        anchor: { series: 'Neutral', fraction: 0.5 },
      },
    )

    expect(extents.size).toBe(anchoredRows.length)
    expectExtent(extents, 0, -3, -1)
    expectExtent(extents, 1, -1, 1)
    expectExtent(extents, 2, 1, 4)
    expectExtent(extents, 3, -1, 0)
    expectExtent(extents, 4, 0, 4)
  })

  it('supports either boundary of the anchor interval', () => {
    const input = anchoredRows.map((row, index) => ({ index, ...row }))
    const start = stackExtents(input, {
      order: anchoredOrder,
      anchor: { series: 'Neutral', fraction: 0 },
    })
    const end = stackExtents(input, {
      order: anchoredOrder,
      anchor: { series: 'Neutral', fraction: 1 },
    })

    expectExtent(start, 0, -2, 0)
    expectExtent(start, 1, 0, 2)
    expectExtent(start, 2, 2, 5)
    expectExtent(end, 0, -4, -2)
    expectExtent(end, 1, -2, 0)
    expectExtent(end, 2, 0, 3)
  })

  it('zero-imputes a missing anchor cell without synthesizing output', () => {
    const extents = stackExtents(
      anchoredRows.map((row, index) => ({ index, ...row })),
      {
        order: anchoredOrder,
        anchor: { series: 'Neutral' },
      },
    )

    expect(extents.size).toBe(anchoredRows.length)
    expectExtent(extents, 3, -1, 0)
    expectExtent(extents, 4, 0, 4)
  })

  it('uses an explicit order to establish a globally absent anchor', () => {
    const extents = stackExtents(
      [
        { index: 0, position: 'Q1', series: 'Disagree', value: 2 },
        { index: 1, position: 'Q1', series: 'Agree', value: 3 },
      ],
      {
        order: anchoredOrder,
        anchor: { series: 'Neutral' },
      },
    )

    expect(extents.size).toBe(2)
    expectExtent(extents, 0, -2, 0)
    expectExtent(extents, 1, 0, 3)
  })

  it('resolves reverse and inside-out order before anchoring', () => {
    const input = anchoredRows.map((row, index) => ({ index, ...row }))
    const reversed = stackExtents(input, {
      order: anchoredOrder,
      reverse: true,
      anchor: { series: 'Neutral' },
    })
    const insideOut = stackExtents(input, {
      order: 'inside-out',
      anchor: { series: 'Neutral' },
    })

    expectExtent(reversed, 0, 1, 3)
    expectExtent(reversed, 1, -1, 1)
    expectExtent(reversed, 2, -4, -1)
    expectExtent(insideOut, 1, -1, 1)
    anchoredRows.forEach((row, index) => {
      const extent = insideOut.get(index)
      expect(extent).toBeDefined()
      expect(extent!.end - extent!.start).toBeCloseTo(row.value)
    })
  })

  it('shares anchored geometry with vertical and horizontal row transforms', () => {
    const options = {
      order: anchoredOrder,
      anchor: { series: 'Neutral' as const },
    }
    const vertical = stackRowsY(anchoredRows, {
      x: 'position',
      y: 'value',
      z: 'series',
      ...options,
    })
    const horizontal = stackRowsX(anchoredRows, {
      x: 'value',
      y: 'position',
      z: 'series',
      ...options,
    })

    vertical.forEach((datum, index) => {
      expect(horizontal[index]!.x1).toBeCloseTo(datum.y1)
      expect(horizontal[index]!.x2).toBeCloseTo(datum.y2)
      expect(horizontal[index]!.source).toEqual([anchoredRows[index]])
      expect(horizontal[index]!.sourceIndexes).toEqual([index])
    })
  })

  it('rejects invalid fractions, missing series, and incompatible offsets', () => {
    const input = anchoredRows.map((row, index) => ({ index, ...row }))

    for (const fraction of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        stackExtents(input, {
          order: anchoredOrder,
          anchor: { series: 'Neutral', fraction },
        }),
      ).toThrow(/fraction must be between zero and one/u)
    }
    expect(() =>
      stackExtents(input, {
        anchor: { series: 'Missing' },
      }),
    ).toThrow(/not in the resolved series order/u)
    for (const offset of ['normalize', 'center', 'wiggle'] as const) {
      expect(() =>
        stackExtents(input, {
          offset,
          anchor: { series: 'Neutral' },
        }),
      ).toThrow(/only be used with the diverging offset/u)
    }
    expect(() =>
      stackExtents(input, {
        offset: 'diverging',
        order: anchoredOrder,
        anchor: { series: 'Neutral' },
      }),
    ).not.toThrow()
    expect(() =>
      stackExtents(
        [{ index: 0, position: 'Q1', series: 'Neutral', value: -1 }],
        { anchor: { series: 'Neutral' } },
      ),
    ).toThrow(/requires nonnegative values/u)
  })
})

describe('diverging offset zero handling', () => {
  it('keeps a zero-valued cell on the running top of a positive stack', () => {
    const positiveRows = [
      { position: 0, series: 'A', value: 10 },
      { position: 0, series: 'B', value: 5 },
      { position: 1, series: 'A', value: 10 },
      { position: 1, series: 'B', value: 0 },
    ] as const
    const extents = stackExtents(
      positiveRows.map((row, index) => ({ index, ...row })),
      { order: ['A', 'B'] },
    )

    expectExtent(extents, 0, 0, 10)
    expectExtent(extents, 1, 10, 15)
    expectExtent(extents, 2, 0, 10)
    expectExtent(extents, 3, 10, 10)
  })

  it('keeps a zero-valued cell on the running bottom of an exclusively negative stack', () => {
    const negativeRows = [
      { position: 0, series: 'A', value: -10 },
      { position: 0, series: 'B', value: -5 },
      { position: 1, series: 'A', value: -10 },
      { position: 1, series: 'B', value: 0 },
    ] as const
    const extents = stackExtents(
      negativeRows.map((row, index) => ({ index, ...row })),
      { order: ['A', 'B'] },
    )

    expectExtent(extents, 0, -10, 0)
    expectExtent(extents, 1, -15, -10)
    expectExtent(extents, 2, -10, 0)
    expectExtent(extents, 3, -10, -10)
  })

  it('leaves a zero unchanged when its series is the only negative one in a mixed stack', () => {
    const mixedRows = [
      { position: 0, series: 'A', value: 10 },
      { position: 0, series: 'B', value: -3 },
      { position: 1, series: 'A', value: 10 },
      { position: 1, series: 'B', value: 0 },
    ] as const
    const extents = stackExtents(
      mixedRows.map((row, index) => ({ index, ...row })),
      { order: ['A', 'B'] },
    )

    expectExtent(extents, 3, 0, 0)
  })

  it('leaves an all-zero position unchanged', () => {
    const allZeroRows = [
      { position: 0, series: 'A', value: 10 },
      { position: 0, series: 'B', value: 5 },
      { position: 1, series: 'A', value: 0 },
      { position: 1, series: 'B', value: 0 },
    ] as const
    const extents = stackExtents(
      allZeroRows.map((row, index) => ({ index, ...row })),
      { order: ['A', 'B'] },
    )

    expectExtent(extents, 2, 0, 0)
    expectExtent(extents, 3, 0, 0)
  })

  it('shares the zero-aware diverging policy with materialized vertical and horizontal rows', () => {
    const positiveRows = [
      { position: 0, series: 'A', value: 10 },
      { position: 0, series: 'B', value: 5 },
      { position: 1, series: 'A', value: 10 },
      { position: 1, series: 'B', value: 0 },
    ] as const
    const options = { order: ['A', 'B'] as const }
    const vertical = stackRowsY(positiveRows, {
      x: 'position',
      y: 'value',
      z: 'series',
      ...options,
    })
    const horizontal = stackRowsX(positiveRows, {
      x: 'value',
      y: 'position',
      z: 'series',
      ...options,
    })

    expect(horizontal).toHaveLength(vertical.length)
    vertical.forEach((datum, index) => {
      const transposed = horizontal[index]!
      expect(transposed.x1).toBeCloseTo(datum.y1)
      expect(transposed.x2).toBeCloseTo(datum.y2)
    })
    expect(vertical[3]!.y1).toBeCloseTo(10)
    expect(vertical[3]!.y2).toBeCloseTo(10)
  })
})

function expectExtent(
  extents: ReturnType<typeof stackExtents>,
  index: number,
  start: number,
  end: number,
) {
  const extent = extents.get(index)
  expect(extent).toBeDefined()
  expect(extent!.start).toBeCloseTo(start)
  expect(extent!.end).toBeCloseTo(end)
}
