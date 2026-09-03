import { createHash } from 'node:crypto'
import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'
import ts from 'typescript'
import { isExactNpmPackageVersion } from './package-version.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const chartsPackageVersion = JSON.parse(
  await readFile(
    resolve(repositoryRoot, 'packages/charts-core/package.json'),
    'utf8',
  ),
).version
if (!isExactNpmPackageVersion(chartsPackageVersion)) {
  throw new TypeError('@tanstack/charts requires a package version')
}
const cohortRoot = resolve(
  repositoryRoot,
  '.benchmark-output/conformance/ai/smoke-v1',
)
const runsRoot = resolve(cohortRoot, 'runs')
const currentRunPath = resolve(cohortRoot, 'current-run.json')
const defaultWorkspaceRoot = resolve(
  process.platform === 'darwin' ? '/private/tmp' : tmpdir(),
  'tanstack-charts-ai',
)
const rootModules = resolve(repositoryRoot, 'node_modules')
const seed = 'plot-catalog-authoring-smoke-v1'
const rendererIds = ['observable-plot', 'tanstack']
const captureByteLimit = 2 * 1024 * 1024
const terminationGraceMs = 5_000

const cases = [
  {
    id: 'bar-vertical-sorted',
    title: 'Sorted vertical bars',
    ariaLabel: 'Sorted vertical bars',
    task: 'Create a vertical bar chart that totals the raw rows by category and sorts categories from largest total to smallest.',
    requirements: [
      'Render exactly eight category bars from the supplied raw rows.',
      'Aggregate value by category; do not hard-code the totals.',
      'Order categories from largest total to smallest.',
      'Use y domain [0, 140], a zero baseline, and every category label.',
      'Use a 640 × 360 chart and the accessible name “Sorted vertical bars”.',
    ],
    categoryOrder: [
      'Router',
      'Start',
      'DB',
      'Table',
      'Virtual',
      'Query',
      'Form',
      'Store',
    ],
    expectedCount: 8,
  },
  {
    id: 'histogram',
    title: 'Histogram',
    ariaLabel: 'Histogram of values',
    task: 'Create a histogram of the value field using the fixed bin boundaries 20, 30, 40, 50, 60, 70, 80, and 90.',
    requirements: [
      'Render exactly seven bins from the supplied raw rows.',
      'Use the complete boundary sequence 20, 30, 40, 50, 60, 70, 80, 90.',
      'Use x domain [20, 90], y domain [0, 80], and a zero baseline.',
      'Use a 640 × 360 chart and the accessible name “Histogram of values”.',
    ],
    boundaries: [20, 30, 40, 50, 60, 70, 80, 90],
    expectedCount: 7,
  },
]

const action = process.argv[2]

if (!['prepare', 'run', 'score'].includes(action)) {
  process.stderr.write(
    [
      'Usage: node scripts/evaluate-chart-authoring.mjs <prepare|run|score>',
      '',
      'prepare  create a new immutable run without invoking an agent',
      'run      create a run, invoke the configured agent, then score it',
      'score    score --run-id=<id>, or the current prepared run',
      '',
    ].join('\n'),
  )
  process.exitCode = 1
} else if (action === 'prepare') {
  const context = await prepare()
  printPrepared(context)
} else if (action === 'run') {
  const context = await prepare()
  await runAgents(context)
  const report = await score(context)
  printReport(report, context)
} else {
  const context = await readRunContext()
  const report = await score(context)
  printReport(report, context)
}

async function prepare() {
  await assertRootDependencies()
  await mkdir(runsRoot, { recursive: true })
  const runId = optionValue('--run-id') ?? timestampRunId()
  validateRunId(runId)
  const runDirectory = resolve(runsRoot, runId)
  await mkdir(runDirectory)
  const workspaceBase = resolve(
    process.env.AI_AUTHORING_WORKSPACE_ROOT ?? defaultWorkspaceRoot,
  )
  await mkdir(workspaceBase, { recursive: true })
  const workspaceRoot = resolve(workspaceBase, runId)
  await mkdir(workspaceRoot)

  const jobs = seededShuffle(
    cases.flatMap((entry) =>
      rendererIds.map((renderer) => ({
        caseId: entry.id,
        renderer,
      })),
    ),
    seed,
  )

  const manifest = {
    schemaVersion: 1,
    cohort: 'smoke-v1',
    repetition: 1,
    runId,
    seed,
    workspaceRoot,
    preparedAt: new Date().toISOString(),
    node: process.version,
    jobs: [],
  }

  for (const [index, job] of jobs.entries()) {
    const entry = getCase(job.caseId)
    const workspaceName = `${String(index + 1).padStart(2, '0')}-${entry.id}-${job.renderer}`
    const workspace = resolve(workspaceRoot, workspaceName)
    const protectedFiles = await writeWorkspace(workspace, entry, job.renderer)
    manifest.jobs.push({
      ...job,
      order: index + 1,
      workspace,
      workspaceName,
      protectedFiles,
    })
  }

  const manifestPath = resolve(runDirectory, 'manifest.json')
  await writeJson(manifestPath, manifest)
  await mkdir(cohortRoot, { recursive: true })
  await writeJson(currentRunPath, { runId })
  return { manifest, runDirectory, manifestPath }
}

async function writeWorkspace(workspace, entry, renderer) {
  await mkdir(resolve(workspace, 'src'), { recursive: true })
  const files = workspaceFiles(entry, renderer)

  for (const [path, contents] of Object.entries(files)) {
    const target = resolve(workspace, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, contents)
  }

  await symlink(rootModules, resolve(workspace, 'node_modules'), 'dir')

  const protectedFiles = Object.fromEntries(
    await Promise.all(
      Object.keys(files)
        .filter((path) => path !== 'src/candidate.ts')
        .map(async (path) => [
          path,
          sha256(await readFile(resolve(workspace, path))),
        ]),
    ),
  )
  const harnessPath = resolve(workspace, '.harness.json')
  await writeJson(harnessPath, {
    schemaVersion: 1,
    caseId: entry.id,
    renderer,
    editable: ['src/candidate.ts'],
    protectedFiles: Object.keys(protectedFiles),
    note: 'Informational only. Canonical hashes live in the parent run manifest.',
  })
  protectedFiles['.harness.json'] = sha256(await readFile(harnessPath))
  return protectedFiles
}

