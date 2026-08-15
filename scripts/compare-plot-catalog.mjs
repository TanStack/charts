import { createServer } from 'node:http'
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { extname, relative, resolve, sep } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import ts from 'typescript'
import {
  countCatalogSourceBytes,
  countCatalogSourceLines,
  loadCatalogSourceClosure,
} from '../benchmarks/conformance/catalog-loader.ts'
import {
  catalogSourceClosureMetadata,
  createCatalogSourceModules,
} from './catalog-source-files.mjs'
import { conformanceArtifactStem } from './benchmark/conformance-artifacts.mjs'
import { estimateConformanceCaseWeight } from './benchmark/conformance-sharding.mjs'
import { assertKnownFilterValues, parseShard } from './benchmark/filters.mjs'
import {
  normalizeTypeDiagnosticPath,
  selectCatalogCases,
} from './compare-plot-catalog-helpers.mjs'
import { runWithConcurrency } from './run-with-concurrency.mjs'

const root = resolve(import.meta.dirname, '..')
const conformanceDirectory = resolve(root, 'benchmarks/conformance')
const casesDirectory = resolve(conformanceDirectory, 'cases')
const outputDirectory = resolve(root, '.benchmark-output/conformance')
const bundleDirectory = resolve(outputDirectory, 'bundles')
const screenshotDirectory = resolve(outputDirectory, 'screenshots')
const resultDirectory = resolve(outputDirectory, 'results')
const typeProbeDirectory = resolve(outputDirectory, 'type-probes')
const rendererRegistry = {
  'observable-plot': {
    fileName: 'plot.ts',
    resultKey: 'observablePlot',
    label: 'Observable Plot',
    packageName: '@observablehq/plot',
  },
  recharts: {
    fileName: 'recharts.ts',
    resultKey: 'recharts',
    label: 'Recharts',
    packageName: 'recharts',
  },
  echarts: {
    fileName: 'echarts.ts',
    resultKey: 'echarts',
    label: 'ECharts',
    packageName: 'echarts',
  },
  tanstack: {
    fileName: 'tanstack.ts',
    resultKey: 'tanstack',
    label: 'TanStack Charts',
    packageName: '@tanstack/charts',
  },
}
const targetRenderer = 'tanstack'
const referenceRenderers = ['observable-plot', 'recharts', 'echarts']
const geometryRoles = [
  'arc',
  'area',
  'arrow',
  'bar',
  'cell',
  'contour',
  'delaunay',
  'density',
  'dot',
  'frame',
  'geo',
  'hexagon',
  'line',
  'link',
  'rect',
  'radar',
  'regression',
  'rule',
  'text',
  'tick',
  'vector',
  'voronoi',
  'waffle',
]
const axes = ['x', 'y', 'fx', 'fy']

const profiles = {
  quick: {
    warmup: 1,
    samples: 3,
    widths: [320, 640],
    themes: ['light'],
  },
  standard: {
    warmup: 3,
    samples: 10,
    widths: [320, 640, 960],
    themes: ['light', 'dark'],
  },
  full: {
    warmup: 5,
    samples: 25,
    widths: [320, 640, 960],
    themes: ['light', 'dark'],
  },
}

const profileName = optionValue('--profile') ?? 'standard'
const profile = profiles[profileName]
if (!profile) {
  throw new Error(
    `Unknown profile "${profileName}". Use ${Object.keys(profiles).join(', ')}.`,
  )
}
const sizeOnly = process.argv.includes('--size-only')
const caseFilter = csvOption('--case')
const shard = parseShard(optionValue('--shard'))

await Promise.all([
  mkdir(bundleDirectory, { recursive: true }),
  mkdir(screenshotDirectory, { recursive: true }),
  mkdir(resultDirectory, { recursive: true }),
  mkdir(typeProbeDirectory, { recursive: true }),
])

const sourceModules = await createCatalogSourceModules(conformanceDirectory)
const allCases = await readCases()
assertKnownFilterValues(
  caseFilter,
  allCases.map((entry) => entry.id),
  'case',
)
const selectedCases = selectCatalogCases(allCases, caseFilter, shard, (entry) =>
  estimateConformanceCaseWeight(entry, profile),
)

const typeDiagnostics = await createTypeDiagnostics()
const typeAudit = await auditTypes(selectedCases, typeDiagnostics.byFile)
const typeProtection = auditTypeProtection(typeDiagnostics)
const bundles = await buildImplementations(selectedCases, typeAudit)
let measurements = []
let visualChecks = []
let behaviorChecks = []
let browserVersion

if (!sizeOnly) {
  const browser = await launchBrowser()
  browserVersion = browser.version()
  const server = await startServer(outputDirectory)
  try {
    for (const entry of selectedCases) {
      const implementations = bundles.filter(
        (bundle) => bundle.caseId === entry.id,
      )
      for (const implementation of implementations) {
        measurements.push(
          await measureImplementation(
            browser,
            server.url,
            entry,
            implementation,
            profile,
          ),
        )
      }
      visualChecks.push(
        await compareVisuals(
          browser,
          server.url,
          entry,
          implementations,
          profile,
        ),
      )
      if (entry.interactionScenarios?.length) {
        behaviorChecks.push(
          await compareBehaviors(
            browser,
            server.url,
            entry,
            implementations,
            profile,
          ),
        )
      }
      process.stdout.write('.')
    }
    process.stdout.write('\n')
  } finally {
    await browser.close()
    await server.close()
  }
}

const result = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  profile: profileName,
  filters: {
    cases:
      caseFilter || shard ? selectedCases.map((entry) => entry.id).sort() : [],
    shard: shard ? `${shard.index}/${shard.total}` : null,
  },
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
    browser: browserVersion,
  },
  versions: {
    observablePlot: await packageVersion('@observablehq/plot'),
    recharts: await packageVersion('recharts'),
    echarts: await packageVersion('echarts'),
    tanstackCharts: await packageVersion('@tanstack/charts'),
    typescript: ts.version,
  },
  protocol: {
    sameTypedRows: true,
    sameSemanticDomains: true,
    isolatedBundles: true,
    width: 640,
    height: 360,
    variants: profile.widths.flatMap((width) =>
      profile.themes.map((theme) => ({ width, theme })),
    ),
    warmup: profile.warmup,
    samples: profile.samples,
    mount:
      'Synchronous mount plus forced layout after module loading; animations disabled.',
    update:
      'Same-shape revision update plus forced layout. Plot replaces its element; Charts reconciles its SVG.',
    geometry:
      'Logical count ranges are checked against data-bearing SVG primitives. Case-specific categorical order, guide multiplicity, and optional minimum geometry-similarity assertions are also enforced. Bounding-box similarity remains diagnostic unless a case declares a floor.',
    typeSafety:
      'Strict project diagnostics, source-level unsafe assertion and suppression counts, and paired known-invalid programs after valid compiler baselines.',
    visual:
      'Geometry, guide containment, and accessibility run before and after a data revision at every viewport/theme variant. A 640px light-mode side-by-side screenshot is retained per case.',
    interaction:
      'Ordered semantic scenarios run from fresh mounts with native Playwright mouse, keyboard, CDP touch, drag, pixel-wheel streams, bounded waits, and in-place revision updates; pointer cancellation and line/page delta modes use explicit DOM events. Driver-state assertions remain renderer-independent; rendered assertions inspect root-scoped DOM text, attributes, focus, visibility, scroll metrics, and bounds directly. Scenarios may retain named checkpoint screenshots. Uncaught page errors fail the active step.',
  },
  cases: selectedCases,
  bundles,
  typeProtection,
  measurements,
  visualChecks,
  behaviorChecks,
  summaries: createSummaries(
    selectedCases,
    bundles,
    measurements,
    visualChecks,
    behaviorChecks,
    typeProtection,
  ),
}

const json = `${JSON.stringify(result, null, 2)}\n`
const markdown = renderMarkdown(result)
const artifactStem = conformanceArtifactStem(result.filters.cases)
await Promise.all([
  writeFile(resolve(resultDirectory, `${artifactStem}.json`), json),
  writeFile(resolve(resultDirectory, `${artifactStem}.md`), markdown),
])
console.log(markdown)

const failedVisuals = visualChecks.filter((check) => check.status === 'fail')
const failedBehaviors = behaviorChecks.filter(
  (check) => check.status === 'fail',
)
if (failedVisuals.length || failedBehaviors.length) {
  throw new Error(
    `Conformance failed for ${failedVisuals.length} visual and ${failedBehaviors.length} interaction checks: ${[
      ...failedVisuals.map((check) => `visual:${check.caseId}`),
      ...failedBehaviors.map((check) => `interaction:${check.caseId}`),
    ].join(', ')}`,
  )
}

async function readCases() {
  const entries = await readdir(casesDirectory, { withFileTypes: true })
  const cases = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const path = resolve(casesDirectory, entry.name, 'case.json')
    const value = JSON.parse(await readFile(path, 'utf8'))
    validateCase(value, path)
    cases.push(value)
  }
  return cases.sort((left, right) => left.order - right.order)
}

function validateCase(value, path) {
  const referenceRenderer = referenceRendererForCase(value)
  const valid =
    value?.schemaVersion === 1 &&
    (value.referenceRenderer === undefined ||
      referenceRenderers.includes(value.referenceRenderer)) &&
    Number.isFinite(value.order) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.family === 'string' &&
    typeof value.intent === 'string' &&
    ['native', 'composed', 'gap', 'deferred'].includes(value.support) &&
    Array.isArray(value.features) &&
    Array.isArray(value.geometry) &&
    hasUniqueGeometryKeys(value.geometry) &&
    (value.minimumGeometrySimilarity === undefined ||
      isGeometrySimilarity(value.minimumGeometrySimilarity)) &&
    value.geometry.every(
      (expectation) =>
        (expectation.id === undefined || typeof expectation.id === 'string') &&
        (expectation.view === undefined ||
          typeof expectation.view === 'string') &&
        geometryRoles.includes(expectation?.role) &&
        isGeometryCount(expectation.count) &&
        (expectation.maxCount === undefined ||
          (isGeometryCount(expectation.maxCount) &&
            expectation.maxCount >= expectation.count)) &&
        (expectation.rendererRoles === undefined ||
          Object.entries(expectation.rendererRoles).every(
            ([renderer, role]) =>
              [referenceRenderer, targetRenderer].includes(renderer) &&
              geometryRoles.includes(role),
          )),
    ) &&
    (value.guideAssertions === undefined ||
      (Array.isArray(value.guideAssertions) &&
        value.guideAssertions.every((expectation) =>
          isValidGuideExpectation(expectation, referenceRenderer),
        ))) &&
    (value.interactionScenarios === undefined ||
      (Array.isArray(value.interactionScenarios) &&
        value.interactionScenarios.every((scenario) =>
          isValidInteractionScenario(scenario),
        ))) &&
    typeof value.source?.url === 'string' &&
    typeof value.ai?.create === 'string' &&
    typeof value.ai?.maintain === 'string'
  if (!valid) throw new TypeError(`Invalid conformance metadata: ${path}`)
}

function isGeometryCount(value) {
  return Number.isInteger(value) && value >= 0
}

function hasUniqueGeometryKeys(expectations) {
  const keys = expectations.map(
    (expectation) => expectation.id ?? expectation.role,
  )
  return new Set(keys).size === keys.length
}

