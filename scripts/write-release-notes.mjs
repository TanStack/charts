import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readReleasePackages } from './release-package-config.mjs'
import { releaseNotes } from './sync-release-changelog.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')
const outputPath = process.argv[2]
assert.ok(outputPath, 'Usage: node scripts/write-release-notes.mjs <output>')

const packages = await readReleasePackages(repositoryRoot)
const version = packages[0].manifest.version
const changelog = await readFile(
  resolve(repositoryRoot, 'CHANGELOG.md'),
  'utf8',
)
const notes = releaseNotes(changelog, version)
await writeFile(resolve(outputPath), `${notes}\n`)
