import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalogSourceClosure } from '../benchmarks/conformance/catalog-loader.ts'
import {
  catalogArtifactFileSizeLimit,
  expectedCatalogImplementationCounts,
  validateCatalogArtifactManifest,
} from './catalog-artifact.mjs'
import {
  catalogSourceClosureMetadata,
  createCatalogSourceModules,
} from './catalog-source-files.mjs'

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
const sourceModules = await createCatalogSourceModules(
  path.join(rootDirectory, 'benchmarks', 'conformance'),
)
assert(
  summary.caseCount === expectedCatalogImplementationCounts.tanstack,
  `expected ${expectedCatalogImplementationCounts.tanstack} cases, got ${summary.caseCount}`,
)
assert(
  summary.referenceCounts['observable-plot'] ===
    expectedCatalogImplementationCounts['observable-plot'] &&
    summary.referenceCounts.recharts ===
      expectedCatalogImplementationCounts.recharts &&
    summary.referenceCounts.echarts ===
      expectedCatalogImplementationCounts.echarts,
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
    const stats = await fs.lstat(sourceFile)
    assert(
      stats.isFile() && !stats.isSymbolicLink(),
      `${sourcePath} is not a regular source file`,
    )
  }
  for (const authoredSource of Object.values(entry.authoredSource)) {
    for (const role of Object.values(authoredSource.roles)) {
      for (const sourcePath of role.paths) {
        const sourceFile = path.join(
          rootDirectory,
          'benchmarks',
          'conformance',
          ...sourcePath.split('/'),
        )
        const stats = await fs.lstat(sourceFile)
        assert(
          stats.isFile() && !stats.isSymbolicLink(),
          `${sourcePath} is not a regular authored source file`,
        )
      }
    }
  }
  const expectedTanStackSource = await sourceMetadataForRepositoryPath(
    entry.code.tanstack,
  )
  const expectedReferenceSource = await sourceMetadataForRepositoryPath(
    entry.code.reference,
  )
  assert(
    JSON.stringify(entry.authoredSource.tanstack) ===
      JSON.stringify(expectedTanStackSource),
    `${entry.id} TanStack authored source does not match the repository`,
  )
  assert(
    JSON.stringify(entry.authoredSource.reference) ===
      JSON.stringify(expectedReferenceSource),
    `${entry.id} reference authored source does not match the repository`,
  )
}

console.log(
  `Verified schema v${catalog.schemaVersion} catalog artifact: ${summary.caseCount} cases, ${summary.assetCount} allowlisted modules, ${formatBytes(summary.assetBytes)}, revision ${catalog.revision}.`,
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

async function sourceMetadataForRepositoryPath(repositoryPath) {
  const prefix = 'benchmarks/conformance/'
  assert(
    repositoryPath.startsWith(prefix),
    `${repositoryPath} is outside conformance source`,
  )
  const entryPath = `./${repositoryPath.slice(prefix.length)}`
  return catalogSourceClosureMetadata(
    await loadCatalogSourceClosure(sourceModules, entryPath),
    entryPath,
  )
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
