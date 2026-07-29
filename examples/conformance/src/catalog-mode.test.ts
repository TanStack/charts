import { describe, expect, it } from 'vitest'
import {
  catalogRenderers,
  isCatalogComparisonMode,
  withCatalogComparisonMode,
} from './catalog-mode'

describe('catalog comparison mode', () => {
  it.each([
    ['', false],
    ['?compare', false],
    ['?compare=0', false],
    ['?compare=true', false],
    ['?compare=1', true],
    ['?family=polar&compare=1', true],
  ])('parses %s', (search, expected) => {
    expect(isCatalogComparisonMode(search)).toBe(expected)
  })

  it('adds the exact opt-in without replacing other query state', () => {
    expect(withCatalogComparisonMode('/charts/catalog/all/', true)).toBe(
      '/charts/catalog/all/?compare=1',
    )
    expect(
      withCatalogComparisonMode('/charts/catalog/all/?family=polar', true),
    ).toBe('/charts/catalog/all/?family=polar&compare=1')
  })

  it('leaves normal links untouched', () => {
    expect(withCatalogComparisonMode('/charts/catalog/', false)).toBe(
      '/charts/catalog/',
    )
  })

  it('keeps normal rendering native-only', () => {
    for (const renderer of [
      'observable-plot',
      'recharts',
      'echarts',
    ] as const) {
      expect(catalogRenderers(renderer, false)).toEqual(['tanstack'])
      expect(catalogRenderers(renderer, true)).toEqual([renderer, 'tanstack'])
    }
  })
})
