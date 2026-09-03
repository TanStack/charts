import { describe, expect, it } from 'vitest'
import { downloads } from '@tanstack/charts-data/downloads'
import { penguins } from '@tanstack/charts-data/penguins'
import { downloadData, penguinData } from './data'

describe('shared Observable Plot fixtures', () => {
  it('passes the published download rows through unchanged', () => {
    expect(downloadData).toBe(downloads)
  })

  it('only removes penguins without body-mass observations', () => {
    expect(penguinData).toHaveLength(
      penguins.filter((penguin) => penguin.body_mass_g !== null).length,
    )
    expect(penguinData.every((penguin) => penguins.includes(penguin))).toBe(
      true,
    )
  })
})
