import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { readReleasePackages } from './release-package-config.mjs'

const execFileAsync = promisify(execFile)

export const unifiedPackageSources = [
  {
    packageName: '@tanstack/charts-scales',
    directory: 'charts-scales',
    namespace: 'scales',
  },
  {
    packageName: '@tanstack/react-charts',
    directory: 'react-charts',
    namespace: 'react',
  },
  {
    packageName: '@tanstack/react-native-charts',
    directory: 'react-native-charts',
    namespace: 'react-native',
  },
  {
    packageName: '@tanstack/octane-charts',
    directory: 'octane-charts',
    namespace: 'octane',
  },
  {
    packageName: '@tanstack/preact-charts',
    directory: 'preact-charts',
    namespace: 'preact',
  },
  {
    packageName: '@tanstack/vue-charts',
    directory: 'vue-charts',
    namespace: 'vue',
  },
  {
    packageName: '@tanstack/solid-charts',
    directory: 'solid-charts',
    namespace: 'solid',
  },
  {
    packageName: '@tanstack/svelte-charts',
    directory: 'svelte-charts',
    namespace: 'svelte',
  },
  {
    packageName: '@tanstack/angular-charts',
    directory: 'angular-charts',
    namespace: 'angular',
  },
  {
    packageName: '@tanstack/lit-charts',
    directory: 'lit-charts',
    namespace: 'lit',
  },
  {
    packageName: '@tanstack/alpine-charts',
    directory: 'alpine-charts',
    namespace: 'alpine',
  },
]

export const legacyUnifiedPackageNames = new Set(
  unifiedPackageSources.map(({ packageName }) => packageName),
)

export function isUnifiedCoreExport(exportKey) {
  return unifiedPackageSources.some(({ namespace }) =>
    belongsToNamespace(exportKey, namespace),
  )
}

export function mappedUnifiedExportKey(namespace, sourceExportKey) {
  assert.match(namespace, /^[a-z][a-z-]*$/u)
  assert.match(sourceExportKey, /^\.(?:\/.*)?$/u)
  return sourceExportKey === '.'
    ? `./${namespace}`
    : `./${namespace}${sourceExportKey.slice(1)}`
}

export function mappedUnifiedExportConditions(namespace, conditions) {
  assert.ok(
    conditions && typeof conditions === 'object' && !Array.isArray(conditions),
    `@tanstack/charts/${namespace} source exports must use conditions`,
  )
  return Object.fromEntries(
    Object.entries(conditions).map(([condition, target]) => {
      assert.equal(
        typeof target,
        'string',
        `@tanstack/charts/${namespace} ${condition} target must be a file`,
      )
      assert.ok(
        target.startsWith('./dist/'),
        `@tanstack/charts/${namespace} ${condition} target must be in dist`,
      )
      return [
        condition,
        `./dist/${namespace}/${target.slice('./dist/'.length)}`,
      ]
    }),
  )
}

export function linkedUnifiedConsumerDependencies({
  repositoryRoot,
  packageDirectory,
  dependencies,
}) {
  return Object.fromEntries(
    Object.keys(dependencies ?? {})
      .sort()
      .map((packageName) => [
        packageName,
        `link:${resolve(
          repositoryRoot,
          'packages',
          packageDirectory,
          'node_modules',
          ...packageName.split('/'),
        )}`,
      ]),
  )
}

export function unifiedConsumerWorkspace(linkedDependencies) {
  const overrides = Object.entries(linkedDependencies).map(
    ([packageName, target]) =>
      `  ${JSON.stringify(packageName)}: ${JSON.stringify(target)}`,
  )
  assert.ok(overrides.length > 0, '@tanstack/charts must declare dependencies')
  return [
    'packages:',
    "  - '.'",
    'autoInstallPeers: false',
    'overrides:',
    ...overrides,
    '',
  ].join('\n')
}

export function validateUnifiedCoreExports(coreExports, sourceManifests) {
  assert.ok(coreExports && typeof coreExports === 'object')

  for (const source of unifiedPackageSources) {
    const sourceManifest = sourceManifests.get(source.packageName)
    assert.ok(sourceManifest, `Missing artifact for ${source.packageName}`)
    const expectedEntries = new Map(
      Object.entries(sourceManifest.exports).map(([key, conditions]) => [
        mappedUnifiedExportKey(source.namespace, key),
        mappedUnifiedExportConditions(source.namespace, conditions),
      ]),
    )
    const actualKeys = Object.keys(coreExports)
      .filter((key) => belongsToNamespace(key, source.namespace))
      .sort()
    assert.deepEqual(
      actualKeys,
      [...expectedEntries.keys()].sort(),
      `@tanstack/charts/${source.namespace} exports drifted from ${source.packageName}`,
    )
    for (const [key, expected] of expectedEntries) {
      assert.deepEqual(
        coreExports[key],
        expected,
        `${key} must map the compiled ${source.packageName} artifact`,
      )
    }
  }
}

