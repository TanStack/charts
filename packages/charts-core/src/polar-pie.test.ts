import { pie as d3Pie } from 'd3-shape'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { pie } from './polar-pie'
import type { PieDatum, PieOptions } from './polar-pie'

interface Slice {
  id: string
  value: number | null
  group?: string
}

describe('pie', () => {
  it('infers field and accessor values without accepting nonnumeric fields', () => {
    const rows = [
      { id: 'a', amount: 2, label: 'Alpha' },
      { id: 'b', amount: 1, label: 'Beta' },
    ]
    const fieldSlices = pie(rows, { value: 'amount' })
    const accessorSlices = pie(rows, {
      value: (datum, { index, data }) => {
        expectTypeOf(datum).toEqualTypeOf<(typeof rows)[number]>()
        expectTypeOf(index).toEqualTypeOf<number>()
        expectTypeOf(data).toEqualTypeOf<readonly (typeof rows)[number][]>()
        return datum.amount
      },
    })

    expectTypeOf(fieldSlices).toEqualTypeOf<PieDatum<(typeof rows)[number]>[]>()
    expectTypeOf(accessorSlices).toEqualTypeOf<
      PieDatum<(typeof rows)[number]>[]
    >()
    expect(accessorSlices).toEqual(fieldSlices)

    if (false) {
      // @ts-expect-error A pie value field must be numeric or nullish.
      pie(rows, { value: 'label' })
    }
  })

  it('preserves reusable option and collision output types', () => {
    const rows = [
      {
        id: 'a',
        amount: 2,
        value: 'authored',
        index: 'authored',
        fraction: 'authored',
        startAngle: 'authored',
        endAngle: 'authored',
        angle: 'authored',
        padAngle: 'authored',
        source: 'authored',
        sourceIndexes: 'authored',
      },
    ]
    const options = {
      value: 'amount',
      startAngle: 0,
      endAngle: Math.PI,
    } satisfies PieOptions<(typeof rows)[number]>
    const slice = pie(rows, options)[0]!

    expectTypeOf(slice.value).toEqualTypeOf<number>()
    expectTypeOf(slice.index).toEqualTypeOf<number>()
    expectTypeOf(slice.fraction).toEqualTypeOf<number>()
    expectTypeOf(slice.startAngle).toEqualTypeOf<number>()
    expectTypeOf(slice.endAngle).toEqualTypeOf<number>()
    expectTypeOf(slice.angle).toEqualTypeOf<number>()
    expectTypeOf(slice.padAngle).toEqualTypeOf<0>()
    expectTypeOf(slice.source).toEqualTypeOf<readonly (typeof rows)[number][]>()
    expectTypeOf(slice.sourceIndexes).toEqualTypeOf<readonly number[]>()
  })

  it('emits flat source-linked intervals in source order', () => {
    const rows = [
      { id: 'b', value: 1, group: 'raw', startAngle: 99 },
      { id: 'a', value: 3, group: 'raw', startAngle: 99 },
      { id: 'c', value: 2, group: 'raw', startAngle: 99 },
    ]
    const slices = pie(rows, {
      value: 'value',
      orderBy: 'value',
      order: 'descending',
    })

    expectTypeOf(slices).toEqualTypeOf<PieDatum<(typeof rows)[number]>[]>()
    expect(slices.map(({ id }) => id)).toEqual(['b', 'a', 'c'])
    expect(slices.map(({ index }) => index)).toEqual([2, 0, 1])
    expect(slices.map(({ fraction }) => fraction)).toEqual([
      1 / 6,
      3 / 6,
      2 / 6,
    ])
    expect(slices[1]).toMatchObject({
      id: 'a',
      group: 'raw',
      startAngle: 0,
      endAngle: Math.PI,
      angle: Math.PI / 2,
      padAngle: 0,
      source: [rows[1]],
      sourceIndexes: [1],
    })
    expect(slices[2]?.startAngle).toBe(Math.PI)
    expect(slices[2]?.endAngle).toBeCloseTo((Math.PI * 5) / 3, 12)
    expect(slices[0]?.startAngle).toBeCloseTo((Math.PI * 5) / 3, 12)
    expect(slices[0]?.endAngle).toBe(Math.PI * 2)
    expect(slices[1]?.source[0]).toBe(rows[1])
    expect(rows.every((row) => row.startAngle === 99)).toBe(true)
  })

  it('uses stable source-index ties for ascending and descending order', () => {
    const rows = [
      { id: 'c', value: 1, priority: 2 },
      { id: 'a', value: 1, priority: 1 },
      { id: 'b', value: 1, priority: 1 },
    ]
    const ascending = pie(rows, {
      value: 'value',
      orderBy: 'priority',
      order: 'ascending',
    })
    const descending = pie(rows, {
      value: 'value',
      orderBy: 'priority',
      order: 'descending',
    })

    expect(ascending.map(({ index }) => index)).toEqual([2, 0, 1])
    expect(descending.map(({ index }) => index)).toEqual([0, 1, 2])
    expect(ascending.map(({ id }) => id)).toEqual(['c', 'a', 'b'])
    expect(descending.map(({ id }) => id)).toEqual(['c', 'a', 'b'])
  })

  it('matches source-ordered D3 allocation when no gap is requested', () => {
    const rows: Slice[] = [
      { id: 'a', value: 4 },
      { id: 'b', value: 2 },
      { id: 'c', value: 1 },
    ]
    const native = pie(rows, { value: 'value' })
    const d3 = d3Pie<Slice>()
      .sort(null)
      .value((row) => row.value ?? 0)(rows)

    expect(
      native.map(({ value, index, startAngle, endAngle, padAngle }) => ({
        value,
        index,
        startAngle,
        endAngle,
        padAngle,
      })),
    ).toEqual(
      d3.map(({ value, index, startAngle, endAngle, padAngle }) => ({
        value,
        index,
        startAngle,
        endAngle,
        padAngle,
      })),
    )
  })

  it('materializes direct seam gaps for complete revolutions', () => {
    const gapAngle = 0.1
    const slices = pie(
      [
        { id: 'a', value: 2 },
        { id: 'b', value: 1 },
        { id: 'zero', value: 0 },
      ],
      { value: 'value', gapAngle },
    )
    const [a, b, zero] = slices
    const visibleSweep =
      a!.endAngle - a!.startAngle + (b!.endAngle - b!.startAngle)

    expect(b!.startAngle - a!.endAngle).toBeCloseTo(gapAngle, 12)
    expect(Math.PI * 2 - b!.endAngle).toBeCloseTo(gapAngle, 12)
    expect(visibleSweep + gapAngle * 2).toBeCloseTo(Math.PI * 2, 12)
    expect(zero).toMatchObject({
      value: 0,
      fraction: 0,
      startAngle: Math.PI * 2,
      endAngle: Math.PI * 2,
      padAngle: 0,
    })
  })

  it('uses one seam gap for a full single slice and no gap for a partial one', () => {
    const row = [{ id: 'only', value: 1 }]
    const complete = pie(row, { value: 'value', gapAngle: 0.25 })[0]!
    const partial = pie(row, {
      value: 'value',
      startAngle: -1,
      endAngle: 1,
      gapAngle: 0.25,
    })[0]!

    expect(complete.startAngle).toBe(0)
    expect(complete.endAngle).toBeCloseTo(Math.PI * 2 - 0.25, 12)
    expect(partial.startAngle).toBe(-1)
    expect(partial.endAngle).toBe(1)
  })

  it('does not allocate a phantom gap to a zero between positive slices', () => {
    const gapAngle = 0.1
    const slices = pie(
      [
        { id: 'a', value: 1 },
        { id: 'zero', value: 0 },
        { id: 'b', value: 1 },
      ],
      { value: 'value', gapAngle },
    )
    const [a, zero, b] = slices
    const visibleSweep =
      a!.endAngle - a!.startAngle + (b!.endAngle - b!.startAngle)

    expect(zero?.startAngle).toBe(b?.startAngle)
    expect(zero?.endAngle).toBe(b?.startAngle)
    expect(b!.startAngle - a!.endAngle).toBeCloseTo(gapAngle, 12)
    expect(visibleSweep + gapAngle * 2).toBeCloseTo(Math.PI * 2, 12)
  })

  it('matches the authored end-trim gap used by rounded donuts', () => {
    const rows = [4, 8, 15, 16, 23].map((value, index) => ({ index, value }))
    const gapAngle = (Math.PI / 180) * 3
    const native = pie(rows, { value: 'value', gapAngle })
    const d3 = d3Pie<(typeof rows)[number]>()
      .sort(null)
      .value((row) => row.value)
      .padAngle(gapAngle)(rows)

    native.forEach((slice, index) => {
      const authored = d3[index]!
      expect(slice.startAngle).toBeCloseTo(authored.startAngle, 12)
      expect(slice.endAngle).toBeCloseTo(
        authored.endAngle - authored.padAngle,
        12,
      )
      expect(slice.padAngle).toBe(0)
    })
  })

  it('uses internal gaps only for positive and negative partial sweeps', () => {
    const rows = [
      { id: 'a', value: 2 },
      { id: 'b', value: 1 },
    ]
    const forward = pie(rows, {
      value: 'value',
      startAngle: -1,
      endAngle: 1,
      gapAngle: 0.2,
    })
    const reverse = pie(rows, {
      value: 'value',
      startAngle: 1,
      endAngle: -1,
      gapAngle: 0.2,
    })

    expect(forward[0]?.startAngle).toBe(-1)
    expect(forward[1]!.startAngle - forward[0]!.endAngle).toBeCloseTo(0.2, 12)
    expect(forward[1]?.endAngle).toBe(1)
    expect(reverse[0]?.startAngle).toBe(1)
    expect(reverse[0]!.endAngle - reverse[1]!.startAngle).toBeCloseTo(0.2, 12)
    expect(reverse[1]?.endAngle).toBe(-1)
  })

  it('closes a negative complete revolution with a seam gap', () => {
    const gapAngle = 0.1
    const slices = pie(
      [
        { id: 'a', value: 2 },
        { id: 'b', value: 1 },
      ],
      {
        value: 'value',
        startAngle: Math.PI,
        endAngle: -Math.PI,
        gapAngle,
      },
    )

    expect(slices[0]?.startAngle).toBe(Math.PI)
    expect(slices[0]!.endAngle - slices[1]!.startAngle).toBeCloseTo(
      gapAngle,
      12,
    )
    expect(slices[1]?.endAngle).toBeCloseTo(-Math.PI + gapAngle, 12)
  })

  it('preserves allocation invariants across signed full and partial sweeps', () => {
    const rows = [
      { id: 'a', value: 1 },
      { id: 'zero', value: 0 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ]
    const ranges = [
      { startAngle: 0, endAngle: Math.PI * 2, full: true },
      { startAngle: Math.PI, endAngle: -Math.PI, full: true },
      { startAngle: -1, endAngle: 2, full: false },
      { startAngle: 2, endAngle: -1, full: false },
    ] as const
    const gapAngle = 0.03

    for (const range of ranges) {
      const slices = pie(rows, { value: 'value', gapAngle, ...range })
      const positive = slices
        .filter(({ value }) => value > 0)
        .sort((left, right) => left.index - right.index)
      const direction = Math.sign(range.endAngle - range.startAngle)
      const gapCount = range.full ? positive.length : positive.length - 1
      const visibleSweep = positive.reduce(
        (sum, slice) => sum + Math.abs(slice.endAngle - slice.startAngle),
        0,
      )

      expect(positive[0]?.startAngle).toBe(range.startAngle)
      expect(
        slices.reduce((sum, slice) => sum + slice.fraction, 0),
      ).toBeCloseTo(1, 12)
      expect(visibleSweep + gapCount * gapAngle).toBeCloseTo(
        Math.abs(range.endAngle - range.startAngle),
        12,
      )
      for (let index = 1; index < positive.length; index += 1) {
        expect(
          direction *
            (positive[index]!.startAngle - positive[index - 1]!.endAngle),
        ).toBeCloseTo(gapAngle, 12)
      }
      expect(positive.at(-1)?.endAngle).toBeCloseTo(
        range.full ? range.endAngle - direction * gapAngle : range.endAngle,
        12,
      )
    }
  })

  it('omits missing values, retains zeroes, and preserves source indexes', () => {
    const rows = [
      { id: 'missing', value: null },
      { id: 'finite', value: 2 },
      { id: 'nan', value: Number.NaN },
      { id: 'infinite', value: Number.POSITIVE_INFINITY },
      { id: 'zero', value: 0 },
    ]
    const slices = pie(rows, {
      value: (datum) => datum.value,
    })

    expect(slices.map(({ id }) => id)).toEqual(['finite', 'zero'])
    expect(slices.map(({ sourceIndexes }) => sourceIndexes)).toEqual([[1], [4]])
    expect(slices[1]).toMatchObject({
      value: 0,
      fraction: 0,
      startAngle: Math.PI * 2,
      endAngle: Math.PI * 2,
    })

    const allZero = pie(
      [
        { id: 'a', value: 0 },
        { id: 'b', value: 0 },
      ],
      { value: 'value', startAngle: 0.5, gapAngle: 1 },
    )
    expect(
      allZero.map(({ fraction, startAngle, endAngle }) => ({
        fraction,
        startAngle,
        endAngle,
      })),
    ).toEqual([
      { fraction: 0, startAngle: 0.5, endAngle: 0.5 },
      { fraction: 0, startAngle: 0.5, endAngle: 0.5 },
    ])
  })

  it('materializes an iterable once without mutating colliding source fields', () => {
    const row = {
      id: 'a',
      amount: 2,
      value: 99,
      index: 99,
      fraction: 99,
      startAngle: 99,
      endAngle: 99,
      angle: 99,
      padAngle: 99,
      source: ['authored'],
      sourceIndexes: [99],
    }
    const before = JSON.stringify(row)
    let iterations = 0
    const source = {
      *[Symbol.iterator]() {
        iterations += 1
        if (iterations > 1) throw new Error('iterated twice')
        yield row
      },
    }
    const slices = pie(source, { value: 'amount' })

    expect(iterations).toBe(1)
    expect(JSON.stringify(row)).toBe(before)
    expect(slices[0]).toMatchObject({
      id: 'a',
      amount: 2,
      value: 2,
      index: 0,
      fraction: 1,
      startAngle: 0,
      endAngle: Math.PI * 2,
      angle: Math.PI,
      padAngle: 0,
      source: [row],
      sourceIndexes: [0],
    })
    expect(slices[0]).not.toHaveProperty('key')
    expect(pie([row], { value: 'amount' })).toEqual(slices)
  })

  it('rejects negative values and invalid angle options', () => {
    expect(() =>
      pie(
        [
          { id: 'a', value: 1 },
          { id: 'b', value: -1 },
        ],
        { value: 'value' },
      ),
    ).toThrow('pie: value at index 1 must be nonnegative')
    expect(() =>
      pie([{ value: 1 }], { value: 'value', startAngle: Number.NaN }),
    ).toThrow('pie: startAngle must be finite')
    expect(() =>
      pie([{ value: 1 }], {
        value: 'value',
        endAngle: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('pie: endAngle must be finite')
    expect(() => pie([{ value: 1 }], { value: 'value', gapAngle: -1 })).toThrow(
      'pie: gapAngle must be nonnegative and finite',
    )
    expect(() =>
      pie([{ value: 1 }], {
        value: 'value',
        startAngle: 0,
        endAngle: Math.PI * 2 + 0.001,
      }),
    ).toThrow('pie: angular sweep must be no greater than 2π')
    expect(() =>
      pie([{ value: 1 }], {
        value: 'value',
        startAngle: 0,
        endAngle: -Math.PI * 2 - 0.001,
      }),
    ).toThrow('pie: angular sweep must be no greater than 2π')
    expect(() =>
      pie([{ value: 1 }, { value: 1 }], {
        value: 'value',
        startAngle: 0,
        endAngle: 1,
        gapAngle: 2,
      }),
    ).toThrow('pie: gapAngle leaves insufficient angular space')
    expect(() =>
      pie([{ value: 1 }, { value: 1 }], {
        value: 'value',
        startAngle: 0,
        endAngle: 1,
        gapAngle: 1,
      }),
    ).toThrow('pie: positive values require drawable angular space')
    expect(() =>
      pie([{ value: 1 }], {
        value: 'value',
        startAngle: 1,
        endAngle: 1,
      }),
    ).toThrow('pie: positive values require drawable angular space')
    const enormous = pie(
      [{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE }],
      { value: 'value' },
    )
    expect(enormous.map(({ fraction }) => fraction)).toEqual([0.5, 0.5])
    expect(enormous[0]?.endAngle).toBe(Math.PI)
    expect(enormous[1]?.startAngle).toBe(Math.PI)
  })
})
