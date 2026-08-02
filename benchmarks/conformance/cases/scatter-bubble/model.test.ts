import { describe, expect, it } from 'vitest'
import { bubbleRows } from './model'

describe('bubbleRows', () => {
  it('paints larger bubbles first so smaller overlaps remain targetable', () => {
    const rows = bubbleRows(0)

    expect(rows).toHaveLength(320)
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1]!.body_mass_g).toBeGreaterThanOrEqual(
        rows[index]!.body_mass_g,
      )
    }
  })
})
