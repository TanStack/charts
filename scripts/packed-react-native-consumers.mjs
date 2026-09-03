import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { runWithConcurrency } from './run-with-concurrency.mjs'

const execFileAsync = promisify(execFile)

const forbiddenNativeSources = [
  '/@tanstack/charts/dist/adapter.js',
  '/@tanstack/charts/dist/adapter-renderer.js',
  '/@tanstack/charts/dist/canvas.js',
  '/@tanstack/charts/dist/dom.js',
  '/@tanstack/charts/dist/dom-text.js',
  '/@tanstack/charts/dist/export.js',
  '/@tanstack/charts/dist/reconcile.js',
  '/@tanstack/charts/dist/renderer.js',
  '/@tanstack/charts/dist/svg-resources.js',
  '/@tanstack/charts/dist/svg-surface.js',
  '/@tanstack/charts/dist/tooltip.js',
  '/@tanstack/charts/dist/tooltip-position.js',
  '/@tanstack/charts/dist/tooltip-portal.js',
  '/@tanstack/react-charts/',
  '/react-dom/',
]

export async function verifyPackedReactNativeConsumers({
  repositoryRoot,
  temporaryRoot,
  tarballs,
}) {
  const coreTarball = requiredTarball(tarballs, '@tanstack/charts')
  const nativeTarball = requiredTarball(
    tarballs,
    '@tanstack/react-native-charts',
  )
  const consumersRoot = resolve(temporaryRoot, 'react-native-consumers')
  const packageManager = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  ).packageManager
  const consumerConfigs = [
    bareConsumerConfig(repositoryRoot),
    expoConsumerConfig(repositoryRoot),
  ]
  const consumers = []

  for (const config of consumerConfigs) {
    const consumerRoot = resolve(consumersRoot, config.name)
    await deployConsumer({
      config,
      consumerRoot,
      coreTarball,
      nativeTarball,
      packageManager,
      repositoryRoot,
    })
    await installConsumer(consumerRoot, repositoryRoot)
    consumers.push({ config, consumerRoot })
  }

  const bundledConsumers = new Array(consumers.length)
  await runWithConcurrency(
    consumers,
    2,
    async ({ config, consumerRoot }, index) => {
      await verifyInstalledPackage({ consumerRoot, repositoryRoot })
      await verifyConsumerTypes({ config, consumerRoot })
      bundledConsumers[index] = await bundleConsumer({ config, consumerRoot })
      const cache = await stat(resolve(consumerRoot, '.metro-cache'))
      assert.ok(
        cache.isDirectory(),
        `${config.name} Metro cache was not isolated`,
      )
    },
  )
  const bundles = bundledConsumers.flat()

  console.log(
    'Packed React Native exports, declarations, bare Metro, and Expo Metro gates passed.',
  )
  return bundles
}

function bareConsumerConfig(repositoryRoot) {
  return {
    name: 'bare',
    importerPath: 'examples/charts-react-native',
    sourceDirectory: resolve(repositoryRoot, 'examples/charts-react-native'),
    writeConfig: async (consumerRoot) => {
      await writeFile(
        resolve(consumerRoot, 'metro.config.cjs'),
        isolatedMetroConfig('@react-native/metro-config'),
      )
    },
    strictTypes: true,
    bundle: bundleBareConsumer,
  }
}

function expoConsumerConfig(repositoryRoot) {
  return {
    name: 'expo',
    importerPath: 'examples/charts-expo',
    sourceDirectory: resolve(repositoryRoot, 'examples/charts-expo'),
    writeConfig: async (consumerRoot) => {
      await writeFile(
        resolve(consumerRoot, 'metro.config.cjs'),
        isolatedMetroConfig('expo/metro-config'),
      )
    },
    strictTypes: false,
    bundle: bundleExpoConsumer,
  }
}

