import { gzipSync } from 'node:zlib'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { launchBenchmarkBrowser } from './benchmark/browser.mjs'
import { attachPageErrorCollector } from './benchmark/page-errors.mjs'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const catalogDirectory = path.join(rootDirectory, 'examples', 'conformance')
const catalogBasePath = '/charts/catalog/'
const comparisonQuery = 'compare=1'
const scenarios = [
  {
    id: '01-line-gaps',
    renderer: 'observable-plot',
    sourceFile: 'plot.ts',
  },
  {
    id: '76-pie',
    renderer: 'recharts',
    sourceFile: 'recharts.ts',
  },
  {
    id: '106-polar-line',
    renderer: 'echarts',
    sourceFile: 'echarts.ts',
  },
]

const graph = await inspectCatalogGraph()
const suppliedUrl = readOption('--url')
let worker
let catalogUrl

if (suppliedUrl) {
  catalogUrl = normalizeCatalogUrl(suppliedUrl)
} else {
  process.env.WRANGLER_LOG_PATH ??= path.join(
    os.tmpdir(),
    'tanstack-charts-catalog-runtime.log',
  )
  const { unstable_startWorker } = await import('wrangler')
  worker = await unstable_startWorker({
    config: 'wrangler.catalog.jsonc',
    dev: {
      inspector: {
        hostname: '127.0.0.1',
        port: 0,
      },
      persist: false,
      server: {
        hostname: '127.0.0.1',
        port: 0,
        secure: false,
      },
    },
  })
  await worker.ready
  catalogUrl = new URL(catalogBasePath.slice(1), await worker.url)
}

const browser = await launchBenchmarkBrowser()

try {
  for (const scenario of scenarios) {
    await checkDetail(browser, catalogUrl, graph, scenario, false)
    await checkDetail(browser, catalogUrl, graph, scenario, true)
  }
  await checkComparisonNavigation(browser, catalogUrl)
  await checkEmbedIsolation(browser, catalogUrl, graph, scenarios[1])
} finally {
  await browser.close()
  await worker?.dispose()
}

console.log(
  `Catalog loading passed: ${formatBytes(graph.entryBytes)} entry (${formatBytes(graph.entryGzipBytes)} gzip), 100 native implementations, and comparison chunks requested only with ?${comparisonQuery}.`,
)

async function inspectCatalogGraph() {
  const result = await build({
    root: catalogDirectory,
    base: catalogBasePath,
    logLevel: 'silent',
    build: {
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
    'the initial static graph includes comparison code',
  )
  assert(
    !entry.code.includes('tanstack.test.ts'),
    'the initial entry registers a test module',
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
    entryBytes: Buffer.byteLength(entry.code),
    entryGzipBytes: gzipSync(entry.code).byteLength,
  }
}

async function checkDetail(browser, baseUrl, graph, scenario, comparisonMode) {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = attachPageErrorCollector(page)
  const requests = collectRequests(page, baseUrl)
  await disableCache(context, page)

  try {
    const url = new URL(`charts/${scenario.id}/`, baseUrl)
    if (comparisonMode) url.search = comparisonQuery
    await page.goto(url.href, { waitUntil: 'domcontentloaded' })
    await waitForRenderers(page, comparisonMode ? 2 : 1)

    const renderers = await page
      .locator('.renderer')
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.renderer))
    const expectedRenderers = comparisonMode
      ? [scenario.renderer, 'tanstack']
      : ['tanstack']
    assert(
      JSON.stringify(renderers) === JSON.stringify(expectedRenderers),
      `${url.href} rendered ${JSON.stringify(renderers)}`,
    )

    const referenceChunk = chunkByFacade(
      graph.chunks,
      `/benchmarks/conformance/cases/${scenario.id}/${scenario.sourceFile}`,
    )
    const sourceChunk = chunkByFacade(
      graph.chunks,
      `/benchmarks/conformance/cases/${scenario.id}/${scenario.sourceFile}?raw`,
    )
    const competitorChunks = staticClosure(
      referenceChunk.fileName,
      graph.chunksByFile,
    ).filter((chunk) =>
      Object.keys(chunk.modules).some((module) =>
        isRendererPackage(module, scenario.renderer),
      ),
    )
    assert(
      competitorChunks.length > 0,
      `${scenario.renderer} has no identifiable package chunk`,
    )

    const gatedFiles = [
      graph.comparisonCatalog.fileName,
      referenceChunk.fileName,
      sourceChunk.fileName,
      ...competitorChunks.map((chunk) => chunk.fileName),
    ]
    if (comparisonMode) {
      for (const file of gatedFiles) {
        assert(
          requests.has(assetPath(baseUrl, file)),
          `${url.href} did not request ${file}`,
        )
      }
    } else {
      for (const file of gatedFiles) {
        assert(
          !requests.has(assetPath(baseUrl, file)),
          `${url.href} unexpectedly requested ${file}`,
        )
      }
    }
    errors.assertNone()
  } finally {
    await context.close()
  }
}

async function checkComparisonNavigation(browser, baseUrl) {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = attachPageErrorCollector(page)
  await disableCache(context, page)

  try {
    const url = new URL('charts/01-line-gaps/', baseUrl)
    url.search = comparisonQuery
    await page.goto(url.href, { waitUntil: 'domcontentloaded' })
    await waitForRenderers(page, 2)
    await page.getByRole('link', { name: 'Next →' }).click()
    await page.waitForURL((nextUrl) => nextUrl.search === `?${comparisonQuery}`)
    await waitForRenderers(page, 2)
    errors.assertNone()
  } finally {
    await context.close()
  }
}

async function checkEmbedIsolation(browser, baseUrl, graph, scenario) {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = attachPageErrorCollector(page)
  const requests = collectRequests(page, baseUrl)
  await disableCache(context, page)

  try {
    const url = new URL(`embed/${scenario.id}/`, baseUrl)
    url.search = comparisonQuery
    await page.goto(url.href, { waitUntil: 'domcontentloaded' })
    await page.locator('.embed-chart > *').first().waitFor()
    assert(
      (await page.locator('.renderer').count()) === 0,
      'embed rendered catalog comparison panels',
    )
    assert(
      !requests.has(assetPath(baseUrl, graph.comparisonCatalog.fileName)),
      'embed requested the comparison catalog',
    )
    errors.assertNone()
  } finally {
    await context.close()
  }
}

function waitForRenderers(page, count) {
  return page.waitForFunction((expectedCount) => {
    const outputs = [...document.querySelectorAll('.renderer output')]
    return (
      outputs.length === expectedCount &&
      outputs.every((output) => output.textContent !== 'pending')
    )
  }, count)
}

function collectRequests(page, baseUrl) {
  const requests = new Set()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin === baseUrl.origin) requests.add(url.pathname)
  })
  return requests
}

async function disableCache(context, page) {
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: true })
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

function assetPath(baseUrl, fileName) {
  return `${baseUrl.pathname}${fileName}`
}

function normalizeCatalogUrl(value) {
  const url = new URL(value)
  assert(
    url.pathname.endsWith('/'),
    `catalog URL must end in a slash: ${url.href}`,
  )
  return url
}

function normalizePath(value) {
  return value.replaceAll('\\', '/')
}

function readOption(name) {
  const index = process.argv.indexOf(name)
  if (index < 0) return ''
  const value = process.argv[index + 1]
  assert(value && !value.startsWith('--'), `${name} requires a value`)
  return value
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
