import { describe, expect, it, vi } from 'vitest'
import { compositeKeyValues, inferredKeyValues } from './mark'

describe('inferred datum keys', () => {
  it('prefers explicit keys, then unique ids, then mark candidates', () => {
    const rows = [
      { id: 'a', category: 'Alpha', explicit: 'first' },
      { id: 'b', category: 'Beta', explicit: 'second' },
    ]

    expect(inferredKeyValues(rows, 'explicit')).toEqual(['first', 'second'])
    expect(inferredKeyValues(rows, undefined)).toEqual(['a', 'b'])
    expect(
      inferredKeyValues(
        rows.map(({ category }) => ({ category })),
        undefined,
        { candidates: [rows.map((row) => row.category)] },
      ),
    ).toEqual(['Alpha', 'Beta'])
  })

  it('tries top-level ids, then nested data ids, before mark candidates', () => {
    const topLevel = [
      { id: 'top-a', data: { id: 'nested-a' } },
      { id: 'top-b', data: { id: 'nested-b' } },
    ]
    const nested = [
      { id: 'duplicate', data: { id: 'nested-a' }, position: 'Alpha' },
      { id: 'duplicate', data: { id: 'nested-b' }, position: 'Beta' },
    ]
    const incomplete = [
      { data: { id: 'nested-a' }, position: 'Alpha' },
      { data: {}, position: 'Beta' },
    ]

    expect(inferredKeyValues(topLevel, undefined)).toEqual(['top-a', 'top-b'])
    expect(
      inferredKeyValues(nested, undefined, {
        candidates: [nested.map((row) => row.position)],
      }),
    ).toEqual(['nested-a', 'nested-b'])
    expect(
      inferredKeyValues(incomplete, undefined, {
        candidates: [incomplete.map((row) => row.position)],
      }),
    ).toEqual(['Alpha', 'Beta'])
    expect(
      inferredKeyValues(
        [{ data: { id: 'same' } }, { data: { id: 'same' } }],
        undefined,
        { groups: ['left', 'right'] },
      ),
    ).toEqual(['same', 'same'])
  })

  it('accepts candidate values that are unique within each group', () => {
    const rows = [{ value: 'A' }, { value: 'A' }]

    expect(
      inferredKeyValues(rows, undefined, {
        groups: ['left', 'right'],
        candidates: [rows.map((row) => row.value)],
      }),
    ).toEqual(['A', 'A'])
    expect(
      inferredKeyValues(rows, undefined, {
        groups: ['same', 'same'],
        candidates: [rows.map((row) => row.value)],
      }),
    ).toEqual([0, 1])
  })

  it('warns once when a mark-specific candidate falls back to position', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const rows = [{ value: 'same' }, { value: 'same' }]
    const options = {
      candidates: [rows.map((row) => row.value)],
      markId: 'duplicate-test',
      warningIdentity: {},
    }

    expect(inferredKeyValues(rows, undefined, options)).toEqual([0, 1])
    expect(inferredKeyValues(rows, undefined, options)).toEqual([0, 1])
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('supply key for stable identity'),
    )
    inferredKeyValues(rows, undefined, {
      ...options,
      warningIdentity: {},
    })
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('builds deterministic composite candidates without value collisions', () => {
    const first = compositeKeyValues(['a', 'a:b'], ['b:c', 'c'])
    const second = compositeKeyValues(['a:b', 'a'], ['c', 'b:c'])

    expect(first[0]).not.toBe(second[0])
    expect(first[1]).not.toBe(second[1])
  })
})
