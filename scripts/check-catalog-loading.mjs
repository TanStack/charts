import { promises as fs } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  catalogBuildGraphPath,
  catalogBuildGraphSchemaVersion,
  expectedCatalogImplementationCounts,
  validateCatalogArtifactManifest,
} from './catalog-artifact.mjs'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const buildDirectory = path.join(
  rootDirectory,
  'examples',
  'conformance',
  'dist',
)
const artifactDirectory = path.join(rootDirectory, '.catalog-artifact')
const catalogPath = path.join(artifactDirectory, 'catalog.json')
const graphPath = path.join(buildDirectory, ...catalogBuildGraphPath.split('/'))

const artifact = await readRequiredJson(catalogPath)
const artifactSummary = validateCatalogArtifactManifest(artifact)
const graph = await inspectCatalogGraph()
verifyPublishedGraph(graph, artifact)

console.log(
  `Catalog graph passed: ${formatBytes(graph.entryBytes)} local authoring entry (${formatBytes(graph.entryGzipBytes)} gzip); ${artifactSummary.assetCount} published implementation modules (${formatBytes(artifactSummary.assetBytes)}) with comparisons remaining debug-only.`,
)

async function inspectCatalogGraph() {
  const buildGraph = await readRequiredJson(graphPath)
  assert(
    isRecord(buildGraph) &&
      buildGraph.schemaVersion === catalogBuildGraphSchemaVersion &&
      Array.isArray(buildGraph.chunks),
    'catalog build graph has an invalid schema',
  )
  const chunks = buildGraph.chunks
  for (const chunk of chunks) validateBuildChunk(chunk)

  const chunksByFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
  const entry = onlyChunk(
    chunks.filter((chunk) => chunk.isEntry),
    'catalog entry',
  )
  const comparisonCatalog = chunkByFacade(
    chunks,
    '/benchmarks/conformance/comparison-catalog.ts',
  )

  assert(
    comparisonCatalog.isDynamicEntry,
    'comparison catalog must remain a dynamic entry',
  )

  const initialChunks = staticClosure(entry.fileName, chunksByFile)
  const initialModules = initialChunks.flatMap((chunk) => chunk.modules)
  assert(
    !initialModules.some(
      (module) =>
        isReferenceImplementation(module) ||
        isCompetitorPackage(module) ||
        normalizePath(module).endsWith(
          '/benchmarks/conformance/comparison-catalog.ts',
        ),
    ),
    'the local authoring entry static graph includes comparison code',
  )
  assert(
    !initialModules.some((module) =>
      normalizePath(module).endsWith('/tanstack.test.ts'),
    ),
    'the local authoring entry registers a test module',
  )

  const caseEntries = chunks.filter(
    (chunk) =>
      chunk.isDynamicEntry &&
      normalizePath(chunk.facadeModuleId ?? '').includes(
        '/benchmarks/conformance/cases/',
      ),
  )
  const counts = {
    tanstack: countCaseEntries(caseEntries, 'tanstack.ts'),
    plot: countCaseEntries(caseEntries, 'plot.ts'),
    recharts: countCaseEntries(caseEntries, 'recharts.ts'),
    echarts: countCaseEntries(caseEntries, 'echarts.ts'),
  }
  assert(
    counts.tanstack.implementation ===
      expectedCatalogImplementationCounts.tanstack &&
      counts.tanstack.source === expectedCatalogImplementationCounts.tanstack,
    `expected ${expectedCatalogImplementationCounts.tanstack} TanStack implementation/source entries, received ${JSON.stringify(counts.tanstack)}`,
  )
  assertReferenceCount(
    counts.plot,
    expectedCatalogImplementationCounts['observable-plot'],
    'Plot',
  )
  assertReferenceCount(
    counts.recharts,
    expectedCatalogImplementationCounts.recharts,
    'Recharts',
  )
  assertReferenceCount(
    counts.echarts,
    expectedCatalogImplementationCounts.echarts,
    'ECharts',
  )

  const unexpectedEntries = caseEntries.filter((chunk) => {
    const facade = normalizePath(chunk.facadeModuleId ?? '').replace(
      /\?raw$/,
      '',
    )
    return !/(?:\/tanstack|\/plot|\/recharts|\/echarts)\.ts$/.test(facade)
  })
  assert(
    unexpectedEntries.length === 0,
    `unexpected case entries: ${unexpectedEntries
      .map((chunk) => chunk.facadeModuleId)
      .join(', ')}`,
  )

  const entryContent = await readRequiredFile(
    path.join(buildDirectory, ...entry.fileName.split('/')),
  )
  return {
    chunks,
    chunksByFile,
    comparisonCatalog,
    entry,
    entryBytes: entryContent.byteLength,
    entryGzipBytes: gzipSync(entryContent).byteLength,
  }
}

