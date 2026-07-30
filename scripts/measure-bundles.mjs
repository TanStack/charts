import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { basename, dirname, resolve } from 'node:path'
import { build } from 'esbuild'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(root, '.bundle-output')
const baselinePath = resolve(
  root,
  'benchmarks/bundle-size/universal-baseline.json',
)
const args = new Set(process.argv.slice(2))
if (args.has('--check') && args.has('--update-baseline')) {
  throw new Error('Choose either --check or --update-baseline, not both.')
}
const rendererBoundaryModules = {
  canvas: [
    'packages/charts-core/src/canvas.ts',
    'packages/react-charts/src/CanvasChart.tsx',
    'packages/react-charts/src/canvas.ts',
  ],
  svg: [
    'packages/charts-core/src/reconcile.ts',
    'packages/charts-core/src/svg-renderer.ts',
    'packages/charts-core/src/svg-resources.ts',
    'packages/charts-core/src/svg-surface.ts',
    'packages/charts-core/src/svg.ts',
    'packages/react-charts/src/Chart.tsx',
  ],
}
const entries = [
  measured('Core host', 'benchmarks/entries/core.ts'),
  locked('D3-scale line scene', 'benchmarks/entries/charts-core.ts'),
  locked('D3-scale line + static SVG', 'benchmarks/entries/charts-svg.ts', {
    rendererBoundary: 'svg',
  }),
  budgeted(
    'D3-scale UTC line + static SVG',
    'benchmarks/entries/charts-time-svg.ts',
    18.05,
  ),
  budgeted(
    'D3-scale histogram + static SVG',
    'benchmarks/entries/charts-histogram-svg.ts',
    14.65,
  ),
  budgeted(
    'D3-scale facets + static SVG',
    'benchmarks/entries/charts-facet-svg.ts',
    15.4,
  ),
  budgeted(
    'D3-scale arrows + static SVG',
    'benchmarks/entries/charts-arrow-svg.ts',
    13.8,
  ),
  budgeted(
    'D3-scale areaX + static SVG',
    'benchmarks/entries/charts-area-x-svg.ts',
    16,
  ),
  budgeted('Frame + static SVG', 'benchmarks/entries/charts-frame-svg.ts', 5.3),
  budgeted(
    'Custom mark scale-value factory',
    'benchmarks/entries/charts-mark-scale-values.ts',
    0.25,
  ),
  budgeted(
    'D3-scale hexagons + static SVG',
    'benchmarks/entries/charts-hexagon-svg.ts',
    13.9,
  ),
  budgeted(
    'D3-scale link + static SVG',
    'benchmarks/entries/charts-link-svg.ts',
    13.4,
  ),
  budgeted(
    'D3-scale ticks + static SVG',
    'benchmarks/entries/charts-tick-svg.ts',
    13.8,
  ),
  budgeted(
    'D3-scale vectors + static SVG',
    'benchmarks/entries/charts-vector-svg.ts',
    14.2,
  ),
  budgeted(
    'D3 geo shape + static SVG',
    'benchmarks/entries/charts-geo-svg.ts',
    10.7,
  ),
  budgeted(
    'Polar arc + static SVG',
    'benchmarks/entries/charts-polar-arc-svg.ts',
    9.1,
  ),
  budgeted(
    'D3 pie + polar arc + static SVG',
    'benchmarks/entries/charts-polar-pie-svg.ts',
    9.55,
  ),
  budgeted(
    'Polar gauge composition + static SVG',
    'benchmarks/entries/charts-polar-gauge-svg.ts',
    17.5,
  ),
  budgeted(
    'Polar line + scatter composition + static SVG',
    'benchmarks/entries/charts-polar-line-scatter-svg.ts',
    18.75,
  ),
  locked('Representative marks', 'benchmarks/entries/charts-representative.ts'),
  measured(
    'Renderer-neutral DOM host',
    'benchmarks/entries/charts-renderer.ts',
    { rendererBoundary: 'neutral' },
  ),
  measured('Canvas DOM host', 'benchmarks/entries/charts-canvas.ts', {
    rendererBoundary: 'canvas',
  }),
  locked('TanStack DOM host', 'benchmarks/entries/charts-dom.ts', {
    rendererBoundary: 'svg',
  }),
  measured(
    'React renderer-neutral adapter',
    'benchmarks/entries/charts-react-core.ts',
    {
      external: ['react', 'react/jsx-runtime'],
      rendererBoundary: 'neutral',
    },
  ),
  measured(
    'React Canvas adapter',
    'benchmarks/entries/charts-react-canvas.ts',
    {
      external: ['react', 'react/jsx-runtime'],
      rendererBoundary: 'canvas',
    },
  ),
  locked('React adapter', 'benchmarks/entries/charts-react.ts', {
    external: ['react', 'react/jsx-runtime'],
    rendererBoundary: 'svg',
  }),
  locked('React line consumer', 'benchmarks/entries/charts-react-line.ts', {
    external: ['react', 'react/jsx-runtime'],
  }),
  budgeted(
    'Stats parity surface',
    'benchmarks/entries/charts-stats-parity.ts',
    32.5,
  ),
  locked(
    'Custom-scale line scene',
    'benchmarks/entries/charts-custom-scale-scene.ts',
  ),
  locked(
    'D3 linear-scale line scene',
    'benchmarks/entries/charts-d3-linear-scene.ts',
  ),
  budgeted(
    'D3 curved line scene',
    'benchmarks/entries/charts-d3-curved-line-scene.ts',
    14.55,
  ),
  budgeted(
    'D3 time-scale line scene',
    'benchmarks/entries/charts-d3-time-scene.ts',
    16.9,
  ),
  budgeted(
    'Direct D3 monotone + TanStack SVG',
    'benchmarks/entries/charts-d3-curve-svg.ts',
    15.7,
  ),
  budgeted(
    'Direct D3 transforms + TanStack histogram',
    'benchmarks/entries/charts-d3-transform-histogram.ts',
    14.65,
  ),
  budgeted(
    'Direct D3 time + TanStack UTC line',
    'benchmarks/entries/charts-d3-time-svg.ts',
    18.05,
  ),
  budgeted(
    'Direct D3 quadtree + TanStack DOM host',
    'benchmarks/entries/charts-d3-quadtree-dom.ts',
    22.8,
  ),
  budgeted(
    'Direct D3 Delaunay + TanStack DOM host',
    'benchmarks/entries/charts-d3-delaunay-dom.ts',
    27.9,
  ),
  measured('D3 array numeric kernel', 'benchmarks/entries/d3-array-kernel.ts'),
  measured(
    'D3 compact format kernel',
    'benchmarks/entries/d3-format-kernel.ts',
  ),
  measured('D3 calendar tick kernel', 'benchmarks/entries/d3-time-kernel.ts'),
  budgeted(
    'D3 linear scale kernel',
    'benchmarks/entries/d3-linear-kernel.ts',
    8.2,
  ),
  budgeted('D3 band scale kernel', 'benchmarks/entries/d3-band-kernel.ts', 1.2),
  budgeted(
    'D3 point scale kernel',
    'benchmarks/entries/d3-point-kernel.ts',
    1.25,
  ),
  budgeted(
    'D3 ordinal scale kernel',
    'benchmarks/entries/d3-ordinal-kernel.ts',
    0.75,
  ),
  budgeted(
    'D3 UTC scale kernel',
    'benchmarks/entries/d3-time-scale-kernel.ts',
    10.3,
  ),
  measured('D3 log scale kernel', 'benchmarks/entries/d3-log-kernel.ts'),
  measured(
    'D3 scale family kernel',
    'benchmarks/entries/d3-scale-family-kernel.ts',
  ),
  budgeted('D3 curve kernel', 'benchmarks/entries/d3-curve-kernel.ts', 2.25),
  budgeted(
    'D3 transform kernel',
    'benchmarks/entries/d3-transform-kernel.ts',
    2.65,
  ),
  budgeted(
    'D3 quadtree kernel',
    'benchmarks/entries/d3-quadtree-kernel.ts',
    2.1,
  ),
  budgeted(
    'D3 Delaunay kernel',
    'benchmarks/entries/d3-delaunay-kernel.ts',
    7.3,
  ),
  budgeted(
    'D3 brush controller kernel',
    'benchmarks/entries/d3-brush-kernel.ts',
    16.5,
  ),
  budgeted(
    'D3 zoom controller kernel',
    'benchmarks/entries/d3-zoom-kernel.ts',
    16.5,
  ),
  measured(
    'TanStack easing helper',
    'benchmarks/entries/native-ease-kernel.ts',
  ),
  measured('D3 easing kernel', 'benchmarks/entries/d3-ease-kernel.ts'),
  measured(
    'D3 interpolation kernel',
    'benchmarks/entries/d3-interpolate-kernel.ts',
  ),
  measured('D3 polygon kernel', 'benchmarks/entries/d3-polygon-kernel.ts'),
  measured('D3 polar kernel', 'benchmarks/entries/d3-polar-kernel.ts'),
  measured('D3 hierarchy kernel', 'benchmarks/entries/d3-hierarchy-kernel.ts'),
  measured('D3 force kernel', 'benchmarks/entries/d3-force-kernel.ts'),
  measured('D3 contour kernel', 'benchmarks/entries/d3-contour-kernel.ts'),
  measured('D3 geo kernel', 'benchmarks/entries/d3-geo-kernel.ts'),
  budgeted(
    'React Stats parity surface',
    'benchmarks/entries/charts-react-stats-parity.tsx',
    33.4,
    { external: ['react', 'react/jsx-runtime'] },
  ),
  measured('Plot renderer integration', 'benchmarks/entries/plot-renderer.ts'),
  measured('Stateful Plot renderer', 'benchmarks/entries/stateful-plot.ts'),
  measured('React host', 'benchmarks/entries/react-host.ts'),
  measured('React + Plot adapter', 'benchmarks/entries/react-observable.ts'),
  measured('Plot minimal line', 'benchmarks/entries/minimal-line.ts'),
  measured(
    'Plot representative marks',
    'benchmarks/entries/representative-chart.ts',
  ),
  measured('Escaped Plot namespace', 'benchmarks/entries/full-namespace.ts'),
]