function workspaceFiles(entry, renderer) {
  const packageDependencies =
    renderer === 'observable-plot'
      ? {
          '@observablehq/plot': '0.6.17',
        }
      : {
          '@tanstack/charts': chartsPackageVersion,
          'd3-scale': '4.0.2',
        }

  return {
    'TASK.md': renderTask(entry, renderer),
    'RENDERER.md': renderRendererDocs(entry, renderer),
    'PROMPT.md': renderPrompt(entry, renderer),
    'package.json': `${JSON.stringify(
      {
        name: `charts-ai-smoke-${entry.id}-${renderer}`,
        private: true,
        type: 'module',
        scripts: {
          typecheck: 'tsc --noEmit -p tsconfig.json',
          build: 'vite build --base=./',
        },
        dependencies: packageDependencies,
        devDependencies: {
          typescript: '^6.0.0',
          vite: '^8.0.16',
        },
      },
      null,
      2,
    )}\n`,
    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          noEmit: true,
          isolatedModules: true,
          verbatimModuleSyntax: true,
          skipLibCheck: true,
          types: [],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${entry.title}</title>
    <style>
      html, body { margin: 0; font: 14px/1.4 system-ui, sans-serif; }
      #chart { width: 640px; height: 360px; }
    </style>
  </head>
  <body>
    <div id="chart"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    'src/contracts.ts': `export interface ChartInput {
  width: number
  height: number
}

export interface ChartHandle {
  destroy: () => void
}

export type MountCandidate = (
  container: HTMLElement,
  input: ChartInput,
) => ChartHandle
`,
    'src/data.ts': renderData(entry),
    'src/main.ts': `import { mount } from './candidate'

const container = document.querySelector<HTMLElement>('#chart')
if (!container) throw new Error('Missing chart container')

const handle = mount(container, { width: 640, height: 360 })
document.documentElement.dataset.chartReady = 'true'
window.addEventListener('pagehide', () => handle.destroy(), { once: true })
`,
    'src/candidate.ts': `import type { MountCandidate } from './contracts'

export const mount: MountCandidate = () => {
  throw new Error('Implement this chart in src/candidate.ts')
}
`,
  }
}

function renderTask(entry, renderer) {
  return `# ${entry.title}

Renderer: ${renderer === 'observable-plot' ? 'Observable Plot' : 'TanStack Charts'}

${entry.task}

## Acceptance contract

${entry.requirements.map((requirement) => `- ${requirement}`).join('\n')}

Implement only \`src/candidate.ts\`. You may add helper source files inside
\`src/\`, but do not modify the task, renderer notes, data, contracts, package
configuration, or host scaffold. Use only the assigned renderer. Do not read or
import files outside this workspace.

The workspace is offline and already linked to its pinned dependencies. Run:

\`\`\`sh
npm run typecheck
npm run build
\`\`\`

Do not use type assertions, TypeScript suppressions, manual SVG/DOM drawing, an
umbrella \`d3\` import, or private package paths.
`
}

function renderPrompt(entry, renderer) {
  return `Work only in the current workspace.

Read TASK.md, RENDERER.md, src/data.ts, and src/contracts.ts. Implement the
${entry.title} task in src/candidate.ts using ${renderer === 'observable-plot' ? 'Observable Plot' : 'TanStack Charts'}. Preserve every other file. Validate with the supplied npm scripts, then stop.
`
}

function renderRendererDocs(entry, renderer) {
  if (renderer === 'observable-plot') {
    return `# Routed Observable Plot notes

Pinned package: \`@observablehq/plot@0.6.17\`.

This offline synopsis is pinned from Observable Plot’s public mark and
transform documentation. Provenance:
\`https://observablehq.com/plot/marks/${entry.id === 'bar-vertical-sorted' ? 'bar' : 'rect'}\`.

- Import the namespace from \`@observablehq/plot\`.
- \`Plot.plot(options)\` returns the chart element. Append it to the supplied
  container and remove it from \`destroy\`.
- Pass \`width\`, \`height\`, and \`ariaLabel\` to \`Plot.plot\`.
- Quantitative and categorical axes are configured with the \`x\` and \`y\`
  options. Explicit domains and \`nice: false\` preserve fixed comparisons.
${
  entry.id === 'bar-vertical-sorted'
    ? `- \`Plot.groupX(outputs, options)\` groups rows by x. The \`sum\` reducer totals a quantitative field. A descending aggregate sort uses \`sort: { x: '-y' }\`.
- Feed the grouped transform to \`Plot.barY(data, options)\`.`
    : `- \`Plot.binX(outputs, options)\` bins a quantitative x channel. \`{ y: 'count' }\` counts rows.
- Feed the bin transform to \`Plot.rectY(data, options)\`.
- Here, the explicit threshold array is the complete boundary sequence.`
}

Use the public package declarations for exact option types. These notes describe
the relevant primitives, not a complete implementation.
`
  }

  return `# Routed TanStack Charts notes

Pinned packages: \`@tanstack/charts@${chartsPackageVersion}\`,
\`d3-scale@4.0.2\`.

This offline synopsis is pinned from the package README and task-oriented
recipes shipped with the local package.

- Marks consume materialized rows; keep TanStack data transforms beside the
  definition and memoize them through application reactivity.
- \`defineChart({ marks, scales: { x, y }, svgAnimation: false, keyboard: false })\` creates a
  static definition. Chart behavior belongs to the definition.
- Each materialized positional dimension requires a D3 scale factory or
  configured instance. A factory infers its domain from mark channels; an
  instance keeps its authored domain. TanStack owns responsive pixel ranges.
- \`mountChart(container, { definition, width, height, ariaLabel })\` returns a
  host with \`destroy()\`.
${
  entry.id === 'bar-vertical-sorted'
    ? `- Use \`groupBy\` from \`@tanstack/charts\` with a named \`sum\` output to aggregate the raw rows.
- \`barY(rows, { x, y, key, fill, inset })\` renders vertical bars.
- Sort the aggregated rows from largest to smallest, then use a \`scaleBand\`
  factory to infer that category order.
- Use a configured \`scaleLinear().domain([0, 140])\` instance for the required
  fixed y domain.`
    : `- Use \`binX\` from \`@tanstack/charts\`. Its threshold array is the complete boundary sequence, including the outer boundaries.
- \`rect(rows, { x1, x2, y1, y2, key, fill, inset })\` renders interval rectangles.
- Use configured \`scaleLinear\` instances for the required x domain
  \`[20, 90]\` and y domain \`[0, 80]\`.`
}

Use the public package declarations for exact option types. These notes describe
the relevant primitives, not a complete implementation.
`
}

function renderData(entry, revision = 0) {
  if (entry.id === 'bar-vertical-sorted') {
    return `export interface CategoryRow {
  id: string
  category: string
  value: number
  series: 'Desktop' | 'Mobile' | 'Tablet'
}

export const rows: readonly CategoryRow[] = ${JSON.stringify(categoryRows(revision), null, 2)}
`
  }

  return `export interface DistributionRow {
  id: number
  value: number
  group: 'A' | 'B'
}

