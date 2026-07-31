import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readReleasePackages } from './release-package-config.mjs'

export function versionSection(source, version) {
  const heading = `## ${version}`
  const lines = source.split('\n')
  const start = source
    .split('\n')
    .findIndex((line) => line === heading || line.startsWith(`${heading} `))
  if (start === -1) return null
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isVersionHeading(lines[index])) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n').trim()
}

export function releaseNotes(source, version) {
  const section = versionSection(source, version)
  assert.ok(section, `Root changelog has no ${version} section`)
  assert.ok(
    section.split('\n').slice(1).join('\n').trim(),
    `Root changelog ${version} section is empty`,
  )
  return section
}

export function combinedReleaseSection(packageChangelogs, version) {
  const packageSections = packageChangelogs
    .map(({ name, source }) => {
      const section = versionSection(source, version)
      assert.ok(section, `${name} changelog has no ${version} section`)
      const body = section.split('\n').slice(1).join('\n').trim()
      if (!body) return null
      return `### ${name}\n\n${demoteHeadings(body)}`
    })
    .filter(Boolean)
  assert.ok(
    packageSections.length,
    `Release ${version} has no package changelog content`,
  )
  return `## ${version}\n\n${packageSections.join('\n\n')}`
}

export function syncRootChangelog(rootChangelog, packageChangelogs, version) {
  if (versionSection(rootChangelog, version)) return rootChangelog
  assert.ok(
    rootChangelog.startsWith('# Changelog\n'),
    'Root changelog must start with # Changelog',
  )
  const section = combinedReleaseSection(packageChangelogs, version)
  return rootChangelog.replace('# Changelog\n', `# Changelog\n\n${section}\n`)
}

export async function syncReleaseChangelog({
  repositoryRoot = resolve(import.meta.dirname, '..'),
} = {}) {
  const packages = await readReleasePackages(repositoryRoot)
  const version = packages[0].manifest.version
  const rootPath = resolve(repositoryRoot, 'CHANGELOG.md')
  const [rootChangelog, packageChangelogs] = await Promise.all([
    readFile(rootPath, 'utf8'),
    Promise.all(
      packages.map(async (packageInfo) => ({
        name: packageInfo.name,
        source: await readFile(
          resolve(
            repositoryRoot,
            'packages',
            packageInfo.directory,
            'CHANGELOG.md',
          ),
          'utf8',
        ),
      })),
    ),
  ])
  const next = syncRootChangelog(rootChangelog, packageChangelogs, version)
  if (next !== rootChangelog) await writeFile(rootPath, next)
}

function demoteHeadings(source) {
  return source.replace(/^(#{3,5})(?= )/gm, '#$1')
}

function isVersionHeading(line) {
  return /^## \d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\s|$)/.test(line)
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  await syncReleaseChangelog()
}
