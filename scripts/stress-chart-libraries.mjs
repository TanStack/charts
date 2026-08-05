import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import {
  launchBenchmarkBrowser,
  startBenchmarkServer,
} from './benchmark/browser.mjs'
import { chartLibraries } from './benchmark/chart-libraries.mjs'
import {
  assertKnownFilterValues,
  parseShard,
  selectWeightedShard,
} from './benchmark/filters.mjs'
import {
  attachPageErrorCollector,
  contextPageErrorFailure,
} from './benchmark/page-errors.mjs'
import {
  collectRetryRecords,
  retryFailedResult,
  retryProgressSymbol,
} from './benchmark/retry.mjs'
import {
  completedResults,
  correctnessValidResults,
} from './benchmark/result-validity.mjs'
import { stressArtifactStem } from './benchmark/stress-artifacts.mjs'
import { runWithConcurrency } from './run-with-concurrency.mjs'

const root = resolve(import.meta.dirname, '..')
const comparisonDirectory = resolve(root, 'benchmarks/comparison')
const stressDirectory = resolve(comparisonDirectory, 'stress')
const outputDirectory = resolve(root, '.benchmark-output/stress')
const caseOutputDirectory = resolve(outputDirectory, 'cases')
const resultDirectory = resolve(outputDirectory, 'results')
const config = JSON.parse(
  await readFile(resolve(stressDirectory, 'workloads.json'), 'utf8'),
)

const profileName = optionValue('--profile') ?? 'standard'
const profile = config.profiles[profileName]
if (!profile) {
  throw new Error(
    `Unknown profile "${profileName}". Use ${Object.keys(config.profiles).join(', ')}.`,
  )
}
validateConfiguration(config)

const libraryFilter = csvOption('--library')
const workloadFilter = csvOption('--workload')
const shard = parseShard(optionValue('--shard'))
assertKnownFilterValues(
  libraryFilter,
  chartLibraries.map((library) => library.id),
  'library',
)
assertKnownFilterValues(
  workloadFilter,
  config.workloads.map((workload) => workload.id),
  'workload',
)
const selectedLibraries = chartLibraries.filter(
  (library) => !libraryFilter || libraryFilter.has(library.id),
)
const filteredWorkloads = config.workloads.filter(
  (workload) => !workloadFilter || workloadFilter.has(workload.id),
)
if (!selectedLibraries.length) {
  throw new Error('The library filter did not match a configured library.')
}
if (!filteredWorkloads.length) {
  throw new Error('The workload filter did not match a configured workload.')
}
const shardWeightProfile = profileName === 'quick' ? 'standard' : profileName
const selectedWorkloads = selectWeightedShard(
  filteredWorkloads,
  shard,
  (workload) => workload.ciWeight[shardWeightProfile],
)
if (!selectedWorkloads.length) {
  throw new Error(
    `Stress shard ${shard.index}/${shard.total} has no workloads after filtering.`,
  )
}
const selectedFilters = {
  libraries: libraryFilter
    ? selectedLibraries.map((library) => library.id)
    : [],
  workloads:
    workloadFilter || shard
      ? selectedWorkloads.map((workload) => workload.id)
      : [],
  shard: shard ? `${shard.index}/${shard.total}` : undefined,
}

await mkdir(caseOutputDirectory, { recursive: true })
await mkdir(resultDirectory, { recursive: true })

const cases = selectedWorkloads.flatMap((workload) =>
  selectedLibraries.map((library) => ({
    id: `${library.id}-${workload.id}`,
    library,
    workload,
    exportName: `mount${capitalize(workload.chartType)}`,
  })),
)
await buildCases(cases)

const browser = await launchBenchmarkBrowser()
const browserVersion = browser.version()
const server = await startBenchmarkServer(outputDirectory, {
  width: 1_400,
  height: 900,
})
const cells = createCells(selectedWorkloads, selectedLibraries, profileName)
const results = []

try {
  for (const cell of cells) {
    const benchmarkCase = cases.find(
      ({ library, workload }) =>
        library.id === cell.library.id && workload.id === cell.workload.id,
    )
    if (!benchmarkCase) throw new Error(`Missing case for ${cell.id}.`)

    const timing = await runIsolatedWithRetry(
      browser,
      120_000,
      (context) =>
        runTimingCell(
          context,
          server.url,
          benchmarkCase,
          cell.sourceCount,
          profile,
        ),
      cell,
      'timing',
    )
    let memory
    if (
      timing.status === 'ok' &&
      cell.sourceCount === cell.workload.sourceCounts[profileName].at(-1)
    ) {
      memory = await runIsolatedWithRetry(
        browser,
        120_000,
        (context) =>
          runMemoryCell(
            context,
            server.url,
            benchmarkCase,
            cell.sourceCount,
            profile,
          ),
        cell,
        'memory',
      )
    }

    results.push({ ...timing, memory })
    process.stdout.write(retryProgressSymbol(timing, memory))
  }
  process.stdout.write('\n')
} finally {
  await browser.close()
  await server.close()
}

const failures = validateResults(results)
const versions = Object.fromEntries(
  await Promise.all(
    selectedLibraries.map(async (library) => [
      library.id,
      await packageVersion(library),
    ]),
  ),
)
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
  filters: selectedFilters,
  protocol: {
    warmup: profile.warmup,
    samples: profile.samples,
    preparationSamples: profile.preparationSamples,
    pointerSamples: profile.pointerSamples,
    pointerSweepSamples: profile.pointerSweepSamples,
    soakCycles: profile.soakCycles,
    streamDurationMs: profile.streamDurationMs,
    burstRevisions: profile.burstRevisions,
    devicePixelRatio: 1,
    sourceGeneration: 'Excluded from preparation and renderer timing.',
    preparation:
      'Measures canonical representation only; validation digest hashing is excluded.',
    completion:
      'Synchronous commit, common first-frame proxy, and common two-frame settle proxy are reported separately. ECharts renderer signals are additive and watchdog-gated.',
    rolling:
      'A fixed active window advances by five percent through one immutable feed. Stream revisions are frame-paced and individually awaited; burst revisions enqueue synchronously and must drain to one stable final output.',
    pointer:
      'Playwright measures trusted inactive-to-active tooltip activation and active-to-active state changes across adapter-reported data targets.',
    memory:
      'Fresh-page CDP JS heap and DOM counters after forced garbage collection; excludes GPU and native canvas allocations.',
    retry:
      'An outer timeout or browser-context infrastructure failure receives one immediate fresh-context retry. Renderer, page, protocol, and correctness failures are not retried; every attempted error remains explicit in the result and report.',
    output:
      'Adapter probes gate rendered dimensions, data items or path vertices, numeric endpoint visibility, and multi-series path, identity, and per-series vertex accounting.',
    ranking:
      'Cross-library timing is informational. Correctness invariants are the only suite gate.',
  },
  workloads: selectedWorkloads,
  results,
  failures,
}
const markdown = renderMarkdown(result)
const artifactStem = stressArtifactStem(profileName, selectedFilters)
const jsonPath = resolve(resultDirectory, `${artifactStem}.json`)
const markdownPath = resolve(resultDirectory, `${artifactStem}.md`)
await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`)
await writeFile(markdownPath, markdown)
console.log(markdown)

if (failures.length) {
  console.error(`Stress comparison failed:\n${failures.join('\n')}`)
  process.exitCode = 1
}

async function buildCases(benchmarkCases) {
  await runWithConcurrency(benchmarkCases, 4, async (benchmarkCase) => {
    const source =
      benchmarkCase.library.sources?.[benchmarkCase.workload.chartType] ??
      benchmarkCase.library.source
    if (!source) {
      throw new Error(`No source for ${benchmarkCase.id}.`)
    }
    await build({
      stdin: {
        contents: `
          export { ${benchmarkCase.exportName} as mount } from '${source}'
          export {
            createRollingFeed,
            createStressSource,
            createStressUpdateSource,
            prepareRollingSequence,
            prepareRollingWindow,
            prepareStressInput,
            prepareStressUpdate,
            rollingShiftCount,
          } from './stress/data.ts'
        `,
        resolveDir: comparisonDirectory,
        sourcefile: `${benchmarkCase.id}.ts`,
        loader: 'ts',
      },
      outfile: resolve(caseOutputDirectory, `${benchmarkCase.id}.js`),
      bundle: true,
      minify: true,
      treeShaking: true,
      platform: 'browser',
      format: 'esm',
      target: 'es2022',
      define: {
        BENCHMARK_INTERACTIVE: String(benchmarkCase.workload.tier !== 'basic'),
        BENCHMARK_ADVANCED: String(benchmarkCase.workload.tier === 'advanced'),
        BENCHMARK_STRESS: 'true',
        BENCHMARK_VARIABLE_SIZE: String(
          Boolean(benchmarkCase.workload.variableSize),
        ),
        BENCHMARK_MULTI_SERIES: String(
          Boolean(benchmarkCase.workload.multiSeries),
        ),
        BENCHMARK_GROUPED_X_FOCUS: String(
          Boolean(benchmarkCase.workload.groupedXFocus),
        ),
        BENCHMARK_ROLLING_WINDOW: String(
          Boolean(benchmarkCase.workload.rollingWindow),
        ),
      },
      legalComments: 'none',
      logLevel: 'silent',
    })
  })
}

async function runIsolated(
  browserInstance,
  timeoutMs,
  run,
  { id, library, workload, sourceCount },
) {
  let context
  let stage = 'context'
  let timeout
  try {
    context = await browserInstance.newContext({
      viewport: { width: 1_400, height: 900 },
      deviceScaleFactor: 1,
    })
    stage = 'cell'
    const pageError = contextPageErrorFailure(context)
    const value = await Promise.race([
      run(context),
      pageError,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new CellTimeoutError(timeoutMs)),
          timeoutMs,
        )
      }),
    ])
    return value
  } catch (error) {
    return {
      id,
      status: 'error',
      library: library.id,
      libraryLabel: library.label,
      workload: workload.id,
      workloadLabel: workload.label,
      lane: workload.lane,
      sourceCount,
      error: error instanceof Error ? error.message : String(error),
      retryable: isRetryableCellInfrastructureError(error, stage),
    }
  } finally {
    clearTimeout(timeout)
    await context?.close().catch(() => {})
  }
}

class CellTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Cell exceeded ${timeoutMs} ms.`)
    this.name = 'CellTimeoutError'
  }
}

function isRetryableCellInfrastructureError(error, stage) {
  if (stage === 'context' || error instanceof CellTimeoutError) return true
  if (!(error instanceof Error) || error.message.startsWith('Page errors:')) {
    return false
  }
  return (
    error.name === 'TargetClosedError' ||
    error.message.includes('Target page, context or browser has been closed')
  )
}

async function runIsolatedWithRetry(
  browserInstance,
  timeoutMs,
  run,
  cell,
  phase,
) {
  return retryFailedResult(
    () => runIsolated(browserInstance, timeoutMs, run, cell),
    phase,
  )
}

