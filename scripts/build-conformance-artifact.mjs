import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseConformanceCaseMeta } from '../benchmarks/conformance/metadata.ts'
import { chartEmbedContract } from '../examples/conformance/src/embed-contract.ts'
import {
  attachEmbedContract,
  createCatalogArtifact,
  serializeCatalogManifest,
  validateCaseEntries,
  validateCatalogArtifactManifest,
} from './catalog-artifact.mjs'
import { catalogSourceRevision } from './catalog-source-revision.mjs'
import { createCatalogSourceModules } from './catalog-source-files.mjs'
import { createCatalogPreviews } from './catalog-preview.mjs'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const casesDirectory = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'cases',
)
const buildDirectory = path.join(
  rootDirectory,
  'examples',
  'conformance',
  'dist',
)
const artifactDirectory = path.join(rootDirectory, '.catalog-artifact')

const checkOnly = process.argv.includes('--check')
const cases = await readCases()

if (checkOnly) {
  validateCaseEntries(cases)
  console.log(`Validated ${cases.length} publishable catalog cases.`)
  process.exit(0)
}

const viteManifest = JSON.parse(
  await fs.readFile(
    path.join(buildDirectory, '.vite', 'manifest.json'),
    'utf8',
  ),
)
const revision = await catalogSourceRevision(rootDirectory)
const sourceModules = await createCatalogSourceModules(
  path.join(rootDirectory, 'benchmarks', 'conformance'),
)
const previewContents = await createCatalogPreviews(cases, rootDirectory)
const artifact = await createCatalogArtifact({
  cases,
  revision,
  viteManifest,
  sourceModules,
  previewContents,
  readAsset: (assetPath) =>
    fs.readFile(path.join(buildDirectory, ...assetPath.split('/'))),
})
const catalog = attachEmbedContract(artifact.catalog, chartEmbedContract)
const summary = validateCatalogArtifactManifest(catalog)

assertSafeArtifactDirectory(artifactDirectory)
await fs.rm(artifactDirectory, { recursive: true, force: true })
await fs.mkdir(artifactDirectory, { recursive: true })

for (const [assetPath, content] of artifact.assetContents) {
  const destination = path.join(artifactDirectory, ...assetPath.split('/'))
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, content)
}

await fs.writeFile(
  path.join(artifactDirectory, 'catalog.json'),
  serializeCatalogManifest(catalog),
  'utf8',
)

console.log(
  `Generated schema v${catalog.schemaVersion} catalog artifact for ${summary.caseCount} cases in ${summary.assetCount} modules (${formatBytes(summary.assetBytes)}) and ${summary.previewCount} previews (${formatBytes(summary.previewBytes)}) at ${revision}.`,
)

async function readCases() {
  const directories = (
    await fs.readdir(casesDirectory, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    directories.map(async (directory) => {
      const metadataPath = path.join(casesDirectory, directory, 'case.json')
      let source
      try {
        source = await fs.readFile(metadataPath, 'utf8')
      } catch (error) {
        throw new Error(`Missing catalog metadata: ${metadataPath}`, {
          cause: error,
        })
      }

      let rawMetadata
      try {
        rawMetadata = JSON.parse(source)
      } catch (error) {
        throw new Error(`Invalid JSON in ${metadataPath}`, { cause: error })
      }

      return {
        directory,
        metadata: parseConformanceCaseMeta(rawMetadata, metadataPath),
      }
    }),
  )
}

function assertSafeArtifactDirectory(directory) {
  if (directory !== path.join(rootDirectory, '.catalog-artifact')) {
    throw new Error('catalog artifact output must remain .catalog-artifact')
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}
