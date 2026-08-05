import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import {
  launchBenchmarkBrowser,
  startBenchmarkServer,
} from './benchmark/browser.mjs'
import { bundleBaselineShapeFailures } from './benchmark/bundle-baseline.mjs'
import { chartLibraries } from './benchmark/chart-libraries.mjs'
import {
  comparisonCapabilityCoverage,
  comparisonChartTypes,
  comparisonTiers,
  formatComparisonImplementationDetail,
} from './benchmark/comparison-capabilities.mjs'
import {
  comparisonInstalledVersionFailure,
  tanstackComparisonRevision,
  tanstackComparisonSourceFailure,
} from './comparison-source-revision.mjs'
import { runWithConcurrency } from './run-with-concurrency.mjs'

const root = resolve(import.meta.dirname, '..')
const comparisonDirectory = resolve(root, 'benchmarks/comparison')
const outputDirectory = resolve(root, '.benchmark-output')
const caseOutputDirectory = resolve(outputDirectory, 'cases')
const resultDirectory = resolve(outputDirectory, 'results')
const baselinePath = resolve(comparisonDirectory, 'bundle-baseline.json')
const baselineCandidatePath = resolve(
  resultDirectory,
  'bundle-baseline.candidate.json',
)

const chartTypes = comparisonChartTypes
const tiers = comparisonTiers
const tierDescriptions = {
  basic: 'One series, axes, and grid.',
  interactive: 'Basic chart plus a legend and pointer-driven tooltip.',
  advanced:
    'Interactive chart plus two series and chart-specific composition: smoothing, stacking, or variable point size.',
}
const libraries = chartLibraries
const capabilityCoverage = comparisonCapabilityCoverage

const profiles = {
  quick: {
    warmup: 2,
    samples: 5,
    pointCounts: {
      line: [250],
      bar: [100],
      area: [250],
      scatter: [250],
    },
  },
  standard: {
    warmup: 5,
    samples: 20,
    pointCounts: {
      line: [100, 1_000],
      bar: [50, 250],
      area: [100, 1_000],
      scatter: [100, 1_000],
    },
  },
  ci: {
    warmup: 3,
    samples: 10,
    pointCounts: {
      line: [100, 1_000],
      bar: [50, 250],
      area: [100, 1_000],
      scatter: [100, 1_000],
    },
  },
  full: {
    warmup: 5,
    samples: 20,
    pointCounts: {
      line: [100, 1_000, 10_000],
      bar: [50, 250, 1_000],
      area: [100, 1_000, 10_000],
      scatter: [100, 1_000, 10_000],
    },
  },
}

const args = new Set(process.argv.slice(2))
const profileName = optionValue('--profile') ?? 'standard'
const profile = profiles[profileName]
if (!profile) {
  throw new Error(
    `Unknown profile "${profileName}". Use ${Object.keys(profiles).join(', ')}.`,
  )
}

const sizeOnly =
  args.has('--size-only') ||
  args.has('--check') ||
  args.has('--update-baseline')
const perfOnly = args.has('--perf-only')
if (sizeOnly && perfOnly) {
  throw new Error('Choose either size-only or perf-only, not both.')
}
if (args.has('--check') && args.has('--update-baseline')) {
  throw new Error('Choose either --check or --update-baseline, not both.')
}
if (args.has('--check') && args.has('--check-bundle-baseline')) {
  throw new Error('Choose either --check or --check-bundle-baseline, not both.')
}

const libraryFilter = csvOption('--library')
const chartFilter = csvOption('--chart')
const tierFilter = csvOption('--tier')
if (
  args.has('--update-baseline') &&
  (libraryFilter || chartFilter || tierFilter)
) {
  throw new Error('Update the bundle baseline only with the complete matrix.')
}
const selectedLibraries = libraries.filter(
  (library) => !libraryFilter || libraryFilter.has(library.id),
)
const selectedChartTypes = chartTypes.filter(
  (chartType) => !chartFilter || chartFilter.has(chartType),
)
const selectedTiers = tiers.filter(
  (tier) => !tierFilter || tierFilter.has(tier),
)
if (!selectedLibraries.length) {
  throw new Error('The library filter did not match any configured library.')
}
if (!selectedChartTypes.length) {
  throw new Error('The chart filter did not match line, bar, area, or scatter.')
}
if (!selectedTiers.length) {
  throw new Error(
    'The tier filter did not match basic, interactive, or advanced.',
  )
}
if (
  args.has('--check-bundle-provenance') &&
  !args.has('--check-bundle-baseline')
) {
  throw new Error('--check-bundle-provenance requires --check-bundle-baseline.')
}

await mkdir(caseOutputDirectory, { recursive: true })
await mkdir(resultDirectory, { recursive: true })

const cases = selectedLibraries.flatMap((library) =>
  selectedChartTypes.flatMap((chartType) =>
    selectedTiers.map((tier) => ({
      id: `${library.id}-${chartType}-${tier}`,
      chartType,
      tier,
      library,
      exportName: `mount${capitalize(chartType)}`,
    })),
  ),
)
const bundles = await buildCases(cases)

