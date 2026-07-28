import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { compile as compileOctane } from 'octane/compiler'
import { build, transform } from 'esbuild'
import ts from 'typescript'
import { validatePackedMarkdownLinks } from './packed-markdown-links.mjs'

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname, '..')
const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json')))
const temporaryRoot = await mkdtemp(
  resolve(tmpdir(), 'tanstack-charts-packed-consumer-'),
)
const buildWorkspace = resolve(temporaryRoot, 'build')
const tarballDirectory = resolve(temporaryRoot, 'tarballs')
const fixtureDirectory = resolve(temporaryRoot, 'consumer')

const packages = [
  packageConfig('charts-core', 'core'),
  packageConfig('react-charts', 'react'),
  packageConfig('octane-charts', 'octane'),
]

try {
  await mkdir(resolve(buildWorkspace, 'packages'), { recursive: true })
  await mkdir(tarballDirectory, { recursive: true })
  await writeFile(
    resolve(buildWorkspace, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n",
  )
  await writeFile(
    resolve(buildWorkspace, 'package.json'),
    `${JSON.stringify(
      {
        name: 'tanstack-charts-pack-workspace',
        private: true,
        packageManager: rootManifest.packageManager,
      },
      null,
      2,
    )}\n`,
  )

  for (const packageInfo of packages) {
    await buildPackage(packageInfo)
  }

  const tarballs = new Map()
  for (const packageInfo of packages) {
    tarballs.set(packageInfo.name, await packPackage(packageInfo))
  }

  await installFixture(tarballs)
  await verifyInstalledManifests()
  await verifyEsmRuntime()
  await verifyDeclarations()
  const bundles = await verifyProductionBundles()

  console.log('Packed exports, declarations, and runtime gate passed.')
  console.log('| Consumer | Minified | Gzip |')
  console.log('| --- | ---: | ---: |')
  for (const bundle of bundles) {
    console.log(
      `| ${bundle.label} | ${formatBytes(bundle.bytes)} | ${formatBytes(bundle.gzip)} |`,
    )
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

function packageConfig(directoryName, kind) {
  const sourceDirectory = resolve(root, 'packages', directoryName)
  return {
    directoryName,
    kind,
    sourceDirectory,
    stageDirectory: resolve(buildWorkspace, 'packages', directoryName),
  }
}

async function buildPackage(packageInfo) {
  const manifest = JSON.parse(
    await readFile(resolve(packageInfo.sourceDirectory, 'package.json')),
  )
  packageInfo.manifest = manifest
  packageInfo.name = manifest.name

  validateManifest(packageInfo)
  await mkdir(packageInfo.stageDirectory, { recursive: true })
  await copyPackageFiles(packageInfo)
  await buildRuntime(packageInfo)
  await buildDeclarations(packageInfo)
  await rewriteGeneratedSpecifiers(resolve(packageInfo.stageDirectory, 'dist'))
  await validatePublishedTargets(packageInfo)
}

function validateManifest(packageInfo) {
  const { manifest } = packageInfo
  assert.equal(manifest.type, 'module', `${manifest.name} must publish ESM`)
  assert.equal(
    manifest.sideEffects,
    false,
    `${manifest.name} must remain tree-shakeable`,
  )
  assert.ok(
    manifest.files?.includes('dist'),
    `${manifest.name} files must include dist`,
  )
  assert.ok(
    manifest.publishConfig?.exports,
    `${manifest.name} requires publishConfig.exports`,
  )
  assert.deepEqual(
    Object.keys(manifest.publishConfig.exports).sort(),
    Object.keys(manifest.exports).sort(),
    `${manifest.name} source and published export keys differ`,
  )

  for (const [key, sourceTarget] of Object.entries(manifest.exports)) {
    assert.equal(
      typeof sourceTarget,
      'string',
      `${manifest.name} source export ${key} must identify one source entry`,
    )
    assert.ok(
      sourceTarget.startsWith('./src/'),
      `${manifest.name} source export ${key} must stay inside src`,
    )
    const published = manifest.publishConfig.exports[key]
    assert.ok(
      typeof published === 'object' && published !== null,
      `${manifest.name} published export ${key} must use conditions`,
    )
    assert.ok(
      published.types?.startsWith('./dist/'),
      `${manifest.name} published export ${key} requires declarations`,
    )
    for (const condition of ['import', 'browser', 'node']) {
      if (published[condition] === undefined) continue
      assert.ok(
        published[condition].startsWith('./dist/'),
        `${manifest.name} published ${key} ${condition} must stay inside dist`,
      )
    }
  }
}

async function copyPackageFiles(packageInfo) {
  const { manifest, sourceDirectory, stageDirectory } = packageInfo
  const stagedManifest = structuredClone(manifest)
  for (const [dependency, range] of Object.entries(
    stagedManifest.dependencies ?? {},
  )) {
    if (!range.startsWith('workspace:')) continue
    const workspacePackage = packages.find(
      (candidate) => candidate.name === dependency,
    )
    assert.ok(workspacePackage, `Unknown workspace dependency ${dependency}`)
    stagedManifest.dependencies[dependency] = workspacePackage.manifest.version
  }
  await writeFile(
    resolve(stageDirectory, 'package.json'),
    `${JSON.stringify(stagedManifest, null, 2)}\n`,
  )
  for (const entry of manifest.files) {
    if (entry === 'dist') continue
    const source = resolve(sourceDirectory, entry)
    const destination = resolve(stageDirectory, entry)
    await cp(source, destination, { recursive: true })
  }
}

async function buildRuntime(packageInfo) {
  const sourceRoot = resolve(packageInfo.sourceDirectory, 'src')
  const outputRoot = resolve(packageInfo.stageDirectory, 'dist')
  const entryPoints = (await walk(sourceRoot)).filter(isRuntimeSource)

  await build({
    entryPoints,
    outdir: outputRoot,
    outbase: sourceRoot,
    bundle: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    jsx: 'automatic',
    jsxImportSource: packageInfo.kind === 'react' ? 'react' : undefined,
    legalComments: 'none',
    logLevel: 'silent',
  })

  if (packageInfo.kind !== 'octane') return

  const sourcePath = resolve(sourceRoot, 'Chart.tsrx')
  const source = await readFile(sourcePath, 'utf8')
  await compileOctaneEntry(source, 'client', resolve(outputRoot, 'Chart.js'))
  await compileOctaneEntry(
    source,
    'server',
    resolve(outputRoot, 'server', 'Chart.js'),
  )
  await writeFile(
    resolve(outputRoot, 'server', 'index.js'),
    "export { Chart } from './Chart.js'\n",
  )
}

function isRuntimeSource(file) {
  if (!/\.(?:ts|tsx)$/.test(file)) return false
  if (/\.d\.ts$/.test(file)) return false
  if (/\.(?:test|type-test)\.(?:ts|tsx)$/.test(file)) return false
  return !file.endsWith(`${sep}test-scales.ts`)
}

async function compileOctaneEntry(source, mode, outfile) {
  const compiled = compileOctane(
    source,
    `/@tanstack/octane-charts/Chart.tsrx`,
    {
      mode,
      dev: false,
      hmr: false,
    },
  )
  if (compiled.diagnostics.length) {
    throw new Error(
      `Octane ${mode} compilation failed:\n${compiled.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join('\n')}`,
    )
  }
  const output = await transform(compiled.code, {
    loader: 'js',
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
  })
  await mkdir(dirname(outfile), { recursive: true })
  await writeFile(outfile, output.code)
}

async function buildDeclarations(packageInfo) {
  const sourceRoot = resolve(packageInfo.sourceDirectory, 'src')
  const outputRoot = resolve(packageInfo.stageDirectory, 'dist')
  const rootNames = [
    ...new Set(
      Object.values(packageInfo.manifest.exports).map((entry) =>
        resolve(packageInfo.sourceDirectory, entry),
      ),
    ),
  ]
  const options = {
    allowArbitraryExtensions: true,
    declaration: true,
    declarationMap: false,
    emitDeclarationOnly: true,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmitOnError: true,
    outDir: outputRoot,
    rootDir: sourceRoot,
    skipLibCheck: false,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: true,
  }
  const program = ts.createProgram(rootNames, options)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    throw new Error(
      `Declaration build failed for ${packageInfo.name}:\n${formatDiagnostics(
        diagnostics,
      )}`,
    )
  }
  const result = program.emit()
  if (result.emitSkipped) {
    throw new Error(`Declaration emit was skipped for ${packageInfo.name}`)
  }

  if (packageInfo.kind === 'octane') {
    await cp(
      resolve(sourceRoot, 'Chart.tsrx.d.ts'),
      resolve(outputRoot, 'Chart.d.ts'),
    )
  }
}

async function rewriteGeneratedSpecifiers(directory) {
  for (const file of await walk(directory)) {
    if (!file.endsWith('.js') && !file.endsWith('.d.ts')) continue
    const source = await readFile(file, 'utf8')
    const rewritten = source.replace(
      /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.\.?\/[^'"]+)\2/g,
      (match, prefix, quote, specifier) =>
        `${prefix}${quote}${toJavaScriptSpecifier(specifier)}${quote}`,
    )
    if (rewritten !== source) await writeFile(file, rewritten)
  }
}

function toJavaScriptSpecifier(specifier) {
  if (/\.(?:[cm]?js|json|css|wasm)$/.test(specifier)) return specifier
  if (/\.(?:ts|tsx|tsrx)$/.test(specifier)) {
    return specifier.replace(/\.(?:ts|tsx|tsrx)$/, '.js')
  }
  return `${specifier}.js`
}

async function validatePublishedTargets(packageInfo) {
  const exports = packageInfo.manifest.publishConfig.exports
  for (const [key, conditions] of Object.entries(exports)) {
    for (const [condition, target] of Object.entries(conditions)) {
      if (condition === 'default') continue
      const targetPath = resolve(packageInfo.stageDirectory, target)
      assert.ok(
        await isFile(targetPath),
        `${packageInfo.name} ${key} ${condition} target is missing: ${target}`,
      )
    }
  }
}

async function packPackage(packageInfo) {
  const filename = `${packageInfo.directoryName}-${packageInfo.manifest.version}.tgz`
  const tarball = resolve(tarballDirectory, filename)
  const { stdout } = await run(
    'pnpm',
    ['pack', '--out', tarball, '--json'],
    packageInfo.stageDirectory,
  )
  const packed = JSON.parse(stdout)
  const files = new Set(packed.files.map((file) => file.path))
  assert.ok(
    files.has('package.json'),
    `${packageInfo.name} omitted package.json`,
  )
  assert.equal(
    [...files].some((file) => file.startsWith('src/')),
    false,
    `${packageInfo.name} leaked source files`,
  )
  for (const conditions of Object.values(
    packageInfo.manifest.publishConfig.exports,
  )) {
    for (const target of Object.values(conditions)) {
      assert.ok(
        files.has(target.replace(/^\.\//, '')),
        `${packageInfo.name} tarball omitted exported target ${target}`,
      )
    }
  }
  await verifyPackedMarkdownLinks(packageInfo, files)
  return tarball
}

async function verifyPackedMarkdownLinks(packageInfo, packedFiles) {
  const markdownSources = new Map()
  for (const file of [...packedFiles]
    .filter((path) => path.endsWith('.md'))
    .sort()) {
    markdownSources.set(
      file,
      await readFile(
        resolve(packageInfo.stageDirectory, ...file.split('/')),
        'utf8',
      ),
    )
  }
  validatePackedMarkdownLinks({
    packageName: packageInfo.name,
    packedFiles,
    markdownSources,
  })
}

async function installFixture(tarballs) {
  await mkdir(fixtureDirectory, { recursive: true })
  const coreTarball = fileDependency(tarballs.get('@tanstack/charts'))
  const dependencies = {
    '@tanstack/charts': coreTarball,
    '@tanstack/octane-charts': fileDependency(
      tarballs.get('@tanstack/octane-charts'),
    ),
    '@tanstack/react-charts': fileDependency(
      tarballs.get('@tanstack/react-charts'),
    ),
    '@types/d3-array': installedDependency('@types/d3-array'),
    '@types/d3-scale': installedDependency('@types/d3-scale'),
    '@types/d3-shape': installedDependency('@types/d3-shape'),
    '@types/react': installedDependency('@types/react'),
    'd3-array': installedDependency('d3-array'),
    'd3-scale': installedDependency('d3-scale'),
    'd3-shape': installedDependency('d3-shape'),
    octane: installedDependency('octane'),
    react: installedDependency('react'),
    'react-dom': installedDependency('react-dom'),
  }
  const manifest = {
    name: 'tanstack-charts-packed-consumer',
    private: true,
    type: 'module',
    dependencies,
  }
  await writeFile(
    resolve(fixtureDirectory, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFile(
    resolve(fixtureDirectory, 'pnpm-workspace.yaml'),
    `packages:\n  - '.'\noverrides:\n  '@tanstack/charts': ${JSON.stringify(
      coreTarball,
    )}\n  'd3-array': ${JSON.stringify(
      installedDependency('d3-array'),
    )}\n  'd3-scale': ${JSON.stringify(
      installedDependency('d3-scale'),
    )}\n  'd3-shape': ${JSON.stringify(
      installedDependency('d3-shape'),
    )}\n  '@types/d3-shape': ${JSON.stringify(
      installedDependency('@types/d3-shape'),
    )}\n`,
  )
  await run(
    'pnpm',
    ['install', '--offline', '--ignore-scripts', '--frozen-lockfile=false'],
    fixtureDirectory,
    {
      CI: 'true',
      npm_config_offline: 'true',
    },
  )
}

function fileDependency(file) {
  assert.ok(file)
  return `file:${file}`
}

function installedDependency(name) {
  return `link:${resolve(root, 'node_modules', ...name.split('/'))}`
}

async function verifyInstalledManifests() {
  for (const packageInfo of packages) {
    const installedPath = resolve(
      fixtureDirectory,
      'node_modules',
      ...packageInfo.name.split('/'),
      'package.json',
    )
    const installed = JSON.parse(await readFile(installedPath))
    assert.deepEqual(
      installed.exports,
      packageInfo.manifest.publishConfig.exports,
      `${packageInfo.name} packed exports differ from publishConfig`,
    )
    assert.equal(
      installed.publishConfig?.exports,
      undefined,
      `${packageInfo.name} packed manifest retained source export overrides`,
    )
    assert.equal(installed.publishConfig?.access, 'public')
    for (const range of Object.values(installed.dependencies ?? {})) {
      assert.equal(
        range.startsWith('workspace:'),
        false,
        `${packageInfo.name} packed manifest retained ${range}`,
      )
    }
  }
}

async function verifyEsmRuntime() {
  const coreSubpaths = Object.keys(packages[0].manifest.publishConfig.exports)
    .sort()
    .map((key) => `@tanstack/charts${key === '.' ? '' : key.slice(1)}`)
  const source = `
    import assert from 'node:assert/strict'
    import { realpathSync } from 'node:fs'
    import { fileURLToPath, pathToFileURL } from 'node:url'
    import { createElement } from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import { renderToString } from 'octane/server'
    import { scaleLinear } from 'd3-scale'
    import {
      createChartScene,
      defineChart,
      lineY,
      renderChartSvg,
    } from '@tanstack/charts'
    import { Chart as ReactChart } from '@tanstack/react-charts'
    import { Chart as OctaneChart } from '@tanstack/octane-charts'

    const canonicalRoot = pathToFileURL(${JSON.stringify(`${root}${sep}`)}).href
    const installedRoot = realpathSync('./node_modules')
    for (const specifier of ${JSON.stringify([
      ...coreSubpaths,
      '@tanstack/react-charts',
      '@tanstack/octane-charts',
    ])}) {
      const resolved = import.meta.resolve(specifier)
      const resolvedPath = realpathSync(fileURLToPath(resolved))
      assert.ok(resolvedPath.startsWith(installedRoot), resolvedPath)
      assert.ok(resolvedPath.includes('/dist/'), resolvedPath)
      assert.equal(resolved.startsWith(canonicalRoot), false, resolved)
      const module = await import(specifier)
      assert.ok(Object.keys(module).length > 0, specifier)
    }

    const rows = [
      { id: 'a', x: 0, y: 2 },
      { id: 'b', x: 1, y: 5 },
    ]
    const definition = defineChart({
      marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 5]) },
    })
    const scene = createChartScene(definition, { width: 320, height: 180 })
    assert.match(
      renderChartSvg(scene, { ariaLabel: 'Packed core chart' }),
      /<path/,
    )

    const reactHtml = renderToStaticMarkup(
      createElement(ReactChart, {
        definition,
        ariaLabel: 'Packed React chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(reactHtml, /Packed React chart/)
    assert.match(reactHtml, /<path/)

    const { html: octaneHtml } = renderToString(() =>
      OctaneChart({
        definition,
        ariaLabel: 'Packed Octane chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(octaneHtml, /Packed Octane chart/)
    assert.match(octaneHtml, /<path/)
  `
  const runtimeCheck = resolve(fixtureDirectory, 'runtime-check.mjs')
  await writeFile(runtimeCheck, source)
  await run('node', [runtimeCheck], fixtureDirectory)
}

async function verifyDeclarations() {
  const coreSubpaths = Object.keys(packages[0].manifest.publishConfig.exports)
    .sort()
    .map((key) => `@tanstack/charts${key === '.' ? '' : key.slice(1)}`)
  const namespaceImports = coreSubpaths
    .map(
      (specifier, index) =>
        `import * as coreExport${index} from '${specifier}'\nvoid coreExport${index}`,
    )
    .join('\n')
  const source = `
    import {
      defineChart,
      mountChart,
      renderChartSvg,
      type ChartFocusStrategy,
      type ChartSpec,
      type ChartPoint,
      type ChartSpecDatum,
      type ChartSpecXValue,
      type ChartSpecYValue,
      type ChartSvgRenderer,
    } from '@tanstack/charts'
    import { lineY } from '@tanstack/charts/line'
    import {
      createMarkWithScaleValues,
      type ChartMarkPointX,
      type ChartMarkScaleX,
    } from '@tanstack/charts/mark/scale-values'
    import { Chart as ReactChart } from '@tanstack/react-charts'
    import { Chart as OctaneChart } from '@tanstack/octane-charts'
    import { extent, max } from 'd3-array'
    import { scaleBand, scaleLinear } from 'd3-scale'
    import { curveMonotoneX } from 'd3-shape'
    ${namespaceImports}
    void [extent, max, curveMonotoneX]

    interface Row {
      id: string
      category: string
      value: number
    }
    type Equal<TLeft, TRight> =
      (<T>() => T extends TLeft ? 1 : 2) extends
      (<T>() => T extends TRight ? 1 : 2)
        ? true
        : false
    type Expect<T extends true> = T

    const rows: readonly Row[] = [
      { id: 'a', category: 'Alpha', value: 4 },
      { id: 'b', category: 'Beta', value: 8 },
    ]
    const definition = defineChart({
      marks: [lineY(rows, { x: 'category', y: 'value', key: 'id' })],
      x: { scale: scaleBand<string>().domain(rows.map((row) => row.category)) },
      y: { scale: scaleLinear().domain([0, 8]) },
    })
    const dynamicDefinition = defineChart<{ rows: readonly Row[] }>()(
      ({ input }) => ({
        marks: [
          lineY(input.rows, { x: 'category', y: 'value', key: 'id' }),
        ],
        x: {
          scale: scaleBand<string>().domain(
            input.rows.map((row) => row.category),
          ),
        },
        y: { scale: scaleLinear().domain([0, 8]) },
      }),
    )
    const undefinedInputDefinition = defineChart<undefined>()(
      () => definition,
    )
    const endpointMark = createMarkWithScaleValues<
      Row,
      number,
      number,
      string,
      number
    >(() => ({
      id: 'endpoint',
      channels: {
        x: { scale: 'x', values: rows.map((row) => row.category) },
        y: { scale: 'y', values: rows.map((row) => row.value) },
      },
      render: () => ({
        nodes: [],
        points: rows.map((row, datumIndex) => ({
          key: row.id,
          markId: 'endpoint',
          group: null,
          groupLabel: 'endpoint',
          datum: row,
          datumIndex,
          xValue: datumIndex,
          yValue: row.value,
          x: datumIndex,
          y: row.value,
          color: 'currentColor',
        })),
      }),
    }))
    const endpointDefinition = defineChart({
      marks: [endpointMark],
      x: {
        scale: scaleBand<string>().domain(
          rows.map((row) => row.category),
        ),
      },
      y: { scale: scaleLinear().domain([0, 8]) },
    })
    type EndpointXIsNumber = Expect<
      Equal<NonNullable<typeof endpointDefinition.__xValue>, number>
    >
    type EndpointSpecXIsNumber = Expect<
      Equal<ChartSpecXValue<typeof endpointDefinition>, number>
    >
    type EndpointSpecYIsNumber = Expect<
      Equal<ChartSpecYValue<typeof endpointDefinition>, number>
    >
    type EndpointSpecDatumIsRow = Expect<
      Equal<ChartSpecDatum<typeof endpointDefinition>, Row>
    >
    type EndpointPointXIsNumber = Expect<
      Equal<ChartMarkPointX<typeof endpointMark>, number>
    >
    type EndpointScaleXIsString = Expect<
      Equal<ChartMarkScaleX<typeof endpointMark>, string>
    >
    const endpointXCheck: EndpointXIsNumber = true
    const endpointSpecXCheck: EndpointSpecXIsNumber = true
    const endpointSpecYCheck: EndpointSpecYIsNumber = true
    const endpointSpecDatumCheck: EndpointSpecDatumIsRow = true
    const endpointPointXCheck: EndpointPointXIsNumber = true
    const endpointScaleXCheck: EndpointScaleXIsString = true
    void [
      endpointXCheck,
      endpointSpecXCheck,
      endpointSpecYCheck,
      endpointSpecDatumCheck,
      endpointPointXCheck,
      endpointScaleXCheck,
    ]
    const invalidEndpointSpec: ChartSpec<readonly [typeof endpointMark]> = {
      marks: [endpointMark],
      // @ts-expect-error The packed custom mark declares categorical x scale values.
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
    }
    void invalidEndpointSpec
    const container = document.createElement('div')

    mountChart(container, {
      definition,
      ariaLabel: 'Core chart',
      focus: {
        resolve(points) {
          const point = points[0]
          if (point) {
            type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
            type XIsString = Expect<Equal<typeof point.xValue, string>>
            type YIsNumber = Expect<Equal<typeof point.yValue, number>>
            const checks: [DatumIsRow, XIsString, YIsNumber] = [
              true,
              true,
              true,
            ]
            void checks
          }
          return points
        },
        group(_points, point) {
          point.datum.id.toUpperCase()
          point.xValue.toUpperCase()
          point.yValue.toFixed(0)
          return [point]
        },
        navigation(points) {
          return points
        },
      },
      renderSvg(scene) {
        const point = scene.points[0]
        if (point) {
          type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
          type XIsString = Expect<Equal<typeof point.xValue, string>>
          type YIsNumber = Expect<Equal<typeof point.yValue, number>>
          const checks: [DatumIsRow, XIsString, YIsNumber] = [
            true,
            true,
            true,
          ]
          void checks
        }
        return renderChartSvg(scene, { ariaLabel: 'Custom SVG renderer' })
      },
      onFocusChange(point) {
        if (!point) return
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
        point.datum.id.toUpperCase()
        // @ts-expect-error xValue is inferred as string.
        point.xValue.toFixed(0)
      },
    })
    ReactChart({
      definition,
      ariaLabel: 'React chart',
      focus: {
        resolve(points) {
          const point = points[0]
          if (point) {
            type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
            type XIsString = Expect<Equal<typeof point.xValue, string>>
            type YIsNumber = Expect<Equal<typeof point.yValue, number>>
            const checks: [DatumIsRow, XIsString, YIsNumber] = [
              true,
              true,
              true,
            ]
            void checks
          }
          return points
        },
        group(_points, point) {
          point.datum.id.toUpperCase()
          point.xValue.toUpperCase()
          point.yValue.toFixed(0)
          return [point]
        },
        navigation(points) {
          return points
        },
      },
      renderSvg(scene) {
        const point = scene.points[0]
        if (point) {
          type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
          type XIsString = Expect<Equal<typeof point.xValue, string>>
          type YIsNumber = Expect<Equal<typeof point.yValue, number>>
          const checks: [DatumIsRow, XIsString, YIsNumber] = [
            true,
            true,
            true,
          ]
          void checks
        }
        return renderChartSvg(scene, {
          ariaLabel: 'Custom React SVG renderer',
        })
      },
      onSelect(point) {
        if (!point) return
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })
    OctaneChart({
      definition,
      ariaLabel: 'Octane chart',
      focus: {
        resolve(points) {
          const point = points[0]
          if (point) {
            type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
            type XIsString = Expect<Equal<typeof point.xValue, string>>
            type YIsNumber = Expect<Equal<typeof point.yValue, number>>
            const checks: [DatumIsRow, XIsString, YIsNumber] = [
              true,
              true,
              true,
            ]
            void checks
          }
          return points
        },
        group(_points, point) {
          point.datum.id.toUpperCase()
          point.xValue.toUpperCase()
          point.yValue.toFixed(0)
          return [point]
        },
        navigation(points) {
          return points
        },
      },
      renderSvg(scene) {
        const point = scene.points[0]
        if (point) {
          type DatumIsRow = Expect<Equal<typeof point.datum, Row>>
          type XIsString = Expect<Equal<typeof point.xValue, string>>
          type YIsNumber = Expect<Equal<typeof point.yValue, number>>
          const checks: [DatumIsRow, XIsString, YIsNumber] = [
            true,
            true,
            true,
          ]
          void checks
        }
        return renderChartSvg(scene, {
          ariaLabel: 'Custom Octane SVG renderer',
        })
      },
      onFocusGroupChange(points) {
        const point = points[0]
        if (!point) return
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })

    mountChart(container, {
      definition: dynamicDefinition,
      input: { rows },
      ariaLabel: 'Dynamic core chart',
    })
    ReactChart({
      definition: dynamicDefinition,
      input: { rows },
      ariaLabel: 'Dynamic React chart',
    })
    OctaneChart({
      definition: dynamicDefinition,
      input: { rows },
      ariaLabel: 'Dynamic Octane chart',
    })
    ReactChart({
      definition: undefinedInputDefinition,
      input: undefined,
      ariaLabel: 'Undefined input chart',
    })
    const numericFocus: ChartFocusStrategy<Row, number, number> = {
      resolve: (points) => points,
      group: (_points, point) => [point],
      navigation: (points) => points,
    }
    const numericRenderer: ChartSvgRenderer<Row, number, number> = () => ''
    mountChart(container, {
      definition,
      ariaLabel: 'Incompatible focus coordinates',
      // @ts-expect-error A numeric-x focus strategy cannot consume string-x points.
      focus: numericFocus,
    })
    ReactChart({
      definition,
      ariaLabel: 'Incompatible React focus coordinates',
      // @ts-expect-error React infers string x from the definition.
      focus: numericFocus,
    })
    ReactChart({
      definition,
      ariaLabel: 'Incompatible React renderer coordinates',
      // @ts-expect-error React infers string x from the definition.
      renderSvg: numericRenderer,
    })
    OctaneChart({
      definition,
      ariaLabel: 'Incompatible Octane focus coordinates',
      // @ts-expect-error Octane infers string x from the definition.
      focus: numericFocus,
    })
    OctaneChart({
      definition,
      ariaLabel: 'Incompatible Octane renderer coordinates',
      // @ts-expect-error Octane infers string x from the definition.
      renderSvg: numericRenderer,
    })

    mountChart(container, {
      // @ts-expect-error Dynamic core definitions require input.
      definition: dynamicDefinition,
      ariaLabel: 'Missing core input',
    })
    ReactChart({
      // @ts-expect-error Dynamic React definitions require input.
      definition: dynamicDefinition,
      ariaLabel: 'Missing React input',
    })
    OctaneChart({
      // @ts-expect-error Dynamic Octane definitions require input.
      definition: dynamicDefinition,
      ariaLabel: 'Missing Octane input',
    })
    ReactChart({
      // @ts-expect-error Undefined-valued dynamic input is still required.
      definition: undefinedInputDefinition,
      ariaLabel: 'Missing undefined input',
    })
    // @ts-expect-error Static definitions reject input.
    ReactChart({ definition, input: { rows }, ariaLabel: 'Static input' })

    declare const point: ChartPoint<Row, string, number>
    point.xValue.toUpperCase()
    point.yValue.toFixed(0)
  `
  const contractPath = resolve(fixtureDirectory, 'type-contract.ts')
  await writeFile(contractPath, source)
  const options = {
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
    verbatimModuleSyntax: true,
  }
  const program = ts.createProgram([contractPath], options)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    throw new Error(
      `Packed declaration contract failed:\n${formatDiagnostics(diagnostics)}`,
    )
  }

  const canonicalSourceRoots = packages.map(
    (packageInfo) => `${resolve(packageInfo.sourceDirectory, 'src')}${sep}`,
  )
  const fixtureNodeModules = await realpath(
    resolve(fixtureDirectory, 'node_modules'),
  )
  const resolvedPackageSources = program
    .getSourceFiles()
    .filter((file) => file.fileName.includes(`${sep}@tanstack${sep}`))
  assert.ok(
    resolvedPackageSources.length > 0,
    'TypeScript did not load packed declarations',
  )
  for (const file of resolvedPackageSources) {
    const resolvedFile = await realpath(file.fileName)
    assert.equal(
      canonicalSourceRoots.some((sourceRoot) =>
        resolvedFile.startsWith(sourceRoot),
      ),
      false,
      `TypeScript escaped to workspace source: ${resolvedFile}`,
    )
    assert.ok(
      resolvedFile.startsWith(fixtureNodeModules),
      `TypeScript resolved outside the fixture: ${resolvedFile}`,
    )
    assert.ok(
      resolvedFile.includes(`${sep}dist${sep}`),
      `TypeScript did not resolve a declaration artifact: ${resolvedFile}`,
    )
  }
}

async function verifyProductionBundles() {
  const entries = [
    {
      label: 'Core',
      filename: 'core.ts',
      external: [],
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { lineY } from '@tanstack/charts/line'
        import { scaleLinear } from 'd3-scale'
        const rows = [{ x: 0, y: 2 }, { x: 1, y: 5 }]
        const definition = defineChart({
          marks: [lineY(rows, { x: 'x', y: 'y' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed core chart' },
        )
      `,
    },
    {
      label: 'React',
      filename: 'react.ts',
      external: ['react', 'react/jsx-runtime'],
      source: `
        import { createElement } from 'react'
        import { Chart } from '@tanstack/react-charts'
        import { defineChart, lineY } from '@tanstack/charts'
        import { scaleLinear } from 'd3-scale'
        const rows = [{ x: 0, y: 2 }, { x: 1, y: 5 }]
        const definition = defineChart({
          marks: [lineY(rows, { x: 'x', y: 'y' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const chart = createElement(Chart, {
          definition,
          ariaLabel: 'Packed React chart',
        })
      `,
    },
    {
      label: 'Octane',
      filename: 'octane.ts',
      external: ['octane'],
      source: `
        export { Chart } from '@tanstack/octane-charts'
      `,
    },
  ]
  const bundleDirectory = resolve(fixtureDirectory, 'bundles')
  const fixtureNodeModules = await realpath(
    resolve(fixtureDirectory, 'node_modules'),
  )
  await mkdir(bundleDirectory, { recursive: true })
  const results = []

  for (const entry of entries) {
    const entryPath = resolve(fixtureDirectory, entry.filename)
    const outfile = resolve(bundleDirectory, `${entry.label.toLowerCase()}.js`)
    await writeFile(entryPath, entry.source)
    const result = await build({
      entryPoints: [entryPath],
      outfile,
      absWorkingDir: fixtureDirectory,
      bundle: true,
      conditions: ['browser', 'import', 'default'],
      external: entry.external,
      format: 'esm',
      legalComments: 'none',
      logLevel: 'silent',
      metafile: true,
      minify: true,
      platform: 'browser',
      target: 'es2022',
      treeShaking: true,
    })
    const contents = await readFile(outfile)
    assert.ok(contents.byteLength > 100, `${entry.label} bundle is empty`)
    assert.ok(
      contents.byteLength < 500_000,
      `${entry.label} bundle unexpectedly exceeds 500 kB`,
    )
    for (const input of Object.keys(result.metafile.inputs)) {
      const absoluteInput = resolve(fixtureDirectory, input)
      assert.equal(
        absoluteInput.startsWith(`${resolve(root, 'packages')}${sep}`),
        false,
        `${entry.label} bundle used workspace source: ${absoluteInput}`,
      )
      if (absoluteInput.includes(`${sep}@tanstack${sep}`)) {
        const resolvedInput = await realpath(absoluteInput)
        assert.ok(
          resolvedInput.startsWith(fixtureNodeModules),
          `${entry.label} bundle resolved outside the fixture: ${resolvedInput}`,
        )
        assert.ok(
          resolvedInput.includes(`${sep}dist${sep}`),
          `${entry.label} bundle bypassed packed dist: ${resolvedInput}`,
        )
      }
    }
    results.push({
      label: entry.label,
      bytes: contents.byteLength,
      gzip: gzipSync(contents).byteLength,
    })
  }

  return results
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(file)))
    else files.push(file)
  }
  return files
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

async function run(command, args, cwd, environment = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      env: { ...process.env, ...environment },
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60_000,
    })
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join('\n')
    throw new Error(
      `${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`,
      { cause: error },
    )
  }
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  })
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}
