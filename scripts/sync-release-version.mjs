import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readReleasePackages } from './release-package-config.mjs'

export const releaseVersionSources = [
  { path: 'README.md', references: 2, tagReferences: 1 },
  { path: 'MARKETING.md', references: 5 },
  { path: 'docs/overview.md', references: 1 },
  { path: 'docs/installation.md', references: 2, tagReferences: 1 },
  { path: 'docs/comparison.md', references: 5, tagReferences: 4 },
  { path: 'docs/reference/json-interchange.md', references: 2 },
  { path: 'packages/charts-core/src/json/version.ts', references: 1 },
  { path: 'packages/charts-core/schemas/chart.json', references: 3 },
  { path: 'packages/charts-core/schemas/example.json', references: 2 },
]

export function changelogVersions(source) {
  return [
    ...source.matchAll(/^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\s|$)/gm),
  ]
    .map((match) => match[1])
    .filter((version, index, versions) => versions.indexOf(version) === index)
}

export function syncReleaseVersionReference(
  source,
  previousVersion,
  version,
  path,
  expectedReferences,
) {
  const previousPattern = releaseVersionPattern(previousVersion)
  const currentPattern = releaseVersionPattern(version)
  const previousReferences = [...source.matchAll(previousPattern)].length
  const currentReferences = [...source.matchAll(currentPattern)].length
  const expectedCount = `${expectedReferences} ${
    expectedReferences === 1 ? 'reference' : 'references'
  }`
  if (previousReferences === 0) {
    assert.equal(
      currentReferences,
      expectedReferences,
      `${path} must contain ${expectedCount} to release ${version}`,
    )
    return source
  }

  assert.equal(
    previousReferences,
    expectedReferences,
    `${path} must contain ${expectedCount} to release ${previousVersion}`,
  )
  assert.equal(
    currentReferences,
    0,
    `${path} mixes release versions ${previousVersion} and ${version}`,
  )
  return source.replace(previousPattern, version)
}

function releaseVersionPattern(version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![0-9.])${escaped}(?![0-9A-Za-z.-])`, 'g')
}

export async function syncReleaseVersion({
  repositoryRoot = resolve(import.meta.dirname, '..'),
} = {}) {
  const packages = await readReleasePackages(repositoryRoot)
  const version = packages[0].manifest.version
  const rootChangelog = await readFile(
    resolve(repositoryRoot, 'CHANGELOG.md'),
    'utf8',
  )
  const versions = changelogVersions(rootChangelog)
  assert.equal(
    versions[0],
    version,
    `Root changelog must begin with release ${version}`,
  )
  const previousVersion = versions.find((entry) => entry !== version)
  assert.ok(previousVersion, `Root changelog has no release before ${version}`)

  await Promise.all(
    releaseVersionSources.map(async ({ path, references, tagReferences }) => {
      const target = resolve(repositoryRoot, path)
      const source = await readFile(target, 'utf8')
      const next = syncReleaseVersionReference(
        source,
        previousVersion,
        version,
        path,
        references,
      )
      if (tagReferences !== undefined) {
        assert.equal(
          releaseTagReferenceCount(next, version),
          tagReferences,
          `${path} must contain ${tagReferences} immutable v${version} release ${tagReferences === 1 ? 'link' : 'links'}`,
        )
      }
      if (next !== source) await writeFile(target, next)
    }),
  )
}

export function releaseTagReferenceCount(source, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    ...source.matchAll(
      new RegExp(
        `https://github\\.com/TanStack/charts/(?:tree|blob)/v${escaped}/`,
        'g',
      ),
    ),
  ].length
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await syncReleaseVersion()
}