function isolatedMetroConfig(moduleName) {
  return `const path = require('node:path')\nconst { getDefaultConfig } = require(${JSON.stringify(moduleName)})\n\nconst config = getDefaultConfig(__dirname)\nconfig.cacheStores = ({ FileStore }) => [\n  new FileStore({ root: path.join(__dirname, '.metro-cache') }),\n]\n\nmodule.exports = config\n`
}

async function deployConsumer({
  config,
  consumerRoot,
  coreTarball,
  nativeTarball,
  packageManager,
  repositoryRoot,
}) {
  await copyConsumerSource(config.sourceDirectory, consumerRoot)
  await writeConsumerLock({
    consumerRoot,
    importerPath: config.importerPath,
    repositoryRoot,
  })
  const manifest = JSON.parse(
    await readFile(resolve(consumerRoot, 'package.json'), 'utf8'),
  )
  manifest.packageManager = packageManager
  manifest.dependencies['@tanstack/charts'] = `file:${coreTarball}`
  manifest.dependencies['@tanstack/react-native-charts'] =
    `file:${nativeTarball}`
  await writeFile(
    resolve(consumerRoot, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFile(
    resolve(consumerRoot, 'pnpm-workspace.yaml'),
    `packages:\n  - '.'\n\noverrides:\n  '@tanstack/charts': ${JSON.stringify(`file:${coreTarball}`)}\n\nverifyDepsBeforeRun: false\n\nallowBuilds:\n  '@parcel/watcher': false\n  esbuild: false\n  nx: false\n  sharp: false\n  workerd: false\n`,
  )
  await config.writeConfig(consumerRoot)
}

async function copyConsumerSource(sourceDirectory, consumerRoot) {
  await mkdir(consumerRoot, { recursive: true })
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('dist')) continue
    await cp(
      resolve(sourceDirectory, entry.name),
      resolve(consumerRoot, entry.name),
      { recursive: entry.isDirectory() },
    )
  }
}

async function writeConsumerLock({
  consumerRoot,
  importerPath,
  repositoryRoot,
}) {
  const lockSource = await readFile(
    resolve(repositoryRoot, 'pnpm-lock.yaml'),
    'utf8',
  )
  const lines = lockSource.split('\n')
  const importersIndex = lines.indexOf('importers:')
  const packagesIndex = lines.indexOf('packages:')
  const importerIndex = lines.indexOf(`  ${importerPath}:`, importersIndex + 1)
  assert.ok(importersIndex >= 0, 'Workspace lock has no importers section')
  assert.ok(
    packagesIndex > importersIndex,
    'Workspace lock has no packages section',
  )
  assert.ok(
    importerIndex > importersIndex && importerIndex < packagesIndex,
    `Workspace lock has no ${importerPath} importer`,
  )

  let importerEnd = importerIndex + 1
  while (importerEnd < packagesIndex && !/^  \S.*:$/.test(lines[importerEnd])) {
    importerEnd += 1
  }
  const importer = lines.slice(importerIndex, importerEnd)
  importer[0] = '  .:'
  const consumerLock = [
    ...lines.slice(0, importersIndex + 1),
    '',
    ...importer,
    '',
    ...lines.slice(packagesIndex),
  ].join('\n')
  await writeFile(resolve(consumerRoot, 'pnpm-lock.yaml'), consumerLock)
}

async function installConsumer(consumerRoot, repositoryRoot) {
  const modulesState = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'node_modules/.modules.yaml'),
      'utf8',
    ),
  )
  assert.equal(typeof modulesState.storeDir, 'string')
  await run(
    'pnpm',
    [
      'install',
      '--prefer-offline',
      '--ignore-scripts',
      '--frozen-lockfile=false',
      '--store-dir',
      resolve(modulesState.storeDir, '..'),
    ],
    consumerRoot,
    { CI: 'true' },
  )
}

