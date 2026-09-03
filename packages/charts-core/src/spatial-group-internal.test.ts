import { describe, expect, it } from 'vitest'
import { groupRowsByChartKey } from './spatial-group-internal'

describe('spatial row grouping', () => {
  it('uses canonical group order while preserving source order within groups', () => {
    const rows = [
      { id: 'string-1', group: '1' },
      { id: 'b-1', group: 'b' },
      { id: 'null', group: null },
      { id: 'a', group: 'a' },
      { id: 'b-2', group: 'b' },
      { id: 'number-1', group: 1 },
    ] as const

    const groups = groupRowsByChartKey(rows)

    expect(groups.map(({ identity }) => identity)).toEqual([
      'number:1',
      'object:null',
      'string:1:1',
      'string:1:a',
      'string:1:b',
    ])
    expect(groups.map(({ group }) => group)).toEqual([1, null, '1', 'a', 'b'])
    expect(groups.at(-1)?.rows.map(({ id }) => id)).toEqual(['b-1', 'b-2'])
    expect(rows.map(({ id }) => id)).toEqual([
      'string-1',
      'b-1',
      'null',
      'a',
      'b-2',
      'number-1',
    ])
  })

  it('returns no groups for empty input', () => {
    expect(groupRowsByChartKey([])).toEqual([])
  })
})
