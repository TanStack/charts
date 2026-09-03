import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  changelogVersions,
  releaseTagReferenceCount,
  releaseVersionSources,
  syncReleaseVersionReference,
} from './sync-release-version.mjs'

describe('release version synchronization', () => {
  it('tracks every shipped skill version', async () => {
    const repositoryRoot = resolve(import.meta.dirname, '..')
    const skillsRoot = resolve(repositoryRoot, 'packages/charts-core/skills')
    const releaseManifest = JSON.parse(
      await readFile(
        resolve(repositoryRoot, 'packages/charts-core/package.json'),
        'utf8',
      ),
    )
    const shippedSkillPaths = (
      await readdir(skillsRoot, { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => `packages/charts-core/skills/${entry.name}/SKILL.md`)
      .sort()
    const trackedSkillSources = releaseVersionSources.filter(({ path }) =>
      path.startsWith('packages/charts-core/skills/'),
    )
    const trackedSkillPaths = trackedSkillSources.map(({ path }) => path).sort()

    expect(trackedSkillPaths).toEqual(shippedSkillPaths)
    for (const { path, references } of trackedSkillSources) {
      const source = await readFile(resolve(repositoryRoot, path), 'utf8')
      const nextVersion = '999.999.999'

      expect(references).toBe(1)
      expect(source).toContain(`library_version: '${releaseManifest.version}'`)
      expect(
        syncReleaseVersionReference(
          source,
          releaseManifest.version,
          nextVersion,
          path,
          references,
        ),
      ).toContain(`library_version: '${nextVersion}'`)
    }
  })

  it('tracks every current release-facing reference', async () => {
    const repositoryRoot = resolve(import.meta.dirname, '..')
    const releaseManifest = JSON.parse(
      await readFile(
        resolve(repositoryRoot, 'packages/charts-core/package.json'),
        'utf8',
      ),
    )
    expect(releaseManifest.version).toMatch(/^\d+\.\d+\.\d+/)

    for (const { path, references, tagReferences } of releaseVersionSources) {
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
      if (tagReferences !== undefined) {
        expect(releaseTagReferenceCount(source, releaseManifest.version)).toBe(
          tagReferences,
        )
      }
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

  it('does not treat a dependency version as the release version', () => {
    const source =
      'TanStack Charts `0.6.0`; tag /v0.6.0/; Observable Plot `0.6.17`.'

    expect(
      syncReleaseVersionReference(
        source,
        '0.6.0',
        '0.6.1',
        'docs/comparison.md',
        2,
      ),
    ).toBe('TanStack Charts `0.6.1`; tag /v0.6.1/; Observable Plot `0.6.17`.')
  })

  it('counts only immutable links for the matching release tag', () => {
    expect(
      releaseTagReferenceCount(
        [
          'https://github.com/TanStack/charts/tree/v0.7.0/docs',
          'https://github.com/TanStack/charts/blob/v0.7.0/README.md',
          'https://github.com/TanStack/charts/blob/main/README.md',
          'https://github.com/TanStack/charts/blob/4f5653e552ddf1d268b49da7046199f11b2be44c/README.md',
        ].join('\n'),
        '0.7.0',
      ),
    ).toBe(2)
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