async function verifyInstalledPackage({ consumerRoot, repositoryRoot }) {
  const sourceManifest = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'packages/react-native-charts/package.json'),
      'utf8',
    ),
  )
  const sourceCoreManifest = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'packages/charts-core/package.json'),
      'utf8',
    ),
  )
  const packageRoot = resolve(
    consumerRoot,
    'node_modules/@tanstack/react-native-charts',
  )
  const installedManifest = JSON.parse(
    await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
  )
  const corePackageRoot = resolve(consumerRoot, 'node_modules/@tanstack/charts')
  const installedCoreManifest = JSON.parse(
    await readFile(resolve(corePackageRoot, 'package.json'), 'utf8'),
  )
  assert.deepEqual(
    installedManifest.exports,
    sourceManifest.publishConfig.exports,
  )
  assert.equal(installedManifest.private, false)
  assert.equal(installedManifest.publishConfig?.exports, undefined)
  assert.equal(installedManifest.publishConfig?.access, 'public')
  assert.equal(installedManifest.publishConfig?.provenance, true)
  assert.equal(
    installedManifest.dependencies['@tanstack/charts'],
    sourceManifest.version,
  )
  assert.equal(installedCoreManifest.version, sourceCoreManifest.version)
  assert.equal((await readdir(packageRoot)).includes('src'), false)
  assert.equal((await readdir(corePackageRoot)).includes('src'), false)

  const nativePackageRealPath = await realpath(packageRoot)
  const directCoreRealPath = await realpath(corePackageRoot)
  const coreResolvedFromNative = await realpath(
    resolve(dirname(dirname(nativePackageRealPath)), '@tanstack/charts'),
  )
  assert.equal(
    coreResolvedFromNative,
    directCoreRealPath,
    'The native adapter did not resolve the installed core tarball',
  )
  for (const range of Object.values(installedManifest.dependencies ?? {})) {
    assert.equal(range.startsWith('workspace:'), false)
  }

  const resolutionCheck = resolve(consumerRoot, 'resolve-exports.mjs')
  await writeFile(
    resolutionCheck,
    `import assert from 'node:assert/strict'\nimport { realpathSync } from 'node:fs'\nimport { fileURLToPath } from 'node:url'\n\nconst expected = process.argv[2]\nfor (const [specifier, suffix] of [\n  ['@tanstack/react-native-charts', '/@tanstack/react-native-charts/dist/' + (expected === 'native' ? 'index.native.js' : 'index.js')],\n  ['@tanstack/react-native-charts/tooltip', '/@tanstack/react-native-charts/dist/' + (expected === 'native' ? 'tooltip-entry.native.js' : 'tooltip-entry.js')],\n  ['@tanstack/charts/react-native', '/@tanstack/charts/dist/react-native/' + (expected === 'native' ? 'index.native.js' : 'index.js')],\n  ['@tanstack/charts/react-native/tooltip', '/@tanstack/charts/dist/react-native/' + (expected === 'native' ? 'tooltip-entry.native.js' : 'tooltip-entry.js')],\n  ['@tanstack/charts/universal', '/@tanstack/charts/dist/universal.js'],\n]) {\n  const resolved = realpathSync(fileURLToPath(import.meta.resolve(specifier)))\n  assert.ok(resolved.startsWith(realpathSync('./node_modules')), resolved)\n  assert.ok(resolved.endsWith(suffix), resolved)\n}\n`,
  )
  await run('node', [resolutionCheck, 'import'], consumerRoot)
  await run(
    'node',
    ['--conditions=react-native', resolutionCheck, 'native'],
    consumerRoot,
  )
}

async function verifyConsumerTypes({ config, consumerRoot }) {
  const tsc = resolve(consumerRoot, 'node_modules/typescript/bin/tsc')
  await run(
    process.execPath,
    [tsc, '--noEmit', '-p', 'tsconfig.json', '--pretty', 'false'],
    consumerRoot,
  )
  if (!config.strictTypes) return

  const strict = await runAllowFailure(
    process.execPath,
    [tsc, '--noEmit', '-p', 'tsconfig.strict.json', '--pretty', 'false'],
    consumerRoot,
  )
  if (strict.status === 0) return
  const diagnostics = strict.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('error TS'))
  const expected = diagnostics.every(
    (line) =>
      line.includes('/@types/d3-array/') &&
      line.includes("Cannot find name 'ImageData'."),
  )
  if (!expected || diagnostics.length !== 2) {
    throw new Error(
      `Packed strict React Native declarations failed beyond the known @types/d3-array boundary:\n${strict.output}`,
    )
  }
}