async function runTimingCell(
  context,
  serverUrl,
  benchmarkCase,
  sourceCount,
  benchmarkProfile,
) {
  const page = await context.newPage()
  const pageErrors = attachPageErrorCollector(page)
  await page.goto(serverUrl, { waitUntil: 'load' })

  const base = await page.evaluate(
    async ({
      moduleUrl,
      library,
      libraryLabel,
      workload,
      sourceCount: count,
      profile: currentProfile,
      profileName: selectedProfile,
    }) => {
      const {
        mount,
        createRollingFeed,
        createStressSource,
        createStressUpdateSource,
        prepareRollingSequence,
        prepareRollingWindow,
        prepareStressInput,
        prepareStressUpdate,
      } = await import(moduleUrl)
      await document.fonts?.ready

      const width = workload.id === 'dashboard-lines' ? 320 : 800
      const height = workload.id === 'dashboard-lines' ? 180 : 400
      const instances = workload.instances?.[selectedProfile] ?? 1
      const rollingLastRevision = workload.rollingWindow
        ? Math.max(
            2,
            Math.ceil(currentProfile.streamDurationMs / 4) +
              currentProfile.burstRevisions +
              4,
          )
        : 0
      const rollingFeed = workload.rollingWindow
        ? createRollingFeed(count, rollingLastRevision)
        : undefined
      const source = rollingFeed
        ? rollingFeed.slice(0, count)
        : createStressSource(workload.id, count, 0)
      const preparationSamples = []
      for (let index = 0; index < currentProfile.preparationSamples; index++) {
        const startedAt = performance.now()
        if (rollingFeed) {
          prepareRollingWindow(rollingFeed, count, 1, width, height, {
            includeDigest: false,
          })
        } else {
          prepareStressInput(workload.id, source, width, height, {
            includeDigest: false,
          })
        }
        preparationSamples.push(performance.now() - startedAt)
      }
      const rollingInputs = rollingFeed
        ? prepareRollingSequence(
            rollingFeed,
            count,
            rollingLastRevision,
            width,
            height,
          )
        : undefined
      const initial =
        rollingInputs?.[0] ??
        prepareStressInput(workload.id, source, width, height)
      validatePrepared(initial, count)
      await nextFrame()

      const longTasks = []
      const renderWindows = []
      const longTaskObserver =
        PerformanceObserver.supportedEntryTypes?.includes('longtask')
          ? new PerformanceObserver((list) => {
              longTasks.push(
                ...list.getEntries().map(({ duration, startTime }) => ({
                  duration,
                  startTime,
                })),
              )
            })
          : undefined
      longTaskObserver?.observe({ type: 'longtask', buffered: false })

      const mountSamples = []
      let output
      for (
        let sampleIndex = 0;
        sampleIndex < currentProfile.warmup + currentProfile.samples;
        sampleIndex++
      ) {
        const root = createRoot(initial.input, instances)
        const startedAt = performance.now()
        const handles = root.containers.map((container) =>
          mount(container, initial.input),
        )
        forceLayout(root.element)
        const syncMs = performance.now() - startedAt
        await Promise.all(handles.map((handle) => handle.ready?.firstFrame))
        forceLayout(root.element)
        const firstFrameMs = performance.now() - startedAt
        await Promise.all(handles.map((handle) => handle.ready?.settled))
        forceLayout(root.element)
        const settledMs = performance.now() - startedAt
        renderWindows.push([startedAt, performance.now()])
        if (sampleIndex === currentProfile.warmup) {
          output = {
            ...outputMetrics(root.element, initial.input, instances),
            probes: readOutputProbes(handles, initial.input),
          }
        }
        if (sampleIndex >= currentProfile.warmup) {
          mountSamples.push({ syncMs, firstFrameMs, settledMs })
        }
        for (const handle of handles) handle.destroy()
        root.element.remove()
        await twoFrames()
      }

      const updates = []
      const pointerStateInputs = new Map([['initial', initial.input]])
      for (const kind of workload.updates) {
        const target =
          kind === 'roll'
            ? rollingInputs?.[1]
            : prepareStressUpdate(
                workload.id,
                kind,
                source,
                initial,
                width,
                height,
              )
        if (!target) {
          throw new Error(`${kind} has no prepared target input.`)
        }
        validatePrepared(target, expectedSourceCount(kind))
        validateUpdate(kind, initial, target)
        if (
          workload.multiSeries &&
          (kind === 'reorder' || kind === 'append' || kind === 'toggle-series')
        ) {
          pointerStateInputs.set(kind, target.input)
        }

        const updatePreparation = measureUpdatePreparation(
          kind,
          currentProfile.preparationSamples,
        )
        await nextFrame()
        const root = createRoot(initial.input, instances)
        const handles = root.containers.map((container) =>
          mount(container, initial.input),
        )
        await Promise.all(handles.map((handle) => handle.ready?.settled))
        const initialVisual = visualSignature(root.element)
        const originalRoots = root.containers.map(
          (container) => container.firstElementChild,
        )
        const originalKeys = keyedNodes(root.element)
        const originalDataNodes = readPhysicalDataNodes(handles)
        const initialProbes = readOutputProbes(handles, initial.input)
        const samples = []
        const probeOperations = handles.map((handle) =>
          handle.update(target.input),
        )
        await Promise.all(
          probeOperations.map((operation) => operation?.settled),
        )
        forceLayout(root.element)
        const targetVisual = visualSignature(root.element)
        if (
          (kind === 'same' ||
            kind === 'append' ||
            kind === 'replace' ||
            kind === 'viewport' ||
            kind === 'toggle-series' ||
            kind === 'roll' ||
            kind === 'resize') &&
          targetVisual === initialVisual
        ) {
          throw new Error(`${kind} did not change rendered output.`)
        }
        const targetProbes = readOutputProbes(handles, target.input)
        validateProbeTransition(kind, initialProbes, targetProbes)
        const physicalReuse =
          kind === 'roll'
            ? rollingPhysicalReuse(
                originalDataNodes,
                readPhysicalDataNodes(handles),
                initial.input,
                target.input,
              )
            : undefined
        if (
          kind === 'roll' &&
          library === 'tanstack' &&
          (!physicalReuse ||
            physicalReuse.supportedInstances !== instances ||
            physicalReuse.reused !== physicalReuse.expected)
        ) {
          throw new Error(
            `TanStack reused ${physicalReuse?.reused ?? 0} of ${physicalReuse?.expected ?? count} surviving keyed data nodes.`,
          )
        }
        const targetOutput = {
          ...outputMetrics(root.element, target.input, instances),
          probes: targetProbes,
        }
        const firstKeyReuse = keyReuse(originalKeys, keyedNodes(root.element))
        if (kind !== 'noop') {
          const resetOperations = handles.map((handle) =>
            handle.update(initial.input),
          )
          await Promise.all(
            resetOperations.map((operation) => operation?.settled),
          )
          forceLayout(root.element)
        }

        for (
          let sampleIndex = 0;
          sampleIndex < currentProfile.warmup + currentProfile.samples;
          sampleIndex++
        ) {
          const next =
            kind === 'noop' || sampleIndex % 2 === 0 ? target : initial
          const startedAt = performance.now()
          const operations = handles.map((handle) => handle.update(next.input))
          forceLayout(root.element)
          const syncMs = performance.now() - startedAt
          await Promise.all(
            operations.map((operation) => operation?.firstFrame),
          )
          forceLayout(root.element)
          const firstFrameMs = performance.now() - startedAt
          await Promise.all(operations.map((operation) => operation?.settled))
          forceLayout(root.element)
          const settledMs = performance.now() - startedAt
          renderWindows.push([startedAt, performance.now()])
          if (sampleIndex >= currentProfile.warmup) {
            samples.push({ syncMs, firstFrameMs, settledMs })
          }
        }

        const rootIdentity = root.containers.filter(
          (container, index) =>
            container.firstElementChild === originalRoots[index],
        ).length
        for (const handle of handles) handle.destroy()
        root.element.remove()
        await twoFrames()
        updates.push({
          kind,
          targetDigest: target.digest,
          representedCount: target.representedCount,
          preparedRowCount: target.preparedRowCount,
          preparation: summarize(updatePreparation),
          timing: summarizePhases(samples),
          rootIdentity: {
            preserved: rootIdentity,
            total: instances,
          },
          keyedReuse: firstKeyReuse,
          physicalReuse,
          output: targetOutput,
        })
      }

      let stream
      if (workload.stream) {
        const ring = rollingInputs
          ? undefined
          : [
              initial,
              prepareStressUpdate(
                workload.id,
                'same',
                source,
                initial,
                width,
                height,
              ),
              prepareStressInput(
                workload.id,
                createStressSource(workload.id, count, 2),
                width,
                height,
              ),
            ]
        if (
          ring &&
          new Set(ring.map(({ digest }) => digest)).size !== ring.length
        ) {
          throw new Error('Streaming inputs do not contain distinct geometry.')
        }
        for (const input of ring ?? []) validatePrepared(input, count)
        await nextFrame()
        const root = createRoot(initial.input, instances)
        const handles = root.containers.map((container) =>
          mount(container, initial.input),
        )
        await Promise.all(handles.map((handle) => handle.ready?.settled))
        const syncSamples = []
        const frameIntervals = []
        const startedAt = performance.now()
        let previousFrame = startedAt
        let revision = 0
        let finalOperations = []
        while (
          performance.now() - startedAt < currentProfile.streamDurationMs &&
          (!rollingInputs || revision + 1 < rollingInputs.length)
        ) {
          await nextFrame()
          const frame = performance.now()
          frameIntervals.push(frame - previousFrame)
          previousFrame = frame
          revision++
          const input = rollingInputs
            ? rollingInputs[revision]
            : ring[revision % ring.length]
          if (!input) throw new Error(`Missing stream revision ${revision}.`)
          const updateStartedAt = performance.now()
          finalOperations = handles.map((handle) => handle.update(input.input))
          forceLayout(root.element)
          const syncMs = performance.now() - updateStartedAt
          syncSamples.push(syncMs)
          if (rollingInputs) {
            await bounded(
              Promise.all(
                finalOperations.map((operation) => operation?.settled),
              ),
              5_000,
              `rolling stream revision ${revision}`,
            )
          }
        }
        const producerEndedAt = performance.now()
        await bounded(
          Promise.all(finalOperations.map((operation) => operation?.settled)),
          5_000,
          'stream drain',
        )
        const drainedAt = performance.now()
        const finalInput = rollingInputs
          ? rollingInputs[revision]
          : ring[revision % ring.length]
        if (!finalInput) throw new Error('Stream has no final input.')
        const finalOutput = readOutputProbes(handles, finalInput.input)
        renderWindows.push([startedAt, drainedAt])
        for (const handle of handles) handle.destroy()
        root.element.remove()
        stream = {
          durationMs: producerEndedAt - startedAt,
          updates: syncSamples.length,
          updatesPerSecond:
            (syncSamples.length * 1_000) / (producerEndedAt - startedAt),
          sync: summarize(syncSamples),
          frameInterval: summarize(frameIntervals),
          missedFrames: frameIntervals.filter((value) => value > 25).length,
          drainMs: drainedAt - producerEndedAt,
          finalRevision: rollingInputs ? revision : undefined,
          finalDigest: finalInput.digest,
          finalOutput,
          rawSyncSamples: syncSamples,
          rawFrameIntervals: frameIntervals,
        }
        await twoFrames()
      }

      let burst
      if (workload.burst) {
        const revisions = currentProfile.burstRevisions
        const inputs = rollingInputs?.slice(1, revisions + 1)
        if (!inputs || inputs.length !== revisions) {
          throw new Error(
            `Burst needs ${revisions} precomputed rolling revisions.`,
          )
        }
        const finalInput = inputs.at(-1)
        if (!finalInput) throw new Error('Burst has no final input.')
        await nextFrame()
        const root = createRoot(initial.input, instances)
        const handles = root.containers.map((container) =>
          mount(container, initial.input),
        )
        await bounded(
          Promise.all(handles.map((handle) => handle.ready?.settled)),
          5_000,
          'burst mount',
        )
        const operations = []
        let finalOperations = []
        const startedAt = performance.now()
        for (const input of inputs) {
          finalOperations = handles.map((handle) => handle.update(input.input))
          operations.push(...finalOperations)
        }
        const enqueuedAt = performance.now()
        forceLayout(root.element)
        await bounded(
          Promise.all(
            finalOperations.map((operation) => operation?.firstFrame),
          ),
          5_000,
          'burst final first frame',
        )
        const finalFrameAt = performance.now()
        await bounded(
          Promise.all(finalOperations.map((operation) => operation?.settled)),
          5_000,
          'burst final settle',
        )
        const finalSettledAt = performance.now()
        await bounded(
          Promise.all(operations.map((operation) => operation?.settled)),
          10_000,
          'burst superseded-operation drain',
        )
        const drainedAt = performance.now()
        forceLayout(root.element)
        const finalOutput = readOutputProbes(handles, finalInput.input)
        await twoFrames()
        const stable = visualSignature(root.element)
        await twoFrames()
        const afterIdle = visualSignature(root.element)
        if (stable !== afterIdle) {
          throw new Error(
            'A superseded burst revision overwrote the stable final output.',
          )
        }
        const replayOperations = handles.map((handle) =>
          handle.update(finalInput.input),
        )
        await bounded(
          Promise.all(replayOperations.map((operation) => operation?.settled)),
          5_000,
          'burst final replay',
        )
        forceLayout(root.element)
        await twoFrames()
        const replayOutput = readOutputProbes(handles, finalInput.input)
        if (JSON.stringify(replayOutput) !== JSON.stringify(finalOutput)) {
          throw new Error(
            'Replaying the final burst input changed canonical output.',
          )
        }
        renderWindows.push([startedAt, performance.now()])
        for (const handle of handles) handle.destroy()
        root.element.remove()
        burst = {
          revisions,
          enqueueMs: enqueuedAt - startedAt,
          enqueueUpdatesPerSecond:
            (revisions * instances * 1_000) / (enqueuedAt - startedAt),
          finalFirstFrameMs: finalFrameAt - startedAt,
          finalSettledMs: finalSettledAt - startedAt,
          drainMs: drainedAt - enqueuedAt,
          supersededDrainMs: drainedAt - finalSettledAt,
          finalDigest: finalInput.digest,
          finalOutput,
          stable: true,
        }
        await twoFrames()
      }

      longTaskObserver?.disconnect()
      longTasks.push(
        ...(longTaskObserver?.takeRecords().map(({ duration, startTime }) => ({
          duration,
          startTime,
        })) ?? []),
      )
      const rendererLongTasks = longTasks.filter((entry) =>
        renderWindows.some(
          ([start, end]) =>
            entry.startTime < end && entry.startTime + entry.duration > start,
        ),
      )

      globalThis.__stressPointerSetup = (state = 'initial') => {
        const input = pointerStateInputs.get(state)
        if (!input) throw new Error(`Unknown pointer state "${state}".`)
        const root = createRoot(input, 1)
        const handle = mount(root.containers[0], input)
        globalThis.__stressPointer = { root, handle, input, state }
        return handle.ready?.settled
      }
      globalThis.__stressPointerTarget = (fraction) =>
        globalThis.__stressPointer?.handle.pointer?.target(fraction)
      globalThis.__stressPointerActive = () =>
        globalThis.__stressPointer?.handle.pointer?.isActive() ?? false
      globalThis.__stressPointerSignature = () =>
        globalThis.__stressPointer?.handle.pointer?.signature?.()
      globalThis.__stressPointerSeriesIdentities = () =>
        globalThis.__stressPointer?.handle.pointer?.seriesIdentities?.() ?? []
      globalThis.__stressPointerSeriesValues = () =>
        globalThis.__stressPointer?.handle.pointer?.seriesValues?.() ?? []
      globalThis.__stressPointerFocusedX = () =>
        globalThis.__stressPointer?.handle.pointer?.focusedX?.()
      globalThis.__stressPointerExpectedSeries = () =>
        visibleSeriesForInput(
          globalThis.__stressPointer?.input ?? initial.input,
        )
      globalThis.__stressPointerExpectedValues = (x) => {
        const input = globalThis.__stressPointer?.input ?? initial.input
        const values = new Map()
        for (const row of input.rows) {
          if (row.x === x) values.set(row.series, row.y)
        }
        return visibleSeriesForInput(input).flatMap((series) => {
          const value = values.get(series)
          return value === undefined ? [] : [{ series, value }]
        })
      }
      globalThis.__stressPointerWaitInactive = async () => {
        for (let frame = 0; frame < 120; frame++) {
          if (!globalThis.__stressPointerActive()) return true
          await nextFrame()
        }
        throw new Error('Pointer tooltip did not return to an inactive state.')
      }
      globalThis.__stressPointerArm = () =>
        new Promise((resolve, reject) => {
          if (globalThis.__stressPointerActive()) {
            reject(
              new Error(
                'Pointer activation timing must start from an inactive state.',
              ),
            )
            return
          }
          document.addEventListener(
            'pointermove',
            (event) => {
              const startedAt = performance.now()
              const trusted = event.isTrusted
              const poll = () => {
                if (globalThis.__stressPointerActive()) {
                  resolve({
                    durationMs: performance.now() - startedAt,
                    trusted,
                  })
                  return
                }
                if (performance.now() - startedAt >= 2_000) {
                  reject(
                    new Error(
                      'Pointer tooltip did not activate within 2 seconds.',
                    ),
                  )
                  return
                }
                requestAnimationFrame(poll)
              }
              requestAnimationFrame(poll)
            },
            { capture: true, once: true },
          )
        })
      globalThis.__stressPointerArmChange = (previousSignature) =>
        new Promise((resolve, reject) => {
          if (!globalThis.__stressPointerActive()) {
            reject(
              new Error(
                'Pointer sweep timing must start from an active tooltip.',
              ),
            )
            return
          }
          document.addEventListener(
            'pointermove',
            (event) => {
              const startedAt = performance.now()
              const trusted = event.isTrusted
              const poll = () => {
                const signature = globalThis.__stressPointerSignature()
                if (
                  globalThis.__stressPointerActive() &&
                  signature !== undefined &&
                  signature !== previousSignature
                ) {
                  resolve({
                    durationMs: performance.now() - startedAt,
                    signature,
                    trusted,
                  })
                  return
                }
                if (performance.now() - startedAt >= 2_000) {
                  reject(
                    new Error(
                      'Pointer tooltip state did not change within 2 seconds.',
                    ),
                  )
                  return
                }
                requestAnimationFrame(poll)
              }
              requestAnimationFrame(poll)
            },
            { capture: true, once: true },
          )
        })
      globalThis.__stressPointerCleanup = () => {
        const pointer = globalThis.__stressPointer
        pointer?.handle.destroy()
        pointer?.root.element.remove()
        delete globalThis.__stressPointer
      }

      return {
        id: `${library}-${workload.id}-${count}`,
        status: 'ok',
        library,
        libraryLabel,
        workload: workload.id,
        workloadLabel: workload.label,
        lane: workload.lane,
        representation: workload.representation,
        sourceCount: count,
        representedCount: initial.representedCount,
        preparedRowCount: initial.preparedRowCount,
        seriesCount: initial.input.seriesDomain?.length,
        pointsPerSeries: initial.input.seriesDomain?.length
          ? initial.input.rows.length / initial.input.seriesDomain.length
          : undefined,
        instances,
        digest: initial.digest,
        preparation: summarize(preparationSamples),
        mount: summarizePhases(mountSamples),
        updates,
        stream,
        burst,
        output,
        longTasks: {
          count: rendererLongTasks.length,
          totalMs: rendererLongTasks.reduce(
            (total, entry) => total + entry.duration,
            0,
          ),
          maximumMs: Math.max(
            0,
            ...rendererLongTasks.map((entry) => entry.duration),
          ),
          entries: rendererLongTasks,
        },
      }

      function measureUpdatePreparation(kind, sampleCount) {
        if (kind === 'noop') return Array.from({ length: sampleCount }, () => 0)
        const preparedSource = createStressUpdateSource(
          workload.id,
          kind,
          source,
        )
        const durations = []
        for (let index = 0; index < sampleCount; index++) {
          const startedAt = performance.now()
          if (kind === 'roll') {
            prepareRollingWindow(rollingFeed, count, 1, width, height, {
              includeDigest: false,
            })
          } else if (
            kind === 'reorder' ||
            kind === 'viewport' ||
            kind === 'toggle-series'
          ) {
            prepareStressUpdate(
              workload.id,
              kind,
              source,
              initial,
              width,
              height,
              { includeDigest: false },
            )
          } else {
            prepareStressInput(
              workload.id,
              kind === 'resize' ? source : preparedSource,
              kind === 'resize' ? 560 : width,
              kind === 'resize' ? height + 40 : height,
              { includeDigest: false },
            )
          }
          durations.push(performance.now() - startedAt)
        }
        return durations
      }

      function validatePrepared(prepared, expectedCount) {
        if (!prepared) throw new Error('Preparation returned no input.')
        if (prepared.representedCount !== expectedCount) {
          throw new Error(
            `Prepared input represents ${prepared.representedCount} of ${expectedCount} rows.`,
          )
        }
        if (prepared.preparedRowCount !== prepared.input.rows.length) {
          throw new Error('Prepared row accounting does not match the input.')
        }
        if (
          workload.maximumPreparedRows !== undefined &&
          prepared.preparedRowCount > workload.maximumPreparedRows
        ) {
          throw new Error(
            `Prepared row budget exceeded: ${prepared.preparedRowCount} > ${workload.maximumPreparedRows}.`,
          )
        }
        if (
          workload.id === 'pixel-envelope' ||
          workload.id === 'viewport-envelope'
        ) {
          const values = new Set(prepared.input.rows.map((row) => row.y))
          if (
            !values.has(prepared.exactMinimum) ||
            !values.has(prepared.exactMaximum)
          ) {
            throw new Error('Pixel envelope lost a global extremum.')
          }
        }
        if (workload.multiSeries) {
          const domain = prepared.input.seriesDomain ?? []
          const order = prepared.input.seriesOrder ?? []
          const domainSet = new Set(domain)
          const orderSet = new Set(order)
          if (
            !domain.length ||
            domainSet.size !== domain.length ||
            order.length !== domain.length ||
            orderSet.size !== domainSet.size ||
            !order.every((series) => domainSet.has(series))
          ) {
            throw new Error(
              'Multi-series preparation lost a unique, complete series order.',
            )
          }
          const counts = new Map(domain.map((series) => [series, 0]))
          for (const row of prepared.input.rows) {
            if (!counts.has(row.series)) {
              throw new Error(
                `Prepared row references unknown series "${row.series}".`,
              )
            }
            counts.set(row.series, counts.get(row.series) + 1)
          }
          if (new Set(counts.values()).size !== 1) {
            throw new Error(
              'Multi-series preparation produced uneven x-bucket counts.',
            )
          }
          if (
            prepared.input.hiddenSeries?.some(
              (series) => !domainSet.has(series),
            )
          ) {
            throw new Error(
              'Multi-series preparation hid an unknown series identity.',
            )
          }
        }
        if (workload.rollingWindow) {
          const window = prepared.rollingWindow
          if (
            !window ||
            window.windowSize !== expectedCount ||
            prepared.input.rows.length !== expectedCount ||
            window.shiftCount !== Math.max(1, Math.ceil(expectedCount * 0.05))
          ) {
            throw new Error('Rolling preparation lost its fixed window shape.')
          }
          const keys = prepared.input.rows.map((row) => row.id)
          if (
            new Set(keys).size !== expectedCount ||
            keys.some((key, index) => key !== window.startIndex + index)
          ) {
            throw new Error(
              'Rolling preparation lost unique monotonic logical keys.',
            )
          }
          if (
            prepared.input.xDomain?.[0] !== window.startIndex ||
            prepared.input.xDomain?.[1] !== window.endIndex - 1
          ) {
            throw new Error(
              'Rolling preparation did not carry its exact numeric domain.',
            )
          }
        }
      }

      function expectedSourceCount(kind) {
        return kind === 'append'
          ? createStressUpdateSource(workload.id, kind, source).length
          : count
      }

      function validateUpdate(kind, first, next) {
        if (kind === 'viewport' && first.input.rows !== next.input.rows) {
          throw new Error('Viewport update regenerated prepared geometry.')
        }
        const shouldMatch =
          kind === 'noop' ||
          (kind === 'resize' && workload.representation !== 'pixel-envelope')
        if (shouldMatch && first.digest !== next.digest) {
          throw new Error(`${kind} unexpectedly changed prepared geometry.`)
        }
        if (!shouldMatch && first.digest === next.digest) {
          throw new Error(`${kind} did not change prepared geometry.`)
        }
        if (kind === 'roll') {
          validateRollingTransition(first, next)
        }
      }

      function validateRollingTransition(first, next) {
        const firstWindow = first.rollingWindow
        const nextWindow = next.rollingWindow
        if (
          !firstWindow ||
          !nextWindow ||
          nextWindow.revision !== firstWindow.revision + 1 ||
          nextWindow.shiftCount !== firstWindow.shiftCount
        ) {
          throw new Error('Rolling update skipped or repeated a revision.')
        }
        const shift = firstWindow.shiftCount
        const firstKeys = new Set(first.input.rows.map((row) => row.id))
        const nextKeys = new Set(next.input.rows.map((row) => row.id))
        const removed = first.input.rows.filter((row) => !nextKeys.has(row.id))
        const added = next.input.rows.filter((row) => !firstKeys.has(row.id))
        if (
          removed.length !== shift ||
          added.length !== shift ||
          removed.some((row, index) => row !== first.input.rows[index]) ||
          added.some(
            (row, index) =>
              row !== next.input.rows[next.input.rows.length - shift + index],
          )
        ) {
          throw new Error(
            'Rolling update did not remove and add the exact edge keys.',
          )
        }
        for (let index = 0; index < first.input.rows.length - shift; index++) {
          if (next.input.rows[index] !== first.input.rows[index + shift]) {
            throw new Error(
              'Rolling update regenerated an overlapping datum object.',
            )
          }
        }
      }

      function createRoot(input, countInstances) {
        const element = document.createElement('div')
        element.style.display = 'grid'
        element.style.gridTemplateColumns =
          countInstances > 1 ? 'repeat(4, max-content)' : 'max-content'
        element.style.gap = '4px'
        const containers = Array.from({ length: countInstances }, () => {
          const container = document.createElement('div')
          container.style.width = `${input.width}px`
          container.style.height = `${input.height}px`
          element.append(container)
          return container
        })
        document.body.append(element)
        return { element, containers }
      }

      function forceLayout(element) {
        const bounds = element.getBoundingClientRect()
        return (
          bounds.width +
          bounds.height +
          [...element.querySelectorAll('svg, canvas')].reduce(
            (total, child) => total + child.getBoundingClientRect().width,
            0,
          )
        )
      }

      function outputMetrics(element, input, countInstances) {
        const encoder = new TextEncoder()
        const svgs = [...element.querySelectorAll('svg')]
        const canvases = [...element.querySelectorAll('canvas')]
        const html = svgs.map((svg) => svg.outerHTML).join('')
        if (/(?:NaN|Infinity)/.test(html)) {
          throw new Error('SVG output contains non-finite geometry.')
        }
        const primary = [...svgs, ...canvases].sort((left, right) => {
          const leftBounds = left.getBoundingClientRect()
          const rightBounds = right.getBoundingClientRect()
          return (
            rightBounds.width * rightBounds.height -
            leftBounds.width * leftBounds.height
          )
        })[0]
        if (!primary) throw new Error('Renderer produced no SVG or canvas.')
        const bounds = primary.getBoundingClientRect()
        if (
          Math.abs(bounds.width - input.width) > 2 ||
          Math.abs(bounds.height - input.height) > 2
        ) {
          throw new Error(
            `Output is ${bounds.width}×${bounds.height}; expected ${input.width}×${input.height}.`,
          )
        }
        const vectorDataElements = element.querySelectorAll(
          'path, rect, circle, line, polygon, polyline',
        ).length
        const canvasInk = canvases.reduce(
          (total, canvas) => total + countCanvasInk(canvas),
          0,
        )
        if (!vectorDataElements && !canvasInk) {
          throw new Error('Renderer output is blank.')
        }
        return {
          instances: countInstances,
          elements: element.querySelectorAll('*').length,
          paths: element.querySelectorAll('path').length,
          rectangles: element.querySelectorAll('rect').length,
          circles: element.querySelectorAll('circle').length,
          text: element.querySelectorAll('text').length,
          canvases: canvases.length,
          svgBytes: svgs.reduce(
            (total, svg) => total + encoder.encode(svg.outerHTML).byteLength,
            0,
          ),
          canvasPixels: canvases.reduce(
            (total, canvas) => total + canvas.width * canvas.height,
            0,
          ),
          canvasInkPixels: canvasInk,
        }
      }

      function readOutputProbes(handles, input) {
        const expectedXMinimum = input.xDomain?.[0] ?? 0
        let expectedXMaximum = input.xDomain?.[1] ?? 1
        if (!input.xDomain) {
          for (const row of input.rows) {
            expectedXMaximum = Math.max(expectedXMaximum, row.x)
          }
          for (const row of input.secondaryRows) {
            expectedXMaximum = Math.max(expectedXMaximum, row.x)
          }
        }
        const expectedItems =
          workload.chartType === 'scatter'
            ? input.rows.filter((row) => !workload.variableSize || row.size > 0)
                .length
            : workload.chartType === 'bar'
              ? input.rows.filter((row) => row.y !== 0).length
              : undefined
        const expectedSeries = workload.multiSeries
          ? visibleSeriesForInput(input)
          : undefined
        const expectedSeriesCounts = workload.multiSeries
          ? countRowsBySeries(input)
          : undefined
        const expectedVertices = expectedSeriesCounts
          ? [...expectedSeriesCounts.values()].reduce(
              (total, value) => total + value,
              0,
            )
          : undefined

        return handles.map((handle, index) => {
          const snapshot = handle.output?.read()
          if (!snapshot) {
            throw new Error(
              `Renderer instance ${index} has no stress output probe.`,
            )
          }
          for (const [name, value] of [
            ['width', snapshot.width],
            ['height', snapshot.height],
          ]) {
            if (!Number.isFinite(value) || value <= 0) {
              throw new Error(
                `Renderer output ${name} is not a positive finite number.`,
              )
            }
          }
          if (
            Math.abs(snapshot.width - input.width) > 2 ||
            Math.abs(snapshot.height - input.height) > 2
          ) {
            throw new Error(
              `Output probe is ${snapshot.width}×${snapshot.height}; expected ${input.width}×${input.height}.`,
            )
          }
          if (workload.chartType === 'line' || workload.chartType === 'area') {
            if (
              snapshot.vertexCount === undefined ||
              (expectedVertices === undefined
                ? snapshot.vertexCount < input.rows.length
                : snapshot.vertexCount !== expectedVertices)
            ) {
              throw new Error(
                `Output probe retained ${snapshot.vertexCount ?? 0} of ${expectedVertices ?? input.rows.length} required path vertices.`,
              )
            }
          } else if (
            snapshot.itemCount === undefined ||
            (workload.chartType === 'scatter'
              ? snapshot.itemCount !== expectedItems
              : snapshot.itemCount < expectedItems)
          ) {
            throw new Error(
              workload.chartType === 'scatter'
                ? `Output probe rendered ${snapshot.itemCount ?? 0} items; expected exactly ${expectedItems}.`
                : `Output probe retained ${snapshot.itemCount ?? 0} of ${expectedItems} visible items.`,
            )
          }
          if (expectedSeries && expectedSeriesCounts) {
            const actualIdentities = snapshot.seriesIdentities ?? []
            if (
              snapshot.pathCount !== expectedSeries.length ||
              snapshot.seriesCount !== expectedSeries.length
            ) {
              throw new Error(
                `Output probe rendered ${snapshot.pathCount ?? 0} paths and ${snapshot.seriesCount ?? 0} series; expected ${expectedSeries.length} of each.`,
              )
            }
            if (!sameOrderedValues(actualIdentities, expectedSeries)) {
              throw new Error(
                `Output probe ordered series identities [${actualIdentities.join(', ')}] differ from [${expectedSeries.join(', ')}].`,
              )
            }
            const colors = snapshot.seriesColors ?? []
            if (
              colors.length !== expectedSeries.length ||
              !sameOrderedValues(
                colors.map(({ series }) => series),
                expectedSeries,
              ) ||
              new Set(colors.map(({ color }) => color)).size !== colors.length
            ) {
              throw new Error(
                'Output probe did not retain one color owner per ordered series.',
              )
            }
            const probedCounts = new Map(
              (snapshot.seriesVertexCounts ?? []).map(
                ({ series, vertices }) => [series, vertices],
              ),
            )
            for (const [series, expectedCount] of expectedSeriesCounts) {
              if (probedCounts.get(series) !== expectedCount) {
                throw new Error(
                  `Output probe retained ${probedCounts.get(series) ?? 0} of ${expectedCount} vertices for "${series}".`,
                )
              }
            }
          }
          if (
            workload.chartType !== 'bar' &&
            snapshot.xDomainMaximum !== undefined
          ) {
            if (
              !Number.isFinite(snapshot.xDomainMaximum) ||
              Math.abs(snapshot.xDomainMaximum - expectedXMaximum) >
                Math.max(1e-6, Math.abs(expectedXMaximum) * 1e-9)
            ) {
              throw new Error(
                `Output probe x-domain ends at ${snapshot.xDomainMaximum}; expected ${expectedXMaximum}.`,
              )
            }
          }
          if (
            workload.chartType !== 'bar' &&
            snapshot.xDomainMinimum !== undefined &&
            (!Number.isFinite(snapshot.xDomainMinimum) ||
              Math.abs(snapshot.xDomainMinimum - expectedXMinimum) >
                Math.max(1e-6, Math.abs(expectedXMinimum) * 1e-9))
          ) {
            throw new Error(
              `Output probe x-domain starts at ${snapshot.xDomainMinimum}; expected ${expectedXMinimum}.`,
            )
          }
          if (
            workload.chartType !== 'bar' &&
            (input.xDomain === undefined ||
              workload.multiSeries ||
              workload.rollingWindow) &&
            snapshot.xEndpointVisible !== true
          ) {
            throw new Error(
              'Output probe did not find the numeric x endpoint inside the rendered chart.',
            )
          }
          if (
            workload.id === 'viewport-envelope' &&
            snapshot.viewportClipped !== undefined &&
            snapshot.viewportClipped !== true
          ) {
            throw new Error(
              'Output probe found viewport geometry without frame clipping.',
            )
          }
          const logicalData = handle.output?.readData?.()
          if (workload.rollingWindow) {
            if (!logicalData) {
              throw new Error(
                `Renderer instance ${index} has no logical datum probe.`,
              )
            }
            if (logicalData.length !== input.rows.length) {
              throw new Error(
                `Logical datum probe retained ${logicalData.length} of ${input.rows.length} rows.`,
              )
            }
            const keys = new Set()
            for (
              let datumIndex = 0;
              datumIndex < input.rows.length;
              datumIndex++
            ) {
              const actual = logicalData[datumIndex]
              const expected = input.rows[datumIndex]
              if (
                !actual ||
                actual.key !== expected.id ||
                actual.x !== expected.x ||
                actual.y !== expected.y ||
                actual.series !== expected.series ||
                actual.category !== expected.category
              ) {
                throw new Error(
                  `Logical datum probe differs at ordered row ${datumIndex}.`,
                )
              }
              keys.add(actual.key)
            }
            if (keys.size !== input.rows.length) {
              throw new Error('Logical datum probe contains duplicate keys.')
            }
          }
          return logicalData
            ? {
                ...snapshot,
                logicalDatumCount: logicalData.length,
                logicalDatumDigest: logicalDatumDigest(logicalData),
              }
            : snapshot
        })
      }

      function validateProbeTransition(kind, initialProbes, targetProbes) {
        for (let index = 0; index < initialProbes.length; index++) {
          const first = initialProbes[index]
          const next = targetProbes[index]
          if (workload.multiSeries) {
            const firstIdentities = first.seriesIdentities ?? []
            const nextIdentities = next.seriesIdentities ?? []
            const nextIdentitySet = new Set(nextIdentities)
            const firstColors = new Map(
              (first.seriesColors ?? []).map(({ series, color }) => [
                series,
                color,
              ]),
            )
            const nextColors = new Map(
              (next.seriesColors ?? []).map(({ series, color }) => [
                series,
                color,
              ]),
            )
            for (const series of firstIdentities) {
              if (
                nextIdentitySet.has(series) &&
                firstColors.get(series) !== nextColors.get(series)
              ) {
                throw new Error(
                  `Update changed stable color ownership for "${series}" on instance ${index}.`,
                )
              }
            }
            if (
              kind === 'toggle-series' &&
              nextIdentities.length !== firstIdentities.length - 1
            ) {
              throw new Error(
                `Series visibility update did not remove exactly one rendered series on instance ${index}.`,
              )
            }
            const firstCounts = new Map(
              (first.seriesVertexCounts ?? []).map(({ series, vertices }) => [
                series,
                vertices,
              ]),
            )
            const nextCounts = new Map(
              (next.seriesVertexCounts ?? []).map(({ series, vertices }) => [
                series,
                vertices,
              ]),
            )
            if (kind === 'reorder' || kind === 'toggle-series') {
              for (const series of nextIdentities) {
                if (nextCounts.get(series) !== firstCounts.get(series)) {
                  throw new Error(
                    `${kind} changed retained geometry for "${series}" on instance ${index}.`,
                  )
                }
              }
            }
            if (kind === 'append') {
              for (const [series, vertices] of nextCounts) {
                if (vertices !== (firstCounts.get(series) ?? 0) + 1) {
                  throw new Error(
                    `Append did not add exactly one vertex to "${series}" on instance ${index}.`,
                  )
                }
              }
            }
          }
          if (kind !== 'append') continue
          const firstCount =
            workload.chartType === 'line' || workload.chartType === 'area'
              ? first.vertexCount
              : first.itemCount
          const nextCount =
            workload.chartType === 'line' || workload.chartType === 'area'
              ? next.vertexCount
              : next.itemCount
          if (
            firstCount === undefined ||
            nextCount === undefined ||
            nextCount <= firstCount
          ) {
            throw new Error(
              `Append did not increase rendered data on instance ${index}.`,
            )
          }
          if (
            workload.id === 'raw-line' &&
            first.xDomainMaximum !== undefined &&
            next.xDomainMaximum !== undefined &&
            next.xDomainMaximum <= first.xDomainMaximum
          ) {
            throw new Error(
              `Append did not extend the visible x-domain on instance ${index}.`,
            )
          }
        }
      }

      function visibleSeriesForInput(input) {
        const hidden = new Set(input.hiddenSeries)
        const order = input.seriesOrder?.length
          ? input.seriesOrder
          : input.seriesDomain?.length
            ? input.seriesDomain
            : [...new Set(input.rows.map((row) => row.series))]
        return order.filter((series) => !hidden.has(series))
      }

      function sameOrderedValues(left, right) {
        return (
          left.length === right.length &&
          left.every((value, index) => value === right[index])
        )
      }

      function logicalDatumDigest(rows) {
        let hash = 2_166_136_261
        const text = (value) => {
          for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index)
            hash = Math.imul(hash, 16_777_619)
          }
        }
        for (const row of rows) {
          hash ^= row.key | 0
          hash = Math.imul(hash, 16_777_619)
          hash ^= Math.round(row.x * 1_000)
          hash = Math.imul(hash, 16_777_619)
          hash ^= Math.round(row.y * 1_000)
          hash = Math.imul(hash, 16_777_619)
          text(row.series)
          text(row.category)
        }
        return (hash >>> 0).toString(16).padStart(8, '0')
      }

      function countRowsBySeries(input) {
        const counts = new Map(
          visibleSeriesForInput(input).map((series) => [series, 0]),
        )
        for (const row of input.rows) {
          if (counts.has(row.series)) {
            counts.set(row.series, counts.get(row.series) + 1)
          }
        }
        return counts
      }

      function countCanvasInk(canvas) {
        const context = canvas.getContext('2d')
        if (!context) return 0
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let ink = 0
        for (let index = 0; index < data.length; index += 4) {
          if (
            data[index + 3] > 0 &&
            (data[index] < 250 ||
              data[index + 1] < 250 ||
              data[index + 2] < 250)
          ) {
            ink++
          }
        }
        return ink
      }

      function visualSignature(element) {
        let hash = 2_166_136_261
        const update = (value) => {
          hash ^= value
          hash = Math.imul(hash, 16_777_619)
        }
        for (const svg of element.querySelectorAll('svg')) {
          const markup = svg.outerHTML
            .replace(/\bid="[^"]*"/g, 'id="<generated>"')
            .replace(/url\(#(?:[^)]+)\)/g, 'url(#<generated>)')
            .replace(
              /\b(aria-labelledby|aria-describedby)="[^"]*"/g,
              '$1="<generated>"',
            )
          for (const character of markup) {
            update(character.charCodeAt(0))
          }
        }
        for (const canvas of element.querySelectorAll('canvas')) {
          const context = canvas.getContext('2d')
          if (!context) continue
          const { data } = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          )
          for (let index = 0; index < data.length; index += 4) {
            update(
              data[index] ^
                (data[index + 1] << 8) ^
                (data[index + 2] << 16) ^
                (data[index + 3] << 24),
            )
          }
        }
        return hash >>> 0
      }

      function keyedNodes(element) {
        return new Map(
          [...element.querySelectorAll('[data-ts-key]')].map((node) => [
            node.getAttribute('data-ts-key'),
            node,
          ]),
        )
      }

      function readPhysicalDataNodes(handles) {
        return handles.map((handle) => handle.output?.readDataNodes?.())
      }

      function rollingPhysicalReuse(before, after, firstInput, nextInput) {
        const nextKeys = new Set(nextInput.rows.map((row) => row.id))
        const expectedPerInstance = firstInput.rows.filter((row) =>
          nextKeys.has(row.id),
        ).length
        let supportedInstances = 0
        let reused = 0
        for (let index = 0; index < before.length; index++) {
          const first = before[index]
          const next = after[index]
          if (!first || !next) continue
          supportedInstances++
          const firstNodes = new Map(first.map(({ key, node }) => [key, node]))
          const nextNodes = new Map(next.map(({ key, node }) => [key, node]))
          for (const [key, node] of firstNodes) {
            if (nextKeys.has(key) && nextNodes.get(key) === node) reused++
          }
        }
        return {
          supportedInstances,
          expected: expectedPerInstance * supportedInstances,
          reused,
          ratio:
            supportedInstances && expectedPerInstance
              ? reused / (expectedPerInstance * supportedInstances)
              : undefined,
        }
      }

      function keyReuse(before, after) {
        if (!before.size) return undefined
        let reused = 0
        for (const [key, node] of before) {
          if (after.get(key) === node) reused++
        }
        return { reused, total: before.size, ratio: reused / before.size }
      }

      function summarizePhases(samples) {
        return {
          sync: summarize(samples.map((sample) => sample.syncMs)),
          firstFrame: summarize(samples.map((sample) => sample.firstFrameMs)),
          settled: summarize(samples.map((sample) => sample.settledMs)),
          rawSamples: samples,
        }
      }

      function summarize(values) {
        const sorted = [...values].sort((left, right) => left - right)
        return {
          medianMs: percentile(sorted, 0.5),
          p95Ms: percentile(sorted, 0.95),
          minimumMs: sorted[0],
          maximumMs: sorted.at(-1),
          rawSamples: values,
        }
      }

      function percentile(sorted, fraction) {
        if (!sorted.length) return undefined
        const index = Math.min(
          sorted.length - 1,
          Math.ceil((sorted.length - 1) * fraction),
        )
        return sorted[index]
      }

      function bounded(promise, timeoutMs, label) {
        let timeout
        return Promise.race([
          promise.finally(() => clearTimeout(timeout)),
          new Promise((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new Error(`${label} did not settle within ${timeoutMs} ms.`),
                ),
              timeoutMs,
            )
          }),
        ])
      }

      function nextFrame() {
        return new Promise((resolve) => requestAnimationFrame(resolve))
      }

      async function twoFrames() {
        await nextFrame()
        await nextFrame()
      }
    },
    {
      moduleUrl: `${serverUrl}cases/${benchmarkCase.id}.js`,
      library: benchmarkCase.library.id,
      libraryLabel: benchmarkCase.library.label,
      workload: benchmarkCase.workload,
      sourceCount,
      profile: benchmarkProfile,
      profileName,
    },
  )

  let pointer
  if (benchmarkCase.workload.pointer) {
    const initialPointer = await measurePointerState(
      'initial',
      benchmarkProfile.pointerSamples,
      benchmarkCase.workload.pointerSweep
        ? benchmarkProfile.pointerSweepSamples
        : 0,
    )
    const updatedStates = []
    if (benchmarkCase.workload.multiSeries) {
      for (const state of ['reorder', 'append', 'toggle-series']) {
        updatedStates.push(await measurePointerState(state, 1, 0))
      }
    }
    const { expectedSeries, samples, sweep } = initialPointer
    const pointerStates = [...samples, ...(sweep?.rawSamples ?? [])]
    const groupedSeriesComplete =
      !benchmarkCase.workload.groupedXFocus ||
      pointerStates.every(({ seriesIdentities }) =>
        sameStringSet(seriesIdentities, expectedSeries),
      )
    pointer = {
      timing: summarizeNode(samples.map(({ durationMs }) => durationMs)),
      trusted: samples.every(({ trusted }) => trusted),
      activated: samples.every(({ active }) => active),
      signaturesPresent: pointerStates.every(
        ({ signature }) => signature !== undefined && signature !== '',
      ),
      groupedXFocus: Boolean(benchmarkCase.workload.groupedXFocus),
      expectedSeries,
      uniqueSeriesCount: expectedSeries.length,
      groupedSeriesComplete,
      focusedXExact:
        !benchmarkCase.workload.groupedXFocus ||
        pointerStates.every(({ focusedXExact }) => focusedXExact),
      seriesValuesExact:
        !benchmarkCase.workload.groupedXFocus ||
        pointerStates.every(({ seriesValuesExact }) => seriesValuesExact),
      updatedStates,
      rawSamples: samples,
      sweep,
    }

    async function measurePointerState(state, activationSamples, sweepSamples) {
      await page.evaluate(
        (pointerState) => globalThis.__stressPointerSetup(pointerState),
        state,
      )
      const expectedSeries = await page.evaluate(() =>
        globalThis.__stressPointerExpectedSeries(),
      )
      const target = await page.evaluate(() =>
        globalThis.__stressPointerTarget(0.5),
      )
      if (!target) {
        throw new Error(`${state} adapter has no pointer target.`)
      }
      const samples = []
      for (let index = 0; index < activationSamples; index++) {
        await page.mouse.move(1_200, 800)
        await page.evaluate(() => globalThis.__stressPointerWaitInactive())
        const pending = page.evaluate(() => globalThis.__stressPointerArm())
        await page.mouse.move(target.x, target.y)
        const sample = await pending
        const observed = await page.evaluate(() => ({
          active: globalThis.__stressPointerActive(),
          signature: globalThis.__stressPointerSignature(),
          seriesIdentities: globalThis.__stressPointerSeriesIdentities(),
          seriesValues: globalThis.__stressPointerSeriesValues(),
          focusedX: globalThis.__stressPointerFocusedX(),
        }))
        const expectedValues =
          target.focusX === undefined
            ? []
            : await page.evaluate(
                (x) => globalThis.__stressPointerExpectedValues(x),
                target.focusX,
              )
        samples.push({
          ...sample,
          ...observed,
          focusedXExact: sameNumber(observed.focusedX, target.focusX),
          seriesValuesExact: sameSeriesValues(
            observed.seriesValues,
            expectedValues,
          ),
          expectedX: target.focusX,
          expectedValues,
        })
      }
      let sweep
      if (sweepSamples) {
        let previousSignature = await page.evaluate(() =>
          globalThis.__stressPointerSignature(),
        )
        if (previousSignature === undefined) {
          throw new Error(`${state} adapter has no pointer state signature.`)
        }
        const rawSamples = []
        for (let index = 0; index < sweepSamples; index++) {
          const fraction = (index + 1) / (sweepSamples + 1)
          const nextTarget = await page.evaluate(
            (nextFraction) => globalThis.__stressPointerTarget(nextFraction),
            fraction,
          )
          if (!nextTarget) {
            throw new Error(
              `${state} pointer sweep target ${index} is unavailable.`,
            )
          }
          const pending = page.evaluate(
            (signature) => globalThis.__stressPointerArmChange(signature),
            previousSignature,
          )
          await page.mouse.move(nextTarget.x, nextTarget.y)
          const sample = await pending
          const observed = await page.evaluate(() => ({
            active: globalThis.__stressPointerActive(),
            seriesIdentities: globalThis.__stressPointerSeriesIdentities(),
            seriesValues: globalThis.__stressPointerSeriesValues(),
            focusedX: globalThis.__stressPointerFocusedX(),
          }))
          const expectedValues =
            nextTarget.focusX === undefined
              ? []
              : await page.evaluate(
                  (x) => globalThis.__stressPointerExpectedValues(x),
                  nextTarget.focusX,
                )
          const changed = sample.signature !== previousSignature
          rawSamples.push({
            ...sample,
            ...observed,
            changed,
            fraction,
            focusedXExact: sameNumber(observed.focusedX, nextTarget.focusX),
            seriesValuesExact: sameSeriesValues(
              observed.seriesValues,
              expectedValues,
            ),
            expectedX: nextTarget.focusX,
            expectedValues,
          })
          previousSignature = sample.signature
        }
        sweep = {
          timing: summarizeNode(rawSamples.map(({ durationMs }) => durationMs)),
          trusted: rawSamples.every(({ trusted }) => trusted),
          changed: rawSamples.every(({ changed }) => changed),
          active: rawSamples.every(({ active }) => active),
          samples: rawSamples.length,
          rawSamples,
        }
      }
      await page.evaluate(() => globalThis.__stressPointerCleanup())
      return {
        state,
        expectedSeries,
        samples,
        sweep,
        focusedXExact: samples.every(({ focusedXExact }) => focusedXExact),
        seriesValuesExact: samples.every(
          ({ seriesValuesExact }) => seriesValuesExact,
        ),
        groupedSeriesComplete: samples.every(({ seriesIdentities }) =>
          sameStringSet(seriesIdentities, expectedSeries),
        ),
      }
    }
  }

  pageErrors.assertNone()
  return { ...base, pointer }
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false
  const values = new Set(left)
  return (
    values.size === right.length && right.every((value) => values.has(value))
  )
}