await mkdir(outputDirectory, { recursive: true })

const rows = []
for (const {
  label,
  entry,
  external,
  alias,
  policy,
  rendererBoundary,
} of entries) {
  const outfile = resolve(
    outputDirectory,
    `${basename(entry, '.ts').replaceAll(/[^a-z0-9-]/gi, '-')}.js`,
  )
  const result = await build({
    entryPoints: [resolve(root, entry)],
    outfile,
    bundle: true,
    minify: true,
    treeShaking: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
    logLevel: 'silent',
    external,
    alias,
    metafile: true,
  })
  assertRendererBoundary(label, result.metafile.inputs, rendererBoundary)
  const contents = await readFile(outfile)
  rows.push({
    label,
    bytes: contents.byteLength,
    gzip: gzipSync(contents).byteLength,
    policy,
  })
}

for (const [label, directory] of [
  ['React proof application', 'examples/react/dist/assets'],
  ['Octane proof application', 'examples/octane/dist/assets'],
  ['Dynamic sandbox application', 'examples/sandbox/dist/assets'],
  ['React TanStack proof application', 'examples/charts-react/dist/assets'],
  ['Octane TanStack proof application', 'examples/charts-octane/dist/assets'],
]) {
  const absoluteDirectory = resolve(root, directory)
  try {
    const files = (await readdir(absoluteDirectory)).filter((file) =>
      file.endsWith('.js'),
    )
    const contents = await Promise.all(
      files.map((file) => readFile(resolve(absoluteDirectory, file))),
    )
    rows.push({
      label,
      bytes: contents.reduce((total, content) => total + content.byteLength, 0),
      gzip: contents.reduce(
        (total, content) => total + gzipSync(content).byteLength,
        0,
      ),
    })
  } catch {
    // Example builds are optional when measuring package-level entries.
  }
}

