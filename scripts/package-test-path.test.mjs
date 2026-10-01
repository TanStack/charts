import { describe, expect, it } from 'vitest'
import {
  assertNoPackageTestInputs,
  isPackageTestPath,
} from './package-test-path.mjs'

describe('package test boundaries', () => {
  it.each([
    'packages/charts-core/src/decorative.type-test.ts',
    'packages/octane-charts/src/Chart.hydration.client.test.tsrx',
    'packages/octane-charts/src/nested/Chart.spec.tsrx',
  ])('recognizes and rejects validation-only input %s', (path) => {
    expect(isPackageTestPath(path)).toBe(true)
    expect(() => assertNoPackageTestInputs([path])).toThrow(
      'Production bundle includes package tests',
    )
  })

  it('recognizes validation files without excluding runtime modules', () => {
    expect(isPackageTestPath('packages/charts-core/src/adapter.test.ts')).toBe(
      true,
    )
    expect(
      isPackageTestPath('packages/react-charts/src/nested/hydration.spec.tsx'),
    ).toBe(true)
    expect(isPackageTestPath('packages/charts-core/src/adapter.ts')).toBe(false)
    expect(
      isPackageTestPath('packages/charts-core/src/adapter.test-data.ts'),
    ).toBe(false)
    expect(isPackageTestPath('packages/octane-charts/src/Chart.tsrx')).toBe(
      false,
    )
    expect(
      isPackageTestPath('packages/charts-core/src/type-test-helper.ts'),
    ).toBe(false)
  })

  it('rejects a runtime bundle importing a test, including Windows paths', () => {
    expect(() =>
      assertNoPackageTestInputs(['packages/charts-core/src/adapter.ts']),
    ).not.toThrow()
    expect(() =>
      assertNoPackageTestInputs(['packages/charts-core/src/adapter.test.ts']),
    ).toThrow('Production bundle includes package tests')
    expect(() =>
      assertNoPackageTestInputs([
        'packages\\charts-core\\src\\adapter.test.ts',
      ]),
    ).toThrow('Production bundle includes package tests')
  })
})