function sameNumber(left, right) {
  if (right === undefined) return true
  return (
    typeof left === 'number' &&
    Number.isFinite(left) &&
    Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9)
  )
}

function sameSeriesValues(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false
  const values = new Map(left.map(({ series, value }) => [series, value]))
  return (
    values.size === right.length &&
    right.every(({ series, value }) => sameNumber(values.get(series), value))
  )
}

function groupedPointerFailureDetails(samples, expectedSeries) {
  const expectedIdentities = Array.isArray(expectedSeries) ? expectedSeries : []
  const sample =
    samples.find(
      ({
        trusted,
        active,
        seriesIdentities,
        focusedXExact,
        seriesValuesExact,
      }) =>
        !trusted ||
        !active ||
        !sameStringSet(seriesIdentities, expectedIdentities) ||
        !focusedXExact ||
        !seriesValuesExact,
    ) ?? samples[0]
  if (!sample) {
    return `Expected series=${JSON.stringify(expectedIdentities)}; no pointer sample was recorded.`
  }
  return [
    `Expected x=${formatPointerValue(sample.expectedX)},`,
    `series=${JSON.stringify(expectedIdentities)},`,
    `values=${formatPointerSeriesValues(sample.expectedValues)};`,
    `observed x=${formatPointerValue(sample.focusedX)},`,
    `series=${JSON.stringify(sample.seriesIdentities ?? [])},`,
    `values=${formatPointerSeriesValues(sample.seriesValues)},`,
    `trusted=${Boolean(sample.trusted)}, active=${Boolean(sample.active)}.`,
  ].join(' ')
}