console.log('| Bundle | Minified | Gzip |')
console.log('| --- | ---: | ---: |')
for (const row of rows) {
  console.log(
    `| ${row.label} | ${formatBytes(row.bytes)} | ${formatBytes(row.gzip)} |`,
  )
}

if (args.has('--check')) {
  const failures = [
    ...checkBudgets(rows),
    ...(await checkUniversalBaseline(rows)),
  ]
  if (failures.length) {
    console.error(`\nBundle size policy failed:\n${failures.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log('\nBundle size policy passed.')
  }
}

if (args.has('--update-baseline')) {
  await writeUniversalBaseline(rows)
  console.log(
    `\nUpdated ${baselinePath.slice(root.length + 1)} after measuring ${lockedRows(rows).length} universal bundles.`,
  )
}

function measured(label, entry, options = {}) {
  return createEntry(label, entry, { kind: 'measure' }, options)
}

function locked(label, entry, options = {}) {
  return createEntry(label, entry, { kind: 'locked' }, options)
}

function budgeted(label, entry, maxGzipKib, options = {}) {
  return createEntry(
    label,
    entry,
    { kind: 'budget', maxGzipBytes: maxGzipKib * 1024 },
    options,
  )
}

function createEntry(label, entry, policy, options) {
  return {
    label,
    entry,
    policy,
    external: options.external,
    alias: options.alias,
    rendererBoundary: options.rendererBoundary,
  }
}

function assertRendererBoundary(label, inputs, boundary) {
  if (!boundary) return
  const paths = Object.keys(inputs).map((input) => input.replaceAll('\\', '/'))
  const canvas = matchingModules(paths, rendererBoundaryModules.canvas)
  const svg = matchingModules(paths, rendererBoundaryModules.svg)
  const failures = []

  if (boundary === 'neutral') {
    if (canvas.length) failures.push(`included Canvas: ${canvas.join(', ')}`)
    if (svg.length) failures.push(`included SVG: ${svg.join(', ')}`)
  } else if (boundary === 'canvas') {
    if (!canvas.length) failures.push('did not include the Canvas renderer')
    if (svg.length) failures.push(`included SVG: ${svg.join(', ')}`)
  } else if (boundary === 'svg') {
    if (!svg.length) failures.push('did not include the SVG renderer')
    if (canvas.length) failures.push(`included Canvas: ${canvas.join(', ')}`)
  } else {
    failures.push(`uses unknown renderer boundary ${boundary}`)
  }

  if (failures.length) {
    throw new Error(`${label} renderer boundary failed: ${failures.join('; ')}`)
  }
}

function matchingModules(inputs, suffixes) {
  return inputs.filter((input) =>
    suffixes.some((suffix) => input.endsWith(suffix)),
  )
}

function checkBudgets(measuredRows) {
  return measuredRows.flatMap((row) => {
    if (row.policy?.kind !== 'budget' || row.gzip <= row.policy.maxGzipBytes) {
      return []
    }
    return [
      `${row.label}: ${formatBytes(row.gzip)} exceeds its isolated ${formatBytes(row.policy.maxGzipBytes)} gzip budget`,
    ]
  })
}

async function checkUniversalBaseline(measuredRows) {
  let baseline
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
  } catch {
    return [
      `Missing ${baselinePath.slice(root.length + 1)}. Run pnpm bundle:update-baseline after reviewing the locked entries.`,
    ]
  }

  if (baseline.schemaVersion !== 1 || typeof baseline.bundles !== 'object') {
    return [`${baselinePath.slice(root.length + 1)} has an unsupported schema.`]
  }

  const failures = []
  const current = new Map(
    lockedRows(measuredRows).map((row) => [row.label, row]),
  )
  const expected = new Map(Object.entries(baseline.bundles))

  for (const label of expected.keys()) {
    if (!current.has(label)) {
      failures.push(`${label}: locked baseline entry is no longer measured`)
    }
  }
  for (const [label, row] of current) {
    const expectedRow = expected.get(label)
    if (!expectedRow) {
      failures.push(
        `${label}: missing locked baseline; run pnpm bundle:update-baseline after review`,
      )
      continue
    }
    for (const metric of ['bytes', 'gzip']) {
      if (row[metric] === expectedRow[metric]) continue
      const delta = row[metric] - expectedRow[metric]
      failures.push(
        `${label} ${metric}: ${formatSignedBytes(delta)} from the locked ${formatBytes(expectedRow[metric])} baseline`,
      )
    }
  }

  return failures
}

async function writeUniversalBaseline(measuredRows) {
  const bundles = Object.fromEntries(
    lockedRows(measuredRows).map((row) => [
      row.label,
      {
        bytes: row.bytes,
        gzip: row.gzip,
      },
    ]),
  )
  await mkdir(dirname(baselinePath), { recursive: true })
  await writeFile(
    baselinePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        policy:
          'Exact minified and gzip output for entries that optional features must not affect. Review every change before updating.',
        bundles,
      },
      null,
      2,
    )}\n`,
  )
}

function lockedRows(measuredRows) {
  return measuredRows.filter((row) => row.policy?.kind === 'locked')
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

function formatSignedBytes(bytes) {
  const sign = bytes > 0 ? '+' : ''
  return `${sign}${bytes} B`
}