export const rows: readonly DistributionRow[] = ${JSON.stringify(distributionRows(revision), null, 2)}
`
}

async function runAgents(context) {
  const { manifest } = context
  const command = process.env.AI_AUTHORING_AGENT_COMMAND
  if (!command) {
    throw new Error(
      'AI_AUTHORING_AGENT_COMMAND is required for the explicit run action.',
    )
  }
  const args = parseAgentArgs(process.env.AI_AUTHORING_AGENT_ARGS_JSON)
  const timeoutMs = positiveInteger(
    process.env.AI_AUTHORING_TIMEOUT_MS,
    300_000,
  )

  for (const job of manifest.jobs) {
    const workspace = job.workspace
    const promptPath = resolve(workspace, 'PROMPT.md')
    const prompt = await readFile(promptPath, 'utf8')
    const expandedArgs = args.map((argument) =>
      argument
        .replaceAll('{workspace}', workspace)
        .replaceAll('{promptFile}', promptPath),
    )
    const startedAt = new Date().toISOString()
    const result = await runCommand(command, expandedArgs, {
      cwd: workspace,
      input: prompt,
      timeoutMs,
      replaceEnv: true,
      env: agentEnvironment({
        AI_AUTHORING_WORKSPACE: workspace,
        AI_AUTHORING_PROMPT_FILE: promptPath,
        AI_AUTHORING_NODE_MODULES: rootModules,
        AI_AUTHORING_CHARTS_PACKAGE: resolve(
          repositoryRoot,
          'packages/charts-core',
        ),
      }),
    })
    await writeFile(resolve(workspace, 'agent.stdout.log'), result.stdout)
    await writeFile(resolve(workspace, 'agent.stderr.log'), result.stderr)
    await writeJson(resolve(workspace, 'agent-run.json'), {
      command,
      args: expandedArgs,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      stdoutBytes: result.stdoutBytes,
      stderrBytes: result.stderrBytes,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated,
      codexJson: result.codexJson,
    })
  }
}

async function score(context) {
  const { manifest, runDirectory } = context
  const results = []

  for (const job of manifest.jobs) {
    const workspace = job.workspace
    const protection = await checkProtection(workspace, job.protectedFiles)
    const source = await scanCandidateSource(workspace, job, job.protectedFiles)
    const typecheck = await runCommand(
      'npm',
      ['run', 'typecheck', '--', '--pretty', 'false'],
      {
        cwd: workspace,
        timeoutMs: 60_000,
      },
    )
    const build = await runCommand('npm', ['run', 'build'], {
      cwd: workspace,
      timeoutMs: 60_000,
    })
    const buildScore = commandScore(build)
    buildScore.javascript = buildScore.pass
      ? await measureBuiltJavascript(resolve(workspace, 'dist'))
      : null
    const alternateBuild = buildScore.pass
      ? await buildAlternateDataset(workspace, getCase(job.caseId))
      : skippedCommandScore('initial build failed')
    const postBuildProtection = await checkProtection(
      workspace,
      job.protectedFiles,
    )
    protection.afterBuildChanged = postBuildProtection.changed
    protection.changed = [
      ...new Set([...protection.changed, ...postBuildProtection.changed]),
    ]
    protection.pass = protection.pass && postBuildProtection.pass
    const agentRun = await readOptionalJson(
      resolve(workspace, 'agent-run.json'),
    )
    results.push({
      ...job,
      workspace,
      protection,
      source,
      typecheck: commandScore(typecheck),
      build: buildScore,
      alternateBuild,
      agent: agentRun
        ? {
            ...agentRun,
            stdout: relative(
              repositoryRoot,
              resolve(workspace, 'agent.stdout.log'),
            ),
            stderr: relative(
              repositoryRoot,
              resolve(workspace, 'agent.stderr.log'),
            ),
          }
        : null,
      browser: null,
    })
  }

  const runnable = results.filter(
    (result) => result.build.pass && result.alternateBuild.pass,
  )
  if (runnable.length) {
    let browser
    try {
      browser = await launchBrowser()
    } catch (error) {
      for (const result of runnable) {
        result.browser = browserException(error, 'browser launch')
      }
    }
    if (browser) {
      try {
        for (const result of runnable) {
          try {
            const initial = await inspectWorkspace(browser, result, {
              label: 'initial',
              revision: 0,
              outputDirectory: 'dist',
            })
            const alternate = await inspectWorkspace(browser, result, {
              label: 'alternate',
              revision: 1,
              outputDirectory: 'dist-alternate',
            })
            result.browser = {
              pass: initial.pass && alternate.pass,
              initial,
              alternate,
            }
          } catch (error) {
            result.browser = browserException(error, 'workspace inspection')
          }
        }
      } finally {
        await browser.close().catch(() => {})
      }
    }
  }

  for (const result of results) {
    result.pass =
      result.protection.pass &&
      result.source.pass &&
      result.typecheck.pass &&
      result.build.pass &&
      result.alternateBuild.pass &&
      Boolean(result.browser?.pass)
    result.evidence = await preserveEvidence(result, runDirectory)
    if (result.agent) {
      result.agent.stdout = `${result.evidence}/agent.stdout.log`
      result.agent.stderr = `${result.evidence}/agent.stderr.log`
    }
  }

  const report = {
    schemaVersion: 1,
    cohort: manifest.cohort,
    runId: manifest.runId,
    seed: manifest.seed,
    repetition: manifest.repetition,
    scoredAt: new Date().toISOString(),
    summary: {
      passed: results.filter((result) => result.pass).length,
      total: results.length,
      passRate:
        results.length > 0
          ? results.filter((result) => result.pass).length / results.length
          : 0,
      agentRuns: results.filter((result) => result.agent).length,
      codexJson: summarizeCodexMetrics(results),
    },
    results,
  }
  const reportJsonPath = resolve(runDirectory, 'report.json')
  const reportMarkdownPath = resolve(runDirectory, 'report.md')
  await writeJson(reportJsonPath, report)
  await writeFile(reportMarkdownPath, renderReport(report))
  return report
}

async function preserveEvidence(result, runDirectory) {
  const destination = resolve(
    runDirectory,
    'evidence',
    `${String(result.order).padStart(2, '0')}-${result.caseId}-${result.renderer}`,
  )
  await mkdir(destination, { recursive: true })
  for (const path of [
    'TASK.md',
    'RENDERER.md',
    'PROMPT.md',
    'package.json',
    'tsconfig.json',
    'index.html',
    '.harness.json',
    'src',
    'agent.stdout.log',
    'agent.stderr.log',
    'agent-run.json',
    'score-initial.png',
    'score-alternate.png',
  ]) {
    await copyIfExists(
      resolve(result.workspace, path),
      resolve(destination, path),
    )
  }
  return relative(repositoryRoot, destination)
}

async function copyIfExists(source, destination) {
  try {
    await stat(source)
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return
    throw error
  }
  await mkdir(dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true, force: true })
}

async function buildAlternateDataset(workspace, entry) {
  const dataPath = resolve(workspace, 'src/data.ts')
  const original = await readFile(dataPath, 'utf8')
  let result
  try {
    await writeFile(dataPath, renderData(entry, 1))
    result = await runCommand(
      'npm',
      ['run', 'build', '--', '--outDir', 'dist-alternate'],
      {
        cwd: workspace,
        timeoutMs: 60_000,
      },
    )
  } finally {
    await writeFile(dataPath, original)
  }
  const scored = commandScore(result)
  scored.javascript = scored.pass
    ? await measureBuiltJavascript(resolve(workspace, 'dist-alternate'))
    : null
  return scored
}

function browserException(error, stage) {
  return {
    pass: false,
    stage,
    error: errorMessage(error),
    initial: null,
    alternate: null,
  }
}

async function launchBrowser() {
  const options = {
    headless: true,
    args: ['--force-device-scale-factor=1'],
  }
  try {
    return await chromium.launch(options)
  } catch (error) {
    throw new Error(
      'Playwright Chromium failed to launch. Install the matching headless browser with "pnpm browser:install".',
      { cause: error },
    )
  }
}

async function inspectWorkspace(browser, result, variant) {
  const workspace = result.workspace
  const server = await serveDirectory(
    resolve(workspace, variant.outputDirectory),
  )
  let page
  const errors = []

  try {
    page = await browser.newPage({
      viewport: { width: 700, height: 420 },
      deviceScaleFactor: 1,
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const response = await page.goto(server.url, { waitUntil: 'load' })
    const ready = await page
      .waitForSelector('html[data-chart-ready="true"]', { timeout: 2_500 })
      .then(() => true)
      .catch(() => false)
    await page.screenshot({
      path: resolve(workspace, `score-${variant.label}.png`),
      fullPage: true,
    })

    const entry = getCase(result.caseId)
    const inspection = await page.evaluate(
      ({ renderer, caseId, expectedCount }) => {
        const container = document.querySelector('#chart')
        const svgs = container ? [...container.querySelectorAll('svg')] : []
        const svg = svgs.sort((left, right) => {
          const leftBounds = left.getBoundingClientRect()
          const rightBounds = right.getBoundingClientRect()
          return (
            rightBounds.width * rightBounds.height -
            leftBounds.width * leftBounds.height
          )
        })[0]
        const selector =
          caseId === 'bar-vertical-sorted'
            ? renderer === 'observable-plot'
              ? '[aria-label="bar"] rect'
              : '.ts-chart__bar rect'
            : renderer === 'observable-plot'
              ? '[aria-label="rect"] rect'
              : '.ts-chart__rect rect'
        const elements = container
          ? [...container.querySelectorAll(selector)]
          : []
        const boxes = elements
          .map((element) => {
            const bounds = element.getBoundingClientRect()
            return {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            }
          })
          .sort((left, right) => left.x - right.x)
        const xTickSelector =
          renderer === 'observable-plot'
            ? '[aria-label="x-axis tick label"] text'
            : '.ts-chart__axes [data-ts-key^="x-tick-label"]'
        const yTickSelector =
          renderer === 'observable-plot'
            ? '[aria-label="y-axis tick label"] text'
            : '.ts-chart__axes [data-ts-key^="y-tick-label"]'
        const xLabels = container
          ? [...container.querySelectorAll(xTickSelector)]
              .map((element) => element.textContent?.trim() ?? '')
              .filter(Boolean)
          : []
        const yLabels = container
          ? [...container.querySelectorAll(yTickSelector)]
              .map((element) => element.textContent?.trim() ?? '')
              .filter(Boolean)
          : []
        const svgBounds = svg?.getBoundingClientRect()
        const viewBox = svg?.getAttribute('viewBox')
        const viewBoxValues = viewBox
          ?.trim()
          .split(/[\s,]+/)
          .map(Number)

        return {
          expectedCount,
          actualCount: elements.length,
          boxes,
          xLabels,
          yLabels,
          dimensions: {
            widthAttribute: svg?.getAttribute('width') ?? null,
            heightAttribute: svg?.getAttribute('height') ?? null,
            viewBox: viewBox ?? null,
            logicalWidth:
              viewBoxValues?.length === 4 &&
              viewBoxValues.every(Number.isFinite)
                ? (viewBoxValues[2] ?? null)
                : Number(svg?.getAttribute('width')),
            logicalHeight:
              viewBoxValues?.length === 4 &&
              viewBoxValues.every(Number.isFinite)
                ? (viewBoxValues[3] ?? null)
                : Number(svg?.getAttribute('height')),
            renderedWidth: svgBounds?.width ?? null,
            renderedHeight: svgBounds?.height ?? null,
          },
          accessibleName:
            svg?.getAttribute('aria-label') ??
            svg?.querySelector('title')?.textContent?.trim() ??
            null,
        }
      },
      {
        renderer: result.renderer,
        caseId: result.caseId,
        expectedCount: entry.expectedCount,
      },
    )

    const nonzeroGeometry =
      inspection.boxes.length === entry.expectedCount &&
      inspection.boxes.every((box) => box.width > 0.5 && box.height > 0.5)
    const geometry =
      entry.id === 'bar-vertical-sorted'
        ? scoreBarGeometry(
            inspection.boxes,
            entry,
            nonzeroGeometry,
            variant.revision,
          )
        : scoreHistogramGeometry(inspection.boxes, entry, variant.revision)
    const expectedOrder =
      entry.id === 'bar-vertical-sorted'
        ? categoryOrder(variant.revision)
        : null
    const order =
      entry.id === 'bar-vertical-sorted'
        ? {
            expected: expectedOrder,
            actual: inspection.xLabels,
            pass:
              inspection.xLabels.join('\u0000') ===
              expectedOrder?.join('\u0000'),
          }
        : {
            expected:
              'seven ascending equal-width bins with correct frequencies',
            actual: inspection.boxes.map((box) => ({
              x: round(box.x),
              width: round(box.width),
              height: round(box.height),
            })),
            pass: geometry.pass,
          }
    const dimensions = scoreDimensions(inspection.dimensions)
    const axes = scoreAxes(inspection, entry)

    return {
      pass:
        response?.ok() === true &&
        ready &&
        errors.length === 0 &&
        inspection.accessibleName === entry.ariaLabel &&
        geometry.pass &&
        order.pass &&
        dimensions.pass &&
        axes.pass,
      variant,
      httpOk: response?.ok() === true,
      ready,
      errors,
      accessibleName: {
        expected: entry.ariaLabel,
        actual: inspection.accessibleName,
        pass: inspection.accessibleName === entry.ariaLabel,
      },
      geometry,
      order,
      dimensions,
      axes,
      actualCount: inspection.actualCount,
    }
  } finally {
    await page?.close().catch(() => {})
    await server.close().catch(() => {})
  }
}

function scoreDimensions(dimensions) {
  const pass =
    closeTo(dimensions.logicalWidth, 640, 0.5) &&
    closeTo(dimensions.logicalHeight, 360, 0.5) &&
    closeTo(dimensions.renderedWidth, 640, 1) &&
    closeTo(dimensions.renderedHeight, 360, 1)
  return {
    ...dimensions,
    expected: {
      logicalWidth: 640,
      logicalHeight: 360,
      renderedWidth: 640,
      renderedHeight: 360,
    },
    pass,
  }
}

function scoreAxes(inspection, entry) {
  if (entry.id === 'bar-vertical-sorted') {
    const yValues = numericLabels(inspection.yLabels)
    return {
      expected: { yIncludes: [0, 140] },
      xLabels: inspection.xLabels,
      yLabels: inspection.yLabels,
      pass: includesApprox(yValues, 0) && includesApprox(yValues, 140),
    }
  }
  const xValues = numericLabels(inspection.xLabels)
  const yValues = numericLabels(inspection.yLabels)
  return {
    expected: { xIncludes: [20, 90], yIncludes: [0, 80] },
    xLabels: inspection.xLabels,
    yLabels: inspection.yLabels,
    pass:
      includesApprox(xValues, 20) &&
      includesApprox(xValues, 90) &&
      includesApprox(yValues, 0) &&
      includesApprox(yValues, 80),
  }
}

function scoreBarGeometry(boxes, entry, nonzeroGeometry, revision) {
  if (!nonzeroGeometry) {
    return {
      pass: false,
      reason: `expected ${entry.expectedCount} nonzero bars`,
      valueCorrelation: null,
      baselineSpread: null,
    }
  }
  const totals = new Map()
  for (const row of categoryRows(revision)) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.value)
  }
  const expectedValues = categoryOrder(revision).map(
    (category) => totals.get(category) ?? 0,
  )
  const valueCorrelation = correlation(
    expectedValues,
    boxes.map((box) => box.height),
  )
  const baselines = boxes.map((box) => box.y + box.height)
  const baselineSpread = Math.max(...baselines) - Math.min(...baselines)
  const pass =
    valueCorrelation !== null &&
    valueCorrelation >= 0.995 &&
    baselineSpread <= 1
  return {
    pass,
    reason: pass
      ? null
      : 'bar heights did not match aggregate totals or a shared zero baseline',
    valueCorrelation,
    baselineSpread,
  }
}

function scoreHistogramGeometry(boxes, entry, revision) {
  if (
    boxes.length !== entry.expectedCount ||
    boxes.some((box) => box.width <= 0.5 || box.height <= 0.5)
  ) {
    return {
      pass: false,
      reason: `expected ${entry.expectedCount} nonzero bins`,
      frequencyCorrelation: null,
      widthVariation: null,
      baselineSpread: null,
    }
  }

  const widths = boxes.map((box) => box.width)
  const meanWidth = mean(widths)
  const widthVariation =
    meanWidth > 0
      ? Math.max(...widths.map((width) => Math.abs(width - meanWidth))) /
        meanWidth
      : Infinity
  const expectedCounts = histogramCounts(
    distributionRows(revision),
    entry.boundaries,
  )
  const frequencyCorrelation = correlation(
    expectedCounts,
    boxes.map((box) => box.height),
  )
  const nonoverlapping = boxes.every((box, index) => {
    if (index === 0) return true
    const previous = boxes[index - 1]
    return previous ? box.x >= previous.x + previous.width - 2.5 : false
  })
  const baselines = boxes.map((box) => box.y + box.height)
  const baselineSpread = Math.max(...baselines) - Math.min(...baselines)
  const pass =
    nonoverlapping &&
    widthVariation <= 0.08 &&
    frequencyCorrelation !== null &&
    frequencyCorrelation >= 0.995 &&
    baselineSpread <= 1

  return {
    pass,
    reason: pass
      ? null
      : 'bin widths, order, or frequency geometry did not match the fixed boundaries',
    frequencyCorrelation,
    widthVariation,
    baselineSpread,
  }
}

async function checkProtection(workspace, protectedFiles) {
  const changed = []
  for (const [path, expectedHash] of Object.entries(protectedFiles)) {
    let actualHash
    try {
      actualHash = sha256(await readFile(resolve(workspace, path)))
    } catch {
      actualHash = null
    }
    if (actualHash !== expectedHash) changed.push(path)
  }
  return {
    pass: changed.length === 0,
    changed,
  }
}

async function scanCandidateSource(workspace, job, protectedFiles) {
  const protectedPaths = new Set(Object.keys(protectedFiles))
  const files = (await sourceFiles(workspace)).filter(
    (path) => !protectedPaths.has(relative(workspace, path)),
  )
  const violations = []
  const contents = []
  const imports = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    contents.push(source)
    const path = relative(workspace, file)
    if (!path.startsWith(`src${sep}`)) {
      violations.push(`${path}: candidate code must stay inside src`)
    }

    const analysis = analyzeSource(source, file)
    imports.push(...analysis.imports.map((specifier) => ({ path, specifier })))
    if (analysis.unsafeAssertions) {
      violations.push(`${path}: unsafe type assertion`)
    }
    if (analysis.manualDrawing) {
      violations.push(`${path}: manual SVG/DOM drawing`)
    }
    if (/@ts-(?:ignore|expect-error|nocheck)/.test(source)) {
      violations.push(`${path}: TypeScript suppression`)
    }
    if (/benchmarks\/conformance\/cases|GitHub\/charts/.test(source)) {
      violations.push(`${path}: repository implementation reference`)
    }
  }

  for (const { path, specifier } of imports) {
    if (
      specifier.startsWith('/') ||
      specifier.startsWith('file:') ||
      specifier.startsWith('http:')
    ) {
      violations.push(`${path}: external path import ${specifier}`)
    } else if (specifier.startsWith('.')) {
      const target = resolve(workspace, dirname(path), specifier)
      if (!inside(workspace, target)) {
        violations.push(`${path}: import escapes workspace ${specifier}`)
      }
    }
    if (specifier === 'd3') {
      violations.push(`${path}: umbrella d3 import`)
    }
    if (/^(?:node:)?(?:fs|child_process|vm)(?:\/|$)/.test(specifier)) {
      violations.push(`${path}: Node capability import ${specifier}`)
    }
    if (
      /^(?:@tanstack\/charts|@observablehq\/plot)\/(?:src|dist|internal)(?:\/|$)/.test(
        specifier,
      )
    ) {
      violations.push(`${path}: private package import ${specifier}`)
    }
  }

  const moduleSpecifiers = imports.map((entry) => entry.specifier)
  const importsPlot = moduleSpecifiers.includes('@observablehq/plot')
  const importsTanstack = moduleSpecifiers.some(
    (specifier) =>
      specifier === '@tanstack/charts' ||
      specifier.startsWith('@tanstack/charts/'),
  )
  if (job.renderer === 'observable-plot') {
    if (!importsPlot) {
      violations.push('candidate does not import @observablehq/plot')
    }
    if (importsTanstack) {
      violations.push('candidate imports the comparison renderer')
    }
  } else {
    if (!importsTanstack) {
      violations.push('candidate does not import @tanstack/charts')
    }
    if (importsPlot) {
      violations.push('candidate imports the comparison renderer')
    }
  }

  return {
    pass: violations.length === 0,
    files: files.map((file) => relative(workspace, file)),
    lines: contents.reduce(
      (total, source) => total + source.split(/\r?\n/).length,
      0,
    ),
    imports: [...new Set(moduleSpecifiers)].sort(),
    violations: [...new Set(violations)],
  }
}

function analyzeSource(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  )
  const result = {
    imports: [],
    unsafeAssertions: 0,
    manualDrawing: 0,
  }
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      result.imports.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require')) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      result.imports.push(node.arguments[0].text)
    }
    if (
      (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
      node.type.getText(sourceFile) !== 'const'
    ) {
      result.unsafeAssertions++
    }
    if (
      (ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        (node.expression.name.text === 'createElementNS' ||
          (node.expression.name.text === 'createElement' &&
            node.arguments.some(
              (argument) =>
                ts.isStringLiteralLike(argument) &&
                argument.text.toLowerCase() === 'svg',
            )))) ||
      (ts.isBinaryExpression(node) &&
        ts.isPropertyAccessExpression(node.left) &&
        ['innerHTML', 'outerHTML'].includes(node.left.name.text)) ||
      (ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['insertAdjacentHTML', 'write', 'writeln'].includes(
          node.expression.name.text,
        )) ||
      (ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'DOMParser') ||
      ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
        jsxTagName(node).toLowerCase() === 'svg')
    ) {
      result.manualDrawing++
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return result
}

function jsxTagName(node) {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText()
  }
  return node.tagName.getText()
}

function scriptKind(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (file.endsWith('.js') || file.endsWith('.mjs')) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('dist') || entry.name === 'node_modules') {
      continue
    }
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)))
    } else if (/\.(?:[cm]?[jt]s|tsx)$/.test(entry.name)) {
      files.push(path)
    }
  }
  return files.sort()
}

async function serveDirectory(root) {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (requestUrl.pathname === '/favicon.ico') {
        response.writeHead(204)
        response.end()
        return
      }
      const pathname =
        requestUrl.pathname === '/'
          ? '/index.html'
          : decodeURIComponent(requestUrl.pathname)
      const target = resolve(root, `.${pathname}`)
      if (!inside(root, target) || !(await stat(target)).isFile()) {
        response.writeHead(404)
        response.end('Not found')
        return
      }
      response.writeHead(200, {
        'content-type': mimeType(target),
        'cache-control': 'no-store',
      })
      response.end(await readFile(target))
    } catch {
      response.writeHead(404)
      response.end('Not found')
    }
  })
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve AI smoke server address')
  }
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise((resolvePromise, reject) =>
        server.close((error) => (error ? reject(error) : resolvePromise())),
      ),
  }
}

function mimeType(path) {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.map': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
    }[extname(path)] ?? 'application/octet-stream'
  )
}

function commandScore(result) {
  return {
    pass: result.exitCode === 0 && !result.timedOut,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr),
    stdoutBytes: result.stdoutBytes,
    stderrBytes: result.stderrBytes,
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
  }
}

function skippedCommandScore(reason) {
  return {
    pass: false,
    skipped: true,
    reason,
    exitCode: null,
    signal: null,
    timedOut: false,
    durationMs: 0,
    stdout: '',
    stderr: '',
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutTruncated: false,
    stderrTruncated: false,
    javascript: null,
  }
}

function runCommand(command, args, options) {
  return new Promise((resolvePromise) => {
    const startedAt = performance.now()
    const stdout = createBoundedCapture(captureByteLimit)
    const stderr = createBoundedCapture(captureByteLimit)
    const codexJson = createCodexJsonAccumulator()
    let timedOut = false
    let settled = false
    let killTimer
    let hardStopTimer
    let child
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...(options.replaceEnv ? {} : process.env),
          ...options.env,
        },
        detached: process.platform !== 'win32',
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (error) {
      stderr.add(Buffer.from(`${errorMessage(error)}\n`))
      codexJson.finish()
      resolvePromise(commandResult(null, null))
      return
    }
    const timeout = setTimeout(() => {
      timedOut = true
      signalProcessTree(child, 'SIGTERM')
      killTimer = setTimeout(
        () => signalProcessTree(child, 'SIGKILL'),
        terminationGraceMs,
      )
      hardStopTimer = setTimeout(
        () => finish(null, 'SIGKILL'),
        terminationGraceMs + 2_000,
      )
    }, options.timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout.add(chunk)
      codexJson.add(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr.add(chunk)
    })
    child.on('error', (error) => {
      stderr.add(Buffer.from(`${errorMessage(error)}\n`))
    })
    child.on('close', (exitCode, signal) => {
      finish(exitCode, signal)
    })
    child.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        stderr.add(Buffer.from(`${errorMessage(error)}\n`))
      }
    })
    child.stdin.end(options.input ?? '')

    function finish(exitCode, signal) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      clearTimeout(killTimer)
      clearTimeout(hardStopTimer)
      codexJson.finish()
      resolvePromise(commandResult(exitCode, signal))
    }

    function commandResult(exitCode, signal) {
      const stdoutResult = stdout.result()
      const stderrResult = stderr.result()
      return {
        exitCode,
        signal,
        timedOut,
        durationMs: performance.now() - startedAt,
        stdout: stdoutResult.text,
        stderr: stderrResult.text,
        stdoutBytes: stdoutResult.totalBytes,
        stderrBytes: stderrResult.totalBytes,
        stdoutTruncated: stdoutResult.truncated,
        stderrTruncated: stderrResult.truncated,
        codexJson: codexJson.result(),
      }
    }
  })
}

function signalProcessTree(child, signal) {
  if (!child.pid) return
  try {
    if (process.platform === 'win32') {
      child.kill(signal)
    } else {
      process.kill(-child.pid, signal)
    }
  } catch (error) {
    return false
  }
  return true
}

function createBoundedCapture(limit) {
  const headLimit = Math.floor(limit / 2)
  const tailLimit = limit - headLimit
  let head = Buffer.alloc(0)
  let tail = Buffer.alloc(0)
  let totalBytes = 0

  return {
    add(value) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      totalBytes += chunk.byteLength
      let offset = 0
      if (head.byteLength < headLimit) {
        const length = Math.min(headLimit - head.byteLength, chunk.byteLength)
        head = Buffer.concat([head, chunk.subarray(0, length)])
        offset = length
      }
      if (offset < chunk.byteLength) {
        tail = Buffer.concat([tail, chunk.subarray(offset)])
        if (tail.byteLength > tailLimit) {
          tail = tail.subarray(tail.byteLength - tailLimit)
        }
      }
    },
    result() {
      const truncated = totalBytes > limit
      const omitted = Math.max(
        0,
        totalBytes - head.byteLength - tail.byteLength,
      )
      const marker = truncated
        ? Buffer.from(`\n… ${omitted} bytes omitted by harness …\n`)
        : Buffer.alloc(0)
      return {
        text: Buffer.concat([head, marker, tail]).toString('utf8'),
        totalBytes,
        truncated,
      }
    },
  }
}

function createCodexJsonAccumulator() {
  const decoder = new StringDecoder('utf8')
  let pending = ''
  let eventCount = 0
  let malformedLines = 0
  let oversizedLines = 0
  let usageEvents = 0
  const toolIds = new Set()
  const toolCalls = new Map()
  const usage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  }

  return {
    add(chunk) {
      pending += decoder.write(chunk)
      drain(false)
      if (pending.length > captureByteLimit) {
        pending = ''
        oversizedLines++
      }
    },
    finish() {
      pending += decoder.end()
      drain(true)
    },
    result() {
      if (!eventCount) return null
      const normalizedUsage = {
        ...usage,
        totalTokens:
          usage.totalTokens || usage.inputTokens + usage.outputTokens,
      }
      return {
        eventCount,
        malformedLines,
        oversizedLines,
        usageEvents,
        usage: normalizedUsage,
        toolCalls: {
          total: [...toolCalls.values()].reduce(
            (total, count) => total + count,
            0,
          ),
          byType: Object.fromEntries([...toolCalls].sort()),
        },
      }
    },
  }

  function drain(final) {
    while (true) {
      const newline = pending.indexOf('\n')
      if (newline === -1) break
      parseLine(pending.slice(0, newline))
      pending = pending.slice(newline + 1)
    }
    if (final && pending.trim()) {
      parseLine(pending)
      pending = ''
    }
  }

  function parseLine(line) {
    if (!line.trim().startsWith('{')) return
    let event
    try {
      event = JSON.parse(line)
    } catch {
      malformedLines++
      return
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      return
    }
    eventCount++
    const type = event.type.replaceAll('.', '_')
    const eventUsage =
      type === 'turn_completed' || type === 'turn_complete' ? event.usage : null
    if (eventUsage && typeof eventUsage === 'object') {
      usageEvents++
      usage.inputTokens += numericField(
        eventUsage,
        'input_tokens',
        'inputTokens',
      )
      usage.cachedInputTokens += numericField(
        eventUsage,
        'cached_input_tokens',
        'cachedInputTokens',
      )
      usage.cacheWriteInputTokens += numericField(
        eventUsage,
        'cache_write_input_tokens',
        'cacheWriteInputTokens',
      )
      usage.outputTokens += numericField(
        eventUsage,
        'output_tokens',
        'outputTokens',
      )
      usage.reasoningOutputTokens += numericField(
        eventUsage,
        'reasoning_output_tokens',
        'reasoningOutputTokens',
      )
      usage.totalTokens += numericField(
        eventUsage,
        'total_tokens',
        'totalTokens',
      )
    }
    const item = event.item
    if (
      (type === 'item_started' || type === 'item_completed') &&
      item &&
      typeof item === 'object'
    ) {
      recordTool(item.type, item.id)
    } else if (type.endsWith('_begin')) {
      recordTool(type.slice(0, -'_begin'.length), event.call_id ?? event.id)
    }
  }

  function recordTool(type, id) {
    if (typeof type !== 'string' || !toolItemType(type)) return
    const key = id ? `${type}:${id}` : `${type}:${eventCount}`
    if (toolIds.has(key)) return
    toolIds.add(key)
    toolCalls.set(type, (toolCalls.get(type) ?? 0) + 1)
  }
}

function toolItemType(type) {
  return [
    'command_execution',
    'dynamic_tool_call',
    'exec_command',
    'file_change',
    'function_call',
    'image_generation',
    'mcp_tool_call',
    'patch_apply',
    'tool_call',
    'web_search',
  ].includes(type)
}

function numericField(value, snake, camel) {
  const candidate = value[snake] ?? value[camel]
  return Number.isFinite(candidate) ? candidate : 0
}

async function readRunContext() {
  const explicitRunId = optionValue('--run-id')
  const current = explicitRunId ? null : await readOptionalJson(currentRunPath)
  const runId = explicitRunId ?? current?.runId
  if (!runId) {
    throw new Error(
      'No current smoke run exists. Prepare one or pass --run-id=<id>.',
    )
  }
  validateRunId(runId)
  const runDirectory = resolve(runsRoot, runId)
  const manifestPath = resolve(runDirectory, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.runId !== runId) {
    throw new Error(`Run manifest mismatch for ${runId}.`)
  }
  return { manifest, runDirectory, manifestPath }
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function measureBuiltJavascript(directory) {
  const files = await artifactFiles(directory, '.js')
  let rawBytes = 0
  let gzipBytes = 0
  const assets = []
  for (const file of files) {
    const contents = await readFile(file)
    const compressedBytes = gzipSync(contents).byteLength
    rawBytes += contents.byteLength
    gzipBytes += compressedBytes
    assets.push({
      path: relative(directory, file),
      rawBytes: contents.byteLength,
      gzipBytes: compressedBytes,
    })
  }
  return {
    files: assets.length,
    rawBytes,
    gzipBytes,
    assets,
  }
}

async function artifactFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await artifactFiles(path, extension)))
    } else if (extname(path) === extension) {
      files.push(path)
    }
  }
  return files.sort()
}

function agentEnvironment(overrides) {
  const names = new Set([
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'TMPDIR',
    'LANG',
    'LC_ALL',
    'TERM',
    'COLORTERM',
    'NO_COLOR',
    'CODEX_HOME',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
  ])
  for (const name of (process.env.AI_AUTHORING_ENV_ALLOWLIST ?? '').split(
    ',',
  )) {
    if (name.trim()) names.add(name.trim())
  }
  const environment = {}
  for (const name of names) {
    if (process.env[name] !== undefined) {
      environment[name] = process.env[name]
    }
  }
  return {
    ...environment,
    NO_COLOR: '1',
    ...overrides,
  }
}

function errorMessage(error) {
  if (error instanceof AggregateError) {
    return [error.message, ...error.errors.map(errorMessage)].join(' | ')
  }
  return error instanceof Error ? error.message : String(error)
}

function validateRunId(runId) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(runId)) {
    throw new Error(
      'Run IDs must be 1–80 letters, numbers, dots, underscores, or hyphens.',
    )
  }
}

function timestampRunId() {
  return new Date().toISOString().replaceAll(/[-:]/g, '').replace('.', '-')
}

async function assertRootDependencies() {
  for (const path of [
    rootModules,
    resolve(rootModules, '@observablehq/plot/package.json'),
    resolve(rootModules, '@tanstack/charts/package.json'),
    resolve(rootModules, 'typescript/package.json'),
    resolve(rootModules, 'vite/package.json'),
  ]) {
    await stat(path)
  }
}

function renderReport(report) {
  const rows = report.results.map((result) => {
    const browser = result.browser
    const agent = result.agent
      ? `${result.agent.exitCode ?? result.agent.signal ?? 'failed'} / ${formatDuration(result.agent.durationMs)} / ${result.agent.codexJson?.usage.totalTokens ?? '—'} tok / ${result.agent.codexJson?.toolCalls.total ?? '—'} tools`
      : 'not run'
    const bundle = result.build.javascript
      ? `${formatBytes(result.build.javascript.rawBytes)} / ${formatBytes(result.build.javascript.gzipBytes)}`
      : '—'
    return `| ${result.order} | ${result.caseId} | ${result.renderer} | ${agent} | ${status(result.protection.pass)} | ${status(result.source.pass)} | ${status(result.typecheck.pass)} | ${status(result.build.pass && result.alternateBuild.pass)} | ${bundle} | ${status(browser?.initial?.pass)} | ${status(browser?.alternate?.pass)} | ${status(result.pass)} |`
  })
  const failures = report.results.flatMap((result) => {
    if (result.pass) return []
    const variants = [
      result.browser?.initial,
      result.browser?.alternate,
    ].filter(Boolean)
    const details = [
      ...result.protection.changed,
      ...result.source.violations,
      ...(result.typecheck.pass
        ? []
        : [`typecheck exit ${result.typecheck.exitCode}`]),
      ...(result.build.pass ? [] : [`build exit ${result.build.exitCode}`]),
      ...(result.alternateBuild.pass
        ? []
        : [`alternate build exit ${result.alternateBuild.exitCode}`]),
      result.browser?.error,
      ...variants.flatMap((variant) => [
        ...variant.errors,
        variant.geometry.reason,
        ...(variant.dimensions.pass ? [] : ['640×360 SVG contract failed']),
        ...(variant.axes.pass ? [] : ['explicit axis endpoint ticks failed']),
        ...(variant.order.pass ? [] : ['category/bin order failed']),
      ]),
    ].filter(Boolean)
    return [
      `- **${result.caseId} / ${result.renderer}:** ${details.join('; ') || 'browser gate did not run'}`,
    ]
  })

  return `# AI chart authoring smoke report

