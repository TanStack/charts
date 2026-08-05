import { describe, expect, it } from 'vitest'
import {
  consumptionBreakdown,
  energyMonths,
  energyTooltipContent,
} from './model'

describe('expanding energy tooltip model', () => {
  it('keeps monthly totals and breakdown segments internally consistent', () => {
    const months = energyMonths()

    expect(months).toHaveLength(12)
    for (const month of months) {
      const parts = consumptionBreakdown(month)
      expect(parts).toHaveLength(4)
      expect(parts[0]?.start).toBe(0)
      expect(parts.at(-1)?.end).toBe(month.consumption)
      expect(parts.reduce((total, part) => total + part.value, 0)).toBe(
        month.consumption,
      )
      expect(month.usedOnSite + month.exported).toBe(month.generation)
    }
  })

  it('adds the pinned-only solar coverage row to the native content model', () => {
    const june = energyMonths().find((month) => month.id === 'jun')!

    expect(energyTooltipContent([{ datum: june }], false)).toEqual({
      title: 'June',
      rows: [
        { label: 'Consumption', value: '738 kWh', color: '#2563eb' },
        { label: 'Generation', value: '482 kWh', color: '#f5b942' },
      ],
    })
    expect(energyTooltipContent([{ datum: june }], true).rows.at(-1)).toEqual({
      label: 'Solar coverage',
      value: '32%',
    })
  })

  it('updates a stable month without changing the domain', () => {
    const initial = energyMonths(0)
    const updated = energyMonths(1)

    expect(updated.map((month) => month.id)).toEqual(
      initial.map((month) => month.id),
    )
    expect(updated.at(-1)?.consumption).toBe(
      (initial.at(-1)?.consumption ?? 0) + 18,
    )
  })
})
