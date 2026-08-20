import { describe, expect, it } from 'vitest'
import { catalogRouteHref, parseCatalogRoute } from './routes'

describe('catalog routes', () => {
  it.each([
    ['/', { view: 'index' }],
    ['/all/', { view: 'all' }],
    ['/collections/shadcn/', { view: 'collection', collectionId: 'shadcn' }],
    ['/json/', { view: 'json' }],
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
    expect(
      catalogRouteHref(
        { view: 'collection', collectionId: 'shadcn charts' },
        '/catalog',
      ),
    ).toBe('/catalog/collections/shadcn%20charts/')
  })

  it('creates the Chart JSON workbench link below a deployment base', () => {
    const basePath = '/charts/catalog/'
    const href = catalogRouteHref({ view: 'json' }, basePath)

    expect(href).toBe('/charts/catalog/json/')
    expect(parseCatalogRoute(href, basePath)).toEqual({ view: 'json' })
  })

  it('preserves the production catalog base for direct embed routes', () => {
    const basePath = '/charts/catalog/'
    const href = catalogRouteHref(
      { view: 'embed', caseId: '01-line-gaps' },
      basePath,
    )

    expect(href).toBe('/charts/catalog/embed/01-line-gaps/')
    expect(parseCatalogRoute(href, basePath)).toEqual({
      view: 'embed',
      caseId: '01-line-gaps',
    })
  })
})
