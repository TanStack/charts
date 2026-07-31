import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const example = resolve(root, 'examples/charts-react-native')
const output = resolve(root, '.bundle-output')
const cli = resolve(example, 'node_modules/.bin/react-native')
const skipBuild = process.argv.includes('--skip-build')
const forbiddenSources = [
  'packages/charts-core/src/adapter.ts',
  'packages/charts-core/src/adapter-renderer.ts',
  'packages/charts-core/src/canvas.ts',
  'packages/charts-core/src/dom.ts',
  'packages/charts-core/src/dom-text.ts',
  'packages/charts-core/src/export.ts',
  'packages/charts-core/src/reconcile.ts',
  'packages/charts-core/src/renderer.ts',
  'packages/charts-core/src/svg-renderer.ts',
  'packages/charts-core/src/svg-resources.ts',
  'packages/charts-core/src/svg-surface.ts',
  'packages/charts-core/src/svg.ts',
  'packages/charts-core/src/tooltip-portal.ts',
  'packages/charts-core/src/tooltip-position.ts',
  'packages/charts-core/src/tooltip.ts',
  'packages/react-charts/',
  'react-dom/',
]
const variants = {
  blank: 'index.blank.js',
  svg: 'index.svg.js',
  core: 'index.core.js',
  chart: 'index.js',
}

await mkdir(output, { recursive: true })

const bundles = []
for (const platform of ['ios', 'android']) {
  for (const [variant, entry] of Object.entries(variants)) {
    const bundle = resolve(
      output,
      `react-native-${variant}.${platform}.jsbundle`,
    )
    const sourceMap = resolve(output, `react-native-${variant}.${platform}.map`)
    if (!skipBuild) {
      await run(cli, [
        'bundle',
        '--entry-file',
        entry,
        '--platform',
        platform,
        '--dev',
        'false',
        '--minify',
        'true',
        '--bundle-output',
        bundle,
        '--sourcemap-output',
        sourceMap,
        '--config',
        resolve(example, 'metro.config.cjs'),
      ])
    }
    const contents = await readFile(bundle)
    const map = JSON.parse(await readFile(sourceMap, 'utf8'))
    const sources = map.sources.map(normalize)
    if (variant === 'chart') assertNativeBoundary(platform, sources)
    bundles.push({
      platform,
      variant,
      bytes: contents.byteLength,
      gzip: gzipSync(contents).byteLength,
      modules: sources.length,
    })
  }
}

const rows = [
  '| Platform | Full chart JS delta | RNSVG-only gzip delta | Core line gzip delta | Full chart gzip delta |',
]
rows.push('| --- | ---: | ---: | ---: | ---: |')
for (const platform of ['ios', 'android']) {
  const blank = bundles.find(
    (bundle) => bundle.platform === platform && bundle.variant === 'blank',
  )
  const chart = bundles.find(
    (bundle) => bundle.platform === platform && bundle.variant === 'chart',
  )
  const svg = bundles.find(
    (bundle) => bundle.platform === platform && bundle.variant === 'svg',
  )
  const core = bundles.find(
    (bundle) => bundle.platform === platform && bundle.variant === 'core',
  )
  if (!blank || !chart || !svg || !core) {
    throw new Error(`Missing ${platform} bundle result`)
  }
  rows.push(
    `| ${platform} | ${format(chart.bytes - blank.bytes)} | ${format(svg.gzip - blank.gzip)} | ${format(core.gzip - blank.gzip)} | ${format(chart.gzip - blank.gzip)} |`,
  )
}

console.log(rows.join('\n'))
await writeFile(
  resolve(output, 'react-native-poc.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      note: 'Metro production JS only. This excludes react-native-svg native binary code.',
      bundles,
    },
    null,
    2,
  )}\n`,
)

function assertNativeBoundary(platform, sources) {
  const nativeSources = sources.filter((source) =>
    source.includes('packages/react-native-charts/src/'),
  )
  if (!nativeSources.length) {
    throw new Error(`${platform} bundle did not include the native host`)
  }
  const forbidden = sources.filter((source) =>
    forbiddenSources.some((candidate) => source.includes(candidate)),
  )
  if (forbidden.length) {
    throw new Error(
      `${platform} bundle crossed the browser boundary:\n${forbidden.join('\n')}`,
    )
  }
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: example,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolvePromise()
      else {
        reject(
          new Error(
            `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
          ),
        )
      }
    })
  })
}

function normalize(value) {
  return value.replaceAll('\\', '/')
}

function format(bytes) {
  const sign = bytes < 0 ? '-' : ''
  return `${sign}${(Math.abs(bytes) / 1024).toFixed(2)} kB`
}
