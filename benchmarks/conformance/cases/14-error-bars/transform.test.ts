import { describe, expect, it } from 'vitest'
import { summarizeErrorBars } from './transform'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

describe('summarizeErrorBars', () => {
  it('groups penguins by species and derives one standard-deviation interval', () => {
    const rows: PenguinsRow[] = [
      {
        species: 'Adelie',
        island: 'Dream',
        culmen_length_mm: 38,
        culmen_depth_mm: 18,
        flipper_length_mm: 185,
        body_mass_g: 10,
        sex: 'FEMALE',
      },
      {
        species: 'Adelie',
        island: 'Dream',
        culmen_length_mm: 40,
        culmen_depth_mm: 19,
        flipper_length_mm: 190,
        body_mass_g: 20,
        sex: 'MALE',
      },
      {
        species: 'Adelie',
        island: 'Dream',
        culmen_length_mm: 42,
        culmen_depth_mm: 20,
        flipper_length_mm: 195,
        body_mass_g: 30,
        sex: 'MALE',
      },
    ]

    expect(summarizeErrorBars(rows)).toEqual([
      {
        species: 'Adelie',
        mean: 20,
        low: 10,
        high: 30,
      },
    ])
  })
})