let browser
let performanceResults = []
let browserVersion
if (!sizeOnly) {
  browser = await launchBenchmarkBrowser()
  browserVersion = browser.version()
  const server = await startBenchmarkServer(outputDirectory)
  try {
    for (const benchmarkCase of cases) {
      const results = await runBrowserBenchmarks(
        browser,
        server.url,
        benchmarkCase,
        profile,
      )
      performanceResults.push(...results)
      process.stdout.write('.')
    }
    process.stdout.write('\n')
  } finally {
    await browser.close()
    await server.close()
  }
}

const versions = Object.fromEntries(
  await Promise.all(
    selectedLibraries.map(async (library) => [
      library.id,
      await packageVersion(library.packageName),
    ]),
  ),
)
const reportedBundles = perfOnly ? [] : bundles
const result = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  revision: revision(),
  profile: profileName,
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
    browser: browserVersion,
  },
  versions,
  capabilityTiers: Object.fromEntries(
    selectedTiers.map((tier) => [tier, tierDescriptions[tier]]),
  ),
  capabilityCoverage: capabilityCoverage.map(
    ({ capability, measured, implementations }) => ({
      capability,
      measured,
      implementations: Object.fromEntries(
        selectedLibraries.map((library) => [
          library.id,
          formatComparisonImplementationDetail(implementations[library.id]),
        ]),
      ),
    }),
  ),
  protocol: {
    width: 800,
    height: 400,
    warmup: profile.warmup,
    samples: profile.samples,
    animation: false,
    devicePixelRatio: 1,
    mountTiming:
      'Synchronous library mount plus forced layout; module loading and paint are excluded.',
    updateTiming:
      'Synchronous same-shape data update plus forced layout; setup is excluded.',
    interactionTiming:
      'Tooltip and legend implementations are bundled and mounted but pointer latency is not timed.',
    excludedTiming:
      'Selection, animation frame completion, and responsive resize require separate event-driven protocols.',
  },
  bundles: reportedBundles,
  performance: performanceResults,
  summaries: createSummaries(reportedBundles, performanceResults),
}
result.narrativeSummary = createNarrativeSummary(result)

