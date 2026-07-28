import { describe, expect, it } from 'vitest'
import type { BenchmarkDatum } from '../types'
import {
  createRollingFeed,
  createStressSource,
  createStressUpdateSource,
  prepareRollingSequence,
  prepareRollingWindow,
  prepareStressInput,
  prepareStressUpdate,
  rollingShiftCount,
} from './data'
import type { StressWorkloadId } from './types'

function row(id: number, x: number, y: number): BenchmarkDatum {
  return {
    id,
    x,
    category: `C${id}`,
    y,
    series: 'Series A',
    size: 2,
  }
}

function groupRowsBySeries(rows: readonly BenchmarkDatum[]) {
  const groups = new Map<string, BenchmarkDatum[]>()
  for (const value of rows) {
    const group = groups.get(value.series)
    if (group) group.push(value)
    else groups.set(value.series, [value])
  }
  return groups
}

describe('stress data generation', () => {
  it('is deterministic for a complete generation key', () => {
    const first = createStressSource('raw-scatter', 512, 3, 1_000)
    const second = createStressSource('raw-scatter', 512, 3, 1_000)

    expect(second).toEqual(first)
    expect(first).toHaveLength(512)
    expect(first[0]?.id).toBe(1_000)
    expect(first.at(-1)?.id).toBe(1_511)
    expect(
      first.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true)
  })

  it('changes values by revision and identities by offset', () => {
    const initial = createStressSource('raw-line', 32, 0)
    const revised = createStressSource('raw-line', 32, 1)
    const replaced = createStressSource('raw-line', 32, 0, 500)

    expect(revised.map(({ id }) => id)).toEqual(initial.map(({ id }) => id))
    expect(revised.map(({ y }) => y)).not.toEqual(initial.map(({ y }) => y))
    expect(replaced.map(({ id }) => id)).toEqual(
      initial.map(({ id }) => id + 500),
    )
  })

  it('produces deterministic prepared rows and digests', () => {
    const source = createStressSource('binned-density', 4_000, 2)
    const first = prepareStressInput('binned-density', source, 800, 400)
    const second = prepareStressInput('binned-density', source, 800, 400)

    expect(second).toEqual(first)
    expect(first.digest).toMatch(/^[0-9a-f]{8}$/)
  })

  it('can exclude digest work without changing prepared data', () => {
    const source = createStressSource('pixel-envelope', 4_000, 2)
    const withDigest = prepareStressInput('pixel-envelope', source, 800, 400)
    const withoutDigest = prepareStressInput(
      'pixel-envelope',
      source,
      800,
      400,
      { includeDigest: false },
    )

    expect(withoutDigest).toEqual({ ...withDigest, digest: '' })
    expect(withDigest.digest).toMatch(/^[0-9a-f]{8}$/)
  })

  it('includes semantic series and category ownership in the digest', () => {
    const source = [row(1, 2, 3)]
    const seriesChanged = [{ ...source[0]!, series: 'Series B' }]
    const categoryChanged = [{ ...source[0]!, category: 'Different' }]

    const original = prepareStressInput('raw-scatter', source, 800, 400)
    expect(
      prepareStressInput('raw-scatter', seriesChanged, 800, 400).digest,
    ).not.toBe(original.digest)
    expect(
      prepareStressInput('raw-scatter', categoryChanged, 800, 400).digest,
    ).not.toBe(original.digest)
  })
})