function isGeometrySimilarity(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

function isValidGuideExpectation(expectation, referenceRenderer) {
  if (typeof expectation?.id !== 'string') return false
  if (typeof expectation.axis === 'string') {
    return axes.includes(expectation.axis)
  }
  return (
    typeof expectation.axis === 'object' &&
    expectation.axis !== null &&
    axes.includes(expectation.axis[referenceRenderer]) &&
    axes.includes(expectation.axis[targetRenderer])
  )
}

function isValidInteractionScenario(scenario) {
  return (
    typeof scenario?.id === 'string' &&
    Array.isArray(scenario.steps) &&
    scenario.steps.length > 0 &&
    scenario.steps.every(isValidInteractionStep)
  )
}

function isValidInteractionStep(step) {
  if (!step || typeof step !== 'object') return false
  switch (step.type) {
    case 'pointerMove':
      return (
        isValidTarget(step.target) &&
        (step.steps === undefined || isPositiveInteger(step.steps))
      )
    case 'pointerDown':
    case 'pointerUp':
      return isValidTarget(step.target) && step.steps === undefined
    case 'pointerCancel':
      return true
    case 'click':
    case 'touchTap':
      return isValidTarget(step.target)
    case 'pointerLeave':
      return step.view === undefined || typeof step.view === 'string'
    case 'update':
      return Number.isFinite(step.revision)
    case 'key':
      return (
        typeof step.key === 'string' &&
        (step.target === undefined || isValidTarget(step.target))
      )
    case 'drag':
      return (
        isValidTarget(step.from) &&
        isValidTarget(step.to) &&
        (step.steps === undefined || isPositiveInteger(step.steps))
      )
    case 'touchDrag':
      return (
        isValidTarget(step.from) &&
        isValidTarget(step.to) &&
        (step.steps === undefined || isPositiveInteger(step.steps)) &&
        (step.cancel === undefined || typeof step.cancel === 'boolean')
      )
    case 'wheel':
      return (
        isValidTarget(step.target) &&
        (step.deltaX === undefined || Number.isFinite(step.deltaX)) &&
        (step.deltaY === undefined || Number.isFinite(step.deltaY)) &&
        (step.deltaX !== undefined || step.deltaY !== undefined) &&
        (step.steps === undefined || isPositiveInteger(step.steps)) &&
        (step.deltaMode === undefined ||
          ['pixel', 'line', 'page'].includes(step.deltaMode))
      )
    case 'wait':
      return (
        Number.isInteger(step.durationMs) &&
        step.durationMs > 0 &&
        step.durationMs <= 5_000
      )
    case 'assert':
      return (
        Array.isArray(step.assertions) &&
        step.assertions.length > 0 &&
        step.assertions.every(isValidStateAssertion)
      )
    case 'assertRendered':
      return (
        Array.isArray(step.assertions) &&
        step.assertions.length > 0 &&
        step.assertions.every(isValidRenderedAssertion)
      )
    case 'screenshot':
      return (
        typeof step.name === 'string' &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step.name) &&
        (step.view === undefined || typeof step.view === 'string')
      )
    default:
      return false
  }
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function isValidTarget(target) {
  return (
    target &&
    typeof target === 'object' &&
    typeof target.anchor === 'string' &&
    (target.view === undefined || typeof target.view === 'string')
  )
}

function isValidRenderedTarget(target) {
  if (!target || typeof target !== 'object') return false
  const kinds = ['selector', 'role', 'root', 'page'].filter((key) =>
    Object.hasOwn(target, key),
  )
  if (kinds.length !== 1) return false
  if (Object.hasOwn(target, 'root')) {
    return target.root === true && target.index === undefined
  }
  if (Object.hasOwn(target, 'page')) {
    return target.page === true && target.index === undefined
  }
  if (
    target.index !== undefined &&
    (!Number.isInteger(target.index) || target.index < 0)
  ) {
    return false
  }
  if (Object.hasOwn(target, 'selector')) {
    return typeof target.selector === 'string' && target.selector.length > 0
  }
  return (
    typeof target.role === 'string' &&
    target.role.length > 0 &&
    (target.name === undefined || typeof target.name === 'string') &&
    (target.exact === undefined || typeof target.exact === 'boolean')
  )
}

function isValidRenderedAssertion(assertion) {
  if (
    !assertion ||
    typeof assertion !== 'object' ||
    !isValidRenderedTarget(assertion.target)
  ) {
    return false
  }
  switch (assertion.property) {
    case 'count':
      return (
        assertion.target.index === undefined &&
        isValidRenderedNumberMatcher(assertion)
      )
    case 'text':
      return isValidRenderedStringMatcher(assertion)
    case 'attribute':
      return (
        typeof assertion.attribute === 'string' &&
        assertion.attribute.length > 0 &&
        isValidRenderedStringMatcher(assertion)
      )
    case 'visible':
    case 'focused':
      return (
        typeof assertion.equals === 'boolean' &&
        !Object.hasOwn(assertion, 'includes') &&
        !Object.hasOwn(assertion, 'approx')
      )
    case 'scrollLeft':
    case 'scrollTop':
    case 'scrollWidth':
    case 'scrollHeight':
    case 'clientWidth':
    case 'clientHeight':
    case 'width':
    case 'height':
      return isValidRenderedNumberMatcher(assertion)
    case 'contained':
      return (
        assertion.equals === true &&
        !Object.hasOwn(assertion, 'includes') &&
        !Object.hasOwn(assertion, 'approx') &&
        (assertion.within === undefined ||
          isValidRenderedTarget(assertion.within)) &&
        (assertion.tolerance === undefined ||
          (Number.isFinite(assertion.tolerance) && assertion.tolerance >= 0))
      )
    default:
      return false
  }
}

function isValidRenderedStringMatcher(assertion) {
  const matchers = [
    Object.hasOwn(assertion, 'equals'),
    Object.hasOwn(assertion, 'includes'),
  ].filter(Boolean).length
  return (
    matchers === 1 &&
    (!Object.hasOwn(assertion, 'equals') ||
      assertion.equals === null ||
      typeof assertion.equals === 'string') &&
    (!Object.hasOwn(assertion, 'includes') ||
      typeof assertion.includes === 'string')
  )
}

function isValidRenderedNumberMatcher(assertion) {
  const matchers = [
    Object.hasOwn(assertion, 'equals'),
    Object.hasOwn(assertion, 'approx'),
    Object.hasOwn(assertion, 'atLeast'),
    Object.hasOwn(assertion, 'atMost'),
  ].filter(Boolean).length
  return (
    matchers === 1 &&
    (!Object.hasOwn(assertion, 'equals') ||
      Number.isFinite(assertion.equals)) &&
    (!Object.hasOwn(assertion, 'approx') ||
      (Number.isFinite(assertion.approx) &&
        Number.isFinite(assertion.tolerance) &&
        assertion.tolerance >= 0)) &&
    (!Object.hasOwn(assertion, 'atLeast') ||
      Number.isFinite(assertion.atLeast)) &&
    (!Object.hasOwn(assertion, 'atMost') || Number.isFinite(assertion.atMost))
  )
}

function isValidStateAssertion(assertion) {
  if (
    !assertion ||
    typeof assertion !== 'object' ||
    typeof assertion.path !== 'string'
  ) {
    return false
  }
  const matchers = [
    Object.hasOwn(assertion, 'equals'),
    Object.hasOwn(assertion, 'includes'),
    Object.hasOwn(assertion, 'approx'),
  ].filter(Boolean).length
  return (
    matchers === 1 &&
    (!Object.hasOwn(assertion, 'approx') ||
      (Number.isFinite(assertion.approx) &&
        Number.isFinite(assertion.tolerance) &&
        assertion.tolerance >= 0))
  )
}

async function createTypeDiagnostics() {
  const configPath = resolve(root, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    )
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    undefined,
    configPath,
  )
  const probes = typeProtectionProbes()
  const baselineEntries = Object.entries(typeProtectionBaselines()).map(
    ([renderer, source]) => ({
      renderer,
      source,
      sourcePath: resolve(typeProbeDirectory, `valid-baseline-${renderer}.ts`),
    }),
  )
  const probeEntries = probes.flatMap((probe) =>
    ['observable-plot', 'recharts', 'tanstack'].map((renderer) => ({
      probe,
      renderer,
      source: probe.sources[renderer],
      sourcePath: resolve(typeProbeDirectory, `${probe.id}-${renderer}.ts`),
    })),
  )
  const generatedEntries = [...baselineEntries, ...probeEntries]

  await Promise.all(
    generatedEntries.map(({ source, sourcePath }) =>
      writeFile(sourcePath, `${source.trim()}\n`),
    ),
  )

  const program = ts.createProgram(
    [
      ...new Set([
        ...parsed.fileNames,
        ...generatedEntries.map(({ sourcePath }) => sourcePath),
      ]),
    ],
    parsed.options,
  )
  const byFile = new Map()
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const sourcePath = diagnostic.file?.fileName
      ? normalizeTypeDiagnosticPath(diagnostic.file.fileName)
      : undefined
    if (!sourcePath) continue
    const diagnostics = byFile.get(sourcePath) ?? []
    diagnostics.push(formatTypeDiagnostic(diagnostic))
    byFile.set(sourcePath, diagnostics)
  }

  return { baselineEntries, byFile, probeEntries, probes }
}

