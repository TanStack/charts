import { promises as fs } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { validateCatalogArtifactManifest } from './catalog-artifact.mjs'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const catalogDirectory = path.join(rootDirectory, 'examples', 'conformance')
const artifactDirectory = path.join(rootDirectory, '.catalog-artifact')
const catalogBasePath = '/charts/catalog/'

const graph = await inspectCatalogGraph()
const artifact = JSON.parse(
  await fs.readFile(path.join(artifactDirectory, 'catalog.json'), 'utf8'),
)
const artifactSummary = validateCatalogArtifactManifest(artifact)
verifyPublishedGraph(graph, artifact)

console.log(
  `Catalog graph passed: ${formatBytes(graph.entryBytes)} local authoring entry (${formatBytes(graph.entryGzipBytes)} gzip); ${artifactSummary.assetCount} published implementation modules (${formatBytes(artifactSummary.assetBytes)}) with comparisons remaining debug-only.`,
)

async function inspectCatalogGraph() {
  const result = await build({
    root: catalogDirectory,
    base: catalogBasePath,
    logLevel: 'silent',
    build: {
      manifest: true,
      target: 'es2022',
      write: false,
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const chunks = outputs
    .flatMap((output) => output.output)
    .filter((output) => output.type === 'chunk')
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
  const initialModules = initialChunks.flatMap((chunk) =>
    Object.keys(chunk.modules),
  )
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
    !entry.code.includes('tanstack.test.ts'),
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
    counts.tanstack.implementation === 100 && counts.tanstack.source === 100,
    `expected 100 TanStack implementation/source entries, received ${JSON.stringify(counts.tanstack)}`,
  )
  assertReferenceCount(counts.plot, 68, 'Plot')
  assertReferenceCount(counts.recharts, 21, 'Recharts')
  assertReferenceCount(counts.echarts, 11, 'ECharts')

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

  return {
    chunks,
    chunksByFile,
    comparisonCatalog,
    entry,
    entryBytes: Buffer.byteLength(entry.code),
    entryGzipBytes: gzipSync(entry.code).byteLength,
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
    ).flatMap((chunk) => Object.keys(chunk.modules))
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

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