function verifyPublishedGraph(graph, artifact) {
  const publishedFiles = new Set(Object.keys(artifact.assets))
  assert(
    !publishedFiles.has(graph.entry.fileName),
    'published artifact contains the standalone authoring entry',
  )
  assert(
    !publishedFiles.has(graph.comparisonCatalog.fileName),
    'published artifact contains the comparison registry',
  )

  for (const assetPath of publishedFiles) {
    const chunk = graph.chunksByFile.get(assetPath)
    assert(chunk, `published artifact contains unknown chunk ${assetPath}`)
    assert(
      !normalizePath(chunk.facadeModuleId ?? '').endsWith('?raw'),
      `published artifact contains raw-source wrapper ${assetPath}`,
    )
  }

  for (const entry of artifact.cases) {
    const tanstackClosureModules = staticClosure(
      entry.modules.tanstack.path,
      graph.chunksByFile,
    ).flatMap((chunk) => chunk.modules)
    assert(
      !tanstackClosureModules.some(
        (module) =>
          isReferenceImplementation(module) || isCompetitorPackage(module),
      ),
      `${entry.id} TanStack module closure includes comparison code`,
    )

    const expectedTanstack = chunkByFacade(
      graph.chunks,
      `/benchmarks/conformance/cases/${entry.id}/tanstack.ts`,
    )
    assert(
      entry.modules.tanstack.path === expectedTanstack.fileName,
      `${entry.id} TanStack module drifted from the Vite graph`,
    )

    const referenceFile =
      entry.modules.comparison.renderer === 'observable-plot'
        ? 'plot'
        : entry.modules.comparison.renderer
    const expectedReference = chunkByFacade(
      graph.chunks,
      `/benchmarks/conformance/cases/${entry.id}/${referenceFile}.ts`,
    )
    assert(
      entry.modules.comparison.path === expectedReference.fileName,
      `${entry.id} comparison module drifted from the Vite graph`,
    )
  }
}

function staticClosure(fileName, chunksByFile) {
  const visited = new Set()
  const chunks = []
  const visit = (currentFile) => {
    if (visited.has(currentFile)) return
    visited.add(currentFile)
    const chunk = chunksByFile.get(currentFile)
    assert(chunk, `missing chunk ${currentFile}`)
    chunks.push(chunk)
    for (const importedFile of chunk.imports) visit(importedFile)
  }
  visit(fileName)
  return chunks
}

function chunkByFacade(chunks, suffix) {
  return onlyChunk(
    chunks.filter((chunk) =>
      normalizePath(chunk.facadeModuleId ?? '').endsWith(suffix),
    ),
    suffix,
  )
}

function onlyChunk(chunks, label) {
  assert(
    chunks.length === 1,
    `expected one ${label}, received ${chunks.length}`,
  )
  return chunks[0]
}

function countCaseEntries(chunks, fileName) {
  const matching = chunks.filter((chunk) => {
    const facade = normalizePath(chunk.facadeModuleId ?? '')
    return (
      facade.endsWith(`/${fileName}`) || facade.endsWith(`/${fileName}?raw`)
    )
  })
  return {
    implementation: matching.filter(
      (chunk) => !chunk.facadeModuleId.endsWith('?raw'),
    ).length,
    source: matching.filter((chunk) => chunk.facadeModuleId.endsWith('?raw'))
      .length,
  }
}

function assertReferenceCount(count, expected, label) {
  assert(
    count.implementation === expected && count.source === expected,
    `expected ${expected} ${label} implementation/source entries, received ${JSON.stringify(count)}`,
  )
}

function isReferenceImplementation(module) {
  return /\/benchmarks\/conformance\/cases\/[^/]+\/(?:plot|recharts|echarts)\.ts(?:\?|$)/.test(
    normalizePath(module),
  )
}

function isCompetitorPackage(module) {
  return (
    isRendererPackage(module, 'observable-plot') ||
    isRendererPackage(module, 'recharts') ||
    isRendererPackage(module, 'echarts')
  )
}

function isRendererPackage(module, renderer) {
  const value = normalizePath(module)
  if (renderer === 'observable-plot') {
    return (
      value.includes('/node_modules/.pnpm/@observablehq+plot@') ||
      value.includes('/node_modules/@observablehq/plot/')
    )
  }
  return (
    value.includes(`/node_modules/.pnpm/${renderer}@`) ||
    value.includes(`/node_modules/${renderer}/`)
  )
}

function normalizePath(value) {
  return value.replaceAll('\\', '/')
}

async function readRequiredJson(filePath) {
  const source = await readRequiredFile(filePath, 'utf8')
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${path.relative(rootDirectory, filePath)}.`,
      { cause: error },
    )
  }
}

async function readRequiredFile(filePath, encoding) {
  try {
    return await fs.readFile(filePath, encoding)
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      throw new Error(
        `Missing ${path.relative(rootDirectory, filePath)}; run \`pnpm catalog:build\` first.`,
        { cause: error },
      )
    }
    throw error
  }
}

function validateBuildChunk(chunk) {
  assert(
    isRecord(chunk) &&
      typeof chunk.fileName === 'string' &&
      (typeof chunk.facadeModuleId === 'string' ||
        chunk.facadeModuleId === null) &&
      typeof chunk.isEntry === 'boolean' &&
      typeof chunk.isDynamicEntry === 'boolean' &&
      isStringArray(chunk.imports) &&
      isStringArray(chunk.dynamicImports) &&
      isStringArray(chunk.modules),
    'catalog build graph contains an invalid chunk',
  )
}

function isStringArray(value) {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  )
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