- Cohort: \`${report.cohort}\`
- Run: \`${report.runId}\`
- Seed: \`${report.seed}\`
- Repetitions: ${report.repetition}
- Passing workspaces: ${report.summary.passed}/${report.summary.total}
- Agent invocations present: ${report.summary.agentRuns}/${report.summary.total}
- Parsed Codex JSON usage: ${report.summary.codexJson.totalTokens} tokens, ${report.summary.codexJson.toolCalls} tool calls

| # | Case | Renderer | Agent exit / time / usage | Protected | Source | Types | Both builds | JS raw / gzip | Initial | Alternate | Result |
| -: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Failures

${failures.length ? failures.join('\n') : 'None.'}

This smoke report is deterministic correctness evidence, not a broad model
benchmark. Compare model cost, tokens, and tool behavior only when the
configured agent emits those fields in its preserved transcript.
`
}

function summarizeCodexMetrics(results) {
  return results.reduce(
    (summary, result) => {
      const metrics = result.agent?.codexJson
      if (!metrics) return summary
      summary.runs++
      summary.toolCalls += metrics.toolCalls.total
      for (const key of Object.keys(summary.usage)) {
        summary.usage[key] += metrics.usage[key] ?? 0
      }
      summary.totalTokens += metrics.usage.totalTokens
      return summary
    },
    {
      runs: 0,
      toolCalls: 0,
      totalTokens: 0,
      usage: {
        inputTokens: 0,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
        outputTokens: 0,
        reasoningOutputTokens: 0,
        totalTokens: 0,
      },
    },
  )
}