function formatPointerSeriesValues(values) {
  if (!Array.isArray(values)) return '[]'
  return `[${values
    .map(
      ({ series, value }) =>
        `${JSON.stringify(series)}=${formatPointerValue(value)}`,
    )
    .join(', ')}]`
}

function formatPointerValue(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : (JSON.stringify(value) ?? String(value))
}

async function runMemoryCell(
  context,
  serverUrl,
  benchmarkCase,
  sourceCount,
  benchmarkProfile,
) {
  const page = await context.newPage()
  const pageErrors = attachPageErrorCollector(page)
  await page.goto(serverUrl, { waitUntil: 'load' })
  const session = await context.newCDPSession(page)
  await page.evaluate(
    async ({
      moduleUrl,
      workload,
      count,
      profileName: selectedProfile,
      soakCycles,
    }) => {
      const {
        mount,
        createRollingFeed,
        createStressSource,
        prepareRollingSequence,
        prepareStressInput,
        prepareStressUpdate,
      } = await import(moduleUrl)
      const width = workload.id === 'dashboard-lines' ? 320 : 800
      const height = workload.id === 'dashboard-lines' ? 180 : 400
      const instances = workload.instances?.[selectedProfile] ?? 1
      const feed = workload.rollingWindow
        ? createRollingFeed(count, soakCycles + 1)
        : undefined
      const rollingInputs = feed
        ? prepareRollingSequence(feed, count, soakCycles + 1, width, height)
        : undefined
      const source =
        rollingInputs?.[0]?.input.rows ??
        createStressSource(workload.id, count, 0)
      const initial =
        rollingInputs?.[0] ??
        prepareStressInput(workload.id, source, width, height)
      const next =
        rollingInputs?.[1] ??
        prepareStressUpdate(
          workload.id,
          workload.updates.includes('same') ? 'same' : 'noop',
          source,
          initial,
          width,
          height,
        )
      globalThis.__stressMemory = {
        mount,
        feed,
        rollingInputs,
        initial,
        next,
        instances,
      }

      const containers = Array.from({ length: instances }, () => {
        const container = document.createElement('div')
        document.body.append(container)
        return container
      })
      const handles = containers.map((container) =>
        mount(container, initial.input),
      )
      await Promise.all(handles.map((handle) => handle.ready?.settled))
      for (const handle of handles) handle.destroy()
      for (const container of containers) container.remove()
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
    },
    {
      moduleUrl: `${serverUrl}cases/${benchmarkCase.id}.js`,
      workload: benchmarkCase.workload,
      count: sourceCount,
      profileName,
      soakCycles: benchmarkProfile.soakCycles,
    },
  )
  await session.send('HeapProfiler.collectGarbage')
  const before = await memorySnapshot(session)

  await page.evaluate(async (cycles) => {
    const { mount, initial, next, instances } = globalThis.__stressMemory
    for (let index = 0; index < cycles; index++) {
      const containers = Array.from({ length: instances }, () => {
        const container = document.createElement('div')
        document.body.append(container)
        return container
      })
      const handles = containers.map((container) =>
        mount(container, initial.input),
      )
      await Promise.all(handles.map((handle) => handle.ready?.settled))
      const operations = handles.map((handle) =>
        handle.update(index % 2 ? initial.input : next.input),
      )
      await Promise.all(operations.map((operation) => operation?.settled))
      for (const handle of handles) handle.destroy()
      for (const container of containers) container.remove()
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
    }
  }, benchmarkProfile.soakCycles)
  await session.send('HeapProfiler.collectGarbage')
  const after = await memorySnapshot(session)
  await page.evaluate(() => {
    delete globalThis.__stressMemory
  })
  pageErrors.assertNone()

  return {
    status: 'ok',
    cycles: benchmarkProfile.soakCycles,
    instances: benchmarkCase.workload.instances?.[profileName] ?? 1,
    before,
    after,
    delta: {
      usedHeapBytes: after.usedHeapBytes - before.usedHeapBytes,
      totalHeapBytes: after.totalHeapBytes - before.totalHeapBytes,
      documents: after.documents - before.documents,
      nodes: after.nodes - before.nodes,
      listeners: after.listeners - before.listeners,
    },
  }
}

