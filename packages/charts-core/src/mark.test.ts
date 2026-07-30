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
    }

    expect(inferredKeyValues(rows, undefined, options)).toEqual([0, 1])
    expect(inferredKeyValues(rows, undefined, options)).toEqual([0, 1])
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('supply key for stable identity'),
    )
    warn.mockRestore()
  })

  it('builds deterministic composite candidates without value collisions', () => {
    const first = compositeKeyValues(['a', 'a:b'], ['b:c', 'c'])
    const second = compositeKeyValues(['a:b', 'a'], ['c', 'b:c'])

    expect(first[0]).not.toBe(second[0])
    expect(first[1]).not.toBe(second[1])
  })
})