async function bundleConsumer({ config, consumerRoot }) {
  const bundles = await config.bundle(consumerRoot)
  for (const bundle of bundles) {
    const sources = await readSourceMapSources(bundle.sourceMaps)
    assertPackedNativeBoundary(bundle.label, sources, bundle.includesTooltip)
  }
  return bundles.map(({ label, bundle }) => ({
    label,
    bytes: bundle.byteLength,
    gzip: gzipSync(bundle).byteLength,
  }))
}

async function bundleBareConsumer(consumerRoot) {
  const cli = resolve(consumerRoot, 'node_modules/.bin/react-native')
  const outputRoot = resolve(consumerRoot, 'bundles')
  await mkdir(outputRoot, { recursive: true })
  await writeFile(
    resolve(consumerRoot, 'packed-base-entry.js'),
    "import { defineChart, lineY } from '@tanstack/charts/universal'\nimport { Chart } from '@tanstack/react-native-charts'\nglobalThis.__tanstackChartsPackedBase = [defineChart, lineY, Chart]\n",
  )

  const entries = [
    {
      entry: 'index.js',
      name: 'bare',
      platforms: ['ios', 'android'],
      includesTooltip: true,
    },
    {
      entry: 'packed-base-entry.js',
      name: 'bare-base',
      platforms: ['ios'],
      includesTooltip: false,
    },
  ]
  const bundles = []
  for (const entry of entries) {
    for (const platform of entry.platforms) {
      const output = resolve(outputRoot, `${entry.name}.${platform}.jsbundle`)
      const sourceMap = resolve(outputRoot, `${entry.name}.${platform}.map`)
      await run(
        cli,
        [
          'bundle',
          '--entry-file',
          entry.entry,
          '--platform',
          platform,
          '--dev',
          'false',
          '--minify',
          'true',
          '--bundle-output',
          output,
          '--sourcemap-output',
          sourceMap,
          '--config',
          resolve(consumerRoot, 'metro.config.cjs'),
        ],
        consumerRoot,
      )
      bundles.push({
        label: `Packed bare React Native ${entry.name === 'bare' ? '' : 'base '}${platform}`,
        bundle: await readFile(output),
        sourceMaps: [sourceMap],
        includesTooltip: entry.includesTooltip,
      })
    }
  }
  return bundles
}

async function bundleExpoConsumer(consumerRoot) {
  const cli = resolve(consumerRoot, 'node_modules/.bin/expo')
  const bundles = []
  for (const platform of ['ios', 'android']) {
    const outputRoot = resolve(consumerRoot, `dist-${platform}`)
    await run(
      cli,
      [
        'export',
        '--platform',
        platform,
        '--output-dir',
        outputRoot,
        '--clear',
        '--source-maps',
      ],
      consumerRoot,
      {
        CI: 'true',
        EXPO_NO_TELEMETRY: '1',
      },
    )
    const files = await walk(outputRoot)
    const sourceMaps = files.filter((file) => file.endsWith('.map'))
    assert.ok(sourceMaps.length, `Expo ${platform} emitted no source map`)
    const bundlePath = await largestBundleFile(files)
    bundles.push({
      label: `Packed Expo ${platform}`,
      bundle: await readFile(bundlePath),
      sourceMaps,
      includesTooltip: true,
    })
  }
  return bundles
}

async function largestBundleFile(files) {
  const candidates = files.filter((file) => /\.(?:js|hbc|bundle)$/.test(file))
  assert.ok(candidates.length, 'Expo emitted no JavaScript or Hermes bundle')
  const measured = await Promise.all(
    candidates.map(async (file) => ({ file, size: (await stat(file)).size })),
  )
  measured.sort((left, right) => right.size - left.size)
  return measured[0].file
}