async function memorySnapshot(session) {
  const [heap, dom] = await Promise.all([
    session.send('Runtime.getHeapUsage'),
    session.send('Memory.getDOMCounters'),
  ])
  return {
    usedHeapBytes: heap.usedSize,
    totalHeapBytes: heap.totalSize,
    documents: dom.documents,
    nodes: dom.nodes,
    listeners: dom.jsEventListeners,
  }
}

function createCells(workloads, libraries, selectedProfile) {
  return workloads.flatMap((workload, workloadIndex) =>
    workload.sourceCounts[selectedProfile].flatMap(
      (sourceCount, countIndex) => {
        const offset = (workloadIndex + countIndex) % libraries.length
        const ordered = [
          ...libraries.slice(offset),
          ...libraries.slice(0, offset),
        ]
        return ordered.map((library) => ({
          id: `${library.id}-${workload.id}-${sourceCount}`,
          library,
          workload,
          sourceCount,
        }))
      },
    ),
  )
}

function validateResults(results) {
  const failures = []
  const digests = new Map()
  for (const result of results) {
    if (result.status !== 'ok') {
      failures.push(`${result.id}: ${result.error}`)
      continue
    }
    const key = `${result.workload}:${result.sourceCount}`
    const prior = digests.get(key)
    if (prior && prior !== result.digest) {
      failures.push(
        `${result.id}: canonical digest ${result.digest} differs from ${prior}.`,
      )
    } else {
      digests.set(key, result.digest)
    }
    if (result.representedCount !== result.sourceCount) {
      failures.push(
        `${result.id}: represents ${result.representedCount} of ${result.sourceCount} source rows.`,
      )
    }
    if (result.pointer) {
      const initialPointerSamples = [
        ...(result.pointer.rawSamples ?? []),
        ...(result.pointer.sweep?.rawSamples ?? []),
      ]
      const initialPointerDetails = groupedPointerFailureDetails(
        initialPointerSamples,
        result.pointer.expectedSeries,
      )
      if (!result.pointer.trusted) {
        failures.push(`${result.id}: pointer events were not trusted.`)
      }
      if (!result.pointer.activated) {
        failures.push(`${result.id}: pointer probe did not activate a tooltip.`)
      }
      if (!result.pointer.signaturesPresent) {
        failures.push(
          `${result.id}: pointer probe did not expose a tooltip signature.`,
        )
      }
      if (
        result.pointer.groupedXFocus &&
        !result.pointer.groupedSeriesComplete
      ) {
        failures.push(
          `${result.id}: grouped x-focus did not expose every unique visible series. ${initialPointerDetails}`,
        )
      }
      if (result.pointer.groupedXFocus && !result.pointer.focusedXExact) {
        failures.push(
          `${result.id}: grouped x-focus selected the wrong canonical x value. ${initialPointerDetails}`,
        )
      }
      if (result.pointer.groupedXFocus && !result.pointer.seriesValuesExact) {
        failures.push(
          `${result.id}: grouped x-focus exposed stale or incorrect series values. ${initialPointerDetails}`,
        )
      }
      for (const state of result.pointer.updatedStates ?? []) {
        if (
          !state.samples.every(({ trusted, active }) => trusted && active) ||
          !state.groupedSeriesComplete ||
          !state.focusedXExact ||
          !state.seriesValuesExact
        ) {
          const details = groupedPointerFailureDetails(
            state.samples,
            state.expectedSeries,
          )
          failures.push(
            `${result.id}: ${state.state} pointer state failed exact grouped-value validation. ${details}`,
          )
        }
      }
      if (result.pointer.sweep) {
        if (!result.pointer.sweep.trusted) {
          failures.push(`${result.id}: pointer sweep events were not trusted.`)
        }
        if (!result.pointer.sweep.changed) {
          failures.push(
            `${result.id}: pointer sweep did not change tooltip state at every target.`,
          )
        }
        if (!result.pointer.sweep.active) {
          failures.push(
            `${result.id}: pointer sweep lost its active tooltip state.`,
          )
        }
      }
    }
    if (result.memory?.status === 'error') {
      failures.push(`${result.id}: memory soak ${result.memory.error}`)
    }
    if (result.burst && !result.burst.stable) {
      failures.push(`${result.id}: burst did not retain stable final output.`)
    }
  }
  return failures
}

