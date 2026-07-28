import { describe, expect, it } from 'vitest'
import { catalogRouteHref, parseCatalogRoute } from './routes'

describe('catalog routes', () => {
  it.each([
    ['/', { view: 'index' }],
    ['/all/', { view: 'all' }],
    ['/charts/01-line/', { view: 'case', caseId: '01-line' }],
    ['/embed/01-line/', { view: 'embed', caseId: '01-line' }],
    ['/unknown/', { view: 'not-found' }],
  ] as const)('parses %s', (pathname, expected) => {
    expect(parseCatalogRoute(pathname)).toEqual(expected)
  })

  it('parses routes below a deployment base path', () => {
    expect(
      parseCatalogRoute('/charts/catalog/all/', '/charts/catalog/'),
    ).toEqual({ view: 'all' })
    expect(parseCatalogRoute('/outside/', '/charts/catalog/')).toEqual({
      view: 'not-found',
    })
  })

  it('creates encoded, base-aware links', () => {
    expect(
      catalogRouteHref(
        { view: 'case', caseId: 'chart with spaces' },
        '/catalog',
      ),
    ).toBe('/catalog/charts/chart%20with%20spaces/')
  })
})
