import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { format as formatWithPrettier } from 'prettier'
import { parseConformanceCaseMeta } from '../benchmarks/conformance/metadata.ts'

export const catalogIndexSchemaVersion = 2
export const catalogIndexSourceRepository = 'tanstack/charts'
export const catalogIndexSourcePathRoot = 'benchmarks/conformance/'

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
const catalogIndexPath = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'catalog-index.json',
)
const shadcnCatalogPath = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'shadcn',
  'catalog.json',
)
const caseIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const collectionIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function readCatalogCases() {
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

export function createCatalogIndex(cases, collectionsByCaseId = new Map()) {
  validateAuthoredCases(cases)
  validateCatalogCollections(cases, collectionsByCaseId)

  return {
    schemaVersion: catalogIndexSchemaVersion,
    source: {
      repo: catalogIndexSourceRepository,
      pathRoot: catalogIndexSourcePathRoot,
    },
    cases: [...cases]
      .sort((left, right) => left.metadata.order - right.metadata.order)
      .map(({ metadata }) => {
        const collection = collectionsByCaseId.get(metadata.id)

        return {
          ...metadata,
          ...(collection ? { collection } : {}),
          entries: {
            example: caseSourcePath(metadata.id, 'example'),
          },
        }
      }),
  }
}

function validateCatalogCollections(cases, collectionsByCaseId) {
  const authoredIds = new Set(cases.map(({ metadata }) => metadata.id))
  for (const [caseId, collection] of collectionsByCaseId) {
    assert(authoredIds.has(caseId), `catalog collection references ${caseId}`)
    assert(
      typeof collection === 'string' && collectionIdPattern.test(collection),
      `catalog collection for ${caseId} has an invalid ID`,
    )
  }
}

export function validateCatalogIndex(index) {
  assert(isRecord(index), 'catalog index must contain an object')
  assert(
    JSON.stringify(Object.keys(index).sort()) ===
      JSON.stringify(['cases', 'schemaVersion', 'source']),
    'catalog index must contain only schemaVersion, source, and cases',
  )
  assert(
    index.schemaVersion === catalogIndexSchemaVersion,
    `catalog index schemaVersion must be ${catalogIndexSchemaVersion}`,
  )
  assert(
    isRecord(index.source) &&
      Object.keys(index.source).length === 2 &&
      index.source.repo === catalogIndexSourceRepository &&
      index.source.pathRoot === catalogIndexSourcePathRoot,
    'catalog index source contract is invalid',
  )
  assert(Array.isArray(index.cases), 'catalog index cases must be an array')
  assert(index.cases.length > 0, 'catalog index must contain cases')

  const ids = new Set()
  const orders = new Set()
  let previousOrder = -1

  for (const entry of index.cases) {
    const metadata = parseConformanceCaseMeta(entry, 'catalog-index.json')
    if ('collection' in entry) {
      assert(
        typeof entry.collection === 'string' &&
          collectionIdPattern.test(entry.collection),
        `catalog index case ${metadata.id} has an invalid collection`,
      )
    }
    assert(
      caseIdPattern.test(metadata.id),
      `catalog index case ${metadata.id} has an invalid ID`,
    )
    assert(!ids.has(metadata.id), `duplicate catalog ID ${metadata.id}`)
    assert(
      Number.isSafeInteger(metadata.order) && metadata.order >= 0,
      `catalog index case ${metadata.id} has an invalid order`,
    )
    assert(
      !orders.has(metadata.order),
      `duplicate catalog order ${metadata.order}`,
    )
    assert(
      metadata.order > previousOrder,
      'catalog index cases must be ordered by metadata order',
    )
    ids.add(metadata.id)
    orders.add(metadata.order)
    previousOrder = metadata.order

    assert(
      isRecord(entry.entries) &&
        Object.keys(entry.entries).length === 1 &&
        entry.entries.example === caseSourcePath(metadata.id, 'example'),
      `catalog index case ${metadata.id} has invalid source entries`,
    )
    assert(
      !('modules' in entry) &&
        !('preview' in entry) &&
        !('assets' in entry) &&
        !('authoredSource' in entry),
      `catalog index case ${metadata.id} must not contain generated runtime output`,
    )
  }

  return { caseCount: index.cases.length }
}

export async function createCatalogIndexSource() {
  const index = createCatalogIndex(
    await readCatalogCases(),
    await readCatalogCollections(),
  )
  validateCatalogIndex(index)
  await validateCatalogIndexSourceEntries(index)
  return formatWithPrettier(`${JSON.stringify(index, null, 2)}\n`, {
    filepath: catalogIndexPath,
  })
}

async function readCatalogCollections() {
  const source = await fs.readFile(shadcnCatalogPath, 'utf8')
  const catalog = JSON.parse(source)
  assert(
    Array.isArray(catalog.cases),
    'shadcn catalog must contain a cases array',
  )

  const caseIds = [
    '127-shadcn-dashboard',
    ...catalog.cases.map((entry) => entry.localCaseId),
  ]
  assert(
    caseIds.every(
      (caseId) => typeof caseId === 'string' && caseIdPattern.test(caseId),
    ),
    'shadcn catalog contains an invalid local case ID',
  )
  assert(
    new Set(caseIds).size === caseIds.length,
    'shadcn catalog contains duplicate local case IDs',
  )

  return new Map(caseIds.map((caseId) => [caseId, 'shadcn']))
}

export async function writeCatalogIndex() {
  const source = await createCatalogIndexSource()
  await fs.writeFile(catalogIndexPath, source, 'utf8')
  const index = JSON.parse(source)
  console.log(
    `Generated metadata-only catalog index for ${index.cases.length} cases.`,
  )
}

export async function checkCatalogIndex() {
  const expectedSource = await createCatalogIndexSource()
  let actualSource
  try {
    actualSource = await fs.readFile(catalogIndexPath, 'utf8')
  } catch (error) {
    throw new Error(
      'Missing catalog index. Run `pnpm catalog:index` and commit the result.',
      { cause: error },
    )
  }
  assert(
    actualSource === expectedSource,
    'Catalog index is stale. Run `pnpm catalog:index` and commit the result.',
  )
  const index = JSON.parse(actualSource)
  console.log(
    `Validated metadata-only catalog index for ${index.cases.length} cases.`,
  )
}

async function validateCatalogIndexSourceEntries(index) {
  for (const entry of index.cases) {
    for (const sourcePath of [entry.entries.example]) {
      const sourceFile = path.join(rootDirectory, ...sourcePath.split('/'))
      let stats
      try {
        stats = await fs.stat(sourceFile)
      } catch (error) {
        throw new Error(`Missing catalog source entry: ${sourcePath}`, {
          cause: error,
        })
      }
      assert(
        stats.isFile(),
        `Catalog source entry is not a file: ${sourcePath}`,
      )
    }
  }
}

function validateAuthoredCases(cases) {
  const ids = new Set()
  const orders = new Set()

  for (const { directory, metadata } of cases) {
    assert(
      metadata.id === directory,
      `catalog ID ${metadata.id} must match directory ${directory}`,
    )
    assert(
      caseIdPattern.test(metadata.id),
      `catalog ID ${metadata.id} must use lowercase URL-safe words separated by hyphens`,
    )
    assert(!ids.has(metadata.id), `duplicate catalog ID ${metadata.id}`)
    assert(
      Number.isSafeInteger(metadata.order) && metadata.order >= 0,
      `catalog case ${metadata.id} has an invalid order`,
    )
    assert(
      !orders.has(metadata.order),
      `duplicate catalog order ${metadata.order}`,
    )
    ids.add(metadata.id)
    orders.add(metadata.order)
  }
}

function caseSourcePath(id, rendererFile) {
  const extension = rendererFile === 'example' ? 'tsx' : 'ts'
  return `benchmarks/conformance/cases/${id}/${rendererFile}.${extension}`
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write')
  const check = process.argv.includes('--check')
  assert(write !== check, 'Use exactly one of --write or --check')
  await (write ? writeCatalogIndex() : checkCatalogIndex())
}