function renderMarkdown(result) {
  const completed = completedResults(result.results)
  const ok = correctnessValidResults(result.results, result.failures)
  const retries = collectRetryRecords(result.results)
  const recoveries = retries.filter(({ recovery }) => recovery.recovered)
  const repeatedFailures = retries.filter(({ recovery }) => !recovery.recovered)
  const saneGroups = groupScenarios(
    ok.filter((row) => row.lane === 'product' || row.lane === 'encoded'),
  ).filter((rows) => rows.some((row) => row.library === 'tanstack'))
  const lines = [
    '# Chart library stress comparison',
    '',
    `Profile: **${result.profile}** · ${completed.length}/${result.results.length} cells completed · ${result.failures.length} correctness failures · ${recoveries.length} recovered retries`,
    '',
    'Raw rendering frontiers and bounded representations are separate lanes. Preparation excludes deterministic source generation; renderer timings exclude preparation.',
  ]
  if (saneGroups.length) {
    lines.push(
      '',
      '## Sane workload decision surface',
      '',
      '| Workload | Source | Fastest mount p95 | TanStack mount p95 | Relative | Fastest same-shape update p95 | TanStack update p95 | Frame budgets |',
      '| --- | ---: | --- | ---: | ---: | --- | ---: | --- |',
    )
    for (const rows of saneGroups) {
      const tanstack = rows.find((row) => row.library === 'tanstack')
      const fastestMount = [...rows].sort(
        (left, right) => left.mount.sync.p95Ms - right.mount.sync.p95Ms,
      )[0]
      const updates = rows
        .map((row) => ({
          row,
          update: row.updates.find((update) => update.kind === 'same'),
        }))
        .filter(({ update }) => update)
        .sort(
          (left, right) =>
            left.update.timing.sync.p95Ms - right.update.timing.sync.p95Ms,
        )
      const fastestUpdate = updates[0]
      const tanstackUpdate = tanstack.updates.find(
        (update) => update.kind === 'same',
      )
      const withinBudget =
        tanstack.mount.sync.p95Ms <= 16.7 &&
        tanstack.mount.settled.p95Ms <= 33.4 &&
        (!tanstackUpdate || tanstackUpdate.timing.sync.p95Ms <= 16.7)
      lines.push(
        `| ${tanstack.workloadLabel} | ${formatNumber(tanstack.sourceCount)} | ${fastestMount.libraryLabel} ${formatMs(fastestMount.mount.sync.p95Ms)} | ${formatMs(tanstack.mount.sync.p95Ms)} | ${(tanstack.mount.sync.p95Ms / fastestMount.mount.sync.p95Ms).toFixed(2)}× | ${fastestUpdate ? `${fastestUpdate.row.libraryLabel} ${formatMs(fastestUpdate.update.timing.sync.p95Ms)}` : '—'} | ${formatMs(tanstackUpdate?.timing.sync.p95Ms)} | ${withinBudget ? 'within' : 'over'} |`,
      )
    }
  }
  lines.push(
    '',
    '## Mount and representation',
    '',
    '| Lane | Workload | Source | Shape | Prepared rows | Compression | Instances | Library | Sync median | Sync p95 | First frame p95 | Settled p95 | Long tasks |',
    '| --- | --- | ---: | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const row of ok) {
    lines.push(
      `| ${row.lane} | ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.seriesCount ? `${formatNumber(row.seriesCount)}×${formatNumber(row.pointsPerSeries)}` : '—'} | ${formatNumber(row.preparedRowCount)} | ${(row.sourceCount / row.preparedRowCount).toFixed(1)}× | ${row.instances} | ${row.libraryLabel} | ${formatMs(row.mount.sync.medianMs)} | ${formatMs(row.mount.sync.p95Ms)} | ${formatMs(row.mount.firstFrame.p95Ms)} | ${formatMs(row.mount.settled.p95Ms)} | ${row.longTasks.count} |`,
    )
  }

  const viewportRows = ok
    .map((row) => ({
      row,
      update: row.updates.find((update) => update.kind === 'viewport'),
    }))
    .filter(({ update }) => update)
  if (viewportRows.length) {
    lines.push(
      '',
      '## Controlled viewport updates',
      '',
      '| Workload | Source | Library | Sync median | Sync p95 | Settled p95 |',
      '| --- | ---: | --- | ---: | ---: | ---: |',
      ...viewportRows.map(
        ({ row, update }) =>
          `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${formatMs(update.timing.sync.medianMs)} | ${formatMs(update.timing.sync.p95Ms)} | ${formatMs(update.timing.settled.p95Ms)} |`,
      ),
    )
  }

  lines.push(
    '',
    '## Updates',
    '',
    '| Workload | Source | Library | Shape | Prep median | Sync median | Sync p95 | Settled p95 |',
    '| --- | ---: | --- | --- | ---: | ---: | ---: | ---: |',
  )
  for (const row of ok) {
    for (const update of row.updates) {
      lines.push(
        `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${update.kind} | ${formatMs(update.preparation.medianMs)} | ${formatMs(update.timing.sync.medianMs)} | ${formatMs(update.timing.sync.p95Ms)} | ${formatMs(update.timing.settled.p95Ms)} |`,
      )
    }
  }

  lines.push(
    '',
    '## Output complexity',
    '',
    '| Workload | Source | Library | Series | Data paths | Probed items | Probed vertices | DOM/SVG elements | SVG paths | Circles | SVG bytes | Canvas pixels |',
    '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const row of ok) {
    lines.push(
      `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${formatOptionalNumber(sumProbeField(row.output.probes, 'seriesCount'))} | ${formatOptionalNumber(sumProbeField(row.output.probes, 'pathCount'))} | ${formatOptionalNumber(sumProbeField(row.output.probes, 'itemCount'))} | ${formatOptionalNumber(sumProbeField(row.output.probes, 'vertexCount'))} | ${formatNumber(row.output.elements)} | ${formatNumber(row.output.paths)} | ${formatNumber(row.output.circles)} | ${formatBytes(row.output.svgBytes)} | ${formatNumber(row.output.canvasPixels)} |`,
    )
  }

  const pointerRows = ok.filter((row) => row.pointer)
  const streamRows = ok.filter((row) => row.stream)
  const burstRows = ok.filter((row) => row.burst)
  const memoryRows = ok.filter((row) => row.memory?.status === 'ok')
  if (pointerRows.length) {
    lines.push(
      '',
      '## Trusted pointer response',
      '',
      '| Workload | Source | Library | Activation p95 | Active sweep p95 | Sweep states | Unique tooltip series | Exact x/values | Tooltip active |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- |',
      ...pointerRows.map(
        (row) =>
          `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${formatMs(row.pointer.timing.p95Ms)} | ${formatMs(row.pointer.sweep?.timing.p95Ms)} | ${formatOptionalNumber(row.pointer.sweep?.samples)} | ${row.pointer.groupedXFocus ? formatNumber(row.pointer.uniqueSeriesCount) : '—'} | ${row.pointer.groupedXFocus ? (row.pointer.focusedXExact && row.pointer.seriesValuesExact ? 'yes' : 'no') : '—'} | ${row.pointer.activated && row.pointer.groupedSeriesComplete && (row.pointer.sweep?.active ?? true) ? 'yes' : 'no'} |`,
      ),
    )
  }
  if (streamRows.length) {
    lines.push(
      '',
      '## Sustained updates',
      '',
      '| Workload | Source | Library | Updates/s | Sync p95 | Missed frames | Drain |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: |',
      ...streamRows.map(
        (row) =>
          `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${row.stream.updatesPerSecond.toFixed(1)} | ${formatMs(row.stream.sync.p95Ms)} | ${row.stream.missedFrames} | ${formatMs(row.stream.drainMs)} |`,
      ),
    )
  }
  if (burstRows.length) {
    lines.push(
      '',
      '## Latest-wins bursts',
      '',
      '| Workload | Source | Library | Revisions | Enqueue | Enqueues/s | Final first frame | Final settled | All-operation drain |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...burstRows.map(
        (row) =>
          `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${formatNumber(row.burst.revisions)} | ${formatMs(row.burst.enqueueMs)} | ${row.burst.enqueueUpdatesPerSecond.toFixed(1)} | ${formatMs(row.burst.finalFirstFrameMs)} | ${formatMs(row.burst.finalSettledMs)} | ${formatMs(row.burst.drainMs)} |`,
      ),
    )
  }

  const rollingRows = ok
    .map((row) => ({
      row,
      update: row.updates.find((update) => update.kind === 'roll'),
    }))
    .filter(({ update }) => update)
  if (rollingRows.length) {
    lines.push(
      '',
      '## Rolling keyed-node reuse',
      '',
      '| Workload | Source | Library | Observable | Reused survivors | Expected survivors | Ratio |',
      '| --- | ---: | --- | --- | ---: | ---: | ---: |',
      ...rollingRows.map(({ row, update }) => {
        const reuse = update.physicalReuse
        return `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${reuse?.supportedInstances ? 'yes' : 'no'} | ${formatOptionalNumber(reuse?.reused)} | ${formatOptionalNumber(reuse?.expected)} | ${reuse?.ratio === undefined ? '—' : `${(reuse.ratio * 100).toFixed(1)}%`} |`
      }),
    )
  }
  if (memoryRows.length) {
    lines.push(
      '',
      '## Lifecycle soak',
      '',
      '| Workload | Source | Library | Instances | Cycles | Retained JS heap delta | DOM node delta | Listener delta |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
      ...memoryRows.map(
        (row) =>
          `| ${row.workloadLabel} | ${formatNumber(row.sourceCount)} | ${row.libraryLabel} | ${row.memory.instances} | ${row.memory.cycles} | ${formatBytes(row.memory.delta.usedHeapBytes)} | ${row.memory.delta.nodes} | ${row.memory.delta.listeners} |`,
      ),
    )
  }

  lines.push(
    '',
    '## Interpretation',
    '',
    '- Product sync p95 at or below 16.7 ms and settled p95 at or below 33.4 ms are investigation thresholds, not cross-library CI gates.',
    '- Cells with correctness failures are retained in JSON but excluded from Markdown metrics and fastest-result comparisons.',
    '- Canvas pixels, SVG nodes, prepared rows, and source rows remain distinct metrics.',
    '- Pointer activation starts inactive; sweep timing starts active and ends only after the tooltip state changes at the next authored target.',
    '- Grouped pointer probes gate exact focused x and per-series values before and after reorder, append, and visibility updates.',
    '- Rolling streams await every monotonic revision. Bursts enqueue synchronously, drain every returned operation, and reject stale final output.',
    '- Memory covers JavaScript heap and DOM counters only; GPU and native canvas allocations are outside this protocol.',
    '- Compare timing only within this run and browser build.',
    '',
  )
  if (recoveries.length) {
    lines.push(
      '## Recovered transient cells',
      '',
      '| Cell | Phase | Attempts | First error |',
      '| --- | --- | ---: | --- |',
      ...recoveries.map(
        ({ id, phase, recovery }) =>
          `| ${id} | ${phase} | ${recovery.attempts} | ${escapeTableCell(recovery.errors[0])} |`,
      ),
      '',
    )
  }
  if (repeatedFailures.length) {
    lines.push(
      '## Persistent retried cells',
      '',
      '| Cell | Phase | Attempts | Attempt errors |',
      '| --- | --- | ---: | --- |',
      ...repeatedFailures.map(
        ({ id, phase, recovery }) =>
          `| ${id} | ${phase} | ${recovery.attempts} | ${recovery.errors.map(escapeTableCell).join('<br>')} |`,
      ),
      '',
    )
  }
  if (result.failures.length) {
    lines.push(
      '## Failures',
      '',
      ...result.failures.map((failure) => `- ${failure}`),
      '',
    )
  }
  return `${lines.join('\n')}\n`
}

