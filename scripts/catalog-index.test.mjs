import { describe, expect, it } from 'vitest'
import { createCatalogIndex, validateCatalogIndex } from './catalog-index.mjs'

const metadata = {
  schemaVersion: 1,
  order: 1,
  id: '01-line',
  title: 'Line',
  family: 'trend',
  intent: 'Show change.',
  support: 'native',
  features: ['line'],
  geometry: [{ role: 'line', count: 1 }],
  source: { title: 'Plot line', url: 'https://example.com/line' },
  ai: { create: 'Create it.', maintain: 'Maintain it.' },
}
const cases = [{ directory: metadata.id, metadata }]

describe('catalog index', () => {
  it('contains authored metadata and entry paths only', () => {
    const index = createCatalogIndex(cases)

    expect(validateCatalogIndex(index)).toEqual({ caseCount: 1 })
    expect(index).toEqual({
      schemaVersion: 1,
      source: {
        repo: 'tanstack/charts',
        pathRoot: 'benchmarks/conformance/',
      },
      cases: [
        {
          ...metadata,
          entries: {
            tanstack: 'benchmarks/conformance/cases/01-line/tanstack.ts',
            reference: {
              renderer: 'observable-plot',
              path: 'benchmarks/conformance/cases/01-line/plot.ts',
            },
          },
        },
      ],
    })
    expect(index).not.toHaveProperty('assets')
    expect(index.cases[0]).not.toHaveProperty('modules')
    expect(index.cases[0]).not.toHaveProperty('preview')
  })

  it('includes explicit collection metadata when provided', () => {
    const index = createCatalogIndex(cases, new Map([[metadata.id, 'shadcn']]))

    expect(validateCatalogIndex(index)).toEqual({ caseCount: 1 })
    expect(index.cases[0]).toMatchObject({
      id: metadata.id,
      collection: 'shadcn',
    })
  })

  it('rejects invalid collection IDs', () => {
    expect(() =>
      createCatalogIndex(cases, new Map([[metadata.id, 'Shad CN']])),
    ).toThrow('catalog collection for 01-line has an invalid ID')
  })

  it('rejects collection members that are not catalog cases', () => {
    expect(() =>
      createCatalogIndex(cases, new Map([['missing-case', 'shadcn']])),
    ).toThrow('catalog collection references missing-case')
  })

  it('rejects source entries that drift from the case ID', () => {
    const index = createCatalogIndex(cases)
    index.cases[0].entries.tanstack =
      'benchmarks/conformance/cases/other/tanstack.ts'

    expect(() => validateCatalogIndex(index)).toThrow(
      'catalog index case 01-line has invalid source entries',
    )
  })

  it('rejects invalid case metadata', () => {
    const index = createCatalogIndex(cases)
    delete index.cases[0].title

    expect(() => validateCatalogIndex(index)).toThrow(
      'Invalid conformance metadata',
    )
  })

  it('rejects generated runtime output', () => {
    const index = createCatalogIndex(cases)
    index.cases[0].modules = {}

    expect(() => validateCatalogIndex(index)).toThrow(
      'must not contain generated runtime output',
    )
  })
})
