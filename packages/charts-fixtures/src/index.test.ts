import { describe, expect, it } from 'vitest'
import { cars } from '@charts-poc/demo-data/cars'
import { downloads } from '@charts-poc/demo-data/downloads'
import {
  carRankingData,
  downloadData,
  horsepowerBins,
  horsepowerData,
} from './index'

describe('shared TanStack chart fixtures', () => {
  it('passes the published download rows to the time-series charts unchanged', () => {
    expect(downloadData).toBe(downloads)
  })

  it('keeps automobile selection and binning separate from the source rows', () => {
    expect(horsepowerData.every((car) => cars.includes(car))).toBe(true)
    expect(horsepowerBins.flat()).toHaveLength(horsepowerData.length)
    expect(horsepowerBins.flat().every((car) => cars.includes(car))).toBe(true)
  })

  it('ranks a visible selection of the original automobile rows', () => {
    expect(carRankingData).toHaveLength(8)
    expect(carRankingData.every((car) => cars.includes(car))).toBe(true)
  })
})