export async function assembleUnifiedCoreArtifact({
  repositoryRoot,
  artifactDirectory,
}) {
  const packages = await readReleasePackages(repositoryRoot)
  const packagesByName = new Map(
    packages.map((packageInfo) => [packageInfo.name, packageInfo]),
  )
  const coreInfo = packagesByName.get('@tanstack/charts')
  assert.ok(coreInfo, 'Release package list omitted @tanstack/charts')

  const temporaryRoot = await mkdtemp(
    resolve(tmpdir(), 'tanstack-charts-unified-artifact-'),
  )
  const extractedPackages = new Map()
  const replacementTarball = resolve(
    artifactDirectory,
    `.tmp-${coreInfo.artifactFilename}`,
  )

  try {
    for (const packageInfo of [coreInfo, ...unifiedPackageSources]) {
      const releaseInfo =
        'name' in packageInfo
          ? packageInfo
          : packagesByName.get(packageInfo.packageName)
      assert.ok(
        releaseInfo,
        `Release package list omitted ${packageInfo.packageName}`,
      )
      const destination = resolve(temporaryRoot, releaseInfo.directory)
      await mkdir(destination, { recursive: true })
      await extractTarball(
        resolve(artifactDirectory, releaseInfo.artifactFilename),
        destination,
      )
      extractedPackages.set(releaseInfo.name, resolve(destination, 'package'))
    }

    const coreRoot = extractedPackages.get('@tanstack/charts')
    assert.ok(coreRoot)
    const coreManifestPath = resolve(coreRoot, 'package.json')
    const coreManifest = JSON.parse(await readFile(coreManifestPath, 'utf8'))
    const sourceManifests = new Map()

    for (const source of unifiedPackageSources) {
      const sourceRoot = extractedPackages.get(source.packageName)
      assert.ok(sourceRoot)
      const sourceManifest = JSON.parse(
        await readFile(resolve(sourceRoot, 'package.json'), 'utf8'),
      )
      sourceManifests.set(source.packageName, sourceManifest)
      const target = resolve(coreRoot, 'dist', source.namespace)
      await rm(target, { recursive: true, force: true })
      await cp(resolve(sourceRoot, 'dist'), target, { recursive: true })
      await rm(resolve(target, 'package.json'), { force: true })
    }

    validateUnifiedCoreExports(coreManifest.exports, sourceManifests)
    validateNoLegacyPackageDependencies(coreManifest)
    await validateExportFiles(coreRoot, coreManifest)
    await validateNoNestedPackageManifests(resolve(coreRoot, 'dist'))
    await validateNoLegacyRuntimeImports(resolve(coreRoot, 'dist'))

    await rm(replacementTarball, { force: true })
    await run('pnpm', ['pack', '--out', replacementTarball, '--json'], coreRoot)
    await rename(
      replacementTarball,
      resolve(artifactDirectory, coreInfo.artifactFilename),
    )
  } finally {
    await rm(replacementTarball, { force: true })
    await rm(temporaryRoot, { recursive: true, force: true })
  }

  return resolve(artifactDirectory, coreInfo.artifactFilename)
}

