import { describe, expect, it } from 'vitest'
import {
  selectBootstrapCandidate,
  validateBootstrapEnvironment,
  validateFixedReleaseSet,
} from './bootstrap-release-package.mjs'

const version = '0.4.0'
const artifacts = [
  artifact('@tanstack/charts', 'sha512-core'),
  artifact('@tanstack/react-native-charts', 'sha512-native', {
    '@tanstack/charts': version,
  }),
]

describe('npm package bootstrap', () => {
  it('derives and confirms the sole missing fixed-set package', () => {
    const selection = selectBootstrapCandidate({
      artifacts,
      expectedSpec: '@tanstack/react-native-charts@0.4.0',
      registryPackages: new Map([
        ['@tanstack/charts', registry(artifacts[0])],
        ['@tanstack/react-native-charts', null],
      ]),
    })

    expect(selection).toEqual({ artifact: artifacts[1], publishNeeded: true })
  })

  it('rejects publication when multiple fixed packages are missing', () => {
    expect(() =>
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/react-native-charts@0.4.0',
        registryPackages: new Map([
          ['@tanstack/charts', null],
          ['@tanstack/react-native-charts', null],
        ]),
      }),
    ).toThrow(/exactly one missing fixed-set package/)
  })

  it('rejects a confirmation outside the fixed release set', () => {
    expect(() =>
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/unknown-charts@0.4.0',
        registryPackages: new Map([
          ['@tanstack/charts', registry(artifacts[0])],
          ['@tanstack/react-native-charts', null],
        ]),
      }),
    ).toThrow(/is not the exact fixed-set package and version/)
  })

  it('rejects a confirmation that differs from the missing package', () => {
    expect(() =>
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/charts@0.4.0',
        registryPackages: new Map([
          ['@tanstack/charts', registry(artifacts[0])],
          ['@tanstack/react-native-charts', null],
        ]),
      }),
    ).toThrow(/Confirmation differs/)
  })

  it('accepts an idempotent rerun only with exact integrity and provenance', () => {
    const registryPackages = new Map(
      artifacts.map((entry) => [entry.name, registry(entry)]),
    )
    expect(
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/react-native-charts@0.4.0',
        registryPackages,
      }),
    ).toEqual({ artifact: artifacts[1], publishNeeded: false })

    registryPackages.set(
      '@tanstack/react-native-charts',
      registry(artifacts[1], { integrity: 'sha512-different' }),
    )
    expect(() =>
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/react-native-charts@0.4.0',
        registryPackages,
      }),
    ).toThrow(/different contents/)
  })

  it('requires every existing fixed package and internal dependency to have provenance', () => {
    expect(() =>
      selectBootstrapCandidate({
        artifacts,
        expectedSpec: '@tanstack/react-native-charts@0.4.0',
        registryPackages: new Map([
          ['@tanstack/charts', registry(artifacts[0], { attestations: null })],
          ['@tanstack/react-native-charts', null],
        ]),
      }),
    ).toThrow(/lacks provenance attestations/)
  })

  it('requires internal dependencies to use the fixed release version', () => {
    const invalidArtifacts = [
      artifacts[0],
      artifact('@tanstack/react-native-charts', 'sha512-native', {
        '@tanstack/charts': '0.3.0',
      }),
    ]
    expect(() =>
      selectBootstrapCandidate({
        artifacts: invalidArtifacts,
        expectedSpec: '@tanstack/react-native-charts@0.4.0',
        registryPackages: new Map([
          ['@tanstack/charts', registry(invalidArtifacts[0])],
          ['@tanstack/react-native-charts', null],
        ]),
      }),
    ).toThrow(/must pin @tanstack\/charts@0\.4\.0/)
  })

  it('requires the Changesets fixed group to exactly match release packages', () => {
    const packages = artifacts.map(({ name }) => ({ name }))
    expect(
      validateFixedReleaseSet(packages, {
        fixed: [packages.map(({ name }) => name)],
      }),
    ).toEqual(packages.map(({ name }) => name))
    expect(() =>
      validateFixedReleaseSet(packages, {
        fixed: [['@tanstack/charts']],
      }),
    ).toThrow(/differs from releasePackageConfigs/)
  })

  it('requires an exact manual dispatch from the main branch of this repository', () => {
    const env = {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_REF_TYPE: 'branch',
      GITHUB_REF_NAME: 'main',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_REPOSITORY: 'TanStack/charts',
      GITHUB_SHA: 'a'.repeat(40),
      RELEASE_REVISION: 'a'.repeat(40),
      BOOTSTRAP_PACKAGE_SPEC: '@tanstack/react-native-charts@0.4.0',
    }
    expect(() => validateBootstrapEnvironment(env)).not.toThrow()
    expect(() =>
      validateBootstrapEnvironment({
        ...env,
        GITHUB_REF: 'refs/heads/feature',
      }),
    ).toThrow(/refs\/heads\/main/)
    expect(() =>
      validateBootstrapEnvironment({
        ...env,
        GITHUB_REPOSITORY: 'fork/charts',
      }),
    ).toThrow(/TanStack\/charts/)
  })
})

function artifact(name, integrity, dependencies = {}) {
  return {
    name,
    integrity,
    manifest: { version },
    packedManifest: { dependencies },
  }
}

function registry(entry, overrides = {}) {
  return {
    name: entry.name,
    version,
    dist: {
      integrity: overrides.integrity ?? entry.integrity,
      attestations:
        overrides.attestations === undefined
          ? { url: 'https://registry.npmjs.org/-/npm/v1/attestations/example' }
          : overrides.attestations,
    },
  }
}
