import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  changelogVersions,
  releaseVersionSources,
  syncReleaseVersionReference,
} from './sync-release-version.mjs'

describe('release version synchronization', () => {
  it('tracks every current release-facing reference', async () => {
    const repositoryRoot = resolve(import.meta.dirname, '..')
    const releaseManifest = JSON.parse(
      await readFile(
        resolve(repositoryRoot, 'packages/charts-core/package.json'),
        'utf8',
      ),
    )
    expect(releaseManifest.version).toMatch(/^\d+\.\d+\.\d+/)

    for (const { path, references } of releaseVersionSources) {
      const source = await readFile(resolve(repositoryRoot, path), 'utf8')
      expect(
        syncReleaseVersionReference(
          source,
          '__previous_release__',
          releaseManifest.version,
          path,
          references,
        ),
      ).toBe(source)
    }
  })

  it('reads release headings without treating subsections as releases', () => {
    expect(
      changelogVersions(`# Changelog

## 0.0.2 (2026-07-31)

## Verification

## 0.0.1
`),
    ).toEqual(['0.0.2', '0.0.1'])
  })

  it('advances every release-facing reference and remains idempotent', () => {
    const source =
      'TanStack Charts `0.0.1` is pre-alpha. Evidence: /blob/v0.0.1/README.md'
    const synced = syncReleaseVersionReference(
      source,
      '0.0.1',
      '0.0.2',
      'docs/example.md',
      2,
    )

    expect(synced).toBe(
      'TanStack Charts `0.0.2` is pre-alpha. Evidence: /blob/v0.0.2/README.md',
    )
    expect(
      syncReleaseVersionReference(
        synced,
        '0.0.1',
        '0.0.2',
        'docs/example.md',
        2,
      ),
    ).toBe(synced)
  })

  it('rejects a release-facing file with no recognized version', () => {
    expect(() =>
      syncReleaseVersionReference(
        'No release marker.',
        '0.0.1',
        '0.0.2',
        'README.md',
        1,
      ),
    ).toThrow('README.md must contain 1 reference to release 0.0.2')
  })

  it('rejects incomplete and mixed release references', () => {
    expect(() =>
      syncReleaseVersionReference(
        'Current `0.0.1`, but another reference was omitted.',
        '0.0.1',
        '0.0.2',
        'MARKETING.md',
        2,
      ),
    ).toThrow('MARKETING.md must contain 2 references to release 0.0.1')
    expect(() =>
      syncReleaseVersionReference(
        'Current `0.0.1`; future `0.0.2`.',
        '0.0.1',
        '0.0.2',
        'MARKETING.md',
        1,
      ),
    ).toThrow('MARKETING.md mixes release versions 0.0.1 and 0.0.2')
  })
})
