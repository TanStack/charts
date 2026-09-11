import assert from 'node:assert/strict'
import {
  conformanceCaseHeight,
  normalizeTypeDiagnosticPath,
  selectCatalogCases,
} from './compare-plot-catalog-helpers.mjs'

const { describe, test } = process.env.VITEST
  ? await import('vitest')
  : await import('node:test')

describe('catalog comparison helpers', () => {
  test('uses authored case heights without changing the legacy default', () => {
    assert.equal(conformanceCaseHeight({}), 360)
    assert.equal(conformanceCaseHeight({ height: 600 }), 600)
    assert.equal(conformanceCaseHeight({ height: 860 }), 860)
  })
  test('rejects invalid authored heights instead of coercing or defaulting', () => {
    for (const height of [
      0,
      -1,
      NaN,
      Infinity,
      -Infinity,
      '600',
      null,
      false,
    ]) {
      assert.throws(
        () => conformanceCaseHeight({ height }),
        /Invalid conformance height/,
      )
    }
    assert.equal(conformanceCaseHeight({ height: 600.5 }), 600.5)
  })
  const cases = [
    { id: 'alpha', weight: 2 },
    { id: 'beta', weight: 1 },
  ]
  const weightFor = (entry) => entry.weight

  test('distinguishes a filter miss from an empty shard', () => {
    assert.throws(
      () =>
        selectCatalogCases(cases, new Set(['missing']), undefined, weightFor),
      /case filter did not match/,
    )
    assert.throws(
      () =>
        selectCatalogCases(cases, undefined, { index: 3, total: 3 }, weightFor),
      /Conformance shard 3\/3 did not select a case/,
    )
  })

  test('normalizes TypeScript diagnostic paths to forward slashes', () => {
    assert.equal(
      normalizeTypeDiagnosticPath('C:\\repo\\benchmarks\\case.ts'),
      'C:/repo/benchmarks/case.ts',
    )
    assert.equal(
      normalizeTypeDiagnosticPath('/repo/benchmarks/case.ts'),
      '/repo/benchmarks/case.ts',
    )
  })
})