function printPrepared(context) {
  const { manifest, manifestPath } = context
  process.stdout.write(
    `Prepared immutable AI run ${manifest.runId}: ${manifest.jobs.length} workspaces under ${manifest.workspaceRoot}. Manifest: ${relative(repositoryRoot, manifestPath)}\n`,
  )
}

function printReport(report, context) {
  process.stdout.write(
    `AI authoring smoke ${report.runId}: ${report.summary.passed}/${report.summary.total} passed. Report: ${relative(repositoryRoot, resolve(context.runDirectory, 'report.md'))}\n`,
  )
}

function status(value) {
  return value ? 'pass' : 'fail'
}

function formatDuration(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : '—'
}

function formatBytes(value) {
  return Number.isFinite(value) ? `${(value / 1024).toFixed(2)} kB` : '—'
}

function getCase(id) {
  const entry = cases.find((candidate) => candidate.id === id)
  if (!entry) throw new Error(`Unknown AI smoke case: ${id}`)
  return entry
}

function categoryRows(revision = 0) {
  const categories = [
    'Query',
    'Router',
    'Table',
    'Form',
    'Start',
    'Virtual',
    'Store',
    'DB',
  ]
  const series = ['Desktop', 'Mobile', 'Tablet']
  return categories.flatMap((category, categoryIndex) =>
    series.map((name, seriesIndex) => ({
      id: `${category}:${name}`,
      category,
      series: name,
      value:
        16 +
        ((categoryIndex * 17 + seriesIndex * 11 + revision * 5) % 31) +
        seriesIndex * 8,
    })),
  )
}