function groupScenarios(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.workload}:${row.sourceCount}`
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()]
}

function sumProbeField(probes, field) {
  const values = probes
    .map((probe) => probe[field])
    .filter((value) => typeof value === 'number')
  return values.length
    ? values.reduce((total, value) => total + value, 0)
    : undefined
}

function escapeTableCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function validateConfiguration(value) {
  if (value.schemaVersion !== 1) {
    throw new Error(`Unsupported stress schema ${value.schemaVersion}.`)
  }
  for (const [profileName, profile] of Object.entries(value.profiles)) {
    if (
      !Number.isInteger(profile.burstRevisions) ||
      profile.burstRevisions <= 0
    ) {
      throw new Error(`${profileName} has no positive burst revision count.`)
    }
  }
  for (const workload of value.workloads) {
    for (const profileName of ['standard', 'full']) {
      const weight = workload.ciWeight?.[profileName]
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error(
          `${workload.id} has no positive ${profileName} CI weight.`,
        )
      }
    }
    if (!workload.updates.includes('noop')) {
      throw new Error(`${workload.id} has no no-op update.`)
    }
    if (
      workload.lane === 'encoded' &&
      !Number.isInteger(workload.maximumPreparedRows)
    ) {
      throw new Error(`${workload.id} has no prepared-row budget.`)
    }
    if (workload.multiSeries) {
      if (!workload.groupedXFocus || workload.chartType !== 'line') {
        throw new Error(
          `${workload.id} must use grouped x-focus on a line chart.`,
        )
      }
      for (const profileName of ['quick', 'standard', 'full']) {
        const shape = workload.seriesShape?.[profileName]
        const counts = workload.sourceCounts?.[profileName]
        if (
          !shape ||
          !Number.isInteger(shape.series) ||
          !Number.isInteger(shape.points) ||
          shape.series <= 0 ||
          shape.points <= 0 ||
          counts?.length !== 1 ||
          counts[0] !== shape.series * shape.points
        ) {
          throw new Error(
            `${workload.id} has an invalid ${profileName} series shape.`,
          )
        }
      }
    }
    if (workload.rollingWindow) {
      if (
        workload.id !== 'rolling-keyed-window' ||
        workload.chartType !== 'scatter' ||
        !workload.stream ||
        !workload.burst ||
        !workload.updates.includes('roll')
      ) {
        throw new Error(`${workload.id} has an invalid rolling-window shape.`)
      }
    }
  }
}

function summarizeNode(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return {
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    minimumMs: sorted[0],
    maximumMs: sorted.at(-1),
    rawSamples: values,
  }
}

function percentile(sorted, fraction) {
  if (!sorted.length) return undefined
  return sorted[
    Math.min(sorted.length - 1, Math.ceil((sorted.length - 1) * fraction))
  ]
}

async function packageVersion(library) {
  if (library.packagePath) {
    return JSON.parse(
      await readFile(resolve(root, library.packagePath), 'utf8'),
    ).version
  }
  try {
    return JSON.parse(
      await readFile(
        resolve(
          root,
          'node_modules',
          ...library.packageName.split('/'),
          'package.json',
        ),
        'utf8',
      ),
    ).version
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  const manifest = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  )
  const version =
    manifest.dependencies?.[library.packageName] ??
    manifest.devDependencies?.[library.packageName]
  if (typeof version === 'string' && /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(version))
    return version
  throw new Error(
    `Could not determine installed version for ${library.packageName}.`,
  )
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

function formatMs(value) {
  return value === undefined ? '—' : `${value.toFixed(2)} ms`
}

function formatBytes(value) {
  const sign = value < 0 ? '-' : ''
  return `${sign}${(Math.abs(value) / 1024).toFixed(2)} kB`
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatOptionalNumber(value) {
  return value === undefined ? '—' : formatNumber(value)
}