const markdown = renderMarkdown(result)
const maintainsBaseline = args.has('--check') || args.has('--update-baseline')
if (!maintainsBaseline) {
  await writeFile(
    resolve(resultDirectory, 'comparison.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  await writeFile(resolve(resultDirectory, 'comparison.md'), markdown)
  console.log(markdown)
}

if (args.has('--update-baseline')) {
  await writeBundleBaseline(
    bundles,
    baselinePath,
    versions,
    selectedChartTypes,
    selectedTiers,
  )
  console.log(
    `Updated ${baselinePath.slice(root.length + 1)} with ${bundles.length} cases.`,
  )
}

if (args.has('--check')) {
  await writeBundleBaseline(
    bundles,
    baselineCandidatePath,
    versions,
    selectedChartTypes,
    selectedTiers,
  )
}

if (args.has('--check') || args.has('--check-bundle-baseline')) {
  const failures = await checkBundleBaseline(bundles, versions, {
    requireCompleteMatrix: args.has('--check'),
    checkSourceProvenance:
      args.has('--check') || args.has('--check-bundle-provenance'),
    selectedLibraries,
    selectedChartTypes,
    selectedTiers,
  })
  if (failures.length) {
    console.error(`Bundle comparison failed:\n${failures.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('Bundle comparison passed.')
  }
}

async function buildCases(benchmarkCases) {
  const results = new Array(benchmarkCases.length)
  await runWithConcurrency(benchmarkCases, 4, async (benchmarkCase, index) => {
    results[index] = await buildCase(benchmarkCase)
  })

  return results
}

async function buildCase(benchmarkCase) {
  const outfile = resolve(caseOutputDirectory, `${benchmarkCase.id}.js`)
  const buildResult = await bundleCase(benchmarkCase, outfile)
  const contents = await readFile(outfile)
  const sharedExternals = benchmarkCase.library.sharedExternals ?? []
  let incrementalContents = contents

  if (sharedExternals.length) {
    const incrementalOutfile = resolve(
      caseOutputDirectory,
      `${benchmarkCase.id}-incremental.js`,
    )
    await bundleCase(benchmarkCase, incrementalOutfile, sharedExternals)
    incrementalContents = await readFile(incrementalOutfile)
  }

  return {
    id: benchmarkCase.id,
    library: benchmarkCase.library.id,
    libraryLabel: benchmarkCase.library.label,
    chartType: benchmarkCase.chartType,
    tier: benchmarkCase.tier,
    minifiedBytes: contents.byteLength,
    gzipBytes: gzipSync(contents).byteLength,
    brotliBytes: brotliCompressSync(contents).byteLength,
    incrementalBytes: incrementalContents.byteLength,
    incrementalGzipBytes: gzipSync(incrementalContents).byteLength,
    incrementalBrotliBytes: brotliCompressSync(incrementalContents).byteLength,
    bundledModuleCount: Object.values(buildResult.metafile.outputs).reduce(
      (total, output) =>
        total +
        Object.values(output.inputs).filter((input) => input.bytesInOutput > 0)
          .length,
      0,
    ),
    stressSupportBytes: Object.values(buildResult.metafile.outputs).reduce(
      (total, output) =>
        total +
        Object.entries(output.inputs)
          .filter(
            ([input]) =>
              input.includes('/comparison/stress/') ||
              input.includes('\\comparison\\stress\\'),
          )
          .reduce(
            (outputTotal, [, input]) => outputTotal + input.bytesInOutput,
            0,
          ),
      0,
    ),
  }
}

async function bundleCase(benchmarkCase, outfile, external = []) {
  return build({
    stdin: {
      contents: `export { ${benchmarkCase.exportName} as mount } from '${benchmarkCase.library.sources?.[benchmarkCase.chartType] ?? benchmarkCase.library.source}'`,
      resolveDir: comparisonDirectory,
      sourcefile: `${benchmarkCase.id}.ts`,
      loader: 'ts',
    },
    outfile,
    bundle: true,
    minify: true,
    treeShaking: true,
    metafile: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    define: {
      BENCHMARK_INTERACTIVE: String(benchmarkCase.tier !== 'basic'),
      BENCHMARK_ADVANCED: String(benchmarkCase.tier === 'advanced'),
      BENCHMARK_STRESS: 'false',
      BENCHMARK_VARIABLE_SIZE: 'false',
      BENCHMARK_MULTI_SERIES: 'false',
      BENCHMARK_GROUPED_X_FOCUS: 'false',
      BENCHMARK_ROLLING_WINDOW: 'false',
    },
    legalComments: 'none',
    logLevel: 'silent',
    external,
  })
}

async function runBrowserBenchmarks(
  browserInstance,
  serverUrl,
  benchmarkCase,
  benchmarkProfile,
) {
  const page = await browserInstance.newPage({
    viewport: { width: 1_100, height: 600 },
    deviceScaleFactor: 1,
  })

  try {
    await page.goto(serverUrl, { waitUntil: 'load' })
    return await page.evaluate(
      async ({
        moduleUrl,
        library,
        libraryLabel,
        chartType,
        tier,
        pointCounts,
        warmup,
        samples,
      }) => {
        const { mount } = await import(moduleUrl)
        const results = []
        await document.fonts?.ready

        for (const pointCount of pointCounts) {
          globalThis.gc?.()
          const inputA = createInput(pointCount, 0)
          const inputB = createInput(pointCount, 1)
          const mountSamples = []
          let output

          for (let index = 0; index < warmup + samples; index++) {
            const container = createContainer()
            const startedAt = performance.now()
            const handle = mount(container, inputA)
            forceLayout(container)
            const duration = performance.now() - startedAt
            if (index === warmup) output = outputMetrics(container)
            if (index >= warmup) mountSamples.push(duration)
            handle.destroy()
            container.remove()
          }

          const updateContainer = createContainer()
          const handle = mount(updateContainer, inputA)
          const updateSamples = []
          for (let index = 0; index < warmup + samples; index++) {
            const nextInput = index % 2 === 0 ? inputB : inputA
            const startedAt = performance.now()
            handle.update(nextInput)
            forceLayout(updateContainer)
            const duration = performance.now() - startedAt
            if (index >= warmup) updateSamples.push(duration)
          }
          handle.destroy()
          updateContainer.remove()

          results.push({
            library,
            libraryLabel,
            chartType,
            tier,
            pointsPerSeries: pointCount,
            totalPoints: tier === 'advanced' ? pointCount * 2 : pointCount,
            mount: summarize(mountSamples),
            update: summarize(updateSamples),
            output,
          })
        }

        return results

        function createInput(pointCount, phase) {
          const makeRows = (seriesIndex) => {
            let state =
              0x9e3779b9 ^ (pointCount * 31 + phase * 101 + seriesIndex * 1_009)
            return Array.from({ length: pointCount }, (_, index) => {
              state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
              state = Math.imul(state ^ (state >>> 15), 0x735a2d97)
              state ^= state >>> 15
              const jitter = ((state >>> 0) / 4_294_967_295 - 0.5) * 6
              const y =
                42 +
                Math.sin((index + phase * 3 + seriesIndex * 7) / 17) * 18 +
                Math.cos((index + phase * 5 + seriesIndex * 11) / 37) * 9 +
                jitter
              return {
                id: seriesIndex * pointCount + index,
                x: index,
                category: `C${index}`,
                y: Math.max(4, Math.min(76, y)),
                series: seriesIndex === 0 ? 'Series A' : 'Series B',
                size: 2 + ((index + seriesIndex * 3) % 5),
              }
            })
          }
          return {
            rows: makeRows(0),
            secondaryRows: makeRows(1),
            width: 800,
            height: 400,
          }
        }

        function createContainer() {
          const container = document.createElement('div')
          container.style.width = '800px'
          container.style.height = '400px'
          document.body.append(container)
          return container
        }

        function forceLayout(container) {
          const bounds = container.getBoundingClientRect()
          const svg = container.querySelector('svg')
          const canvas = container.querySelector('canvas')
          return (
            bounds.width +
            bounds.height +
            (svg?.getBoundingClientRect().width ?? 0) +
            (canvas?.getBoundingClientRect().width ?? 0)
          )
        }

        function outputMetrics(container) {
          const encoder = new TextEncoder()
          const svgs = [...container.querySelectorAll('svg')]
          const canvases = [...container.querySelectorAll('canvas')]
          return {
            elements: container.querySelectorAll('*').length,
            paths: container.querySelectorAll('path').length,
            rectangles: container.querySelectorAll('rect').length,
            circles: container.querySelectorAll('circle').length,
            canvases: canvases.length,
            svgBytes: svgs.reduce(
              (total, svg) => total + encoder.encode(svg.outerHTML).byteLength,
              0,
            ),
            canvasPixels: canvases.reduce(
              (total, canvas) => total + canvas.width * canvas.height,
              0,
            ),
          }
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
        moduleUrl: `${serverUrl}cases/${benchmarkCase.id}.js`,
        library: benchmarkCase.library.id,
        libraryLabel: benchmarkCase.library.label,
        chartType: benchmarkCase.chartType,
        tier: benchmarkCase.tier,
        pointCounts: benchmarkProfile.pointCounts[benchmarkCase.chartType],
        warmup: benchmarkProfile.warmup,
        samples: benchmarkProfile.samples,
      },
    )
  } finally {
    await page.close()
  }
}

function createSummaries(bundles, measurements) {
  return {
    bundle: summarizeBundleFacet(bundles),
    mount: summarizeTimingFacet(measurements, 'mount'),
    update: summarizeTimingFacet(measurements, 'update'),
    output: summarizeOutputFacet(measurements),
  }
}

function summarizeBundleFacet(bundles) {
  const tanstack = new Map(
    bundles
      .filter((bundle) => bundle.library === 'tanstack')
      .map((bundle) => [`${bundle.tier}:${bundle.chartType}`, bundle]),
  )

  return groupedRows(bundles).map(({ tier, library, libraryLabel, rows }) => {
    const matching = rows
      .map((row) => ({
        row,
        baseline: tanstack.get(`${row.tier}:${row.chartType}`),
      }))
      .filter((entry) => entry.baseline)

    return {
      tier,
      library,
      libraryLabel,
      chartCount: rows.length,
      geometricMeanGzipBytes: geometricMean(rows.map((row) => row.gzipBytes)),
      geometricMeanIncrementalGzipBytes: geometricMean(
        rows.map((row) => row.incrementalGzipBytes),
      ),
      relativeGzipToTanStack:
        matching.length === rows.length
          ? geometricMean(
              matching.map(
                ({ row, baseline }) => row.gzipBytes / baseline.gzipBytes,
              ),
            )
          : undefined,
      relativeIncrementalGzipToTanStack:
        matching.length === rows.length
          ? geometricMean(
              matching.map(
                ({ row, baseline }) =>
                  row.incrementalGzipBytes / baseline.incrementalGzipBytes,
              ),
            )
          : undefined,
    }
  })
}

function summarizeTimingFacet(measurements, facet) {
  const tanstack = new Map(
    measurements
      .filter((measurement) => measurement.library === 'tanstack')
      .map((measurement) => [
        `${measurement.tier}:${measurement.chartType}:${measurement.pointsPerSeries}`,
        measurement,
      ]),
  )

  return groupedRows(measurements).map(
    ({ tier, library, libraryLabel, rows }) => {
      const matching = rows
        .map((row) => ({
          row,
          baseline: tanstack.get(
            `${row.tier}:${row.chartType}:${row.pointsPerSeries}`,
          ),
        }))
        .filter((entry) => entry.baseline)

      return {
        tier,
        library,
        libraryLabel,
        scenarioCount: rows.length,
        geometricMeanMedianMs: geometricMean(
          rows.map((row) => row[facet].medianMs),
        ),
        relativeMedianToTanStack:
          matching.length === rows.length
            ? geometricMean(
                matching.map(
                  ({ row, baseline }) =>
                    row[facet].medianMs / baseline[facet].medianMs,
                ),
              )
            : undefined,
      }
    },
  )
}

function summarizeOutputFacet(measurements) {
  return groupedRows(measurements).map(
    ({ tier, library, libraryLabel, rows }) => ({
      tier,
      library,
      libraryLabel,
      scenarioCount: rows.length,
      renderers: [
        ...new Set(rows.map((row) => (row.output.canvases ? 'canvas' : 'svg'))),
      ],
      elements: numericRange(rows.map((row) => row.output.elements)),
      svgBytes: numericRange(rows.map((row) => row.output.svgBytes)),
      canvasPixels: numericRange(rows.map((row) => row.output.canvasPixels)),
    }),
  )
}

function groupedRows(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.tier}:${row.library}`
    const group = groups.get(key)
    if (group) {
      group.rows.push(row)
    } else {
      groups.set(key, {
        tier: row.tier,
        library: row.library,
        libraryLabel: row.libraryLabel,
        rows: [row],
      })
    }
  }
  return [...groups.values()]
}

function geometricMean(values) {
  if (!values.length) return undefined
  return Math.exp(
    values.reduce(
      (total, value) => total + Math.log(Math.max(0.01, value)),
      0,
    ) / values.length,
  )
}

function numericRange(values) {
  return {
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  }
}

function createNarrativeSummary(result) {
  const paragraphs = []
  const selectedTiers = Object.keys(result.capabilityTiers)
  const caseKeys = new Set([
    ...result.bundles.map(
      (bundle) => `${bundle.library}:${bundle.chartType}:${bundle.tier}`,
    ),
    ...result.performance.map(
      (measurement) =>
        `${measurement.library}:${measurement.chartType}:${measurement.tier}`,
    ),
  ])
  const chartTypes = new Set([
    ...result.bundles.map((bundle) => bundle.chartType),
    ...result.performance.map((measurement) => measurement.chartType),
  ])

  paragraphs.push(
    `This run compares ${formatNumber(Object.keys(result.versions).length)} libraries across ${formatNumber(chartTypes.size)} chart types and ${formatNumber(selectedTiers.length)} capability tiers: ${formatNumber(caseKeys.size)} library/chart/tier cases${result.performance.length ? ` and ${formatNumber(result.performance.length)} browser scenarios across the selected point counts` : ''}. Basic covers one series with axes and grid, interactive adds a legend and pointer tooltip, and advanced adds two-series smoothing, stacking, or variable-size scatter.`,
  )

  const tanstackBundles = result.summaries.bundle.filter(
    (summary) => summary.library === 'tanstack',
  )
  if (tanstackBundles.length) {
    const tanstackByTier = tanstackBundles.map(
      (summary) =>
        `${formatBytes(summary.geometricMeanGzipBytes)} for ${summary.tier}`,
    )
    const bundleComparisons = summarizeRelativeLibraries(
      result.summaries.bundle,
      'relativeGzipToTanStack',
      'relativeIncrementalGzipToTanStack',
    )
    paragraphs.push(
      `TanStack Charts’ geometric-mean gzip bundles are ${joinSeries(tanstackByTier)}.${
        bundleComparisons.length
          ? ` Relative to those matching cases, ${joinSeries(bundleComparisons)}. The gap remains after adding tooltip, legend, and advanced multi-series composition, so the measured size advantage is not explained only by comparing a less capable basic fixture.`
          : ''
      }`,
    )
  }

  if (result.summaries.mount.length && result.summaries.update.length) {
    const tanstackMount = result.summaries.mount
      .filter((summary) => summary.library === 'tanstack')
      .map(
        (summary) =>
          `${summary.tier} ${formatDuration(summary.geometricMeanMedianMs)}`,
      )
    const tanstackUpdate = result.summaries.update
      .filter((summary) => summary.library === 'tanstack')
      .map(
        (summary) =>
          `${summary.tier} ${formatDuration(summary.geometricMeanMedianMs)}`,
      )
    const mountComparisons = summarizeTimingLibraries(result.summaries.mount)
    const updateComparisons = summarizeTimingLibraries(result.summaries.update)
    paragraphs.push(
      `TanStack’s geometric-mean median mount times are ${joinSeries(tanstackMount)}, while its update times are ${joinSeries(tanstackUpdate)}.${
        mountComparisons.length
          ? ` Across tiers, mount-time ratios relative to TanStack are ${joinSeries(mountComparisons)}; update-time ratios are ${joinSeries(updateComparisons)}. A ratio below 1× is faster than TanStack and a ratio above 1× is slower. For mounting, ${joinSeries(describeTimingStandings(result.summaries.mount))}; for updates, ${joinSeries(describeTimingStandings(result.summaries.update))}.`
          : ''
      }`,
    )
  }

  if (result.summaries.output.length) {
    const outputDescriptions = summarizeOutputLibraries(result.summaries.output)
    paragraphs.push(
      `Output structure follows renderer choice. ${joinSeries(outputDescriptions)}. Canvas DOM counts describe a backing surface rather than individual marks, so they should not be read as directly smaller than SVG output. The SVG figures are useful for comparing DOM and serialization pressure among the SVG libraries, not visual quality.`,
    )
  }

  if (result.performance.length) {
    paragraphs.push(
      'These results establish parity only for the exercised fixtures. Tooltip and legend implementations are bundled and mounted, but pointer-response latency is not timed; selection, animation-frame completion, and responsive resize still need event-driven protocols. Mount and update timings include forced layout but exclude module loading, network transfer, paint, and animation frames, and should only be compared across runs from the same machine and browser build.',
    )
  }

  return paragraphs
}

function summarizeRelativeLibraries(rows, fullMetric, incrementalMetric) {
  return groupSummariesByLibrary(rows)
    .filter(([library]) => library !== 'tanstack')
    .flatMap(([, libraryRows]) => {
      const fullValues = libraryRows
        .map((row) => row[fullMetric])
        .filter((value) => value !== undefined)
      if (!fullValues.length) return []
      const fullRange = numericRange(fullValues)
      const incrementalValues = libraryRows
        .map((row) => row[incrementalMetric])
        .filter((value) => value !== undefined)
      const incrementalRange = incrementalValues.length
        ? numericRange(incrementalValues)
        : undefined
      const hasDistinctIncremental = libraryRows.some(
        (row) =>
          row[fullMetric] !== undefined &&
          row[incrementalMetric] !== undefined &&
          Math.abs(row[fullMetric] - row[incrementalMetric]) >= 0.01,
      )
      return [
        `${libraryRows[0].libraryLabel} was ${formatRatioRange(fullRange)} TanStack’s gzip size${
          hasDistinctIncremental && incrementalRange
            ? `, or ${formatRatioRange(incrementalRange)} with shared React externalized`
            : ''
        }`,
      ]
    })
}

function summarizeTimingLibraries(rows) {
  return groupSummariesByLibrary(rows)
    .filter(([library]) => library !== 'tanstack')
    .flatMap(([, libraryRows]) => {
      const values = libraryRows
        .map((row) => row.relativeMedianToTanStack)
        .filter((value) => value !== undefined)
      if (!values.length) return []
      return [
        `${libraryRows[0].libraryLabel} ${formatRatioRange(numericRange(values))}`,
      ]
    })
}

function describeTimingStandings(rows) {
  return groupSummariesByLibrary(rows)
    .filter(([library]) => library !== 'tanstack')
    .flatMap(([, libraryRows]) => {
      const values = libraryRows
        .map((row) => row.relativeMedianToTanStack)
        .filter((value) => value !== undefined)
      if (!values.length) return []
      const minimum = Math.min(...values)
      const maximum = Math.max(...values)
      let standing
      if (maximum < 0.95) standing = 'was faster'
      else if (minimum > 2) standing = 'was materially slower'
      else if (minimum > 1.05) standing = 'was slower'
      else if (minimum < 0.95 && maximum > 1.05)
        standing = 'changed position by tier'
      else standing = 'stayed close'
      return [`${libraryRows[0].libraryLabel} ${standing}`]
    })
}

function summarizeOutputLibraries(rows) {
  return groupSummariesByLibrary(rows).map(([, libraryRows]) => {
    const elements = {
      minimum: Math.min(
        ...libraryRows.map((summary) => summary.elements.minimum),
      ),
      maximum: Math.max(
        ...libraryRows.map((summary) => summary.elements.maximum),
      ),
    }
    const canvasPixels = Math.max(
      ...libraryRows.map((summary) => summary.canvasPixels.maximum),
    )
    const svgBytes = Math.max(
      ...libraryRows.map((summary) => summary.svgBytes.maximum),
    )
    const renderers = new Set(
      libraryRows.flatMap((summary) => summary.renderers),
    )
    if (renderers.has('canvas')) {
      return `${libraryRows[0].libraryLabel} uses canvas with ${formatCountRange(elements, 'DOM element')} and up to ${formatNumber(canvasPixels)} backing pixels`
    }
    return `${libraryRows[0].libraryLabel} uses SVG and peaks at ${formatNumber(elements.maximum)} elements and ${formatBytes(svgBytes)} serialized markup`
  })
}

function groupSummariesByLibrary(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const existing = grouped.get(row.library)
    if (existing) existing.push(row)
    else grouped.set(row.library, [row])
  }
  return [...grouped.entries()]
}

function joinSeries(items) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function renderMarkdown(result) {
  const lines = [
    '# Chart library comparison',
    '',
    `Generated ${result.createdAt} with the \`${result.profile}\` profile.`,
    '',
    '## Results summary',
    '',
  ]
  for (const paragraph of result.narrativeSummary) {
    lines.push(paragraph, '')
  }
  lines.push(
    '## Capability tiers',
    '',
    '| Tier | Included capability |',
    '| --- | --- |',
  )
  for (const [tier, description] of Object.entries(result.capabilityTiers)) {
    lines.push(`| ${tier} | ${description} |`)
  }
  lines.push(
    '',
    'The advanced composition is chart-specific: line uses two smoothed series, bar and area use two stacked series, and scatter uses two variable-size series.',
    '',
    '### Capability coverage',
    '',
    'The measured column describes fixture coverage. Tooltip and legend code is bundled and mounted, but pointer response is not timed. API-only rows prevent bundle results from being mistaken for full feature parity.',
    '',
    `| Capability | Measured | ${selectedLibraryLabels(result).join(' | ')} |`,
    `| --- | --- | ${selectedLibraryLabels(result)
      .map(() => '---')
      .join(' | ')} |`,
  )
  for (const coverage of result.capabilityCoverage) {
    lines.push(
      `| ${coverage.capability} | ${coverage.measured} | ${Object.values(coverage.implementations).join(' | ')} |`,
    )
  }
  lines.push('')

  if (result.bundles.length) {
    lines.push(
      '## Bundle size',
      '',
      'Full size is a cold-page ESM bundle. Incremental size externalizes shared React runtime only for React-first libraries.',
      '',
      '### Summary',
      '',
      'Geometric means cover the selected chart types. Relative columns compare matching cases with TanStack Charts.',
      '',
      '| Tier | Library | Mean gzip | vs TanStack | Mean incremental gzip | vs TanStack |',
      '| --- | --- | ---: | ---: | ---: | ---: |',
    )
    for (const summary of result.summaries.bundle) {
      lines.push(
        `| ${summary.tier} | ${summary.libraryLabel} | ${formatBytes(summary.geometricMeanGzipBytes)} | ${formatRatio(summary.relativeGzipToTanStack)} | ${formatBytes(summary.geometricMeanIncrementalGzipBytes)} | ${formatRatio(summary.relativeIncrementalGzipToTanStack)} |`,
      )
    }
    lines.push(
      '',
      '### Measurements',
      '',
      '| Tier | Library | Chart | Minified | Gzip | Brotli | Incremental gzip | Modules |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    )
    for (const bundle of result.bundles) {
      lines.push(
        `| ${bundle.tier} | ${bundle.libraryLabel} | ${bundle.chartType} | ${formatBytes(bundle.minifiedBytes)} | ${formatBytes(bundle.gzipBytes)} | ${formatBytes(bundle.brotliBytes)} | ${formatBytes(bundle.incrementalGzipBytes)} | ${bundle.bundledModuleCount} |`,
      )
    }
    lines.push('')
  }

  if (result.performance.length) {
    lines.push(
      '## Mount performance',
      '',
      '### Summary',
      '',
      'Geometric means cover every matching chart and point-count scenario. Ratios below 1× are faster than TanStack; ratios above 1× are slower.',
      '',
      '| Tier | Library | Mean median | vs TanStack | Scenarios |',
      '| --- | --- | ---: | ---: | ---: |',
    )
    for (const summary of result.summaries.mount) {
      lines.push(
        `| ${summary.tier} | ${summary.libraryLabel} | ${formatDuration(summary.geometricMeanMedianMs)} | ${formatRatio(summary.relativeMedianToTanStack)} | ${summary.scenarioCount} |`,
      )
    }
    lines.push(
      '',
      '### Measurements',
      '',
      '| Tier | Library | Chart | Points/series | Total points | Median | p95 |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: |',
    )
    for (const measurement of result.performance) {
      lines.push(
        `| ${measurement.tier} | ${measurement.libraryLabel} | ${measurement.chartType} | ${formatNumber(measurement.pointsPerSeries)} | ${formatNumber(measurement.totalPoints)} | ${formatDuration(measurement.mount.medianMs)} | ${formatDuration(measurement.mount.p95Ms)} |`,
      )
    }
    lines.push(
      '',
      '## Update performance',
      '',
      '### Summary',
      '',
      'The summary uses the same matched-scenario geometric mean as mount performance.',
      '',
      '| Tier | Library | Mean median | vs TanStack | Scenarios |',
      '| --- | --- | ---: | ---: | ---: |',
    )
    for (const summary of result.summaries.update) {
      lines.push(
        `| ${summary.tier} | ${summary.libraryLabel} | ${formatDuration(summary.geometricMeanMedianMs)} | ${formatRatio(summary.relativeMedianToTanStack)} | ${summary.scenarioCount} |`,
      )
    }
    lines.push(
      '',
      '### Measurements',
      '',
      '| Tier | Library | Chart | Points/series | Total points | Median | p95 |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: |',
    )
    for (const measurement of result.performance) {
      lines.push(
        `| ${measurement.tier} | ${measurement.libraryLabel} | ${measurement.chartType} | ${formatNumber(measurement.pointsPerSeries)} | ${formatNumber(measurement.totalPoints)} | ${formatDuration(measurement.update.medianMs)} | ${formatDuration(measurement.update.p95Ms)} |`,
      )
    }
    lines.push(
      '',
      '## Output complexity',
      '',
      '### Summary',
      '',
      'Ranges cover the selected chart and point-count scenarios. Canvas pixels describe backing-store size, not mark count.',
      '',
      '| Tier | Library | Renderer | Elements | SVG bytes | Canvas pixels |',
      '| --- | --- | --- | ---: | ---: | ---: |',
    )
    for (const summary of result.summaries.output) {
      lines.push(
        `| ${summary.tier} | ${summary.libraryLabel} | ${summary.renderers.join(', ')} | ${formatNumberRange(summary.elements)} | ${formatByteRange(summary.svgBytes)} | ${formatNumberRange(summary.canvasPixels)} |`,
      )
    }
    lines.push(
      '',
      '### Measurements',
      '',
      '| Tier | Library | Chart | Total points | Elements | Paths | Rectangles | Circles | SVG | Canvases | Canvas pixels |',
      '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    )
    for (const measurement of result.performance) {
      lines.push(
        `| ${measurement.tier} | ${measurement.libraryLabel} | ${measurement.chartType} | ${formatNumber(measurement.totalPoints)} | ${formatNumber(measurement.output.elements)} | ${formatNumber(measurement.output.paths)} | ${formatNumber(measurement.output.rectangles)} | ${formatNumber(measurement.output.circles)} | ${formatBytes(measurement.output.svgBytes)} | ${measurement.output.canvases} | ${formatNumber(measurement.output.canvasPixels)} |`,
      )
    }
    lines.push('')
  }

  lines.push(
    '## Environment',
    '',
    `- Revision: \`${result.revision}\``,
    `- Node: \`${result.environment.node}\``,
    `- Browser: \`${result.environment.browser ?? 'not used'}\``,
    `- Platform: \`${result.environment.platform} ${result.environment.architecture}\``,
    `- CPU: ${result.environment.cpu}`,
    `- Samples: ${result.protocol.samples} after ${result.protocol.warmup} warmups`,
    '',
  )

  return `${lines.join('\n')}\n`
}

function selectedLibraryLabels(result) {
  return Object.keys(result.versions).map(
    (libraryId) =>
      libraries.find((library) => library.id === libraryId)?.label ?? libraryId,
  )
}

async function writeBundleBaseline(
  bundles,
  targetPath,
  baselineVersions,
  baselineChartTypes,
  baselineTiers,
) {
  const sourceRevision = tanstackComparisonRevision(root)
  const baseline = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    packageVersions: baselineVersions,
    sources: Object.fromEntries(
      libraries.map((library) => [
        library.id,
        library.id === 'tanstack'
          ? {
              kind: 'workspace',
              revision: sourceRevision,
            }
          : {
              kind: 'package',
              packageName: library.packageName,
              version: baselineVersions[library.id],
            },
      ]),
    ),
    matrix: {
      chartTypes: baselineChartTypes,
      tiers: baselineTiers,
    },
    tolerance: {
      relative: 0.03,
      minimumBytes: 512,
    },
    bundles: Object.fromEntries(
      bundles.map((bundle) => [
        bundle.id,
        {
          minifiedBytes: bundle.minifiedBytes,
          gzipBytes: bundle.gzipBytes,
          brotliBytes: bundle.brotliBytes,
          incrementalGzipBytes: bundle.incrementalGzipBytes,
          incrementalBrotliBytes: bundle.incrementalBrotliBytes,
        },
      ]),
    ),
  }
  await writeFile(targetPath, `${JSON.stringify(baseline, null, 2)}\n`)
}

async function checkBundleBaseline(
  bundles,
  actualVersions,
  {
    requireCompleteMatrix = true,
    checkSourceProvenance = true,
    selectedLibraries: checkedLibraries = libraries,
    selectedChartTypes: checkedChartTypes = chartTypes,
    selectedTiers: checkedTiers = tiers,
  } = {},
) {
  let baseline
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  } catch {
    return [
      `Missing ${baselinePath.slice(root.length + 1)}. Run pnpm benchmark:update-baseline.`,
    ]
  }

  const failures = []
  const expectedTanStackRevision = checkSourceProvenance
    ? tanstackComparisonRevision(root)
    : undefined
  if (baseline.schemaVersion !== 3) {
    failures.push(
      'bundle baseline schema is stale; run pnpm benchmark:update-baseline',
    )
  }
  failures.push(
    ...bundleBaselineShapeFailures(baseline, {
      libraryIds: libraries.map((library) => library.id),
      chartTypes,
      tiers,
    }),
  )
  for (const library of checkedLibraries) {
    const expectedVersion = baseline.packageVersions?.[library.id]
    if (!expectedVersion) {
      failures.push(
        `${library.label}: bundle baseline is missing its package version`,
      )
      continue
    }
    const actualVersion = actualVersions[library.id]
    const source = baseline.sources?.[library.id]
    const versionFailure = comparisonInstalledVersionFailure(
      source,
      actualVersion,
      expectedVersion,
    )
    if (versionFailure) failures.push(`${library.label}: ${versionFailure}`)
    if (library.id === 'tanstack') {
      if (checkSourceProvenance) {
        const sourceFailure = tanstackComparisonSourceFailure(
          source,
          expectedTanStackRevision,
        )
        if (sourceFailure) failures.push(`${library.label}: ${sourceFailure}`)
      }
    } else if (
      source?.kind !== 'package' ||
      source.packageName !== library.packageName ||
      source.version !== expectedVersion
    ) {
      failures.push(
        `${library.label}: bundle baseline package provenance is missing or stale`,
      )
    }
  }
  const actualIds = new Set(bundles.map((bundle) => bundle.id))
  const expectedIds = new Set(
    requireCompleteMatrix
      ? Object.keys(baseline.bundles)
      : checkedLibraries.flatMap((library) =>
          checkedChartTypes.flatMap((chartType) =>
            checkedTiers.map((tier) => `${library.id}-${chartType}-${tier}`),
          ),
        ),
  )
  for (const id of expectedIds) {
    if (!actualIds.has(id)) failures.push(`${id}: baseline case was not run`)
  }
  for (const bundle of bundles) {
    if (bundle.stressSupportBytes !== 0) {
      failures.push(
        `${bundle.id}: normal comparison bundle retained ${bundle.stressSupportBytes} bytes of stress-only support`,
      )
    }
    const expected = baseline.bundles[bundle.id]
    if (!expected) {
      failures.push(`${bundle.id}: no baseline; update the bundle baseline`)
      continue
    }
    for (const metric of [
      'minifiedBytes',
      'gzipBytes',
      'brotliBytes',
      'incrementalGzipBytes',
      'incrementalBrotliBytes',
    ]) {
      const allowance = Math.max(
        baseline.tolerance.minimumBytes,
        Math.ceil(expected[metric] * baseline.tolerance.relative),
      )
      const limit = expected[metric] + allowance
      if (bundle[metric] > limit) {
        failures.push(
          `${bundle.id} ${metric}: ${formatBytes(bundle[metric])} exceeds ${formatBytes(limit)} (${formatBytes(expected[metric])} baseline)`,
        )
      }
    }
  }
  return failures
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

function revision() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

function optionValue(name) {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith(`${name}=`))
  return argument?.slice(name.length + 1)
}

function csvOption(name) {
  const value = optionValue(name)
  return value ? new Set(value.split(',').filter(Boolean)) : undefined
}

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function formatBytes(bytes) {
  if (bytes === undefined) return '—'
  return `${(bytes / 1024).toFixed(2)} kB`
}

function formatDuration(duration) {
  if (duration === undefined) return '—'
  return `${duration.toFixed(2)} ms`
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatRatio(value) {
  return value === undefined ? '—' : `${value.toFixed(2)}×`
}

function formatRatioRange(range) {
  if (range.minimum === range.maximum) return formatRatio(range.minimum)
  return `${formatRatio(range.minimum)}–${formatRatio(range.maximum)}`
}

function formatNumberRange(range) {
  if (range.minimum === range.maximum) return formatNumber(range.minimum)
  return `${formatNumber(range.minimum)}–${formatNumber(range.maximum)}`
}

function formatCountRange(range, singular) {
  const formatted = formatNumberRange(range)
  return `${formatted} ${range.minimum === 1 && range.maximum === 1 ? singular : `${singular}s`}`
}

function formatByteRange(range) {
  if (range.minimum === range.maximum) return formatBytes(range.minimum)
  return `${formatBytes(range.minimum)}–${formatBytes(range.maximum)}`
}
