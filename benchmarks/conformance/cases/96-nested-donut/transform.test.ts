import { flare } from '@charts-poc/demo-data/flare'
import { describe, expect, it } from 'vitest'
import { nestedFlareDonut } from './transform'

describe('nestedFlareDonut', () => {
  it('aggregates leaf sizes into aligned family and detail rings', () => {
    const data = nestedFlareDonut(flare)

    expect(data.inner).toEqual([
      { name: 'flare.animate', size: 100_024 },
      { name: 'flare.data', size: 30_284 },
    ])
    expect(data.outer).toEqual([
      {
        name: 'flare.animate.core',
        family: 'flare.animate',
        size: 76_943,
      },
      {
        name: 'flare.animate.interpolate',
        family: 'flare.animate',
        size: 23_081,
      },
      { name: 'flare.data.core', family: 'flare.data', size: 11_935 },
      {
        name: 'flare.data.converters',
        family: 'flare.data',
        size: 18_349,
      },
    ])
  })
})