export async function verifyUnifiedCoreArtifact({
  repositoryRoot,
  artifactDirectory,
}) {
  const packages = await readReleasePackages(repositoryRoot)
  const coreInfo = packages.find(({ name }) => name === '@tanstack/charts')
  assert.ok(coreInfo)
  const coreTarball = resolve(artifactDirectory, coreInfo.artifactFilename)
  const temporaryRoot = await mkdtemp(
    resolve(tmpdir(), 'tanstack-charts-unified-consumer-'),
  )
  const extractedRoot = resolve(temporaryRoot, 'extracted')
  const fixtureRoot = resolve(temporaryRoot, 'consumer')

  try {
    await mkdir(extractedRoot, { recursive: true })
    await extractTarball(coreTarball, extractedRoot)
    const packedRoot = resolve(extractedRoot, 'package')
    const packedManifest = JSON.parse(
      await readFile(resolve(packedRoot, 'package.json'), 'utf8'),
    )
    validateNoLegacyPackageDependencies(packedManifest)
    await validateExportFiles(packedRoot, packedManifest)
    await validateNoNestedPackageManifests(resolve(packedRoot, 'dist'))
    await validateNoLegacyRuntimeImports(resolve(packedRoot, 'dist'))

    const linkedDependencies = linkedUnifiedConsumerDependencies({
      repositoryRoot,
      packageDirectory: coreInfo.directory,
      dependencies: packedManifest.dependencies,
    })
    for (const [packageName, target] of Object.entries(linkedDependencies)) {
      assert.ok(
        (await stat(target.slice('link:'.length))).isDirectory(),
        `Workspace install omitted ${packageName}`,
      )
    }

    await mkdir(fixtureRoot, { recursive: true })
    await writeFile(
      resolve(fixtureRoot, 'package.json'),
      `${JSON.stringify(
        {
          name: 'tanstack-charts-unified-consumer',
          private: true,
          type: 'module',
          dependencies: {
            '@tanstack/charts': `file:${coreTarball}`,
          },
        },
        null,
        2,
      )}\n`,
    )
    await writeFile(
      resolve(fixtureRoot, 'pnpm-workspace.yaml'),
      unifiedConsumerWorkspace(linkedDependencies),
    )
    await run(
      'pnpm',
      [
        'install',
        '--offline',
        '--ignore-scripts',
        '--frozen-lockfile=false',
        '--store-dir',
        resolve(temporaryRoot, 'store'),
      ],
      fixtureRoot,
      {
        npm_config_offline: 'true',
        XDG_CACHE_HOME: resolve(temporaryRoot, 'cache'),
        XDG_DATA_HOME: resolve(temporaryRoot, 'data'),
        XDG_STATE_HOME: resolve(temporaryRoot, 'state'),
      },
    )

    const installedScope = resolve(fixtureRoot, 'node_modules', '@tanstack')
    assert.deepEqual(
      (await readdir(installedScope)).sort(),
      ['charts'],
      'Unified consumer installed a legacy TanStack package',
    )
    await verifyUnifiedBundles(fixtureRoot)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

async function verifyUnifiedBundles(fixtureRoot) {
  const { build } = await import('esbuild')
  const entries = [
    ['Compact linear scale', '@tanstack/charts/scales/linear'],
    ['Compact band scale', '@tanstack/charts/scales/band'],
    ['React adapter', '@tanstack/charts/react'],
    ['React tooltip adapter', '@tanstack/charts/react/tooltip'],
    [
      'React Native adapter',
      '@tanstack/charts/react-native',
      ['react-native', 'import', 'default'],
    ],
    [
      'React Native tooltip adapter',
      '@tanstack/charts/react-native/tooltip',
      ['react-native', 'import', 'default'],
    ],
    ['Octane adapter', '@tanstack/charts/octane'],
    ['Octane canvas adapter', '@tanstack/charts/octane/canvas'],
    ['Preact adapter', '@tanstack/charts/preact'],
    ['Vue adapter', '@tanstack/charts/vue'],
    ['Solid adapter', '@tanstack/charts/solid', ['solid', 'import', 'default']],
    [
      'Svelte adapter',
      '@tanstack/charts/svelte',
      ['svelte', 'import', 'default'],
    ],
    ['Angular adapter', '@tanstack/charts/angular'],
    ['Lit adapter', '@tanstack/charts/lit'],
    ['Alpine adapter', '@tanstack/charts/alpine'],
  ]
  const external = [
    '@angular/*',
    'alpinejs',
    'lit',
    'lit/*',
    'octane',
    'octane/*',
    'preact',
    'preact/*',
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    'react-native',
    'react-native/*',
    'react-native-svg',
    'solid-js',
    'solid-js/*',
    'svelte',
    'svelte/*',
    'tslib',
    'vue',
  ]

  for (const [label, specifier, conditions] of entries) {
    const namespace = specifier.slice('@tanstack/charts/'.length).split('/')[0]
    const entry = resolve(
      fixtureRoot,
      `${specifier.replaceAll(/[^a-z0-9]+/giu, '-')}.mjs`,
    )
    await writeFile(entry, `export * from '${specifier}'\n`)
    const bundled =
      namespace === 'svelte'
        ? await bundleSvelteEntry({
            conditions: conditions ?? ['svelte', 'import', 'default'],
            entry,
            external,
            fixtureRoot,
          })
        : await bundleJavaScriptEntry({
            build,
            conditions: conditions ?? ['browser', 'import', 'default'],
            entry,
            external,
            fixtureRoot,
          })
    assert.ok(bundled.bytes > 0, `${label} bundle is empty`)
    const retainedInputs = bundled.inputs
    assert.ok(
      retainedInputs.some(
        (input) =>
          input.includes(`${sep}@tanstack${sep}charts${sep}dist${sep}`) ||
          input.includes('/@tanstack/charts/dist/'),
      ),
      `${label} did not resolve through the packed unified artifact`,
    )
    assert.equal(
      retainedInputs.some((input) =>
        [...legacyUnifiedPackageNames].some((packageName) =>
          input.includes(`/${packageName}/`),
        ),
      ),
      false,
      `${label} resolved a legacy TanStack package`,
    )
    for (const input of retainedInputs) {
      const retainedNamespace = unifiedPackageSources.find(({ namespace }) =>
        input.includes(`/@tanstack/charts/dist/${namespace}/`),
      )?.namespace
      if (retainedNamespace === undefined) continue
      assert.equal(
        retainedNamespace,
        namespace,
        `${label} retained the ${retainedNamespace} adapter tree`,
      )
    }
  }
}

async function bundleJavaScriptEntry({
  build,
  conditions,
  entry,
  external,
  fixtureRoot,
}) {
  const result = await build({
    absWorkingDir: fixtureRoot,
    bundle: true,
    conditions,
    entryPoints: [entry],
    external,
    format: 'esm',
    legalComments: 'none',
    logLevel: 'silent',
    metafile: true,
    platform: 'neutral',
    target: 'es2022',
    treeShaking: true,
    write: false,
  })
  return {
    bytes: result.outputFiles.reduce(
      (total, output) => total + output.contents.byteLength,
      0,
    ),
    inputs: Object.keys(result.metafile.inputs),
  }
}

async function bundleSvelteEntry({ conditions, entry, external, fixtureRoot }) {
  const [{ build: viteBuild }, { svelte }] = await Promise.all([
    import('vite'),
    import('@sveltejs/vite-plugin-svelte'),
  ])
  const result = await viteBuild({
    configFile: false,
    logLevel: 'silent',
    plugins: [svelte()],
    resolve: { conditions },
    build: {
      emptyOutDir: false,
      lib: { entry, formats: ['es'] },
      outDir: resolve(fixtureRoot, '.svelte-bundle'),
      rollupOptions: {
        external: (specifier) => isExternal(specifier, external),
      },
      target: 'es2022',
      write: false,
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (buildResult) => buildResult.output,
  )
  const chunks = outputs.filter((output) => output.type === 'chunk')
  return {
    bytes: chunks.reduce((total, chunk) => total + chunk.code.length, 0),
    inputs: [...new Set(chunks.flatMap((chunk) => Object.keys(chunk.modules)))],
  }
}

function isExternal(specifier, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith('/*')
      ? specifier.startsWith(pattern.slice(0, -1))
      : specifier === pattern,
  )
}

function validateNoLegacyPackageDependencies(manifest) {
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const packageName of Object.keys(manifest[field] ?? {})) {
      assert.equal(
        legacyUnifiedPackageNames.has(packageName),
        false,
        `@tanstack/charts ${field} retained ${packageName}`,
      )
    }
  }
}

async function validateExportFiles(packageRoot, manifest) {
  for (const [key, conditions] of Object.entries(manifest.exports ?? {})) {
    assert.ok(
      conditions &&
        typeof conditions === 'object' &&
        !Array.isArray(conditions),
      `@tanstack/charts packed export ${key} must use conditions`,
    )
    for (const [condition, target] of Object.entries(conditions)) {
      assert.equal(
        typeof target,
        'string',
        `@tanstack/charts ${key} ${condition} must identify a file`,
      )
      const targetPath = resolve(packageRoot, target)
      assert.ok(
        targetPath.startsWith(`${packageRoot}${sep}`),
        `@tanstack/charts ${key} ${condition} escapes the package`,
      )
      assert.ok(
        await isFile(targetPath),
        `@tanstack/charts ${key} ${condition} target is missing: ${target}`,
      )
    }
  }
}

async function validateNoLegacyRuntimeImports(distRoot) {
  for (const file of await walk(distRoot)) {
    if (!/\.(?:[cm]?js)$/u.test(file)) continue
    const source = await readFile(file, 'utf8')
    for (const packageName of legacyUnifiedPackageNames) {
      assert.equal(
        source.includes(packageName),
        false,
        `${relative(distRoot, file)} retained runtime import ${packageName}`,
      )
    }
  }
}

async function validateNoNestedPackageManifests(distRoot) {
  const manifests = (await walk(distRoot))
    .filter((file) => file.endsWith(`${sep}package.json`))
    .map((file) => relative(distRoot, file))
    .sort()
  assert.deepEqual(
    manifests,
    [],
    '@tanstack/charts dist retained nested package manifests',
  )
}

function belongsToNamespace(exportKey, namespace) {
  const root = `./${namespace}`
  return exportKey === root || exportKey.startsWith(`${root}/`)
}

async function extractTarball(tarball, destination) {
  assert.ok(await isFile(tarball), `Missing release artifact ${tarball}`)
  await execFileAsync('tar', ['-xzf', tarball, '-C', destination], {
    maxBuffer: 20 * 1024 * 1024,
  })
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

async function isFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function run(command, args, cwd, environment = {}) {
  return execFileAsync(command, args, {
    cwd,
    env: { ...process.env, CI: 'true', ...environment },
    maxBuffer: 20 * 1024 * 1024,
  })
}
