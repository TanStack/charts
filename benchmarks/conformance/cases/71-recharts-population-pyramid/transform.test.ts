import { penguins } from '@charts-poc/demo-data/penguins'
import { describe, expect, it } from 'vitest'
import { countPenguinsBySpecies, divergeMaleCounts } from './transform'

describe('penguin species pyramid', () => {
  it('groups source observations before negating male counts', () => {
    const counts = countPenguinsBySpecies(penguins)
    const rows = divergeMaleCounts(counts)

    expect(counts).toEqual([
      { species: 'Adelie', male: 73, female: 73 },
      { species: 'Chinstrap', male: 34, female: 34 },
      { species: 'Gentoo', male: 61, female: 58 },
    ])
    expect(rows[0]).toEqual({ species: 'Adelie', male: -73, female: 73 })
    expect(counts[0]?.male).toBe(73)
  })
})