describe('rolling keyed windows', () => {
  it('creates one immutable deterministic feed for every revision', () => {
    const first = createRollingFeed(1_000, 3)
    const second = createRollingFeed(1_000, 3)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1_150)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first.every(Object.isFrozen)).toBe(true)
    expect(first.map(({ id }) => id)).toEqual(
      Array.from({ length: 1_150 }, (_, index) => index),
    )
  })

  it.each([
    [1_000, 50],
    [5_000, 250],
    [10_000, 500],
  ])('shifts exactly five percent of a %i-row window', (windowSize, shift) => {
    expect(rollingShiftCount(windowSize)).toBe(shift)
  })

  it('preserves every overlapping datum object and replaces exact edge keys', () => {
    const feed = createRollingFeed(1_000, 2)
    const [initial, first, second] = prepareRollingSequence(
      feed,
      1_000,
      2,
      800,
      400,
    )
    const initialKeys = new Set(initial!.input.rows.map(({ id }) => id))
    const firstKeys = new Set(first!.input.rows.map(({ id }) => id))

    expect(initial!.rollingWindow).toEqual({
      revision: 0,
      windowSize: 1_000,
      shiftCount: 50,
      startIndex: 0,
      endIndex: 1_000,
    })
    expect(first!.rollingWindow).toEqual({
      revision: 1,
      windowSize: 1_000,
      shiftCount: 50,
      startIndex: 50,
      endIndex: 1_050,
    })
    expect(initial!.input.xDomain).toEqual([0, 999])
    expect(first!.input.xDomain).toEqual([50, 1_049])
    expect(second!.input.xDomain).toEqual([100, 1_099])
    expect(Object.isFrozen(initial!.input.rows)).toBe(true)
    expect(Object.isFrozen(first!.input.rows)).toBe(true)
    expect([...initialKeys].filter((key) => !firstKeys.has(key))).toEqual(
      Array.from({ length: 50 }, (_, index) => index),
    )
    expect([...firstKeys].filter((key) => !initialKeys.has(key))).toEqual(
      Array.from({ length: 50 }, (_, index) => 1_000 + index),
    )
    first!.input.rows.slice(0, 950).forEach((value, index) => {
      expect(value).toBe(initial!.input.rows[index + 50])
    })
    expect(initial!.digest).not.toBe(first!.digest)
    expect(first!.representedCount).toBe(1_000)
    expect(first!.preparedRowCount).toBe(1_000)
  })

  it('rejects a revision beyond the preallocated feed', () => {
    const feed = createRollingFeed(1_000, 1)
    expect(() => prepareRollingWindow(feed, 1_000, 2, 800, 400)).toThrowError(
      /needs 1100/,
    )
  })

  it('rejects the generic roll path that cannot preserve feed identity', () => {
    const feed = createRollingFeed(1_000, 1)
    const initial = prepareRollingWindow(feed, 1_000, 0, 800, 400)

    expect(() =>
      prepareStressUpdate(
        'rolling-keyed-window',
        'roll',
        initial.input.rows,
        initial,
        800,
        400,
      ),
    ).toThrowError(/prepareRollingWindow/)
  })
})