async function auditTypes(cases, diagnosticsByFile) {
  const relevantSources = new Map()

  for (const entry of cases) {
    for (const renderer of pairedRenderers(entry)) {
      const sourcePath = resolve(
        casesDirectory,
        entry.id,
        rendererFileName(renderer),
      )
      try {
        const source = await readFile(sourcePath, 'utf8')
        relevantSources.set(sourcePath, {
          source,
          caseId: entry.id,
          renderer,
        })
      } catch {
        // Capability gaps intentionally omit an implementation.
      }
    }
  }

  const audit = new Map()
  for (const [sourcePath, details] of relevantSources) {
    const sourceDiagnostics =
      diagnosticsByFile.get(normalizeTypeDiagnosticPath(sourcePath)) ?? []
    const source = details.source
    audit.set(`${details.caseId}:${details.renderer}`, {
      diagnostics: sourceDiagnostics,
      lines: countCatalogSourceLines(source),
      sourceBytes: countCatalogSourceBytes(source),
      unsafeAssertions: countMatches(
        source,
        /\bas\s+(?:any|unknown)(?:\s+as\s+\w+)?/g,
      ),
      suppressions: countMatches(
        source,
        /@ts-(?:ignore|nocheck)|eslint-disable/g,
      ),
      nonConstAssertions: countMatches(
        source,
        /\bas\s+(?!const\b)[A-Za-z_$<{[(]/g,
      ),
      umbrellaD3Imports: countMatches(
        source,
        /from\s+['"]d3['"]|import\s+\*\s+as\s+d3/g,
      ),
    })
  }
  return audit
}

function auditTypeProtection({
  baselineEntries,
  byFile,
  probeEntries,
  probes,
}) {
  const results = []

  for (const { renderer, sourcePath } of baselineEntries) {
    const diagnostics =
      byFile.get(normalizeTypeDiagnosticPath(sourcePath)) ?? []
    if (diagnostics.length) {
      throw new Error(
        `Valid ${renderer} type baseline failed: ${diagnostics
          .map((diagnostic) => diagnostic.message)
          .join('; ')}`,
      )
    }
  }

  for (const { probe, renderer, sourcePath } of probeEntries) {
    const diagnostics =
      byFile.get(normalizeTypeDiagnosticPath(sourcePath)) ?? []
    const setupDiagnostic = diagnostics.find((diagnostic) =>
      [2307, 6053, 7016].includes(diagnostic.code),
    )
    if (setupDiagnostic) {
      throw new Error(
        `Type probe "${probe.id}" could not load its dependencies: ${setupDiagnostic.message}`,
      )
    }
    results.push({
      id: probe.id,
      title: probe.title,
      renderer,
      rejected: diagnostics.length > 0,
      diagnostics,
    })
  }

  return {
    probes: probes.map(({ id, title, contract }) => ({
      id,
      title,
      contract,
    })),
    results,
    renderers: Object.fromEntries(
      ['observable-plot', 'recharts', 'tanstack'].map((renderer) => {
        const rendererResults = results.filter(
          (result) => result.renderer === renderer,
        )
        const rejected = rendererResults.filter(
          (result) => result.rejected,
        ).length
        return [
          renderer,
          {
            probes: rendererResults.length,
            rejected,
            protectionRate:
              rendererResults.length > 0
                ? rejected / rendererResults.length
                : undefined,
          },
        ]
      }),
    ),
  }
}

function formatTypeDiagnostic(diagnostic) {
  return {
    code: diagnostic.code,
    line:
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line +
          1
        : undefined,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }
}

function typeProtectionBaselines() {
  return {
    'observable-plot': `
      import * as Plot from '@observablehq/plot'
      interface Row { x: number; y: number }
      const rows: readonly Row[] = [{ x: 1, y: 2 }]
      Plot.plot({ marks: [Plot.lineY(rows, { x: 'x', y: 'y' })] })
    `,
    recharts: `
      import { createElement } from 'react'
      import { Line, LineChart } from 'recharts'
      interface Row { x: number; y: number }
      const rows: Row[] = [{ x: 1, y: 2 }]
      createElement(
        LineChart,
        { data: rows, width: 640, height: 360 },
        createElement(Line, { dataKey: 'y' }),
      )
    `,
    tanstack: `
      import { defineChart, lineY } from '@tanstack/charts'
      import { scaleLinear } from 'd3-scale'
      interface Row { x: number; y: number }
      const rows: readonly Row[] = [{ x: 1, y: 2 }]
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y' })],
        x: { scale: scaleLinear() },
        y: { scale: scaleLinear() },
      })
    `,
  }
}

function typeProtectionProbes() {
  return [
    {
      id: 'missing-field',
      title: 'Missing field name',
      contract: 'A field-name channel must exist on the datum.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { x: number; y: number }
          const rows: readonly Row[] = [{ x: 1, y: 2 }]
          Plot.dot(rows, { x: 'missing', y: 'y' })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Line, LineChart } from 'recharts'
          interface Row { x: number; y: number }
          const rows: Row[] = [{ x: 1, y: 2 }]
          createElement(
            LineChart,
            { data: rows },
            createElement(Line, { dataKey: 'missing' }),
          )
        `,
        tanstack: `
          import { dot } from '@tanstack/charts'
          interface Row { x: number; y: number }
          const rows: readonly Row[] = [{ x: 1, y: 2 }]
          dot(rows, { x: 'missing', y: 'y' })
        `,
      },
    },
    {
      id: 'boolean-quantitative-channel',
      title: 'Boolean quantitative channel',
      contract: 'A line y channel must produce numbers or nullish values.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { x: number; enabled: boolean }
          const rows: readonly Row[] = [{ x: 1, enabled: true }]
          Plot.lineY(rows, { x: 'x', y: 'enabled' })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Line, LineChart } from 'recharts'
          interface Row { x: number; enabled: boolean }
          const rows: Row[] = [{ x: 1, enabled: true }]
          createElement(
            LineChart,
            { data: rows },
            createElement(Line, { dataKey: 'enabled' }),
          )
        `,
        tanstack: `
          import { lineY } from '@tanstack/charts'
          interface Row { x: number; enabled: boolean }
          const rows: readonly Row[] = [{ x: 1, enabled: true }]
          lineY(rows, { x: 'x', y: 'enabled' })
        `,
      },
    },
    {
      id: 'invalid-accessor-property',
      title: 'Invalid accessor property',
      contract: 'An accessor must receive the source datum type.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { x: number; y: number }
          const rows: readonly Row[] = [{ x: 1, y: 2 }]
          Plot.lineY(rows, { x: 'x', y: (row) => row.missing })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Line, LineChart } from 'recharts'
          interface Row { x: number; y: number }
          const rows: Row[] = [{ x: 1, y: 2 }]
          createElement(
            LineChart,
            { data: rows },
            createElement(Line, { dataKey: (row) => row.missing }),
          )
        `,
        tanstack: `
          import { lineY } from '@tanstack/charts'
          interface Row { x: number; y: number }
          const rows: readonly Row[] = [{ x: 1, y: 2 }]
          lineY(rows, { x: 'x', y: (row) => row.missing })
        `,
      },
    },
    {
      id: 'boolean-radius-channel',
      title: 'Boolean radius channel',
      contract: 'A radius channel must produce numbers or nullish values.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { x: number; y: number; selected: boolean }
          const rows: readonly Row[] = [{ x: 1, y: 2, selected: true }]
          Plot.dot(rows, { x: 'x', y: 'y', r: 'selected' })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Scatter, ScatterChart, ZAxis } from 'recharts'
          interface Row { x: number; y: number; selected: boolean }
          const rows: Row[] = [{ x: 1, y: 2, selected: true }]
          createElement(
            ScatterChart,
            null,
            createElement(ZAxis, { dataKey: 'selected' }),
            createElement(Scatter, { data: rows }),
          )
        `,
        tanstack: `
          import { dot } from '@tanstack/charts'
          interface Row { x: number; y: number; selected: boolean }
          const rows: readonly Row[] = [{ x: 1, y: 2, selected: true }]
          dot(rows, { x: 'x', y: 'y', r: 'selected' })
        `,
      },
    },
    {
      id: 'categorical-linear-scale',
      title: 'Categorical channel on a linear scale',
      contract:
        'A categorical positional channel cannot use a numeric linear scale.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { category: string; value: number }
          const rows: readonly Row[] = [{ category: 'Alpha', value: 2 }]
          Plot.plot({
            x: { type: 'linear' },
            marks: [Plot.dot(rows, { x: 'category', y: 'value' })],
          })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Scatter, ScatterChart, XAxis } from 'recharts'
          interface Row { category: string; value: number }
          const rows: Row[] = [{ category: 'Alpha', value: 2 }]
          createElement(
            ScatterChart,
            null,
            createElement(XAxis, { type: 'number', dataKey: 'category' }),
            createElement(Scatter, { data: rows }),
          )
        `,
        tanstack: `
          import { defineChart, dot } from '@tanstack/charts'
          import { scaleLinear } from 'd3-scale'
          interface Row { category: string; value: number }
          const rows: readonly Row[] = [{ category: 'Alpha', value: 2 }]
          defineChart({
            marks: [dot(rows, { x: 'category', y: 'value' })],
            x: { scale: scaleLinear() },
            y: { scale: scaleLinear() },
          })
        `,
      },
    },
    {
      id: 'invalid-date-formatter',
      title: 'Numeric formatting on a date axis',
      contract: 'An axis formatter must receive the positional channel type.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { date: Date; value: number }
          const rows: readonly Row[] = [{ date: new Date(0), value: 2 }]
          Plot.plot({
            x: { tickFormat: (value) => value.toFixed(2) },
            marks: [Plot.lineY(rows, { x: 'date', y: 'value' })],
          })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Line, LineChart, XAxis } from 'recharts'
          interface Row { date: Date; value: number }
          const rows: Row[] = [{ date: new Date(0), value: 2 }]
          createElement(
            LineChart,
            { data: rows },
            createElement(XAxis, {
              dataKey: 'date',
              tickFormatter: (value) => value.toFixed(2),
            }),
            createElement(Line, { dataKey: 'value' }),
          )
        `,
        tanstack: `
          import { defineChart, lineY } from '@tanstack/charts'
          import { scaleLinear, scaleUtc } from 'd3-scale'
          interface Row { date: Date; value: number }
          const rows: readonly Row[] = [{ date: new Date(0), value: 2 }]
          defineChart({
            marks: [lineY(rows, { x: 'date', y: 'value' })],
            x: {
              scale: scaleUtc(),
              format: (value) => value.toFixed(2),
            },
            y: { scale: scaleLinear() },
          })
        `,
      },
    },
    {
      id: 'rect-linear-scale',
      title: 'Categorical rect endpoints on a linear scale',
      contract:
        'Rect endpoint channels should retain enough type information to reject a numeric scale.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          interface Row { start: string; end: string; low: number; high: number }
          const rows: readonly Row[] = [{ start: 'A', end: 'B', low: 1, high: 2 }]
          Plot.plot({
            x: { type: 'linear' },
            marks: [
              Plot.rect(rows, {
                x1: 'start',
                x2: 'end',
                y1: 'low',
                y2: 'high',
              }),
            ],
          })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Bar, BarChart, XAxis } from 'recharts'
          interface Row { start: string; end: string; low: number; high: number }
          const rows: Row[] = [{ start: 'A', end: 'B', low: 1, high: 2 }]
          createElement(
            BarChart,
            { data: rows },
            createElement(XAxis, { type: 'number', dataKey: 'start' }),
            createElement(Bar, { dataKey: 'low' }),
          )
        `,
        tanstack: `
          import { defineChart, rect } from '@tanstack/charts'
          import { scaleLinear } from 'd3-scale'
          interface Row { start: string; end: string; low: number; high: number }
          const rows: readonly Row[] = [{ start: 'A', end: 'B', low: 1, high: 2 }]
          defineChart({
            marks: [
              rect(rows, {
                x1: 'start',
                x2: 'end',
                y1: 'low',
                y2: 'high',
              }),
            ],
            x: { scale: scaleLinear() },
            y: { scale: scaleLinear() },
          })
        `,
      },
    },
    {
      id: 'invalid-text-anchor',
      title: 'Invalid text anchor',
      contract:
        'A text anchor must use one of the renderer-supported literal values.',
      sources: {
        'observable-plot': `
          import * as Plot from '@observablehq/plot'
          Plot.text([{ x: 1, y: 2, label: 'A' }], {
            x: 'x',
            y: 'y',
            text: 'label',
            textAnchor: 'centre',
          })
        `,
        recharts: `
          import { createElement } from 'react'
          import { Text } from 'recharts'
          createElement(Text, {
            x: 1,
            y: 2,
            textAnchor: 'centre',
          }, 'A')
        `,
        tanstack: `
          import { text } from '@tanstack/charts'
          text([{ x: 1, y: 2, label: 'A' }], {
            x: 'x',
            y: 'y',
            text: 'label',
            anchor: 'centre',
          })
        `,
      },
    },
  ]
}

async function buildImplementations(cases, typeAudit) {
  const candidates = cases.flatMap((entry) =>
    pairedRenderers(entry).map((renderer) => ({ entry, renderer })),
  )
  const bundles = new Array(candidates.length)

  await runWithConcurrency(
    candidates,
    4,
    async ({ entry, renderer }, index) => {
      const sourcePath = resolve(
        casesDirectory,
        entry.id,
        rendererFileName(renderer),
      )
      try {
        await access(sourcePath)
      } catch {
        return
      }
      const id = `${entry.id}-${renderer}`
      const outputPath = resolve(bundleDirectory, `${id}.js`)
      await build({
        entryPoints: [sourcePath],
        outfile: outputPath,
        bundle: true,
        minify: true,
        treeShaking: true,
        metafile: true,
        platform: 'browser',
        format: 'esm',
        target: 'es2022',
        legalComments: 'none',
        logLevel: 'silent',
      })
      const measurementResult = await build({
        entryPoints: [sourcePath],
        outfile: outputPath,
        bundle: true,
        minify: true,
        treeShaking: true,
        metafile: true,
        platform: 'browser',
        format: 'esm',
        target: 'es2022',
        legalComments: 'none',
        logLevel: 'silent',
        write: false,
        external: ['@tanstack/charts-data/*'],
      })
      const contents = measurementResult.outputFiles[0]?.contents
      if (!contents) {
        throw new Error(`No measurement bundle emitted for ${id}`)
      }
      const inputPaths = Object.keys(measurementResult.metafile.inputs)
      const sourceEntryPath = `./cases/${entry.id}/${rendererFileName(renderer)}`
      const authoredSource = catalogSourceClosureMetadata(
        await loadCatalogSourceClosure(sourceModules, sourceEntryPath),
        sourceEntryPath,
      )
      const chartSource = ['entry', 'support'].reduce(
        (total, role) => ({
          files: total.files + authoredSource.roles[role].files,
          lines: total.lines + authoredSource.roles[role].lines,
          bytes: total.bytes + authoredSource.roles[role].bytes,
        }),
        { files: 0, lines: 0, bytes: 0 },
      )
      const entryTypeAudit =
        typeAudit.get(`${entry.id}:${renderer}`) ?? missingTypeAudit()
      bundles[index] = {
        id,
        caseId: entry.id,
        renderer,
        minifiedBytes: contents.byteLength,
        gzipBytes: gzipSync(contents).byteLength,
        brotliBytes: brotliCompressSync(contents).byteLength,
        moduleCount: inputPaths.length,
        d3Modules: packageModules(inputPaths, /^d3-/),
        typeAudit: {
          ...entryTypeAudit,
          entryLines: entryTypeAudit.lines,
          entrySourceBytes: entryTypeAudit.sourceBytes,
          lines: chartSource.lines,
          sourceBytes: chartSource.bytes,
          sourceFiles: chartSource.files,
          fixtureLines: authoredSource.roles.fixture.lines,
          fixtureSourceBytes: authoredSource.roles.fixture.bytes,
          fixtureSourceFiles: authoredSource.roles.fixture.files,
          totalSourceLines: authoredSource.totalLines,
          totalSourceBytes: authoredSource.totalBytes,
          totalSourceFiles: authoredSource.totalFiles,
          sourceRoles: authoredSource.roles,
        },
      }
    },
  )

  return bundles.filter(Boolean)
}

async function measureImplementation(
  browser,
  serverUrl,
  entry,
  implementation,
  selectedProfile,
) {
  const page = await browser.newPage({
    viewport: { width: 1_120, height: 620 },
    deviceScaleFactor: 1,
  })
  try {
    await page.goto(serverUrl, { waitUntil: 'load' })
    return await page.evaluate(
      async ({ moduleUrl, caseId, renderer, warmup, samples }) => {
        const { mount } = await import(moduleUrl)
        await document.fonts?.ready
        const inputA = { width: 640, height: 360, revision: 0 }
        const inputB = { width: 640, height: 360, revision: 1 }
        const mountSamples = []
        let output

        for (let index = 0; index < warmup + samples; index++) {
          const container = createContainer(640)
          const startedAt = performance.now()
          const handle = mount(container, inputA)
          forceLayout(container)
          const duration = performance.now() - startedAt
          if (index === warmup) output = outputMetrics(container)
          if (index >= warmup) mountSamples.push(duration)
          handle.destroy()
          container.remove()
        }

        const updateContainer = createContainer(640)
        const handle = mount(updateContainer, inputA)
        forceLayout(updateContainer)
        const updateSamples = []
        for (let index = 0; index < warmup + samples; index++) {
          const startedAt = performance.now()
          handle.update(index % 2 === 0 ? inputB : inputA)
          forceLayout(updateContainer)
          if (index >= warmup) {
            updateSamples.push(performance.now() - startedAt)
          }
        }
        handle.destroy()
        updateContainer.remove()

        return {
          caseId,
          renderer,
          mount: summarize(mountSamples),
          update: summarize(updateSamples),
          output,
        }

        function createContainer(width) {
          const container = document.createElement('div')
          container.style.width = `${width}px`
          container.style.height = '360px'
          document.body.append(container)
          return container
        }

        function forceLayout(container) {
          const bounds = container.getBoundingClientRect()
          const svg = primarySvg(container)
          return (
            bounds.width +
            bounds.height +
            (svg?.getBoundingClientRect().width ?? 0)
          )
        }

        function outputMetrics(container) {
          const svgs = [...container.querySelectorAll('svg')]
          return {
            elements: container.querySelectorAll('*').length,
            paths: container.querySelectorAll('path').length,
            rectangles: container.querySelectorAll('rect').length,
            circles: container.querySelectorAll('circle').length,
            labels: container.querySelectorAll('text').length,
            svgBytes: svgs.reduce(
              (total, svg) =>
                total + new TextEncoder().encode(svg.outerHTML).byteLength,
              0,
            ),
          }
        }

        function primarySvg(container) {
          return [...container.querySelectorAll('svg')].sort((left, right) => {
            const leftBounds = left.getBoundingClientRect()
            const rightBounds = right.getBoundingClientRect()
            return (
              rightBounds.width * rightBounds.height -
              leftBounds.width * leftBounds.height
            )
          })[0]
        }

        function summarize(values) {
          const sorted = [...values].sort((left, right) => left - right)
          return {
            medianMs: percentile(sorted, 0.5),
            p95Ms: percentile(sorted, 0.95),
            minimumMs: sorted[0],
            maximumMs: sorted.at(-1),
          }
        }

        function percentile(sorted, fraction) {
          const index = Math.min(
            sorted.length - 1,
            Math.ceil((sorted.length - 1) * fraction),
          )
          return sorted[index]
        }
      },
      {
        moduleUrl: `${serverUrl}bundles/${implementation.id}.js`,
        caseId: entry.id,
        renderer: implementation.renderer,
        warmup: selectedProfile.warmup,
        samples: selectedProfile.samples,
      },
    )
  } finally {
    await page.close()
  }
}

async function compareVisuals(
  browser,
  serverUrl,
  entry,
  implementations,
  selectedProfile,
) {
  const referenceRenderer = referenceRendererForCase(entry)
  const referenceResultKey = rendererResultKey(referenceRenderer)
  const reference = implementations.find(
    (implementation) => implementation.renderer === referenceRenderer,
  )
  const tanstack = implementations.find(
    (implementation) => implementation.renderer === targetRenderer,
  )
  if (!reference || !tanstack) {
    return {
      caseId: entry.id,
      referenceRenderer,
      status: 'gap',
      variants: [],
    }
  }

  const page = await browser.newPage({
    viewport: { width: 2_080, height: 620 },
    deviceScaleFactor: 1,
  })
  try {
    await page.goto(serverUrl, { waitUntil: 'load' })
    const variants = await page.evaluate(
      async ({
        referenceUrl,
        referenceRenderer,
        referenceResultKey,
        tanstackUrl,
        geometry,
        guideAssertions,
        widths,
        themes,
      }) => {
        const [{ mount: mountReference }, { mount: mountTanstack }] =
          await Promise.all([import(referenceUrl), import(tanstackUrl)])
        await document.fonts?.ready
        const root = document.createElement('main')
        root.style.display = 'grid'
        root.style.gridTemplateColumns = 'repeat(2, max-content)'
        root.style.gap = '24px'
        root.style.padding = '24px'
        document.body.append(root)
        const referenceContainer = document.createElement('div')
        const tanstackContainer = document.createElement('div')
        root.append(referenceContainer, tanstackContainer)
        let referenceHandle
        let tanstackHandle
        const results = []

        for (const theme of themes) {
          applyTheme(theme)
          for (const width of widths) {
            const input = { width, height: 360, revision: 0 }
            for (const container of [referenceContainer, tanstackContainer]) {
              container.style.width = `${width}px`
              container.style.minHeight = '360px'
              container.style.color = theme === 'dark' ? '#edf2fb' : '#172033'
              container.style.background =
                theme === 'dark' ? '#151a24' : '#ffffff'
            }

            if (!referenceHandle) {
              referenceHandle = mountReference(referenceContainer, input)
              tanstackHandle = mountTanstack(tanstackContainer, input)
            } else {
              referenceHandle.update(input)
              tanstackHandle.update(input)
            }
            forceLayout(referenceContainer)
            forceLayout(tanstackContainer)
            await Promise.all([
              referenceHandle.driver?.settle?.(),
              tanstackHandle.driver?.settle?.(),
            ])
            forceLayout(referenceContainer)
            forceLayout(tanstackContainer)

            const referenceInspection = inspect(
              referenceContainer,
              referenceHandle,
              referenceRenderer,
              geometry,
              guideAssertions,
            )
            const tanstackInspection = inspect(
              tanstackContainer,
              tanstackHandle,
              'tanstack',
              geometry,
              guideAssertions,
            )
            const updatedInput = { ...input, revision: 1 }
            referenceHandle.update(updatedInput)
            tanstackHandle.update(updatedInput)
            forceLayout(referenceContainer)
            forceLayout(tanstackContainer)
            await Promise.all([
              referenceHandle.driver?.settle?.(),
              tanstackHandle.driver?.settle?.(),
            ])
            forceLayout(referenceContainer)
            forceLayout(tanstackContainer)
            const updatedReferenceInspection = inspect(
              referenceContainer,
              referenceHandle,
              referenceRenderer,
              geometry,
              guideAssertions,
            )
            const updatedTanstackInspection = inspect(
              tanstackContainer,
              tanstackHandle,
              'tanstack',
              geometry,
              guideAssertions,
            )
            results.push({
              width,
              theme,
              referenceRenderer,
              [referenceResultKey]: referenceInspection,
              tanstack: tanstackInspection,
              geometrySimilarity: compareGeometry(
                referenceInspection.geometry,
                tanstackInspection.geometry,
              ),
              paintParity: comparePaints(
                referenceInspection.geometry,
                tanstackInspection.geometry,
              ),
              updated: {
                referenceRenderer,
                [referenceResultKey]: updatedReferenceInspection,
                tanstack: updatedTanstackInspection,
                geometrySimilarity: compareGeometry(
                  updatedReferenceInspection.geometry,
                  updatedTanstackInspection.geometry,
                ),
                paintParity: comparePaints(
                  updatedReferenceInspection.geometry,
                  updatedTanstackInspection.geometry,
                ),
              },
            })
          }
        }

        return results

        function applyTheme(theme) {
          document.documentElement.style.colorScheme = theme
          document.body.style.margin = '0'
          document.body.style.color = theme === 'dark' ? '#edf2fb' : '#172033'
          document.body.style.background =
            theme === 'dark' ? '#0e1118' : '#f4f6fa'
          document.documentElement.style.setProperty(
            '--ts-chart-1',
            theme === 'dark' ? '#6ea8fe' : '#2563eb',
          )
          document.documentElement.style.setProperty(
            '--ts-chart-2',
            theme === 'dark' ? '#ff9b65' : '#f97316',
          )
          document.documentElement.style.setProperty(
            '--ts-chart-3',
            theme === 'dark' ? '#4fd1a1' : '#10b981',
          )
        }

        function forceLayout(container) {
          const bounds = container.getBoundingClientRect()
          const svg = primarySvg(container)
          return bounds.width + (svg?.getBoundingClientRect().height ?? 0)
        }

        function inspect(
          container,
          handle,
          renderer,
          expectations,
          guideExpectations,
        ) {
          const svg = primarySvg(container)
          const geometryOutput = Object.fromEntries(
            expectations.map((expectation) => {
              const { role, count, maxCount, rendererRoles, view } = expectation
              const viewRoot = conformanceView(container, view)
              const resolvedRole = rendererRoles?.[renderer] ?? role
              const driverSamples =
                handle.driver?.geometry?.({
                  ...(view === undefined ? {} : { view }),
                  role: resolvedRole,
                }) ?? null
              const driverViewBounds = handle.driver?.viewBounds?.(view)
              const viewBounds = driverViewBounds
                ? {
                    left: driverViewBounds.x,
                    top: driverViewBounds.y,
                    width: driverViewBounds.width,
                    height: driverViewBounds.height,
                  }
                : viewRoot
                  ? (primarySvg(viewRoot)?.getBoundingClientRect() ??
                    viewRoot.getBoundingClientRect())
                  : null
              if (!viewBounds) {
                throw new Error(
                  `Missing conformance view bounds for "${view ?? 'main'}"`,
                )
              }
              const elements = driverSamples
                ? []
                : dataElements(viewRoot ?? container, renderer, resolvedRole)
              const boxes = driverSamples
                ? driverSamples.map(({ x, y, width, height }) => ({
                    x,
                    y,
                    width,
                    height,
                    top: y,
                    left: x,
                    right: x + width,
                    bottom: y + height,
                  }))
                : elements.map((element) => element.getBoundingClientRect())
              const paints = driverSamples
                ? driverSamples
                    .filter((sample) => sample.width > 0 && sample.height > 0)
                    .map((sample) => sample.paint)
                    .filter(Boolean)
                    .sort()
                : elements
                    .filter(
                      (_element, index) =>
                        (boxes[index]?.width ?? 0) > 0 &&
                        (boxes[index]?.height ?? 0) > 0,
                    )
                    .map(elementPaint)
                    .sort()
              const actual = driverSamples?.length ?? elements.length
              return [
                expectation.id ?? role,
                {
                  role,
                  view: view ?? 'main',
                  expected: count,
                  maximum: maxCount,
                  actual,
                  present: actual >= count,
                  withinMaximum: maxCount === undefined || actual <= maxCount,
                  boxes: normalizeBoxes(boxes, viewBounds),
                  paints,
                },
              ]
            }),
          )
          const labels = [...container.querySelectorAll('svg text')].filter(
            (element) =>
              element.textContent?.trim() && isRenderedLabel(element),
          )
          const containerBounds = container.getBoundingClientRect()
          const labelInspections = labels.map((element) => ({
            text: element.textContent?.trim() ?? '',
            ...inspectLabelBounds(element, container),
          }))
          const visibleLabelInspections = labelInspections.filter(
            (inspection) => !inspection.scrollViewportAnchorOutside,
          )
          const guideOverflows = visibleLabelInspections.flatMap(
            ({ bounds, text }) => {
              if (
                bounds.left >= containerBounds.left - 1 &&
                bounds.right <= containerBounds.right + 1 &&
                bounds.top >= containerBounds.top - 1 &&
                bounds.bottom <= containerBounds.bottom + 1
              ) {
                return []
              }
              return [
                {
                  text,
                  left: bounds.left - containerBounds.left,
                  right: bounds.right - containerBounds.right,
                  top: bounds.top - containerBounds.top,
                  bottom: bounds.bottom - containerBounds.bottom,
                },
              ]
            },
          )
          const guideClippings = visibleLabelInspections.flatMap(
            ({ clippings, text }) =>
              clippings.map((clipping) => ({
                text,
                ...clipping,
              })),
          )
          const scrollViewportOffscreenLabels = labelInspections
            .filter((inspection) => inspection.scrollViewportAnchorOutside)
            .map((inspection) => inspection.text)
          const accessibleNameFor = (element) => {
            const direct = element.getAttribute('aria-label')?.trim()
            if (direct) return direct
            const labelledBy = element.getAttribute('aria-labelledby')
            if (labelledBy) {
              const label = labelledBy
                .split(/\s+/)
                .map((id) => element.ownerDocument.getElementById(id))
                .map((node) => node?.textContent?.trim() ?? '')
                .filter(Boolean)
                .join(' ')
              if (label) return label
            }
            return (
              element.querySelector(':scope > title')?.textContent?.trim() ?? ''
            )
          }
          const accessibleRoots = [
            ...container.querySelectorAll(
              '[role="img"], [role="application"], [role="region"], svg:not([aria-hidden="true"])',
            ),
          ]
            .filter((element) => accessibleNameFor(element))
            .filter((element, index, roots) => roots.indexOf(element) === index)
          const accessibleRootDetails = accessibleRoots.map((element) => ({
            label: accessibleNameFor(element),
            role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
          }))
          const duplicateAccessibleRoots = accessibleRoots.flatMap(
            (outer, outerIndex) =>
              accessibleRoots.slice(outerIndex + 1).flatMap((inner) => {
                const outerLabel = accessibleNameFor(outer)
                const innerLabel = accessibleNameFor(inner)
                return outerLabel &&
                  outerLabel === innerLabel &&
                  (outer.contains(inner) || inner.contains(outer))
                  ? [outerLabel]
                  : []
              }),
          )
          const contained =
            !!svg && guideOverflows.length === 0 && guideClippings.length === 0
          return {
            geometry: geometryOutput,
            guideAssertions: guideExpectations.map((expectation) => {
              const axis =
                typeof expectation.axis === 'string'
                  ? expectation.axis
                  : expectation.axis[renderer]
              const labels = tickLabels(container, renderer, axis)
              const counts = Object.fromEntries(
                [...new Set(labels)].map((label) => [
                  label,
                  labels.filter((candidate) => candidate === label).length,
                ]),
              )
              return {
                id: expectation.id,
                axis,
                labels,
                pass:
                  (expectation.sequence === undefined ||
                    labels.join('\u0000') ===
                      expectation.sequence.join('\u0000')) &&
                  (expectation.maxRepeat === undefined ||
                    Object.values(counts).every(
                      (count) => count <= expectation.maxRepeat,
                    )),
              }
            }),
            guidesContained: contained,
            guideOverflows,
            guideClippings,
            scrollViewportOffscreenLabels,
            accessibleName:
              accessibleRoots.length > 0 &&
              duplicateAccessibleRoots.length === 0,
            accessibleRoots: accessibleRootDetails,
            duplicateAccessibleRoots,
            xTicks: tickLabels(container, renderer, 'x'),
            yTicks: tickLabels(container, renderer, 'y'),
          }
        }

        function inspectLabelBounds(element, boundary) {
          const bounds = element.getBoundingClientRect()
          const clippings = []
          let scrollViewportAnchorOutside = false

          for (
            let ancestor = element.parentElement;
            ancestor && ancestor !== boundary;
            ancestor = ancestor.parentElement
          ) {
            const style = getComputedStyle(ancestor)
            const clipsX = clipsOverflow(style.overflowX)
            const clipsY = clipsOverflow(style.overflowY)
            if (!clipsX && !clipsY) continue

            const ancestorBounds = ancestor.getBoundingClientRect()
            if (
              ancestor.hasAttribute('data-conformance-scroll-viewport') &&
              isAnchorOutsideClippingBounds(
                bounds,
                ancestorBounds,
                clipsX,
                clipsY,
              )
            ) {
              scrollViewportAnchorOutside = true
            }

            const edges = []
            if (clipsX && bounds.left < ancestorBounds.left - 1) {
              edges.push('left')
            }
            if (clipsX && bounds.right > ancestorBounds.right + 1) {
              edges.push('right')
            }
            if (clipsY && bounds.top < ancestorBounds.top - 1) {
              edges.push('top')
            }
            if (clipsY && bounds.bottom > ancestorBounds.bottom + 1) {
              edges.push('bottom')
            }
            if (edges.length) {
              clippings.push({
                ancestor: ancestor.hasAttribute(
                  'data-conformance-scroll-viewport',
                )
                  ? 'scroll-viewport'
                  : ancestor.tagName.toLowerCase(),
                edges,
                left: bounds.left - ancestorBounds.left,
                right: bounds.right - ancestorBounds.right,
                top: bounds.top - ancestorBounds.top,
                bottom: bounds.bottom - ancestorBounds.bottom,
              })
            }
          }

          return {
            bounds,
            clippings,
            scrollViewportAnchorOutside,
          }
        }

        function isRenderedLabel(element) {
          const style = getComputedStyle(element)
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number.parseFloat(style.opacity || '1') > 0
          )
        }

        function isAnchorOutsideClippingBounds(
          bounds,
          ancestorBounds,
          clipsX,
          clipsY,
        ) {
          const anchorX = bounds.left + bounds.width / 2
          const anchorY = bounds.top + bounds.height / 2
          return (
            (clipsX &&
              (anchorX <= ancestorBounds.left + 1 ||
                anchorX >= ancestorBounds.right - 1)) ||
            (clipsY &&
              (anchorY <= ancestorBounds.top + 1 ||
                anchorY >= ancestorBounds.bottom - 1))
          )
        }

        function clipsOverflow(value) {
          return (
            value === 'auto' ||
            value === 'clip' ||
            value === 'hidden' ||
            value === 'overlay' ||
            value === 'scroll'
          )
        }

        function dataElements(container, renderer, role) {
          const plotSelectors = {
            arc: '[aria-label="arc"] path',
            area: '[aria-label="area"] path, [aria-label="positive difference"] path, [aria-label="negative difference"] path',
            arrow: '[aria-label="arrow"] path',
            bar: '[aria-label="bar"] rect',
            cell: '[aria-label="cell"] rect',
            contour: '[aria-label="contour"] path',
            delaunay: '[aria-label="delaunay link"] path',
            density: '[aria-label="density"] path',
            dot: '[aria-label="dot"] circle',
            frame:
              'rect[aria-label="frame"], path[aria-label="frame"], line[aria-label="frame"], [aria-label="frame"] rect, [aria-label="frame"] path, [aria-label="frame"] line',
            geo: '[aria-label="geo"] path',
            hexagon: '[aria-label="dot"] path',
            line: '[aria-label="line"] path',
            link: '[aria-label="link"] path, [aria-label="link"] line',
            rect: '[aria-label="rect"] rect',
            radar: '[aria-label="area"] path',
            regression: '[aria-label="linear-regression"] path',
            rule: '[aria-label="rule"] line, [aria-label="rule"] path, [aria-label^="ruleX"] line, [aria-label^="ruleY"] line',
            text: '[aria-label="text"] text',
            tick: '[aria-label="tick"] line, [aria-label^="tickX"] line, [aria-label^="tickY"] line',
            vector: '[aria-label="vector"] path',
            voronoi: '[aria-label="voronoi"] path',
            waffle: '[aria-label="waffle"] path',
          }
          const tanstackSelectors = {
            arc: '.ts-chart__arc path',
            area: '.ts-chart__area path',
            arrow: '.ts-chart__arrow-shaft',
            bar: '.ts-chart__bar rect',
            cell: '.ts-chart__rect rect',
            contour: '.ts-chart__area path',
            delaunay: '.ts-chart__link line, .ts-chart__link path',
            density: '.ts-chart__area path',
            dot: '.ts-chart__dot circle',
            frame: '.ts-chart__frame rect',
            geo: '.ts-chart__geo path, .ts-chart__area path',
            hexagon: '.ts-chart__hexagon path',
            line: '.ts-chart__line path',
            link: '.ts-chart__link line, .ts-chart__link path',
            rect: '.ts-chart__rect rect',
            radar: '.ts-chart__radar path',
            regression: '.ts-chart__line path',
            rule: '.ts-chart__rule line',
            text: '.ts-chart__text text',
            tick: '.ts-chart__tick line',
            vector: '.ts-chart__vector-item .ts-chart__arrow-shaft',
            voronoi: '.ts-chart__voronoi path',
            waffle: '.ts-chart__waffle rect',
          }
          const rechartsSelectors = {
            arc: '.recharts-pie-sector path, .recharts-radial-bar-sector path, .recharts-sector',
            area: '.recharts-area-area',
            arrow:
              '.recharts-reference-line line, .recharts-reference-line path',
            bar: '.recharts-bar-rectangle path, .recharts-bar-rectangle rect',
            cell: '.recharts-rectangle',
            contour: '.recharts-contour path',
            delaunay: '.recharts-voronoi path',
            density: '.recharts-area-area',
            dot: '.recharts-dot, .recharts-scatter-symbol path, .recharts-scatter-symbol circle',
            frame:
              '.recharts-cartesian-grid-bg, .recharts-polar-grid-concentric path',
            geo: '.recharts-geo path',
            hexagon: '.recharts-polygon',
            line: '.recharts-line-curve',
            link: '.recharts-link, .recharts-sankey-link',
            rect: '.recharts-rectangle',
            radar: '.recharts-radar-polygon .recharts-polygon',
            regression: '.recharts-line-curve',
            rule: '.recharts-reference-line-line, .recharts-polar-radius-axis line, path.recharts-pie-label-line',
            text: '.recharts-text',
            tick: '.recharts-cartesian-axis-tick-line',
            vector: '.recharts-scatter-symbol',
            voronoi: '.recharts-voronoi path',
            waffle: '.recharts-rectangle',
          }
          const selectors = {
            'observable-plot': plotSelectors,
            recharts: rechartsSelectors,
            tanstack: tanstackSelectors,
          }
          const selector = selectors[renderer]?.[role]
          return selector ? [...container.querySelectorAll(selector)] : []
        }

        function elementPaint(element) {
          const style = getComputedStyle(element)
          if (element.localName === 'line') return style.stroke
          if (style.fill && style.fill !== 'none') {
            const referenceId = style.fill.match(
              /url\((?:["'])?#([^"')]+)(?:["'])?\)/,
            )?.[1]
            const referencedElement = referenceId
              ? element.ownerDocument.getElementById(referenceId)
              : undefined
            const patternPaint = referencedElement?.querySelector('rect, path')
            if (patternPaint) return getComputedStyle(patternPaint).fill
            const gradientStop = referencedElement?.querySelector('stop')
            return gradientStop
              ? getComputedStyle(gradientStop).getPropertyValue('stop-color')
              : style.fill
          }
          return style.stroke
        }

        function primarySvg(container) {
          return [...container.querySelectorAll('svg')].sort((left, right) => {
            const leftBounds = left.getBoundingClientRect()
            const rightBounds = right.getBoundingClientRect()
            return (
              rightBounds.width * rightBounds.height -
              leftBounds.width * leftBounds.height
            )
          })[0]
        }

        function conformanceView(container, view) {
          if (view === undefined || view === 'main') {
            return (
              [...container.querySelectorAll('[data-conformance-view]')].find(
                (element) => element.dataset.conformanceView === 'main',
              ) ?? container
            )
          }
          const root = [
            ...container.querySelectorAll('[data-conformance-view]'),
          ].find((element) => element.dataset.conformanceView === view)
          return root ?? null
        }

        function normalizeBoxes(boxes, reference) {
          if (!boxes.length || !reference) return []
          const width = Math.max(1, reference.width)
          const height = Math.max(1, reference.height)
          return boxes
            .map((box) => ({
              x: (box.left - reference.left) / width,
              y: (box.top - reference.top) / height,
              width: box.width / width,
              height: box.height / height,
            }))
            .sort((a, b) => a.x - b.x || a.y - b.y)
        }

        function compareGeometry(plotGeometry, tanstackGeometry) {
          const scores = []
          for (const role of Object.keys(plotGeometry)) {
            const plotBoxes = plotGeometry[role]?.boxes ?? []
            const tanstackBoxes = tanstackGeometry[role]?.boxes ?? []
            if (!plotBoxes.length || !tanstackBoxes.length) continue
            const comparablePlotBoxes =
              plotBoxes.length === tanstackBoxes.length
                ? plotBoxes
                : [boxEnvelope(plotBoxes)]
            const comparableTanstackBoxes =
              plotBoxes.length === tanstackBoxes.length
                ? tanstackBoxes
                : [boxEnvelope(tanstackBoxes)]
            let difference = 0
            for (let index = 0; index < comparablePlotBoxes.length; index++) {
              const left = comparablePlotBoxes[index]
              const right = comparableTanstackBoxes[index]
              difference +=
                Math.abs(left.x - right.x) +
                Math.abs(left.y - right.y) +
                Math.abs(left.width - right.width) +
                Math.abs(left.height - right.height)
            }
            scores.push(
              Math.max(0, 1 - difference / (comparablePlotBoxes.length * 4)),
            )
          }
          return scores.length
            ? scores.reduce((total, value) => total + value, 0) / scores.length
            : undefined
        }

        function comparePaints(plotGeometry, tanstackGeometry) {
          return Object.keys(plotGeometry).every((role) => {
            const plotPaints = [...new Set(plotGeometry[role]?.paints ?? [])]
            const tanstackPaints = [
              ...new Set(tanstackGeometry[role]?.paints ?? []),
            ]
            if (plotPaints.length !== tanstackPaints.length) return false
            const unmatched = [...tanstackPaints]
            return plotPaints.every((paint) => {
              const index = unmatched.findIndex((candidate) =>
                paintsEquivalent(paint, candidate),
              )
              if (index < 0) return false
              unmatched.splice(index, 1)
              return true
            })
          })
        }

        function paintsEquivalent(left, right) {
          if (left === right) return true
          const leftChannels = paintChannels(left)
          const rightChannels = paintChannels(right)
          return (
            leftChannels !== undefined &&
            rightChannels !== undefined &&
            leftChannels
              .slice(0, 3)
              .every(
                (channel, index) =>
                  Math.abs(channel - rightChannels[index]) <= 1,
              ) &&
            Math.abs((leftChannels[3] ?? 1) - (rightChannels[3] ?? 1)) <= 0.005
          )
        }

        function paintChannels(value) {
          const rgb = value
            .trim()
            .match(
              /^rgba?\(\s*(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)(?:\D+(\d+(?:\.\d+)?))?\s*\)$/i,
            )
          if (rgb) {
            return [
              Number(rgb[1]),
              Number(rgb[2]),
              Number(rgb[3]),
              rgb[4] === undefined ? 1 : Number(rgb[4]),
            ]
          }

          const hex = value
            .trim()
            .match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)
          if (!hex) return undefined
          const digits =
            hex[1].length <= 4
              ? [...hex[1]].map((digit) => `${digit}${digit}`).join('')
              : hex[1]
          return [
            Number.parseInt(digits.slice(0, 2), 16),
            Number.parseInt(digits.slice(2, 4), 16),
            Number.parseInt(digits.slice(4, 6), 16),
            digits.length === 8
              ? Number.parseInt(digits.slice(6, 8), 16) / 255
              : 1,
          ]
        }

        function boxEnvelope(boxes) {
          const left = Math.min(...boxes.map((box) => box.x))
          const top = Math.min(...boxes.map((box) => box.y))
          const right = Math.max(...boxes.map((box) => box.x + box.width))
          const bottom = Math.max(...boxes.map((box) => box.y + box.height))
          return {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          }
        }

        function tickLabels(container, renderer, axis) {
          if (renderer === 'echarts') {
            return echartsTickLabels(container, axis)
          }
          const selectors = {
            'observable-plot': `[aria-label="${axis}-axis tick label"] text`,
            recharts: `.recharts-${axis}Axis .recharts-cartesian-axis-tick-value`,
            tanstack: `.ts-chart__axes [data-ts-key^="${axis}-tick-label"]`,
          }
          const selector = selectors[renderer]
          if (!selector) return []
          return [...container.querySelectorAll(selector)]
            .map((element) => element.textContent?.trim())
            .filter(Boolean)
        }

        function echartsTickLabels(container, axis) {
          if (axis !== 'x' && axis !== 'y') return []
          const svg = container.querySelector('svg')
          if (!(svg instanceof SVGSVGElement)) return []
          const plot = renderedCartesianPlotBounds(svg)
          if (!plot) return []

          const texts = [...svg.querySelectorAll('text')].flatMap((element) => {
            const label = element.textContent?.trim()
            const matrix = element.getScreenCTM()
            if (!label || !matrix) return []
            const x = Number.parseFloat(element.getAttribute('x') ?? '0')
            const y = Number.parseFloat(element.getAttribute('y') ?? '0')
            const bounds = element.getBoundingClientRect()
            if (bounds.width <= 0 || bounds.height <= 0) return []
            return [
              {
                anchorX: matrix.a * x + matrix.c * y + matrix.e,
                anchorY: matrix.b * x + matrix.d * y + matrix.f,
                bounds,
                label,
              },
            ]
          })

          if (axis === 'x') {
            const candidates = texts.filter(
              ({ anchorX, anchorY }) =>
                anchorX >= plot.left - 2 &&
                anchorX <= plot.right + 2 &&
                (anchorY < plot.top - 1 || anchorY > plot.bottom + 1),
            )
            const group = closestAxisTextGroup(
              candidates,
              'anchorY',
              plot.top,
              plot.bottom,
            )
            return group
              .sort((left, right) => left.anchorX - right.anchorX)
              .map(({ label }) => label)
          }

          const candidates = texts.filter(
            ({ anchorX, anchorY }) =>
              anchorY >= plot.top - 2 &&
              anchorY <= plot.bottom + 2 &&
              (anchorX < plot.left - 1 || anchorX > plot.right + 1),
          )
          return closestAxisTextGroup(
            candidates,
            'anchorX',
            plot.left,
            plot.right,
          ).map(({ label }) => label)
        }

        function closestAxisTextGroup(candidates, coordinate, start, end) {
          const groups = []
          for (const candidate of candidates) {
            const value = candidate[coordinate]
            const group = groups.find(
              (entry) => Math.abs(entry.coordinate - value) <= 1.5,
            )
            if (group) {
              group.items.push(candidate)
              group.coordinate =
                group.items.reduce((sum, item) => sum + item[coordinate], 0) /
                group.items.length
            } else {
              groups.push({ coordinate: value, items: [candidate] })
            }
          }
          groups.sort((left, right) => {
            if (right.items.length !== left.items.length) {
              return right.items.length - left.items.length
            }
            const leftDistance = Math.min(
              Math.abs(left.coordinate - start),
              Math.abs(left.coordinate - end),
            )
            const rightDistance = Math.min(
              Math.abs(right.coordinate - start),
              Math.abs(right.coordinate - end),
            )
            return leftDistance - rightDistance
          })
          return groups[0]?.items ?? []
        }

        function renderedCartesianPlotBounds(svg) {
          const svgBounds = svg.getBoundingClientRect()
          const minimumHorizontalSpan = svgBounds.width * 0.2
          const minimumVerticalSpan = svgBounds.height * 0.2
          const segments = [...svg.querySelectorAll('path, line')]
            .map((element) => element.getBoundingClientRect())
            .filter((bounds) => bounds.width > 0 || bounds.height > 0)
          const horizontal = dominantRenderedSegments(
            segments.filter(
              (bounds) =>
                bounds.width >= minimumHorizontalSpan && bounds.height <= 2,
            ),
            'horizontal',
          )
          const vertical = dominantRenderedSegments(
            segments.filter(
              (bounds) =>
                bounds.height >= minimumVerticalSpan && bounds.width <= 2,
            ),
            'vertical',
          )
          if (horizontal.length === 0 && vertical.length === 0) return null

          const left =
            horizontal.length > 0
              ? median(horizontal.map((bounds) => bounds.left))
              : Math.min(
                  ...vertical.map((bounds) => bounds.left + bounds.width / 2),
                )
          const right =
            horizontal.length > 0
              ? median(horizontal.map((bounds) => bounds.right))
              : Math.max(
                  ...vertical.map((bounds) => bounds.left + bounds.width / 2),
                )
          const top =
            vertical.length > 0
              ? median(vertical.map((bounds) => bounds.top))
              : Math.min(
                  ...horizontal.map((bounds) => bounds.top + bounds.height / 2),
                )
          const bottom =
            vertical.length > 0
              ? median(vertical.map((bounds) => bounds.bottom))
              : Math.max(
                  ...horizontal.map((bounds) => bounds.top + bounds.height / 2),
                )
          if (right - left <= 20 || bottom - top <= 20) return null
          return { left, right, top, bottom }
        }

        function dominantRenderedSegments(segments, orientation) {
          const groups = new Map()
          for (const bounds of segments) {
            const start =
              orientation === 'horizontal' ? bounds.left : bounds.top
            const end =
              orientation === 'horizontal' ? bounds.right : bounds.bottom
            const key = `${Math.round(start * 2) / 2}:${
              Math.round(end * 2) / 2
            }`
            const group = groups.get(key)
            if (group) group.push(bounds)
            else groups.set(key, [bounds])
          }
          return (
            [...groups.values()].sort((left, right) => {
              if (right.length !== left.length)
                return right.length - left.length
              const leftSpan =
                orientation === 'horizontal' ? left[0].width : left[0].height
              const rightSpan =
                orientation === 'horizontal' ? right[0].width : right[0].height
              return rightSpan - leftSpan
            })[0] ?? []
          )
        }

        function median(values) {
          const sorted = [...values].sort((left, right) => left - right)
          const middle = Math.floor(sorted.length / 2)
          return sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2
        }
      },
      {
        referenceUrl: `${serverUrl}bundles/${reference.id}.js`,
        referenceRenderer,
        referenceResultKey,
        tanstackUrl: `${serverUrl}bundles/${tanstack.id}.js`,
        geometry: entry.geometry,
        guideAssertions: entry.guideAssertions ?? [],
        widths: selectedProfile.widths,
        themes: selectedProfile.themes,
      },
    )

    await page.setViewportSize({ width: 1_360, height: 500 })
    await page.evaluate(
      async ({ referenceUrl, tanstackUrl }) => {
        document.body.replaceChildren()
        document.body.style.margin = '0'
        document.body.style.padding = '20px'
        document.body.style.display = 'grid'
        document.body.style.gridTemplateColumns = 'repeat(2, 640px)'
        document.body.style.gap = '20px'
        document.body.style.color = '#172033'
        document.body.style.background = '#f4f6fa'
        const [{ mount: mountReference }, { mount: mountTanstack }] =
          await Promise.all([import(referenceUrl), import(tanstackUrl)])
        for (const mount of [mountReference, mountTanstack]) {
          const panel = document.createElement('div')
          panel.style.width = '640px'
          panel.style.minHeight = '360px'
          panel.style.background = '#ffffff'
          document.body.append(panel)
          mount(panel, { width: 640, height: 360, revision: 0 })
        }
        await document.fonts?.ready
      },
      {
        referenceUrl: `${serverUrl}bundles/${reference.id}.js`,
        tanstackUrl: `${serverUrl}bundles/${tanstack.id}.js`,
      },
    )
    await page.screenshot({
      path: resolve(screenshotDirectory, `${entry.id}.png`),
      fullPage: true,
    })

    return {
      caseId: entry.id,
      referenceRenderer,
      minimumGeometrySimilarity: entry.minimumGeometrySimilarity,
      status: variants.every(
        (variant) =>
          visualPairPasses(
            variant,
            referenceResultKey,
            entry.minimumGeometrySimilarity,
          ) &&
          visualPairPasses(
            variant.updated,
            referenceResultKey,
            entry.minimumGeometrySimilarity,
          ),
      )
        ? 'pass'
        : 'fail',
      screenshot: relative(
        resultDirectory,
        resolve(screenshotDirectory, `${entry.id}.png`),
      ),
      variants,
    }
  } finally {
    await page.close()
  }
}

async function compareBehaviors(
  browser,
  serverUrl,
  entry,
  implementations,
  selectedProfile,
) {
  const referenceRenderer = referenceRendererForCase(entry)
  const referenceResultKey = rendererResultKey(referenceRenderer)
  const reference = implementations.find(
    (implementation) => implementation.renderer === referenceRenderer,
  )
  const tanstack = implementations.find(
    (implementation) => implementation.renderer === targetRenderer,
  )
  if (!reference || !tanstack) {
    return {
      caseId: entry.id,
      referenceRenderer,
      status: 'gap',
      variants: [],
    }
  }

  const variants = []
  for (const theme of selectedProfile.themes) {
    for (const width of selectedProfile.widths) {
      for (const revision of [0, 1]) {
        const pair = {
          width,
          theme,
          revision,
          referenceRenderer,
          [referenceResultKey]: await runBehaviorImplementation(
            browser,
            serverUrl,
            reference,
            entry.interactionScenarios,
            { width, theme, revision },
          ),
          tanstack: await runBehaviorImplementation(
            browser,
            serverUrl,
            tanstack,
            entry.interactionScenarios,
            { width, theme, revision },
          ),
        }
        variants.push(pair)
      }
    }
  }

  return {
    caseId: entry.id,
    referenceRenderer,
    status: variants.every(
      (variant) => variant[referenceResultKey].pass && variant.tanstack.pass,
    )
      ? 'pass'
      : 'fail',
    variants,
  }
}

async function runBehaviorImplementation(
  browser,
  serverUrl,
  implementation,
  scenarios,
  variant,
) {
  const page = await browser.newPage({
    viewport: {
      width: Math.max(variant.width + 96, 480),
      height: 560,
    },
    deviceScaleFactor: 1,
    hasTouch: scenarios.some((scenario) =>
      scenario.steps.some(
        (step) => step.type === 'touchTap' || step.type === 'touchDrag',
      ),
    ),
  })
  const scenarioResults = []
  try {
    await page.goto(serverUrl, { waitUntil: 'load' })
    for (const scenario of scenarios) {
      let mounted = false
      const trace = []
      const pageErrors = []
      const handlePageError = (error) => {
        pageErrors.push(error.stack || error.message || String(error))
      }
      const takePageErrors = () => pageErrors.splice(0)
      page.on('pageerror', handlePageError)
      try {
        const mountResult = await page.evaluate(
          async ({ moduleUrl, width, revision, theme }) => {
            document.body.replaceChildren()
            document.documentElement.scrollTop = 0
            document.body.style.margin = '0'
            document.body.style.padding = '24px'
            document.body.style.color = theme === 'dark' ? '#edf2fb' : '#172033'
            document.body.style.background =
              theme === 'dark' ? '#0e1118' : '#f4f6fa'
            document.documentElement.style.colorScheme = theme
            document.documentElement.style.setProperty(
              '--ts-chart-1',
              theme === 'dark' ? '#6ea8fe' : '#2563eb',
            )
            document.documentElement.style.setProperty(
              '--ts-chart-2',
              theme === 'dark' ? '#ff9b65' : '#f97316',
            )
            document.documentElement.style.setProperty(
              '--ts-chart-3',
              theme === 'dark' ? '#4fd1a1' : '#10b981',
            )
            const container = document.createElement('div')
            container.dataset.conformanceRoot = ''
            container.style.width = `${width}px`
            container.style.minHeight = '360px'
            container.style.background =
              theme === 'dark' ? '#151a24' : '#ffffff'
            const scrollProbe = document.createElement('div')
            scrollProbe.setAttribute('aria-hidden', 'true')
            scrollProbe.style.height = '400px'
            document.body.append(container, scrollProbe)
            const { mount } = await import(moduleUrl)
            const handle = mount(container, {
              width,
              height: 360,
              revision,
              interactive: true,
              behavior: true,
            })
            globalThis.__conformanceBehavior = {
              container,
              handle,
              pointerTarget: null,
              revision,
            }
            await document.fonts?.ready
            await new Promise((resolveFrame) =>
              requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
            )
            return {
              driver: Boolean(handle.driver),
              state: handle.driver?.readState() ?? null,
            }
          },
          {
            moduleUrl: `${serverUrl}bundles/${implementation.id}.js`,
            ...variant,
          },
        )
        mounted = true
        if (!mountResult.driver) {
          throw new Error('implementation did not expose a conformance driver')
        }
        await page.waitForTimeout(0)
        const mountErrors = takePageErrors()
        if (mountErrors.length) {
          throw new Error(
            `renderer page error during mount: ${mountErrors.join('\n')}`,
          )
        }

        let scenarioPass = true
        for (const step of scenario.steps) {
          let stepResult
          try {
            stepResult = await performBehaviorStep(page, step, variant, {
              implementationId: implementation.id,
              scenarioId: scenario.id,
            })
            await page.waitForTimeout(0)
          } catch (error) {
            const errors = takePageErrors()
            trace.push({
              type: step.type,
              pass: false,
              reason: error instanceof Error ? error.message : String(error),
              errors,
            })
            scenarioPass = false
            break
          }

          const errors = takePageErrors()
          const tracedStep = {
            ...stepResult,
            pass: stepResult.pass && errors.length === 0,
            errors,
          }
          trace.push(tracedStep)
          scenarioPass &&= tracedStep.pass
          if (!tracedStep.pass) break
        }
        scenarioResults.push({
          id: scenario.id,
          pass: scenarioPass,
          initialState: mountResult.state,
          trace,
        })
      } catch (error) {
        scenarioResults.push({
          id: scenario.id,
          pass: false,
          reason: error instanceof Error ? error.message : String(error),
          trace,
        })
      } finally {
        try {
          if (mounted) {
            await cancelActiveBehaviorPointer(page)
            await page.evaluate(() => {
              globalThis.__conformanceBehavior?.handle.destroy()
              delete globalThis.__conformanceBehavior
            })
          }
        } finally {
          page.off('pageerror', handlePageError)
        }
      }
    }
  } finally {
    await page.close()
  }

  return {
    renderer: implementation.renderer,
    pass: scenarioResults.every((scenario) => scenario.pass),
    scenarios: scenarioResults,
  }
}

async function performBehaviorStep(page, step, variant, context) {
  if (step.type === 'assert') {
    const state = await readBehaviorState(page)
    const assertions = step.assertions.map((assertion) =>
      evaluateStateAssertion(state, assertion),
    )
    return {
      type: step.type,
      pass: assertions.every((assertion) => assertion.pass),
      state,
      assertions,
    }
  }
  if (step.type === 'assertRendered') {
    const assertions = await Promise.all(
      step.assertions.map((assertion) =>
        evaluateRenderedAssertion(page, assertion),
      ),
    )
    return {
      type: step.type,
      pass: assertions.every((assertion) => assertion.pass),
      state: await readBehaviorState(page),
      assertions,
    }
  }
  if (step.type === 'screenshot') {
    const screenshot = await captureBehaviorScreenshot(
      page,
      step,
      variant,
      context,
    )
    return {
      type: step.type,
      pass: true,
      screenshot,
      state: await readBehaviorState(page),
    }
  }

  switch (step.type) {
    case 'pointerMove': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.mouse.move(target.x, target.y, { steps: step.steps ?? 1 })
      break
    }
    case 'pointerDown': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.mouse.move(target.x, target.y)
      const targetFound = await rememberBehaviorPointerTarget(page, target)
      if (!targetFound) {
        throw new Error(`pointerDown did not hit "${step.target.anchor}"`)
      }
      await page.mouse.down()
      break
    }
    case 'pointerUp': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.mouse.move(target.x, target.y)
      await page.mouse.up()
      await clearBehaviorPointerTarget(page)
      break
    }
    case 'pointerCancel': {
      const canceled = await page.evaluate(() => {
        const behavior = globalThis.__conformanceBehavior
        const target = behavior?.pointerTarget
        if (!target) return false
        target.dispatchEvent(
          new PointerEvent('pointercancel', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
          }),
        )
        behavior.pointerTarget = null
        return true
      })
      if (!canceled) {
        throw new Error('pointerCancel requires a preceding pointerDown')
      }
      await page.mouse.up()
      break
    }
    case 'pointerLeave': {
      if (step.view) {
        if (!(await resolveBehaviorViewBounds(page, step.view))) {
          throw new Error(`could not resolve view "${step.view}"`)
        }
      }
      await page.mouse.move(1, 1)
      break
    }
    case 'update': {
      await page.evaluate(
        ({ width, revision }) => {
          const behavior = globalThis.__conformanceBehavior
          if (!behavior) {
            throw new Error('conformance behavior mount is unavailable')
          }
          behavior.handle.update({
            width,
            height: 360,
            revision,
          })
          behavior.revision = revision
        },
        {
          width: variant.width,
          revision: step.revision,
        },
      )
      break
    }
    case 'click': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.mouse.click(target.x, target.y)
      break
    }
    case 'key': {
      if (step.target) {
        const focusResult = await page.evaluate((target) => {
          const resolved =
            globalThis.__conformanceBehavior.handle.driver.resolveTarget(target)
          const focusElement = resolved?.focusElement
          if (!focusElement) {
            return {
              focused: false,
              reason: 'did not expose a focus element',
            }
          }
          if (
            !(focusElement instanceof HTMLElement) &&
            !(focusElement instanceof SVGElement)
          ) {
            return {
              focused: false,
              reason: 'exposed an unsupported focus element',
            }
          }
          if (!focusElement.isConnected) {
            return {
              focused: false,
              reason: 'exposed a disconnected focus element',
            }
          }
          focusElement.focus()
          return document.activeElement === focusElement
            ? { focused: true }
            : {
                focused: false,
                reason: 'focus element did not accept focus',
              }
        }, step.target)
        if (!focusResult.focused) {
          throw new Error(
            `target "${step.target.anchor}" ${focusResult.reason}`,
          )
        }
      }
      await page.keyboard.press(step.key)
      break
    }
    case 'drag': {
      const from = await resolveBehaviorTarget(page, step.from)
      const to = await resolveBehaviorTarget(page, step.to)
      await page.mouse.move(from.x, from.y)
      if (!(await rememberBehaviorPointerTarget(page, from))) {
        throw new Error(`drag did not hit "${step.from.anchor}"`)
      }
      await page.mouse.down()
      try {
        await page.mouse.move(to.x, to.y, { steps: step.steps ?? 8 })
      } finally {
        await page.mouse.up()
        await clearBehaviorPointerTarget(page)
      }
      break
    }
    case 'wheel': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.mouse.move(target.x, target.y)
      const steps = step.steps ?? 1
      const deltaMode = step.deltaMode ?? 'pixel'
      for (let index = 0; index < steps; index += 1) {
        if (deltaMode === 'pixel') {
          await page.mouse.wheel(step.deltaX ?? 0, step.deltaY ?? 0)
        } else {
          await page.evaluate(
            ({ x, y, deltaX, deltaY, mode }) => {
              const targetElement = document.elementFromPoint(x, y)
              if (!targetElement) {
                throw new Error('wheel target is outside the document')
              }
              targetElement.dispatchEvent(
                new WheelEvent('wheel', {
                  bubbles: true,
                  cancelable: true,
                  clientX: x,
                  clientY: y,
                  deltaX,
                  deltaY,
                  deltaMode: mode === 'line' ? 1 : 2,
                }),
              )
            },
            {
              ...target,
              deltaX: step.deltaX ?? 0,
              deltaY: step.deltaY ?? 0,
              mode: deltaMode,
            },
          )
        }
      }
      break
    }
    case 'touchTap': {
      const target = await resolveBehaviorTarget(page, step.target)
      await page.touchscreen.tap(target.x, target.y)
      break
    }
    case 'touchDrag': {
      const from = await resolveBehaviorTarget(page, step.from)
      const to = await resolveBehaviorTarget(page, step.to)
      await performTouchDrag(
        page,
        from,
        to,
        step.steps ?? 8,
        step.cancel ?? false,
      )
      break
    }
    case 'wait': {
      await page.waitForTimeout(step.durationMs)
      break
    }
  }

  await settleBehavior(page)
  return {
    type: step.type,
    pass: true,
    state: await readBehaviorState(page),
  }
}

async function rememberBehaviorPointerTarget(page, target) {
  return page.evaluate(({ x, y }) => {
    const behavior = globalThis.__conformanceBehavior
    if (!behavior) return false
    behavior.pointerTarget = document.elementFromPoint(x, y)
    return Boolean(behavior.pointerTarget)
  }, target)
}

async function clearBehaviorPointerTarget(page) {
  await page.evaluate(() => {
    if (globalThis.__conformanceBehavior) {
      globalThis.__conformanceBehavior.pointerTarget = null
    }
  })
}

async function cancelActiveBehaviorPointer(page) {
  const canceled = await page.evaluate(() => {
    const behavior = globalThis.__conformanceBehavior
    const target = behavior?.pointerTarget
    if (!target) return false
    target.dispatchEvent(
      new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }),
    )
    behavior.pointerTarget = null
    return true
  })
  if (canceled) await page.mouse.up()
}

async function performTouchDrag(page, from, to, steps, cancel) {
  const session = await page.context().newCDPSession(page)
  let active = false
  const touchPoint = (x, y) => ({
    x,
    y,
    radiusX: 1,
    radiusY: 1,
    force: 1,
    id: 0,
  })
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint(from.x, from.y)],
    })
    active = true
    for (let index = 1; index <= steps; index += 1) {
      const progress = index / steps
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          touchPoint(
            from.x + (to.x - from.x) * progress,
            from.y + (to.y - from.y) * progress,
          ),
        ],
      })
    }
    await session.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    })
    active = false
  } finally {
    if (active) {
      await session
        .send('Input.dispatchTouchEvent', {
          type: 'touchCancel',
          touchPoints: [],
        })
        .catch(() => {})
    }
    await session.detach()
  }
}

async function resolveBehaviorTarget(page, target) {
  const resolved = await page.evaluate((targetValue) => {
    const driver = globalThis.__conformanceBehavior?.handle.driver
    const point = driver?.resolveTarget(targetValue)
    return point ? { x: point.x, y: point.y } : null
  }, target)
  if (!resolved) {
    throw new Error(
      `could not resolve target "${target.anchor}"${target.view ? ` in view "${target.view}"` : ''}`,
    )
  }
  return resolved
}

async function resolveBehaviorViewBounds(page, view) {
  return page.evaluate((viewName) => {
    const behavior = globalThis.__conformanceBehavior
    const container = behavior?.container
    if (!container) return null
    if (!viewName) {
      const bounds = container.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    }
    const element = [
      ...container.querySelectorAll('[data-conformance-view]'),
    ].find((candidate) => candidate.dataset.conformanceView === viewName)
    if (element) {
      const bounds = element.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    }
    const bounds = behavior.handle.driver?.viewBounds?.(viewName)
    return bounds
      ? {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }
      : null
  }, view)
}

async function captureBehaviorScreenshot(page, step, variant, context) {
  const bounds = await resolveBehaviorViewBounds(page, step.view)
  if (!bounds) {
    throw new Error(
      step.view
        ? `could not resolve screenshot view "${step.view}"`
        : 'could not resolve the conformance root',
    )
  }
  const viewport = page.viewportSize()
  const x = Math.max(0, bounds.x)
  const y = Math.max(0, bounds.y)
  const width = Math.min(bounds.width - (x - bounds.x), viewport.width - x)
  const height = Math.min(bounds.height - (y - bounds.y), viewport.height - y)
  if (width <= 0 || height <= 0) {
    throw new Error('screenshot bounds are outside the browser viewport')
  }
  const revision = await page.evaluate(
    () => globalThis.__conformanceBehavior?.revision,
  )
  const fileName = [
    context.implementationId,
    `${variant.width}px`,
    variant.theme,
    `r${revision ?? variant.revision}`,
    context.scenarioId,
    step.name,
  ]
    .map(safeScreenshotSegment)
    .join('-')
  const path = resolve(screenshotDirectory, `${fileName}.png`)
  await page.screenshot({
    path,
    clip: { x, y, width, height },
  })
  return relative(root, path).split(sep).join('/')
}

function safeScreenshotSegment(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-')
}

function renderedLocator(page, target) {
  if (target.page) return page.locator('html')
  const rootLocator = page.locator('[data-conformance-root]')
  if (target.root) return rootLocator
  if (target.selector) return rootLocator.locator(target.selector)
  return rootLocator.getByRole(target.role, {
    ...(target.name === undefined ? {} : { name: target.name }),
    ...(target.exact === undefined ? {} : { exact: target.exact }),
  })
}

async function resolveRenderedLocator(page, target) {
  const collection = renderedLocator(page, target)
  const count = await collection.count()
  if (target.index !== undefined) {
    if (target.index >= count) {
      return {
        locator: null,
        count,
        reason: `rendered target index ${target.index} exceeds count ${count}`,
      }
    }
    return { locator: collection.nth(target.index), count }
  }
  if (count !== 1) {
    return {
      locator: null,
      count,
      reason: `rendered target resolved ${count} elements; supply index for one`,
    }
  }
  return { locator: collection, count }
}

async function evaluateRenderedAssertion(page, assertion) {
  try {
    if (assertion.property === 'count') {
      const actual = await renderedLocator(page, assertion.target).count()
      return completeRenderedAssertion(assertion, actual)
    }

    const resolved = await resolveRenderedLocator(page, assertion.target)
    if (resolved.reason) {
      return {
        ...assertion,
        actual: resolved.count,
        pass: false,
        reason: resolved.reason,
      }
    }
    if (assertion.property === 'text') {
      const text = await resolved.locator.textContent()
      const actual = text?.replace(/\s+/g, ' ').trim() ?? null
      return completeRenderedAssertion(assertion, actual)
    }
    if (assertion.property === 'attribute') {
      const actual = await resolved.locator.getAttribute(assertion.attribute)
      return completeRenderedAssertion(assertion, actual)
    }
    if (assertion.property === 'visible') {
      const actual = await resolved.locator.isVisible()
      return completeRenderedAssertion(assertion, actual)
    }
    if (assertion.property === 'focused') {
      const actual = await resolved.locator.evaluate(
        (element) => document.activeElement === element,
      )
      return completeRenderedAssertion(assertion, actual)
    }
    if (assertion.property === 'contained') {
      const boundary = await resolveRenderedLocator(
        page,
        assertion.within ?? { root: true },
      )
      if (boundary.reason || !boundary.locator) {
        return {
          ...assertion,
          actual: false,
          pass: false,
          reason: boundary.reason ?? 'containment boundary was unavailable',
        }
      }
      const [targetBounds, boundaryBounds] = await Promise.all([
        resolved.locator.boundingBox(),
        boundary.locator.boundingBox(),
      ])
      if (!targetBounds || !boundaryBounds) {
        return {
          ...assertion,
          actual: false,
          pass: false,
          reason: 'containment target or boundary has no rendered bounds',
        }
      }
      const tolerance = assertion.tolerance ?? 0
      const actual =
        targetBounds.x >= boundaryBounds.x - tolerance &&
        targetBounds.y >= boundaryBounds.y - tolerance &&
        targetBounds.x + targetBounds.width <=
          boundaryBounds.x + boundaryBounds.width + tolerance &&
        targetBounds.y + targetBounds.height <=
          boundaryBounds.y + boundaryBounds.height + tolerance
      return {
        ...completeRenderedAssertion(assertion, actual),
        bounds: {
          target: targetBounds,
          boundary: boundaryBounds,
        },
      }
    }

    if (assertion.property === 'width' || assertion.property === 'height') {
      const bounds = await resolved.locator.boundingBox()
      if (!bounds) {
        return {
          ...assertion,
          actual: null,
          pass: false,
          reason: 'rendered target has no bounds',
        }
      }
      return completeRenderedAssertion(assertion, bounds[assertion.property])
    }

    const actual = assertion.target.page
      ? await page.evaluate((property) => {
          const element = document.scrollingElement ?? document.documentElement
          return element[property]
        }, assertion.property)
      : await resolved.locator.evaluate(
          (element, property) => element[property],
          assertion.property,
        )
    return completeRenderedAssertion(assertion, actual)
  } catch (error) {
    return {
      ...assertion,
      actual: null,
      pass: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

function completeRenderedAssertion(assertion, actual) {
  if (Object.hasOwn(assertion, 'includes')) {
    return {
      ...assertion,
      actual,
      pass:
        typeof actual === 'string' &&
        actual.includes(String(assertion.includes)),
    }
  }
  if (Object.hasOwn(assertion, 'approx')) {
    return {
      ...assertion,
      actual,
      pass:
        typeof actual === 'number' &&
        Math.abs(actual - assertion.approx) <= assertion.tolerance,
    }
  }
  if (Object.hasOwn(assertion, 'atLeast')) {
    return {
      ...assertion,
      actual,
      pass: typeof actual === 'number' && actual >= assertion.atLeast,
    }
  }
  if (Object.hasOwn(assertion, 'atMost')) {
    return {
      ...assertion,
      actual,
      pass: typeof actual === 'number' && actual <= assertion.atMost,
    }
  }
  return {
    ...assertion,
    actual,
    pass: Object.is(actual, assertion.equals),
  }
}

async function settleBehavior(page) {
  await page.evaluate(async () => {
    await new Promise((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
    )
    await globalThis.__conformanceBehavior?.handle.driver?.settle?.()
  })
}

async function readBehaviorState(page) {
  return page.evaluate(
    () => globalThis.__conformanceBehavior?.handle.driver?.readState() ?? {},
  )
}

function evaluateStateAssertion(state, assertion) {
  const actual = stateAtPath(state, assertion.path)
  if (Object.hasOwn(assertion, 'equals')) {
    return {
      ...assertion,
      actual,
      pass: jsonValuesEqual(actual, assertion.equals),
    }
  }
  if (Object.hasOwn(assertion, 'includes')) {
    return {
      ...assertion,
      actual,
      pass:
        typeof actual === 'string'
          ? actual.includes(String(assertion.includes))
          : Array.isArray(actual) &&
            actual.some((value) => jsonValuesEqual(value, assertion.includes)),
    }
  }
  return {
    ...assertion,
    actual,
    pass:
      typeof actual === 'number' &&
      Math.abs(actual - assertion.approx) <= assertion.tolerance,
  }
}

function stateAtPath(state, path) {
  if (!path) return state
  return path.split('.').reduce((value, key) => value?.[key], state)
}

function jsonValuesEqual(left, right) {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    )
  }
  if (
    left &&
    right &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.hasOwn(right, key) && jsonValuesEqual(left[key], right[key]),
      )
    )
  }
  return false
}

function visualPairPasses(pair, referenceResultKey, minimumGeometrySimilarity) {
  return (
    pair.paintParity &&
    (minimumGeometrySimilarity === undefined ||
      (pair.geometrySimilarity !== undefined &&
        pair.geometrySimilarity >= minimumGeometrySimilarity)) &&
    [pair[referenceResultKey], pair.tanstack].every(
      (inspection) =>
        inspection.guidesContained &&
        inspection.accessibleName &&
        inspection.guideAssertions.every((assertion) => assertion.pass) &&
        Object.values(inspection.geometry).every(
          (geometry) => geometry.present && geometry.withinMaximum,
        ),
    )
  )
}

function createSummaries(
  cases,
  bundles,
  measurements,
  visualChecks,
  behaviorChecks,
  typeProtection,
) {
  const pairedBundleRatios = []
  const pairedSourceLineRatios = []
  const pairedMountRatios = []
  const pairedUpdateRatios = []
  const plotBundleRatios = []
  const plotSourceLineRatios = []
  const plotMountRatios = []
  const plotUpdateRatios = []
  const geometrySimilarities = visualChecks.flatMap((check) =>
    check.variants.flatMap((variant) =>
      [variant.geometrySimilarity, variant.updated?.geometrySimilarity].filter(
        (value) => value !== undefined,
      ),
    ),
  )

  for (const entry of cases) {
    const referenceRenderer = referenceRendererForCase(entry)
    const referenceBundle = bundles.find(
      (row) => row.caseId === entry.id && row.renderer === referenceRenderer,
    )
    const tanstackBundle = bundles.find(
      (row) => row.caseId === entry.id && row.renderer === targetRenderer,
    )
    if (referenceBundle && tanstackBundle) {
      const bundleRatio = tanstackBundle.gzipBytes / referenceBundle.gzipBytes
      const sourceLineRatio =
        tanstackBundle.typeAudit.lines / referenceBundle.typeAudit.lines
      pairedBundleRatios.push(bundleRatio)
      pairedSourceLineRatios.push(sourceLineRatio)
      if (referenceRenderer === 'observable-plot') {
        plotBundleRatios.push(bundleRatio)
        plotSourceLineRatios.push(sourceLineRatio)
      }
    }
    const referenceMeasurement = measurements.find(
      (row) => row.caseId === entry.id && row.renderer === referenceRenderer,
    )
    const tanstackMeasurement = measurements.find(
      (row) => row.caseId === entry.id && row.renderer === targetRenderer,
    )
    if (referenceMeasurement && tanstackMeasurement) {
      const mountRatio =
        tanstackMeasurement.mount.medianMs / referenceMeasurement.mount.medianMs
      const updateRatio =
        tanstackMeasurement.update.medianMs /
        referenceMeasurement.update.medianMs
      pairedMountRatios.push(mountRatio)
      pairedUpdateRatios.push(updateRatio)
      if (referenceRenderer === 'observable-plot') {
        plotMountRatios.push(mountRatio)
        plotUpdateRatios.push(updateRatio)
      }
    }
  }

  const geometricMeanChartsToReferenceGzip = geometricMean(pairedBundleRatios)
  const geometricMeanChartsToReferenceSourceLines = geometricMean(
    pairedSourceLineRatios,
  )
  const geometricMeanChartsToReferenceMount = geometricMean(pairedMountRatios)
  const geometricMeanChartsToReferenceUpdate = geometricMean(pairedUpdateRatios)

  return {
    caseCount: cases.length,
    references: Object.fromEntries(
      referenceRenderers.map((renderer) => [
        renderer,
        cases.filter((entry) => referenceRendererForCase(entry) === renderer)
          .length,
      ]),
    ),
    support: Object.fromEntries(
      ['native', 'composed', 'gap', 'deferred'].map((status) => [
        status,
        cases.filter((entry) => entry.support === status).length,
      ]),
    ),
    pairedCases: pairedBundleRatios.length,
    geometricMeanChartsToReferenceGzip,
    geometricMeanChartsToReferenceSourceLines,
    geometricMeanChartsToReferenceMount,
    geometricMeanChartsToReferenceUpdate,
    // Preserve the original Plot-only result fields for existing consumers.
    geometricMeanChartsToPlotGzip: geometricMean(plotBundleRatios),
    geometricMeanChartsToPlotSourceLines: geometricMean(plotSourceLineRatios),
    geometricMeanChartsToPlotMount: geometricMean(plotMountRatios),
    geometricMeanChartsToPlotUpdate: geometricMean(plotUpdateRatios),
    meanGeometrySimilarity: arithmeticMean(geometrySimilarities),
    visualPasses: visualChecks.filter((check) => check.status === 'pass')
      .length,
    visualFailures: visualChecks.filter((check) => check.status === 'fail')
      .length,
    visualGaps: visualChecks.filter((check) => check.status === 'gap').length,
    behaviorPasses: behaviorChecks.filter((check) => check.status === 'pass')
      .length,
    behaviorFailures: behaviorChecks.filter((check) => check.status === 'fail')
      .length,
    behaviorGaps: behaviorChecks.filter((check) => check.status === 'gap')
      .length,
    unsafeTypeEscapes: bundles.reduce(
      (total, bundle) =>
        total +
        bundle.typeAudit.unsafeAssertions +
        bundle.typeAudit.suppressions,
      0,
    ),
    typeDiagnostics: bundles.reduce(
      (total, bundle) => total + bundle.typeAudit.diagnostics.length,
      0,
    ),
    typeProtection: typeProtection.renderers,
  }
}

function renderMarkdown(result) {
  const referenceSummary = referenceRenderers
    .filter((renderer) => result.summaries.references[renderer] > 0)
    .map(
      (renderer) =>
        `${result.summaries.references[renderer]} ${rendererLabel(renderer)}`,
    )
    .join(', ')
  const lines = [
    '# Chart catalog conformance',
    '',
    `Generated ${result.createdAt} with Observable Plot ${result.versions.observablePlot}, Recharts ${result.versions.recharts}, ECharts ${result.versions.echarts}, and TanStack Charts ${result.versions.tanstackCharts}.`,
    '',
    `${result.summaries.caseCount} scoped cases: ${result.summaries.support.native} native, ${result.summaries.support.composed} composed, ${formatCount(result.summaries.support.gap, 'gap')}, and ${result.summaries.support.deferred} deferred.`,
    `References: ${referenceSummary}.`,
    '',
  ]

  if (result.bundles.length) {
    lines.push(
      `Across ${result.summaries.pairedCases} paired cases, TanStack's geometric-mean gzip ratio to the selected reference is ${formatRatio(result.summaries.geometricMeanChartsToReferenceGzip)}.`,
      '',
      `TanStack's geometric-mean authored source-line ratio to the selected reference is ${formatRatio(result.summaries.geometricMeanChartsToReferenceSourceLines)}. This measures implementation surface, not agent success.`,
      '',
    )
  }
  if (result.measurements.length) {
    lines.push(
      `The paired median mount ratio is ${formatRatio(result.summaries.geometricMeanChartsToReferenceMount)} and the update ratio is ${formatRatio(result.summaries.geometricMeanChartsToReferenceUpdate)}. Ratios below 1 favor TanStack.`,
      '',
    )
  }
  if (result.visualChecks.length) {
    lines.push(
      `Mean frame-relative geometry similarity is ${formatSimilarity(result.summaries.meanGeometrySimilarity)}; this is diagnostic and not a pixel-parity claim.`,
      '',
    )
  }
  if (result.behaviorChecks.length) {
    lines.push(
      `${result.summaries.behaviorPasses}/${result.behaviorChecks.length} interaction cases passed every semantic scenario across both renderers, revisions, sizes, and themes.`,
      '',
    )
  }
  lines.push(
    `Strict case sources produced ${result.summaries.typeDiagnostics} diagnostics and ${result.summaries.unsafeTypeEscapes} unsafe assertions or suppressions.`,
    '',
    `The invalid-program probes were rejected by Observable Plot in ${result.summaries.typeProtection['observable-plot'].rejected}/${result.summaries.typeProtection['observable-plot'].probes} cases, by Recharts in ${result.summaries.typeProtection.recharts.rejected}/${result.summaries.typeProtection.recharts.probes} cases, and by TanStack Charts in ${result.summaries.typeProtection.tanstack.rejected}/${result.summaries.typeProtection.tanstack.probes} cases.`,
    '',
    '## Case matrix',
    '',
    '| Case | Reference | Support | Reference source | Charts source | Source ratio | Reference gzip | Charts gzip | Ratio | Reference mount | Charts mount | Reference update | Charts update | Geometry | Visual | Behavior | Types |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
  )

  for (const entry of result.cases) {
    const referenceRenderer = referenceRendererForCase(entry)
    const referenceBundle = findBundle(result, entry.id, referenceRenderer)
    const tanstackBundle = findBundle(result, entry.id, 'tanstack')
    const referenceMeasurement = findMeasurement(
      result,
      entry.id,
      referenceRenderer,
    )
    const tanstackMeasurement = findMeasurement(result, entry.id, 'tanstack')
    const visual = result.visualChecks.find(
      (check) => check.caseId === entry.id,
    )
    const behavior = result.behaviorChecks.find(
      (check) => check.caseId === entry.id,
    )
    const diagnosticCount =
      (referenceBundle?.typeAudit.diagnostics.length ?? 0) +
      (tanstackBundle?.typeAudit.diagnostics.length ?? 0)
    const unsafeCount =
      (referenceBundle?.typeAudit.unsafeAssertions ?? 0) +
      (tanstackBundle?.typeAudit.unsafeAssertions ?? 0) +
      (referenceBundle?.typeAudit.suppressions ?? 0) +
      (tanstackBundle?.typeAudit.suppressions ?? 0)
    const geometrySimilarity = arithmeticMean(
      visual?.variants.flatMap((variant) =>
        [
          variant.geometrySimilarity,
          variant.updated?.geometrySimilarity,
        ].filter((value) => value !== undefined),
      ) ?? [],
    )
    lines.push(
      `| [${entry.title}](${entry.source.url}) | ${rendererLabel(referenceRenderer)} | ${entry.support} | ${referenceBundle?.typeAudit.lines ?? '—'} lines | ${tanstackBundle?.typeAudit.lines ?? '—'} lines | ${referenceBundle && tanstackBundle ? formatRatio(tanstackBundle.typeAudit.lines / referenceBundle.typeAudit.lines) : '—'} | ${formatBytes(referenceBundle?.gzipBytes)} | ${formatBytes(tanstackBundle?.gzipBytes)} | ${referenceBundle && tanstackBundle ? formatRatio(tanstackBundle.gzipBytes / referenceBundle.gzipBytes) : '—'} | ${formatDuration(referenceMeasurement?.mount.medianMs)} | ${formatDuration(tanstackMeasurement?.mount.medianMs)} | ${formatDuration(referenceMeasurement?.update.medianMs)} | ${formatDuration(tanstackMeasurement?.update.medianMs)} | ${formatSimilarity(geometrySimilarity)} | ${visual?.status ?? 'not run'} | ${behavior?.status ?? 'not applicable'} | ${diagnosticCount || unsafeCount ? `${diagnosticCount} diag / ${unsafeCount} escape` : 'clean'} |`,
    )
  }

  const failedVisuals = result.visualChecks.filter(
    (check) => check.status === 'fail',
  )
  if (failedVisuals.length) {
    lines.push('', '## Open conformance failures', '')
    for (const check of failedVisuals) {
      const title =
        result.cases.find((entry) => entry.id === check.caseId)?.title ??
        check.caseId
      lines.push(`- **${title}:** ${visualFailureReasons(check).join('; ')}.`)
    }
  }

  const failedBehaviors = result.behaviorChecks.filter(
    (check) => check.status === 'fail',
  )
  if (failedBehaviors.length) {
    lines.push('', '## Open interaction failures', '')
    for (const check of failedBehaviors) {
      const title =
        result.cases.find((entry) => entry.id === check.caseId)?.title ??
        check.caseId
      lines.push(`- **${title}:** ${behaviorFailureReasons(check).join('; ')}.`)
    }
  }

  lines.push(
    '',
    '## Type protection',
    '',
    '| Invalid program | Observable Plot | Recharts | TanStack Charts |',
    '| --- | --- | --- | --- |',
  )
  for (const probe of result.typeProtection.probes) {
    const plot = result.typeProtection.results.find(
      (entry) => entry.id === probe.id && entry.renderer === 'observable-plot',
    )
    const recharts = result.typeProtection.results.find(
      (entry) => entry.id === probe.id && entry.renderer === 'recharts',
    )
    const tanstack = result.typeProtection.results.find(
      (entry) => entry.id === probe.id && entry.renderer === 'tanstack',
    )
    lines.push(
      `| ${probe.title} | ${typeProtectionVerdict(plot)} | ${typeProtectionVerdict(recharts)} | ${typeProtectionVerdict(tanstack)} |`,
    )
  }

  lines.push(
    '',
    '## Protocol',
    '',
    `- Same typed raw rows and intent are used by both renderers.`,
    `- Paired implementations use the same explicit semantic scale domains; responsive pixel ranges remain renderer-owned.`,
    `- A reference may use its built-in transforms; Charts uses the equivalent TanStack data transform or granular D3 primitive.`,
    `- Bundles are isolated per case and renderer. The gallery bundle is never measured.`,
    `- Timings exclude module loading and animations and include forced layout.`,
    `- Static visual inspection waits for an implementation's optional settle hook; temporal assertions run in interaction scenarios.`,
    `- Reference updates follow that library's native lifecycle; Charts updates reconcile the existing SVG.`,
    `- Initial and revised data are checked at ${result.protocol.variants.map((variant) => `${variant.width}px ${variant.theme}`).join(', ')}.`,
    `- Bounding-box similarity is diagnostic unless a case declares a minimum floor. Required geometry count ranges, corresponding data-mark paints, guide assertions, containment, accessible naming, and side-by-side screenshots are the review gates.`,
    `- Interaction scenarios use fresh mounts with native mouse, keyboard, CDP touch, drag, pixel-wheel, bounded waits, and in-place revision input; pointer cancellation and line/page wheel modes use explicit DOM events. Driver assertions cover semantic state; root-scoped rendered assertions cover visible text, attributes, focus, scroll, and bounds. Named checkpoints may retain screenshots, and uncaught page errors fail the active step.`,
    `- Type protection compiles known-invalid paired programs without suppressions. A valid baseline for each renderer must compile first.`,
    '',
    '## AI authoring',
    '',
    'Every case carries a create task and a maintenance task. The executable agent cohort is intentionally separate from runtime results: agents must receive pinned docs, fresh consumers, identical data, and hidden type/runtime/geometry checks. See `benchmarks/conformance/AI-EVALUATION.md`.',
    '',
  )

  return `${lines.join('\n')}\n`
}

