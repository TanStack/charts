import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  catalogArtifactFileSizeLimit,
  validateCatalogArtifactManifest,
} from './catalog-artifact.mjs'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const artifactDirectory = path.join(rootDirectory, '.catalog-artifact')
const catalogPath = path.join(artifactDirectory, 'catalog.json')
const catalogSource = await fs.readFile(catalogPath, 'utf8')

if (Buffer.byteLength(catalogSource) > catalogArtifactFileSizeLimit) {
  throw new Error('catalog.json exceeds the artifact file-size limit')
}

const catalog = JSON.parse(catalogSource)
const summary = validateCatalogArtifactManifest(catalog)
assert(
  summary.caseCount === 100,
  `expected 100 cases, got ${summary.caseCount}`,
)
assert(
  summary.referenceCounts['observable-plot'] === 68 &&
    summary.referenceCounts.recharts === 21 &&
    summary.referenceCounts.echarts === 11,
  `unexpected comparison counts ${JSON.stringify(summary.referenceCounts)}`,
)

const expectedFiles = new Set(['catalog.json', ...Object.keys(catalog.assets)])
const actualFiles = new Set(await listArtifactFiles(artifactDirectory))
assertSetEqual(actualFiles, expectedFiles, 'catalog artifact files')

for (const [assetPath, expected] of Object.entries(catalog.assets)) {
  const content = await fs.readFile(
    path.join(artifactDirectory, ...assetPath.split('/')),
  )
  assert(
    content.byteLength === expected.bytes,
    `${assetPath} has ${content.byteLength} bytes, expected ${expected.bytes}`,
  )
  assert(
    createHash('sha256').update(content).digest('hex') === expected.sha256,
    `${assetPath} does not match its sha256`,
  )
}

for (const entry of catalog.cases) {
  for (const sourcePath of Object.values(entry.code)) {
    const sourceFile = path.join(rootDirectory, ...sourcePath.split('/'))
    const stats = await fs.stat(sourceFile)
    assert(stats.isFile(), `${sourcePath} is not a source file`)
  }
}

console.log(
  `Verified schema v2 catalog artifact: ${summary.caseCount} cases, ${summary.assetCount} allowlisted modules, ${formatBytes(summary.assetBytes)}, revision ${catalog.revision}.`,
)

async function listArtifactFiles(directory) {
  const files = []

  async function visit(currentDirectory) {
    for (const entry of await fs.readdir(currentDirectory, {
      withFileTypes: true,
    })) {
      const entryPath = path.join(currentDirectory, entry.name)
      const relativePath = path
        .relative(directory, entryPath)
        .split(path.sep)
        .join('/')

      if (entry.isSymbolicLink()) {
        throw new Error(`catalog artifact contains symlink ${relativePath}`)
      }
      if (entry.isDirectory()) {
        await visit(entryPath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`catalog artifact contains non-file ${relativePath}`)
      }
      files.push(relativePath)
    }
  }

  await visit(directory)
  return files.sort()
}

function assertSetEqual(actual, expected, label) {
  const missing = [...expected].filter((entry) => !actual.has(entry))
  const extra = [...actual].filter((entry) => !expected.has(entry))
  assert(
    missing.length === 0 && extra.length === 0,
    `${label} mismatch; missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}`,
  )
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