describe('stress representation preparation', () => {
  it.each([
    ['binned-density', 2_048],
    ['pixel-envelope', 3_200],
    ['viewport-envelope', 3_200],
    ['histogram-128', 128],
    ['top-categories', 25],
  ] satisfies ReadonlyArray<readonly [StressWorkloadId, number]>)(
    '%s accounts for every source row within its mark budget',
    (workload, maximumPreparedRows) => {
      const source = createStressSource(workload, 10_000, 0)
      const prepared = prepareStressInput(workload, source, 800, 400)

      expect(prepared.representedCount).toBe(source.length)
      expect(prepared.preparedRowCount).toBe(prepared.input.rows.length)
      expect(prepared.preparedRowCount).toBeLessThanOrEqual(maximumPreparedRows)
    },
  )

  it('keeps raw representations one-to-one with source rows', () => {
    const source = createStressSource('raw-scatter', 1_000, 0)
    const prepared = prepareStressInput('raw-scatter', source, 800, 400)

    expect(prepared.input.rows).toBe(source)
    expect(prepared.representedCount).toBe(1_000)
    expect(prepared.preparedRowCount).toBe(1_000)
  })

  it('preserves the exact minimum and maximum in a pixel envelope', () => {
    const source = [5, 9, -7, 3, 4, 20, 8, 1].map((y, id) => row(id, id, y))
    const prepared = prepareStressInput('pixel-envelope', source, 2, 400)
    const renderedValues = prepared.input.rows.map(({ y }) => y)

    expect(prepared.exactMinimum).toBe(-7)
    expect(prepared.exactMaximum).toBe(20)
    expect(renderedValues).toContain(-7)
    expect(renderedValues).toContain(20)
    expect(prepared.preparedRowCount).toBeLessThanOrEqual(8)
  })

  it('preserves source-space x positions and recomputes for the viewport', () => {
    const source = createStressSource('pixel-envelope', 1_000, 0)
    const wide = prepareStressInput('pixel-envelope', source, 800, 400)
    const narrow = prepareStressInput('pixel-envelope', source, 200, 400)
    const sourceById = new Map(source.map((value) => [value.id, value]))

    expect(
      wide.input.rows.every((value) => sourceById.get(value.id)?.x === value.x),
    ).toBe(true)
    expect(narrow.preparedRowCount).toBeLessThan(wide.preparedRowCount)
    expect(narrow.digest).not.toBe(wide.digest)
    expect(narrow.representedCount).toBe(source.length)
  })

  it('accounts for every source row and retains extrema after an append', () => {
    const source = [
      row(0, 0, 2),
      row(1, 1, -40),
      row(2, 2, 8),
      row(3, 3, 140),
      row(4, 4, 6),
      row(5, 5, 3),
      row(6, 6, 4),
      row(7, 7, 5),
      row(8, 8, 7),
      row(9, 9, 9),
    ]
    const initial = prepareStressInput('pixel-envelope', source, 2, 400)
    const updateSource = createStressUpdateSource(
      'pixel-envelope',
      'append',
      source,
    )
    const updated = prepareStressUpdate(
      'pixel-envelope',
      'append',
      source,
      initial,
      2,
      400,
    )
    const sourceValues = updateSource.map(({ y }) => y)
    const renderedValues = updated.input.rows.map(({ y }) => y)

    expect(updated.representedCount).toBe(updateSource.length)
    expect(updated.exactMinimum).toBe(Math.min(...sourceValues))
    expect(updated.exactMaximum).toBe(Math.max(...sourceValues))
    expect(renderedValues).toContain(updated.exactMinimum)
    expect(renderedValues).toContain(updated.exactMaximum)
  })

  it('maps density counts into occupied cells of a fixed grid', () => {
    const source = [
      row(0, 0, 0),
      row(1, 0, 0),
      row(2, 0, 0),
      row(3, 0, 0),
      row(4, 4, 100),
    ]
    const prepared = prepareStressInput('binned-density', source, 800, 400)
    const populated = prepared.input.rows
      .map(({ size }) => size)
      .sort((left, right) => right - left)

    expect(prepared.preparedRowCount).toBe(2)
    expect(prepared.representedCount).toBe(5)
    expect(populated).toEqual([10, 5.75])
    expect(prepared.input.rows.every(({ size }) => size > 0)).toBe(true)
  })

  it('normalizes all observations into 128 histogram bins', () => {
    const source = [
      row(0, 0, 0),
      row(1, 1, 0),
      row(2, 2, 0),
      row(3, 3, 0),
      row(4, 4, 100),
    ]
    const prepared = prepareStressInput('histogram-128', source, 800, 400)
    const populated = prepared.input.rows.filter(({ y }) => y > 0)

    expect(prepared.preparedRowCount).toBe(128)
    expect(prepared.representedCount).toBe(5)
    expect(populated).toEqual([
      expect.objectContaining({ category: 'B0', y: 100 }),
      expect.objectContaining({ category: 'B127', y: 25 }),
    ])
  })

  it('rolls every category outside the leading 24 into Other', () => {
    const source = Array.from({ length: 26 }, (_, id) => row(id, id, 0))
    const prepared = prepareStressInput('top-categories', source, 800, 400)
    const other = prepared.input.rows.at(-1)

    expect(prepared.preparedRowCount).toBe(25)
    expect(prepared.representedCount).toBe(26)
    expect(prepared.input.rows.slice(0, 24).every(({ y }) => y === 50)).toBe(
      true,
    )
    expect(other).toEqual(
      expect.objectContaining({
        id: -1,
        category: 'Other',
        x: 24,
        y: 100,
      }),
    )
  })
})