async function readSourceMapSources(sourceMaps) {
  const sources = []
  for (const sourceMap of sourceMaps) {
    const parsed = JSON.parse(await readFile(sourceMap, 'utf8'))
    sources.push(...(parsed.sources ?? []).map(normalize))
  }
  return sources
}

function assertPackedNativeBoundary(label, sources, includesTooltip) {
  const requiredSources = ['/@tanstack/charts/dist/universal.js']
  if (includesTooltip) {
    requiredSources.push(
      '/@tanstack/charts/dist/react-native/index.native.js',
      '/@tanstack/charts/dist/react-native/tooltip-entry.native.js',
      '/@tanstack/charts/dist/react-native/Tooltip.js',
    )
  } else {
    requiredSources.push('/@tanstack/react-native-charts/dist/index.native.js')
  }
  for (const required of requiredSources) {
    assert.ok(
      sources.some((source) => source.includes(required)),
      `${label} did not include packed ${required}`,
    )
  }
  if (!includesTooltip) {
    const optionalTooltipSources = sources.filter(
      (source) =>
        source.includes(
          '/@tanstack/react-native-charts/dist/tooltip-entry.native.js',
        ) || source.includes('/@tanstack/react-native-charts/dist/Tooltip.js'),
    )
    assert.deepEqual(
      optionalTooltipSources,
      [],
      `${label} retained the optional tooltip entry`,
    )
  }
  const leakedSource = sources.filter(
    (source) =>
      source.includes('/packages/react-native-charts/src/') ||
      source.includes('/packages/charts-core/src/') ||
      source.includes('/@tanstack/react-native-charts/src/') ||
      source.includes('/@tanstack/charts/src/'),
  )
  assert.deepEqual(leakedSource, [], `${label} resolved workspace source`)
  assertSinglePackedPackage(label, sources, '@tanstack/charts')
  if (includesTooltip) {
    assert.equal(
      sources.some((source) =>
        source.includes('/@tanstack/react-native-charts/'),
      ),
      false,
      `${label} retained the legacy React Native package`,
    )
  } else {
    assertSinglePackedPackage(label, sources, '@tanstack/react-native-charts')
  }
  const forbidden = sources.filter((source) =>
    forbiddenNativeSources.some((candidate) => source.includes(candidate)),
  )
  assert.deepEqual(forbidden, [], `${label} crossed the browser boundary`)
}

function assertSinglePackedPackage(label, sources, packageName) {
  const marker = `/${packageName}/`
  const packageSources = sources.filter((source) => source.includes(marker))
  assert.ok(packageSources.length, `${label} did not include ${packageName}`)
  assert.ok(
    packageSources.every((source) => source.includes(`${marker}dist/`)),
    `${label} loaded a non-dist ${packageName} module`,
  )
  const roots = new Set(
    packageSources.map((source) =>
      source.slice(0, source.indexOf(marker) + marker.length - 1),
    ),
  )
  assert.equal(roots.size, 1, `${label} loaded multiple ${packageName} copies`)
}

function requiredTarball(tarballs, packageName) {
  const tarball = tarballs.get(packageName)
  assert.ok(tarball, `Missing packed tarball for ${packageName}`)
  return tarball
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}

async function run(command, args, cwd, environment = {}) {
  return execFileAsync(command, args, {
    cwd,
    env: { ...process.env, ...environment },
    maxBuffer: 20 * 1024 * 1024,
  })
}

async function runAllowFailure(command, args, cwd) {
  try {
    const result = await run(command, args, cwd)
    return { status: 0, output: `${result.stdout}${result.stderr}` }
  } catch (error) {
    return {
      status: error.code ?? 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    }
  }
}

function normalize(value) {
  return value.replaceAll('\\', '/')
}