function categoryOrder(revision = 0) {
  const totals = new Map()
  for (const row of categoryRows(revision)) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.value)
  }
  return [...totals]
    .sort((left, right) => right[1] - left[1])
    .map(([category]) => category)
}

function distributionRows(revision = 0) {
  return Array.from({ length: 240 }, (_, index) => {
    const group = index % 2 === 0 ? 'A' : 'B'
    const center = group === 'A' ? 44 : 61
    const wave =
      Math.sin((index + revision) * 1.73) * 13 +
      Math.cos((index + revision * 3) * 0.37) * 7
    return {
      id: index,
      value: round(center + wave),
      group,
    }
  })
}

function histogramCounts(rows, boundaries) {
  return boundaries.slice(0, -1).map((lower, index) => {
    const upper = boundaries[index + 1]
    const last = index === boundaries.length - 2
    return rows.filter(
      (row) =>
        row.value >= lower && (last ? row.value <= upper : row.value < upper),
    ).length
  })
}

function seededShuffle(values, value) {
  let state = [...value].reduce(
    (total, character) =>
      Math.imul(total ^ character.charCodeAt(0), 16_777_619) >>> 0,
    2_166_136_261,
  )
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const target = (state >>> 0) % (index + 1)
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function correlation(left, right) {
  if (left.length !== right.length || left.length < 2) return null
  const leftMean = mean(left)
  const rightMean = mean(right)
  let numerator = 0
  let leftSquares = 0
  let rightSquares = 0
  for (let index = 0; index < left.length; index++) {
    const leftDelta = (left[index] ?? 0) - leftMean
    const rightDelta = (right[index] ?? 0) - rightMean
    numerator += leftDelta * rightDelta
    leftSquares += leftDelta * leftDelta
    rightSquares += rightDelta * rightDelta
  }
  const denominator = Math.sqrt(leftSquares * rightSquares)
  return denominator > 0 ? numerator / denominator : null
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function numericLabels(labels) {
  return labels
    .map((label) => Number(label.replaceAll(',', '').trim()))
    .filter(Number.isFinite)
}

function includesApprox(values, expected, tolerance = 0.001) {
  return values.some((value) => Math.abs(value - expected) <= tolerance)
}

function closeTo(value, expected, tolerance) {
  return Number.isFinite(value) && Math.abs(value - expected) <= tolerance
}

function round(value) {
  return Math.round(value * 100) / 100
}

function inside(root, target) {
  const path = relative(root, target)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..')
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

function parseAgentArgs(value) {
  if (!value) return []
  const parsed = JSON.parse(value)
  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('AI_AUTHORING_AGENT_ARGS_JSON must be a JSON string array.')
  }
  return parsed
}

function optionValue(name) {
  const prefix = `${name}=`
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
}

function positiveInteger(value, fallback) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('AI_AUTHORING_TIMEOUT_MS must be a positive integer.')
  }
  return parsed
}

function truncate(value, limit = 6_000) {
  return value.length <= limit
    ? value
    : `${value.slice(0, limit)}\n… ${value.length - limit} characters omitted`
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}