describe('stress updates', () => {
  const sourceCount = 10
  const width = 800
  const height = 400
  const initialSource = createStressSource('raw-scatter', sourceCount, 0)
  const initial = prepareStressInput(
    'raw-scatter',
    initialSource,
    width,
    height,
  )

  it.each([
    'raw-line',
    'raw-scatter',
    'interactive-scatter',
    'binned-density',
    'pixel-envelope',
    'viewport-envelope',
    'stats-multi-series-line',
    'rolling-keyed-window',
    'histogram-128',
    'top-categories',
    'dashboard-lines',
  ] satisfies readonly StressWorkloadId[])(
    '%s append retains the exact source prefix and accounts for the tail',
    (workload) => {
      const source = createStressSource(workload, 100, 0)
      const prepared = prepareStressInput(workload, source, width, height)
      const updateSource = createStressUpdateSource(workload, 'append', source)
      const updated = prepareStressUpdate(
        workload,
        'append',
        source,
        prepared,
        width,
        height,
      )

      const appendedCount =
        workload === 'stats-multi-series-line'
          ? new Set(source.map(({ series }) => series)).size
          : 10
      expect(updateSource).toHaveLength(100 + appendedCount)
      updateSource.slice(0, source.length).forEach((value, index) => {
        expect(value).toBe(source[index])
      })
      expect(updated.representedCount).toBe(updateSource.length)
      if (workload !== 'stats-multi-series-line') {
        expect(updateSource.at(source.length)?.id).toBe(source.length)
      }
      if (workload === 'raw-line' || workload === 'dashboard-lines') {
        expect(updateSource.at(source.length)?.x).toBe(source.length)
      }
    },
  )

  it('returns the exact prepared input for a no-op', () => {
    expect(
      prepareStressUpdate(
        'raw-scatter',
        'noop',
        initialSource,
        initial,
        width,
        height,
      ),
    ).toBe(initial)
  })

  it('updates values while retaining keys and cardinality', () => {
    const updated = prepareStressUpdate(
      'raw-scatter',
      'same',
      initialSource,
      initial,
      width,
      height,
    )

    expect(updated.input.rows.map(({ id }) => id)).toEqual(
      initial.input.rows.map(({ id }) => id),
    )
    expect(updated.preparedRowCount).toBe(initial.preparedRowCount)
    expect(updated.digest).not.toBe(initial.digest)
  })

  it('appends ten percent with stable source accounting', () => {
    const updateSource = createStressUpdateSource(
      'raw-scatter',
      'append',
      initialSource,
    )
    const updated = prepareStressUpdate(
      'raw-scatter',
      'append',
      initialSource,
      initial,
      width,
      height,
    )

    expect(updated.representedCount).toBe(11)
    expect(updated.preparedRowCount).toBe(11)
    expect(updateSource.slice(0, sourceCount)).toEqual(initialSource)
    expect(updateSource.slice(0, sourceCount)).toEqual(
      updated.input.rows.slice(0, sourceCount),
    )
    updateSource.slice(0, sourceCount).forEach((value, index) => {
      expect(value).toBe(initialSource[index])
    })
    expect(updateSource.at(sourceCount)?.id).toBe(sourceCount)
    expect(updateSource.at(sourceCount)?.category).toBe(`C${sourceCount}`)
    expect(
      createStressUpdateSource('raw-scatter', 'append', initialSource),
    ).toEqual(updateSource)
  })

  it('replaces every key without changing cardinality', () => {
    const updated = prepareStressUpdate(
      'raw-scatter',
      'replace',
      initialSource,
      initial,
      width,
      height,
    )
    const initialIds = new Set(initial.input.rows.map(({ id }) => id))

    expect(updated.preparedRowCount).toBe(sourceCount)
    expect(updated.input.rows.every(({ id }) => !initialIds.has(id))).toBe(true)
  })

  it('reverses prepared rows without regenerating them', () => {
    const updated = prepareStressUpdate(
      'raw-scatter',
      'reorder',
      initialSource,
      initial,
      width,
      height,
    )

    expect(updated.input.rows).toEqual([...initial.input.rows].reverse())
    expect(updated.input.rows[0]).toBe(initial.input.rows.at(-1))
    expect(updated.representedCount).toBe(initial.representedCount)
    expect(updated.digest).not.toBe(initial.digest)
  })

  it('crops the numeric viewport without changing prepared rows', () => {
    const source = createStressSource('viewport-envelope', 10_000, 0)
    const prepared = prepareStressInput(
      'viewport-envelope',
      source,
      width,
      height,
    )
    const updated = prepareStressUpdate(
      'viewport-envelope',
      'viewport',
      source,
      prepared,
      width,
      height,
    )

    expect(updated.input.rows).toBe(prepared.input.rows)
    expect(prepared.input.xDomain).toEqual([
      prepared.input.rows[0]?.x,
      prepared.input.rows.at(-1)?.x,
    ])
    expect(updated.input.xDomain).toEqual([
      prepared.input.rows[Math.floor(prepared.input.rows.length * 0.2)]?.x,
      prepared.input.rows[Math.floor(prepared.input.rows.length * 0.8)]?.x,
    ])
    expect(updated.representedCount).toBe(source.length)
    expect(updated.digest).not.toBe(prepared.digest)
  })

  it.each([
    [2_080, 8, 260],
    [12_480, 24, 520],
    [33_280, 32, 1_040],
  ])(
    'creates %i long-form Stats observations as %i stable series by %i x buckets',
    (count, seriesCount, pointCount) => {
      const source = createStressSource('stats-multi-series-line', count, 0)
      const prepared = prepareStressInput(
        'stats-multi-series-line',
        source,
        width,
        height,
      )
      const groups = groupRowsBySeries(source)

      expect(source).toHaveLength(count)
      expect(groups.size).toBe(seriesCount)
      expect(
        [...groups.values()].every((rows) => rows.length === pointCount),
      ).toBe(true)
      expect(prepared.input.seriesDomain).toEqual([...groups.keys()])
      expect(prepared.input.seriesOrder).toEqual([...groups.keys()])
      expect(prepared.input.hiddenSeries).toEqual([])
      expect(prepared.representedCount).toBe(count)
    },
  )

  it('reorders Stats rows and series without changing their identities', () => {
    const source = createStressSource('stats-multi-series-line', 2_080, 0)
    const initial = prepareStressInput(
      'stats-multi-series-line',
      source,
      width,
      height,
    )
    const updated = prepareStressUpdate(
      'stats-multi-series-line',
      'reorder',
      source,
      initial,
      width,
      height,
    )

    expect(updated.input.seriesOrder).toEqual(
      [...(initial.input.seriesOrder ?? [])].reverse(),
    )
    expect(new Set(updated.input.rows.map(({ id }) => id))).toEqual(
      new Set(initial.input.rows.map(({ id }) => id)),
    )
    expect(updated.input.rows[0]?.series).toBe(
      initial.input.seriesOrder?.at(-1),
    )
    expect(updated.digest).not.toBe(initial.digest)
  })

  it('appends exactly one x bucket to every Stats series', () => {
    const source = createStressSource('stats-multi-series-line', 2_080, 0)
    const updateSource = createStressUpdateSource(
      'stats-multi-series-line',
      'append',
      source,
    )
    const updated = prepareStressUpdate(
      'stats-multi-series-line',
      'append',
      source,
      prepareStressInput('stats-multi-series-line', source, width, height),
      width,
      height,
    )
    const groups = groupRowsBySeries(updateSource)

    expect(updateSource.slice(0, source.length)).toEqual(source)
    source.forEach((value, index) => {
      expect(updateSource[index]).toBe(value)
    })
    expect(updateSource).toHaveLength(2_088)
    expect([...groups.values()].every((rows) => rows.length === 261)).toBe(true)
    expect([...groups.values()].every((rows) => rows.at(-1)?.x === 260)).toBe(
      true,
    )
    expect(updated.representedCount).toBe(2_088)
  })

  it('hides one Stats series without regenerating or dropping source rows', () => {
    const source = createStressSource('stats-multi-series-line', 2_080, 0)
    const initial = prepareStressInput(
      'stats-multi-series-line',
      source,
      width,
      height,
    )
    const updated = prepareStressUpdate(
      'stats-multi-series-line',
      'toggle-series',
      source,
      initial,
      width,
      height,
    )

    expect(updated.input.rows).toBe(initial.input.rows)
    expect(updated.input.hiddenSeries).toEqual([
      initial.input.seriesDomain?.at(-1),
    ])
    expect(updated.representedCount).toBe(source.length)
    expect(updated.digest).not.toBe(initial.digest)
  })

  it('carries an exact explicit domain through Stats append', () => {
    const source = createStressSource('stats-multi-series-line', 2_080, 0)
    const initial = prepareStressInput(
      'stats-multi-series-line',
      source,
      width,
      height,
    )
    const updated = prepareStressUpdate(
      'stats-multi-series-line',
      'append',
      source,
      initial,
      width,
      height,
    )

    expect(initial.input.xDomain).toEqual([0, 259])
    expect(updated.input.xDomain).toEqual([0, 260])
  })

  it('changes only the requested viewport contract on resize', () => {
    const updated = prepareStressUpdate(
      'raw-scatter',
      'resize',
      initialSource,
      initial,
      width,
      height,
    )

    expect(updated.input.width).toBe(560)
    expect(updated.input.height).toBe(440)
    expect(updated.digest).toBe(initial.digest)
    expect(updated.representedCount).toBe(initial.representedCount)
  })

  it('can omit update digest work without changing update preparation', () => {
    const withDigest = prepareStressUpdate(
      'raw-scatter',
      'append',
      initialSource,
      initial,
      width,
      height,
    )
    const withoutDigest = prepareStressUpdate(
      'raw-scatter',
      'append',
      initialSource,
      initial,
      width,
      height,
      { includeDigest: false },
    )

    expect(withoutDigest).toEqual({ ...withDigest, digest: '' })
    expect(withDigest.digest).toMatch(/^[0-9a-f]{8}$/)
  })
})