async function launchBrowser() {
  const launchOptions = {
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--force-device-scale-factor=1',
      '--js-flags=--expose-gc',
    ],
  }
  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    throw new Error(
      'Playwright Chromium failed to launch. Install the matching headless browser with "pnpm browser:install".',
      { cause: error },
    )
  }
}

async function startServer(directory) {
  const absoluteDirectory = resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/' || url.pathname === '/index.html') {
        response.setHeader('content-type', 'text/html; charset=utf-8')
        response.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body { margin: 0; font: 12px system-ui, sans-serif; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body></body>
</html>`)
        return
      }
      const path = resolve(absoluteDirectory, `.${url.pathname}`)
      if (!path.startsWith(`${absoluteDirectory}${sep}`)) {
        response.statusCode = 403
        response.end('Forbidden')
        return
      }
      const file = await readFile(path)
      response.setHeader(
        'content-type',
        extname(path) === '.js'
          ? 'text/javascript; charset=utf-8'
          : 'application/octet-stream',
      )
      response.end(file)
    } catch {
      response.statusCode = 404
      response.end('Not found')
    }
  })
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Conformance server did not receive a TCP port.')
  }
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()))
      }),
  }
}

async function packageVersion(packageName) {
  const packagePath = resolve(
    root,
    'node_modules',
    ...packageName.split('/'),
    'package.json',
  )
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
  return packageJson.version
}

function referenceRendererForCase(entry) {
  return entry.referenceRenderer ?? 'observable-plot'
}

function pairedRenderers(entry) {
  return [referenceRendererForCase(entry), targetRenderer]
}

function rendererFileName(renderer) {
  return rendererRegistry[renderer]?.fileName ?? `${renderer}.ts`
}

function rendererResultKey(renderer) {
  return rendererRegistry[renderer]?.resultKey ?? renderer
}

function rendererLabel(renderer) {
  return rendererRegistry[renderer]?.label ?? renderer
}

function packageModules(inputPaths, pattern) {
  const names = new Set()
  for (const path of inputPaths) {
    const match = path.match(
      /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(@?[^/]+(?:\/[^/]+)?)/,
    )
    if (match?.[1] && pattern.test(match[1])) names.add(match[1])
  }
  return [...names].sort()
}

function missingTypeAudit() {
  return {
    diagnostics: [],
    lines: 0,
    sourceBytes: 0,
    unsafeAssertions: 0,
    suppressions: 0,
    nonConstAssertions: 0,
    umbrellaD3Imports: 0,
  }
}

function findBundle(result, caseId, renderer) {
  return result.bundles.find(
    (bundle) => bundle.caseId === caseId && bundle.renderer === renderer,
  )
}

function findMeasurement(result, caseId, renderer) {
  return result.measurements.find(
    (measurement) =>
      measurement.caseId === caseId && measurement.renderer === renderer,
  )
}

function geometricMean(values) {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0)
  if (!usable.length) return undefined
  return Math.exp(
    usable.reduce((total, value) => total + Math.log(value), 0) / usable.length,
  )
}

function arithmeticMean(values) {
  const usable = values.filter((value) => Number.isFinite(value))
  if (!usable.length) return undefined
  return usable.reduce((total, value) => total + value, 0) / usable.length
}

function visualFailureReasons(check) {
  const reasons = new Set()
  for (const variant of check.variants) {
    const referenceRenderer = variant.referenceRenderer ?? 'observable-plot'
    const referenceResultKey = rendererResultKey(referenceRenderer)
    for (const [phase, pair] of [
      ['initial', variant],
      ['updated', variant.updated],
    ]) {
      if (!pair.paintParity) {
        reasons.add(
          `${rendererLabel(referenceRenderer)} and Charts data-mark paints differ after ${phase} render`,
        )
      }
      if (
        check.minimumGeometrySimilarity !== undefined &&
        (pair.geometrySimilarity === undefined ||
          pair.geometrySimilarity < check.minimumGeometrySimilarity)
      ) {
        reasons.add(
          `geometry similarity after ${phase} render is ${formatSimilarity(pair.geometrySimilarity)}; expected at least ${formatSimilarity(check.minimumGeometrySimilarity)}`,
        )
      }
      for (const [renderer, label] of [
        [referenceResultKey, rendererLabel(referenceRenderer)],
        ['tanstack', 'Charts'],
      ]) {
        const inspection = pair[renderer]
        if (!inspection.accessibleName) {
          reasons.add(
            inspection.duplicateAccessibleRoots?.length
              ? `${label} has duplicate nested accessible chart roots after ${phase} render (${inspection.duplicateAccessibleRoots.join(', ')})`
              : `${label} has no accessible name after ${phase} render`,
          )
        }
        if (!inspection.guidesContained) {
          const overflowingLabels = inspection.guideOverflows
            .map((overflow) => overflow.text)
            .filter(Boolean)
            .join(', ')
          const clippedLabels = inspection.guideClippings
            .map((clipping) => clipping.text)
            .filter(Boolean)
            .join(', ')
          if (overflowingLabels) {
            reasons.add(
              `${label} labels exceed the container (${overflowingLabels})`,
            )
          }
          if (clippedLabels) {
            reasons.add(
              `${label} labels are clipped by an ancestor (${clippedLabels})`,
            )
          }
          if (!overflowingLabels && !clippedLabels) {
            reasons.add(`${label} guide containment could not be verified`)
          }
        }
        for (const [role, geometry] of Object.entries(inspection.geometry)) {
          if (!geometry.present) {
            reasons.add(
              `${label} ${role} count is ${geometry.actual}; expected at least ${geometry.expected}`,
            )
          }
          if (!geometry.withinMaximum) {
            reasons.add(
              `${label} ${role} count is ${geometry.actual}; expected at most ${geometry.maximum}`,
            )
          }
        }
        for (const assertion of inspection.guideAssertions) {
          if (!assertion.pass) {
            reasons.add(`${label} guide assertion "${assertion.id}" failed`)
          }
        }
      }
    }
  }
  return reasons.size ? [...reasons] : ['an unspecified visual gate failed']
}

function behaviorFailureReasons(check) {
  const reasons = new Set()
  for (const variant of check.variants) {
    const referenceRenderer = variant.referenceRenderer ?? 'observable-plot'
    const referenceResultKey = rendererResultKey(referenceRenderer)
    for (const [resultKey, label] of [
      [referenceResultKey, rendererLabel(referenceRenderer)],
      ['tanstack', 'TanStack Charts'],
    ]) {
      for (const scenario of variant[resultKey]?.scenarios ?? []) {
        if (scenario.pass) continue
        const failedStep = scenario.trace?.find((step) => !step.pass)
        const failedAssertions = failedStep?.assertions
          ?.filter((assertion) => !assertion.pass)
          .map((assertion) => {
            const subject =
              assertion.path ??
              `${renderedTargetLabel(assertion.target)}.${assertion.property}`
            return `${subject} was ${JSON.stringify(assertion.actual)}${assertion.reason ? `: ${assertion.reason}` : ''}`
          })
          .join(', ')
        reasons.add(
          `${label} scenario "${scenario.id}" failed at ${variant.width}px ${variant.theme} revision ${variant.revision}${scenario.reason ? ` (${scenario.reason})` : failedAssertions ? ` (${failedAssertions})` : ''}`,
        )
      }
    }
  }
  return reasons.size
    ? [...reasons]
    : ['an unspecified interaction gate failed']
}

function renderedTargetLabel(target) {
  if (!target) return 'rendered target'
  if (target.root) return 'root'
  if (target.page) return 'page'
  if (target.selector) {
    return `${target.selector}${target.index === undefined ? '' : `[${target.index}]`}`
  }
  return `role=${target.role}${target.name === undefined ? '' : ` name=${JSON.stringify(target.name)}`}${target.index === undefined ? '' : `[${target.index}]`}`
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length
}

function optionValue(name) {
  const prefix = `${name}=`
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
}

function csvOption(name) {
  const value = optionValue(name)
  return value
    ? new Set(
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      )
    : undefined
}

function formatBytes(value) {
  if (value === undefined) return '—'
  return value < 1_024 ? `${value} B` : `${(value / 1_024).toFixed(2)} kB`
}

function formatCount(value, noun) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

function formatDuration(value) {
  return value === undefined ? '—' : `${value.toFixed(2)} ms`
}

function formatRatio(value) {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(2)}×`
}

function formatSimilarity(value) {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : `${(value * 100).toFixed(1)}%`
}

function typeProtectionVerdict(result) {
  if (!result) return '—'
  return result.rejected
    ? `rejected (${result.diagnostics.map((diagnostic) => `TS${diagnostic.code}`).join(', ')})`
    : 'accepted'
}
