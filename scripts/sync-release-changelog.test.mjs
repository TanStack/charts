import { describe, expect, it } from 'vitest'
import {
  combinedReleaseSection,
  consumeUnreleasedSection,
  releaseNotes,
  syncRootChangelog,
  versionSection,
} from './sync-release-changelog.mjs'

describe('release changelog synchronization', () => {
  const packageChangelog = `# @tanstack/charts

## 0.0.2

### Patch Changes

- Add cached CI.

## 0.0.1

- Initial release.
`

  it('extracts one exact version section', () => {
    expect(versionSection(packageChangelog, '0.0.2')).toBe(`## 0.0.2

### Patch Changes

- Add cached CI.`)
  })

  it('retains H2 subsections until the next semver release heading', () => {
    const detailedChangelog = `# Changelog

## 0.0.2 (2026-07-30)

Release summary.

## Breaking changes and migrations

Migration details.

## Verification

Verification details.

## 0.0.1

Previous release.
`
    expect(versionSection(detailedChangelog, '0.0.2'))
      .toBe(`## 0.0.2 (2026-07-30)

Release summary.

## Breaking changes and migrations

Migration details.

## Verification

Verification details.`)
  })

  it('requires nonempty notes for the release version', () => {
    expect(() => releaseNotes('# Changelog\n', '0.0.2')).toThrow(
      'Root changelog has no 0.0.2 section',
    )
    expect(() =>
      releaseNotes('# Changelog\n\n## 0.0.2\n\n## 0.0.1\n\nPrevious.', '0.0.2'),
    ).toThrow('Root changelog 0.0.2 section is empty')
  })

  const adapterChangelog = `# @tanstack/react-charts

## 0.0.2

### Patch Changes

- Fix adapter hydration.
`

  it('combines every package entry under one release heading', () => {
    expect(
      combinedReleaseSection(
        [
          { name: '@tanstack/charts', source: packageChangelog },
          { name: '@tanstack/react-charts', source: adapterChangelog },
        ],
        '0.0.2',
      ),
    ).toBe(`## 0.0.2

### @tanstack/charts

#### Patch Changes

- Add cached CI.

### @tanstack/react-charts

#### Patch Changes

- Fix adapter hydration.`)
  })

  it('prepends the combined package entries to the root changelog once', () => {
    const root = '# Changelog\n\n## 0.0.1\n\n- Initial release.\n'
    const packages = [
      { name: '@tanstack/charts', source: packageChangelog },
      { name: '@tanstack/react-charts', source: adapterChangelog },
    ]
    const synced = syncRootChangelog(root, packages, '0.0.2')
    expect(synced).toContain('# Changelog\n\n## 0.0.2\n\n### @tanstack/charts')
    expect(synced).toContain('### @tanstack/react-charts')
    expect(syncRootChangelog(synced, packages, '0.0.2')).toBe(synced)
  })

  it('moves pending migration notes into the generated release section', () => {
    const root = `# Changelog

## Unreleased

### Breaking changes

Replace the legacy tooltip input.

## 0.0.1

- Initial release.
`
    const consumed = consumeUnreleasedSection(root)
    expect(consumed.body).toBe(`### Breaking changes

Replace the legacy tooltip input.`)
    expect(consumed.source).not.toContain('## Unreleased')

    const synced = syncRootChangelog(
      root,
      [{ name: '@tanstack/charts', source: packageChangelog }],
      '0.0.2',
    )
    expect(synced).toContain(`## 0.0.2

### @tanstack/charts`)
    expect(synced).toContain(`### Breaking changes

Replace the legacy tooltip input.

## 0.0.1`)
    expect(synced).not.toContain('## Unreleased')
    expect(releaseNotes(synced, '0.0.2')).toContain(
      'Replace the legacy tooltip input.',
    )
  })
})
