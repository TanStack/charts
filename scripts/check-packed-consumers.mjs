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
import { verifyPackedReactNativeConsumers } from './packed-react-native-consumers.mjs'

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname, '..')
const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json')))
const artifactDirectory = parseArtifactDirectory(process.argv.slice(2))
const temporaryRoot = await mkdtemp(
  resolve(tmpdir(), 'tanstack-charts-packed-consumer-'),
)
const buildWorkspace = resolve(temporaryRoot, 'build')
const tarballDirectory = artifactDirectory ?? resolve(temporaryRoot, 'tarballs')
const fixtureDirectory = resolve(temporaryRoot, 'consumer')

const webPackages = [
  packageConfig('charts-scales', 'scale'),
  packageConfig('charts-core', 'core'),
  packageConfig('react-charts', 'react'),
  packageConfig('octane-charts', 'octane'),
]
const nativePackage = packageConfig('react-native-charts', 'react-native')
const packages = [...webPackages, nativePackage]

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
  const nativeBundles = await verifyPackedReactNativeConsumers({
    repositoryRoot: root,
    temporaryRoot,
    tarballs,
  })

  console.log('Packed exports, declarations, and runtime gate passed.')
  console.log('| Consumer | Bytes | Gzip |')
  console.log('| --- | ---: | ---: |')
  for (const bundle of bundles) {
    console.log(
      `| ${bundle.label} | ${formatBytes(bundle.bytes)} | ${formatBytes(bundle.gzip)} |`,
    )
  }
  for (const bundle of nativeBundles) {
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
  assert.equal(manifest.private, false, `${manifest.name} must be publishable`)
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
  assert.equal(
    manifest.publishConfig?.provenance,
    true,
    `${manifest.name} must publish provenance`,
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
    for (const condition of ['import', 'browser', 'node', 'react-native']) {
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
    jsxImportSource:
      packageInfo.kind === 'react' || packageInfo.kind === 'react-native'
        ? 'react'
        : undefined,
    legalComments: 'none',
    logLevel: 'silent',
  })

  if (packageInfo.kind !== 'octane') return

  for (const name of ['Chart', 'RendererChart', 'CanvasChart']) {
    const filename = `${name}.tsrx`
    const source = await readFile(resolve(sourceRoot, filename), 'utf8')
    await compileOctaneEntry(
      source,
      filename,
      'client',
      resolve(outputRoot, `${name}.js`),
    )
    await compileOctaneEntry(
      source,
      filename,
      'server',
      resolve(outputRoot, 'server', `${name}.js`),
    )
  }
  await writeFile(
    resolve(outputRoot, 'server', 'index.js'),
    "export { Chart } from './Chart.js'\n",
  )
  await writeFile(
    resolve(outputRoot, 'server', 'core.js'),
    "export { RendererChart as Chart } from './RendererChart.js'\n",
  )
  await writeFile(
    resolve(outputRoot, 'server', 'canvas.js'),
    "export { CanvasChart as Chart } from './CanvasChart.js'\n",
  )
}

function isRuntimeSource(file) {
  if (!/\.(?:ts|tsx)$/.test(file)) return false
  if (/\.d\.ts$/.test(file)) return false
  if (/\.(?:test|type-test)\.(?:ts|tsx)$/.test(file)) return false
  return !file.endsWith(`${sep}test-scales.ts`)
}

async function compileOctaneEntry(source, filename, mode, outfile) {
  const compiled = compileOctane(
    source,
    `/@tanstack/octane-charts/${filename}`,
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
  const isReactNative = packageInfo.kind === 'react-native'
  const options = {
    allowArbitraryExtensions: true,
    declaration: true,
    declarationMap: false,
    emitDeclarationOnly: true,
    jsx: ts.JsxEmit.ReactJSX,
    customConditions: isReactNative ? ['react-native'] : undefined,
    lib: isReactNative
      ? ['lib.es2022.d.ts']
      : ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmitOnError: true,
    outDir: outputRoot,
    rootDir: sourceRoot,
    skipLibCheck: isReactNative,
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
    for (const name of ['Chart', 'RendererChart', 'CanvasChart']) {
      await cp(
        resolve(sourceRoot, `${name}.tsrx.d.ts`),
        resolve(outputRoot, `${name}.d.ts`),
      )
    }
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
  const scalesTarball = fileDependency(tarballs.get('@tanstack/charts-scales'))
  const dependencies = {
    '@tanstack/charts': coreTarball,
    '@tanstack/charts-scales': scalesTarball,
    '@tanstack/octane-charts': fileDependency(
      tarballs.get('@tanstack/octane-charts'),
    ),
    '@tanstack/react-charts': fileDependency(
      tarballs.get('@tanstack/react-charts'),
    ),
    '@types/d3-array': installedDependency('@types/d3-array'),
    '@types/d3-geo': installedDependency('@types/d3-geo'),
    '@types/d3-scale': installedDependency('@types/d3-scale'),
    '@types/d3-shape': installedDependency('@types/d3-shape'),
    '@types/react': installedDependency('@types/react'),
    'd3-array': installedDependency('d3-array'),
    'd3-geo': installedDependency('d3-geo'),
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
    )}\n  '@tanstack/charts-scales': ${JSON.stringify(
      scalesTarball,
    )}\n  'd3-array': ${JSON.stringify(
      installedDependency('d3-array'),
    )}\n  'd3-geo': ${JSON.stringify(
      installedDependency('d3-geo'),
    )}\n  'd3-scale': ${JSON.stringify(
      installedDependency('d3-scale'),
    )}\n  'd3-shape': ${JSON.stringify(
      installedDependency('d3-shape'),
    )}\n  '@types/d3-shape': ${JSON.stringify(
      installedDependency('@types/d3-shape'),
    )}\n  '@types/d3-geo': ${JSON.stringify(
      installedDependency('@types/d3-geo'),
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

function publishedSpecifiers(packageInfo) {
  return Object.keys(packageInfo.manifest.publishConfig.exports)
    .sort()
    .map((key) => `${packageInfo.name}${key === '.' ? '' : key.slice(1)}`)
}

async function verifyInstalledManifests() {
  for (const packageInfo of webPackages) {
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
  const publishedSubpaths = webPackages.flatMap(publishedSpecifiers)
  const source = `
    import assert from 'node:assert/strict'
    import { realpathSync } from 'node:fs'
    import { fileURLToPath, pathToFileURL } from 'node:url'
    import { createElement } from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import { renderToString } from 'octane/server'
    import { scaleLinear } from 'd3-scale'
    import { scaleBand as compactScaleBand } from '@tanstack/charts-scales/band'
    import { scaleLinear as compactScaleLinear } from '@tanstack/charts-scales/linear'
    import { scaleOrdinal as compactScaleOrdinal } from '@tanstack/charts-scales/ordinal'
    import { scalePoint as compactScalePoint } from '@tanstack/charts-scales/point'
    import {
      createChartScene,
      defineChart,
      lineY,
      renderChartSvg,
    } from '@tanstack/charts'
    import { canvasChartRenderer } from '@tanstack/charts/canvas'
    import { motion } from '@tanstack/charts/motion'
    import { createChartSpring } from '@tanstack/charts/spring'
    import { tooltip } from '@tanstack/charts/tooltip'
    import { portal } from '@tanstack/charts/tooltip/portal'
    import { Chart as ReactChart } from '@tanstack/react-charts'
    import { Chart as ReactCanvasChart } from '@tanstack/react-charts/canvas'
    import { Chart as ReactRendererChart } from '@tanstack/react-charts/core'
    import { Chart as OctaneChart } from '@tanstack/octane-charts'
    import { Chart as OctaneCanvasChart } from '@tanstack/octane-charts/canvas'
    import { Chart as OctaneRendererChart } from '@tanstack/octane-charts/core'

    const canonicalRoot = pathToFileURL(${JSON.stringify(`${root}${sep}`)}).href
    const installedRoot = realpathSync('./node_modules')
    const typeOnlySpecifiers = new Set(['@tanstack/charts/types'])
    for (const specifier of ${JSON.stringify(publishedSubpaths)}) {
      const resolved = import.meta.resolve(specifier)
      const resolvedPath = realpathSync(fileURLToPath(resolved))
      assert.ok(resolvedPath.startsWith(installedRoot), resolvedPath)
      assert.ok(resolvedPath.includes('/dist/'), resolvedPath)
      assert.equal(resolved.startsWith(canonicalRoot), false, resolved)
      const module = await import(specifier)
      if (!typeOnlySpecifiers.has(specifier)) {
        assert.ok(Object.keys(module).length > 0, specifier)
      }
    }
    assert.equal(compactScaleLinear([0, 1], [0, 10])(0.5), 5)
    assert.equal(compactScaleBand(['a', 'b'], [0, 10]).domain().length, 2)
    assert.equal(compactScalePoint(['a', 'b'], [0, 10]).bandwidth(), 0)
    assert.equal(compactScaleOrdinal(['a'], ['red'])('a'), 'red')
    assert.equal(tooltip.id, 'tooltip')
    assert.equal(portal.id, 'portal')
    assert.equal(motion().id, 'svg:svg-motion')
    assert.equal(createChartSpring().sample(0).value, 0)

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

    const reactRendererHtml = renderToStaticMarkup(
      createElement(ReactRendererChart, {
        renderer: canvasChartRenderer,
        definition,
        ariaLabel: 'Packed React renderer chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(reactRendererHtml, /Packed React renderer chart/)
    assert.match(reactRendererHtml, /<canvas/)

    const reactCanvasHtml = renderToStaticMarkup(
      createElement(ReactCanvasChart, {
        definition,
        ariaLabel: 'Packed React Canvas chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(reactCanvasHtml, /Packed React Canvas chart/)
    assert.match(reactCanvasHtml, /<canvas/)

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

    const { html: octaneRendererHtml } = renderToString(() =>
      OctaneRendererChart({
        renderer: canvasChartRenderer,
        definition,
        ariaLabel: 'Packed Octane renderer chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(octaneRendererHtml, /Packed Octane renderer chart/)
    assert.match(octaneRendererHtml, /<canvas/)

    const { html: octaneCanvasHtml } = renderToString(() =>
      OctaneCanvasChart({
        definition,
        ariaLabel: 'Packed Octane Canvas chart',
        width: 320,
        height: 180,
      }),
    )
    assert.match(octaneCanvasHtml, /Packed Octane Canvas chart/)
    assert.match(octaneCanvasHtml, /<canvas/)
  `
  const runtimeCheck = resolve(fixtureDirectory, 'runtime-check.mjs')
  await writeFile(runtimeCheck, source)
  await run('node', [runtimeCheck], fixtureDirectory)
}

async function verifyDeclarations() {
  const namespaceImports = webPackages
    .flatMap(publishedSpecifiers)
    .map(
      (specifier, index) =>
        `import * as packedExport${index} from '${specifier}'\nvoid packedExport${index}`,
    )
    .join('\n')
  const source = `
    import {
      defineChart,
      mountChart,
      renderChartSvg,
      type ChartFocusStrategy,
      type ChartHost,
      type ChartHostCommonOptions,
      type ChartHostOptions,
      type ChartSpec,
      type ChartPoint,
      type ChartRenderContext,
      type ChartRenderer,
      type ChartRendererHost,
      type ChartRendererHostCommonOptions,
      type ChartRendererHostOptions,
      type ChartRendererRenderContext,
      type ChartSpecDatum,
      type ChartSpecXValue,
      type ChartSpecYValue,
      type ChartSurface,
      type ChartSurfaceRenderOptions,
      type ChartSvgRenderer,
      type ChartTooltipBodyTarget,
    } from '@tanstack/charts'
    import { canvasChartRenderer } from '@tanstack/charts/canvas'
    import { motion, type ChartMotionOptions } from '@tanstack/charts/motion'
    import {
      createChartSpring,
      type ChartSpringOptions,
    } from '@tanstack/charts/spring'
    import { lineY } from '@tanstack/charts/line'
    import { tooltip } from '@tanstack/charts/tooltip'
    import { portal } from '@tanstack/charts/tooltip/portal'
    import { scaleBand as compactScaleBand } from '@tanstack/charts-scales/band'
    import { scaleLinear as compactScaleLinear } from '@tanstack/charts-scales/linear'
    import { scaleOrdinal as compactScaleOrdinal } from '@tanstack/charts-scales/ordinal'
    import { scalePoint as compactScalePoint } from '@tanstack/charts-scales/point'
    import {
      createMarkWithScaleValues,
      type ChartMarkPointX,
      type ChartMarkScaleX,
    } from '@tanstack/charts/mark/scale-values'
    import { Chart as ReactChart } from '@tanstack/react-charts'
    import { Chart as ReactCanvasChart } from '@tanstack/react-charts/canvas'
    import { Chart as ReactRendererChart } from '@tanstack/react-charts/core'
    import { Chart as OctaneChart } from '@tanstack/octane-charts'
    import { Chart as OctaneCanvasChart } from '@tanstack/octane-charts/canvas'
    import { Chart as OctaneRendererChart } from '@tanstack/octane-charts/core'
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
    const motionOptions: ChartMotionOptions = {
      transition: {
        type: 'spring',
        stiffness: 170,
        damping: 14,
        mass: 1,
      },
    }
    const motionRenderer = motion<Row, number, number>(motionOptions)
    const springOptions: ChartSpringOptions = { stiffness: 170, damping: 14 }
    const spring = createChartSpring(springOptions)
    void [motionRenderer, spring]
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
    })
    const compactDefinition = defineChart({
      marks: [lineY(rows, { x: 'category', y: 'value', key: 'id' })],
      x: {
        scale: compactScaleBand<string>().domain(
          rows.map((row) => row.category),
        ),
      },
      y: { scale: compactScaleLinear().domain([0, 8]) },
      tooltip: {
        use: tooltip,
        portal,
        format(point) {
          point.datum.id.toUpperCase()
          point.xValue.toUpperCase()
          point.yValue.toFixed(0)
          return point.datum.category
        },
      },
    })
    compactScalePoint<string>().domain(rows.map((row) => row.category))
    compactScaleOrdinal<string, string>()
      .domain(rows.map((row) => row.category))
      .range(['red'])
    void compactDefinition
    const responsiveDefinition = defineChart(({ width }) => ({
      marks: [lineY(rows, { x: 'category', y: 'value', key: 'id' })],
      x: {
        scale: scaleBand<string>().domain(rows.map((row) => row.category)),
        axis: { ticks: { count: width < 480 ? 3 : 5 } },
      },
      y: { scale: scaleLinear().domain([0, 8]) },
    }))
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

    const packedRenderer: ChartRenderer<Row, string, number> =
      canvasChartRenderer
    ReactRendererChart({
      renderer: packedRenderer,
      definition,
      ariaLabel: 'React renderer chart',
      onSelect(point) {
        if (!point) return
        point.datum.id.toUpperCase()
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })
    ReactCanvasChart({
      definition,
      ariaLabel: 'React Canvas chart',
      onSelect(point) {
        if (!point) return
        point.datum.id.toUpperCase()
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })
    OctaneRendererChart({
      renderer: packedRenderer,
      definition,
      ariaLabel: 'Octane renderer chart',
      onSelect(point) {
        if (!point) return
        point.datum.id.toUpperCase()
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })
    OctaneCanvasChart({
      definition,
      ariaLabel: 'Octane Canvas chart',
      onSelect(point) {
        if (!point) return
        point.datum.id.toUpperCase()
        point.xValue.toUpperCase()
        point.yValue.toFixed(0)
      },
    })

    mountChart(container, {
      definition: responsiveDefinition,
      ariaLabel: 'Responsive core chart',
    })
    ReactChart({
      definition: responsiveDefinition,
      ariaLabel: 'Responsive React chart',
    })
    OctaneChart({
      definition: responsiveDefinition,
      ariaLabel: 'Responsive Octane chart',
    })
    ReactRendererChart({
      renderer: canvasChartRenderer,
      definition: responsiveDefinition,
      ariaLabel: 'Responsive React renderer chart',
    })
    ReactCanvasChart({
      definition: responsiveDefinition,
      ariaLabel: 'Responsive React Canvas chart',
    })
    OctaneRendererChart({
      renderer: canvasChartRenderer,
      definition: responsiveDefinition,
      ariaLabel: 'Responsive Octane renderer chart',
    })
    OctaneCanvasChart({
      definition: responsiveDefinition,
      ariaLabel: 'Responsive Octane Canvas chart',
    })
    const numericFocus: ChartFocusStrategy<Row, number, number> = {
      resolve: (points) => points,
      group: (_points, point) => [point],
      navigation: (points) => points,
    }
    const numericRenderer: ChartSvgRenderer<Row, number, number> = () => ''
    // @ts-expect-error A numeric-x focus strategy cannot consume string-x points.
    defineChart(definition, {
      focus: numericFocus,
    })
    mountChart(container, {
      definition,
      ariaLabel: 'Core chart rejects host focus',
      // @ts-expect-error Chart behavior belongs to the definition.
      focus: numericFocus,
    })
    ReactChart({
      definition,
      ariaLabel: 'React chart rejects host focus',
      // @ts-expect-error Chart behavior belongs to the definition.
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
      ariaLabel: 'Octane chart rejects host focus',
      // @ts-expect-error Chart behavior belongs to the definition.
      focus: numericFocus,
    })
    OctaneChart({
      definition,
      ariaLabel: 'Incompatible Octane renderer coordinates',
      // @ts-expect-error Octane infers string x from the definition.
      renderSvg: numericRenderer,
    })

    // @ts-expect-error Chart props reject formal input.
    ReactChart({ definition: responsiveDefinition, input: { rows } })

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

  await assertPackedDeclarationSources(program, 'DOM declaration contract')

  const universalSource = `
    import {
      createChartRuntime,
      defineChart,
      lineY,
      type ChartPoint,
      type ChartTooltipOptions,
    } from '@tanstack/charts/universal'
    import type {
      ChartDefinition,
      ChartScene,
      ChartTooltipExtensionToken,
      ChartTooltipPortalExtensionToken,
    } from '@tanstack/charts/types'
    import { scaleLinear } from 'd3-scale'

    interface Row {
      id: string
      x: number
      y: number
    }

    const rows: readonly Row[] = [
      { id: 'a', x: 0, y: 2 },
      { id: 'b', x: 1, y: 5 },
    ]
    const definition: ChartDefinition<Row, number, number> = defineChart({
      marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
    })
    const runtime = createChartRuntime<Row, number, number>()
    const scene: ChartScene<Row, number, number> = runtime.render(
      definition,
      { width: 320, height: 180 },
    )
    const point: ChartPoint<Row, number, number> | undefined = scene.points[0]
    const tooltip: ChartTooltipOptions<Row, number, number> = {
      format: (nextPoint) => nextPoint.datum.id,
    }
    const tooltipToken: ChartTooltipExtensionToken = {
      id: 'host-tooltip',
      create: () => undefined,
    }
    const portalToken: ChartTooltipPortalExtensionToken = {
      id: 'host-tooltip-portal',
      create: () => undefined,
    }
    void [point, tooltip, tooltipToken, portalToken]
  `
  const universalContractPath = resolve(
    fixtureDirectory,
    'universal-type-contract.ts',
  )
  await writeFile(universalContractPath, universalSource)
  const universalProgram = ts.createProgram([universalContractPath], {
    ...options,
    lib: ['lib.es2022.d.ts', 'lib.webworker.d.ts'],
  })
  const universalDiagnostics = ts.getPreEmitDiagnostics(universalProgram)
  if (universalDiagnostics.length) {
    throw new Error(
      `Packed universal declaration contract failed:\n${formatDiagnostics(
        universalDiagnostics,
      )}`,
    )
  }
  await assertPackedDeclarationSources(
    universalProgram,
    'universal declaration contract',
  )
}

async function assertPackedDeclarationSources(program, label) {
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
    `TypeScript did not load packed declarations for ${label}`,
  )
  for (const file of resolvedPackageSources) {
    const resolvedFile = await realpath(file.fileName)
    assert.equal(
      canonicalSourceRoots.some((sourceRoot) =>
        resolvedFile.startsWith(sourceRoot),
      ),
      false,
      `${label} escaped to workspace source: ${resolvedFile}`,
    )
    assert.ok(
      resolvedFile.startsWith(fixtureNodeModules),
      `${label} resolved outside the fixture: ${resolvedFile}`,
    )
    assert.ok(
      resolvedFile.includes(`${sep}dist${sep}`),
      `${label} did not resolve a declaration artifact: ${resolvedFile}`,
    )
  }
}

async function verifyProductionBundles() {
  const packedRendererModules = {
    canvas: [
      '/@tanstack/charts/dist/canvas.js',
      '/@tanstack/react-charts/dist/CanvasChart.js',
      '/@tanstack/react-charts/dist/canvas.js',
      '/@tanstack/octane-charts/dist/CanvasChart.js',
      '/@tanstack/octane-charts/dist/canvas.js',
    ],
    svg: [
      '/@tanstack/charts/dist/reconcile.js',
      '/@tanstack/charts/dist/svg-renderer.js',
      '/@tanstack/charts/dist/svg-resources.js',
      '/@tanstack/charts/dist/svg-surface.js',
      '/@tanstack/charts/dist/svg.js',
      '/@tanstack/react-charts/dist/Chart.js',
      '/@tanstack/octane-charts/dist/Chart.js',
    ],
    browserHost: [
      '/@tanstack/charts/dist/index.js',
      '/@tanstack/charts/dist/adapter.js',
      '/@tanstack/charts/dist/adapter-renderer.js',
      '/@tanstack/charts/dist/adapter-shared.js',
      '/@tanstack/charts/dist/canvas.js',
      '/@tanstack/charts/dist/dom.js',
      '/@tanstack/charts/dist/dom-text.js',
      '/@tanstack/charts/dist/export.js',
      '/@tanstack/charts/dist/reconcile.js',
      '/@tanstack/charts/dist/renderer.js',
      '/@tanstack/charts/dist/svg-surface.js',
    ],
  }
  const packedInputModules = {
    compactLinear: ['/@tanstack/charts-scales/dist/linear.js'],
    compactBand: ['/@tanstack/charts-scales/dist/band.js'],
    compactPoint: ['/@tanstack/charts-scales/dist/point.js'],
    compactBandKernel: ['/@tanstack/charts-scales/dist/band-kernel.js'],
    compactOrdinal: ['/@tanstack/charts-scales/dist/ordinal.js'],
    tooltip: [
      '/@tanstack/charts/dist/tooltip.js',
      '/@tanstack/charts/dist/tooltip-position.js',
    ],
    tooltipExtension: ['/@tanstack/charts/dist/tooltip.js'],
    tooltipPortal: ['/@tanstack/charts/dist/tooltip-portal.js'],
    motion: ['/@tanstack/charts/dist/motion.js'],
    spring: ['/@tanstack/charts/dist/spring.js'],
    reactTooltip: ['/@tanstack/react-charts/dist/tooltip.js'],
    d3GeometryRuntime: ['/d3-geo/', '/d3-shape/'],
    d3Runtime: ['/d3-', '/internmap/'],
  }
  const entries = [
    {
      label: 'Universal',
      filename: 'universal.ts',
      external: [],
      rendererBoundary: 'universal',
      platform: 'neutral',
      conditions: ['import', 'default'],
      source: `
        export * from '@tanstack/charts/universal'
      `,
    },
    {
      label: 'Core',
      filename: 'core.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: { forbid: ['d3GeometryRuntime'] },
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
      label: 'Core renderer',
      filename: 'core-renderer.ts',
      external: [],
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltip', 'tooltipPortal', 'motion'],
      },
      source: `
        export { mountChartRenderer } from '@tanstack/charts/renderer'
      `,
    },
    {
      label: 'Core Canvas',
      filename: 'core-canvas.ts',
      external: [],
      rendererBoundary: 'canvas',
      source: `
        export { mountCanvasChart } from '@tanstack/charts/canvas'
      `,
    },
    {
      label: 'React',
      filename: 'react.ts',
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'svg',
      inputBoundary: {
        forbid: [
          'tooltip',
          'tooltipPortal',
          'reactTooltip',
          'd3GeometryRuntime',
          'motion',
        ],
      },
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
      label: 'React core',
      filename: 'react-core.ts',
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: ['tooltip', 'tooltipPortal', 'reactTooltip', 'motion'],
      },
      source: `
        export { Chart } from '@tanstack/react-charts/core'
        export type { ChartTooltipBodyRenderContext } from '@tanstack/react-charts/core'
      `,
    },
    {
      label: 'React Canvas',
      filename: 'react-canvas.ts',
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'canvas',
      inputBoundary: {
        forbid: ['tooltip', 'tooltipPortal', 'reactTooltip', 'motion'],
      },
      source: `
        export { Chart } from '@tanstack/react-charts/canvas'
        export type { ChartTooltipBodyRenderContext } from '@tanstack/react-charts/canvas'
      `,
    },
    {
      label: 'Compact linear scale',
      filename: 'compact-linear.ts',
      external: [],
      inputBoundary: {
        require: ['compactLinear'],
        forbid: [
          'compactBand',
          'compactPoint',
          'compactBandKernel',
          'compactOrdinal',
          'd3Runtime',
        ],
      },
      source: `
        export { scaleLinear } from '@tanstack/charts-scales/linear'
      `,
    },
    {
      label: 'Compact band scale',
      filename: 'compact-band.ts',
      external: [],
      inputBoundary: {
        require: ['compactBand', 'compactBandKernel'],
        forbid: [
          'compactLinear',
          'compactPoint',
          'compactOrdinal',
          'd3Runtime',
        ],
      },
      source: `
        export { scaleBand } from '@tanstack/charts-scales/band'
      `,
    },
    {
      label: 'Compact point scale',
      filename: 'compact-point.ts',
      external: [],
      inputBoundary: {
        require: ['compactPoint', 'compactBandKernel'],
        forbid: ['compactLinear', 'compactBand', 'compactOrdinal', 'd3Runtime'],
      },
      source: `
        export { scalePoint } from '@tanstack/charts-scales/point'
      `,
    },
    {
      label: 'Compact ordinal scale',
      filename: 'compact-ordinal.ts',
      external: [],
      inputBoundary: {
        require: ['compactOrdinal'],
        forbid: [
          'compactLinear',
          'compactBand',
          'compactPoint',
          'compactBandKernel',
          'd3Runtime',
        ],
      },
      source: `
        export { scaleOrdinal } from '@tanstack/charts-scales/ordinal'
      `,
    },
    {
      label: 'Tooltip extension',
      filename: 'tooltip.ts',
      external: [],
      inputBoundary: {
        require: ['tooltipExtension'],
        forbid: ['tooltipPortal', 'reactTooltip'],
      },
      source: `
        export { tooltip } from '@tanstack/charts/tooltip'
      `,
    },
    {
      label: 'Motion SVG renderer',
      filename: 'motion.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['motion'],
        forbid: ['tooltipExtension', 'tooltipPortal', 'd3Runtime'],
      },
      source: `
        export { motion } from '@tanstack/charts/motion'
      `,
    },
    {
      label: 'Spring physics kernel',
      filename: 'spring.ts',
      external: [],
      inputBoundary: {
        require: ['spring'],
        forbid: ['motion', 'tooltipExtension', 'tooltipPortal', 'd3Runtime'],
      },
      source: `
        export { createChartSpring } from '@tanstack/charts/spring'
      `,
    },
    {
      label: 'Tooltip portal transport',
      filename: 'tooltip-portal.ts',
      external: [],
      inputBoundary: {
        require: ['tooltipPortal'],
        forbid: ['tooltipExtension', 'reactTooltip'],
      },
      source: `
        export { portal } from '@tanstack/charts/tooltip/portal'
      `,
    },
    {
      label: 'React rich tooltip',
      filename: 'react-tooltip.ts',
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['tooltipExtension', 'reactTooltip'],
        forbid: ['tooltipPortal'],
      },
      source: `
        import { createElement } from 'react'
        import { defineChart, lineY } from '@tanstack/charts'
        import { tooltip } from '@tanstack/charts/tooltip'
        import { scaleLinear } from '@tanstack/charts-scales/linear'
        import { Chart } from '@tanstack/react-charts/tooltip'
        const definition = defineChart({
          marks: [lineY([2, 5])],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
          tooltip,
        })
        export const chart = createElement(Chart, {
          definition,
          ariaLabel: 'Packed React tooltip chart',
          renderTooltipBody: (context) => context.defaultBody,
        })
      `,
    },
    {
      label: 'Octane',
      filename: 'octane.ts',
      external: ['octane'],
      rendererBoundary: 'svg',
      source: `
        export { Chart } from '@tanstack/octane-charts'
      `,
    },
    {
      label: 'Octane core',
      filename: 'octane-core.ts',
      external: ['octane'],
      rendererBoundary: 'neutral',
      source: `
        export { Chart } from '@tanstack/octane-charts/core'
      `,
    },
    {
      label: 'Octane Canvas',
      filename: 'octane-canvas.ts',
      external: ['octane'],
      rendererBoundary: 'canvas',
      source: `
        export { Chart } from '@tanstack/octane-charts/canvas'
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
      conditions: entry.conditions ?? ['browser', 'import', 'default'],
      external: entry.external,
      format: 'esm',
      legalComments: 'none',
      logLevel: 'silent',
      metafile: true,
      minify: true,
      platform: entry.platform ?? 'browser',
      target: 'es2022',
      treeShaking: true,
    })
    const contents = await readFile(outfile)
    assert.ok(contents.byteLength > 100, `${entry.label} bundle is empty`)
    assert.ok(
      contents.byteLength < 500_000,
      `${entry.label} bundle unexpectedly exceeds 500 kB`,
    )
    const retainedInputs = collectRetainedInputs(result.metafile)
    assertRendererBoundary(
      entry.label,
      retainedInputs,
      entry.rendererBoundary,
      packedRendererModules,
    )
    assertPackedInputBoundary(
      entry.label,
      retainedInputs,
      entry.inputBoundary,
      packedInputModules,
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

function assertRendererBoundary(label, inputs, boundary, modules) {
  if (!boundary) return
  const paths = inputs.map((input) => input.replaceAll('\\', '/'))
  const canvas = matchingModules(paths, modules.canvas)
  const svg = matchingModules(paths, modules.svg)
  const browserHost = matchingModules(paths, modules.browserHost)

  if (boundary === 'universal') {
    assert.deepEqual(
      browserHost,
      [],
      `${label} universal bundle included browser host modules`,
    )
    return
  }

  if (boundary === 'neutral') {
    assert.deepEqual(canvas, [], `${label} neutral bundle included Canvas`)
    assert.deepEqual(svg, [], `${label} neutral bundle included SVG`)
    return
  }
  if (boundary === 'canvas') {
    assert.ok(canvas.length > 0, `${label} bundle omitted Canvas`)
    assert.deepEqual(svg, [], `${label} Canvas bundle included SVG`)
    return
  }
  if (boundary === 'svg') {
    assert.ok(svg.length > 0, `${label} bundle omitted SVG`)
    assert.deepEqual(canvas, [], `${label} SVG bundle included Canvas`)
    return
  }
  assert.fail(`${label} uses unknown renderer boundary ${boundary}`)
}

function collectRetainedInputs(metafile) {
  const retained = new Set()
  for (const output of Object.values(metafile.outputs)) {
    for (const [input, contribution] of Object.entries(output.inputs)) {
      if (contribution.bytesInOutput > 0) {
        retained.add(input.replaceAll('\\', '/'))
      }
    }
  }
  return [...retained].sort()
}

function assertPackedInputBoundary(label, inputs, boundary, modules) {
  if (!boundary) return
  for (const group of boundary.require ?? []) {
    assert.ok(
      matchingPackedInputs(inputs, modules[group]).length > 0,
      `${label} bundle omitted ${group}`,
    )
  }
  for (const group of boundary.forbid ?? []) {
    assert.deepEqual(
      matchingPackedInputs(inputs, modules[group]),
      [],
      `${label} bundle retained ${group}`,
    )
  }
}

function matchingPackedInputs(inputs, fragments) {
  assert.ok(fragments, 'Unknown packed input boundary')
  return inputs.filter((input) =>
    fragments.some((fragment) => input.includes(fragment)),
  )
}

function matchingModules(inputs, suffixes) {
  return inputs.filter((input) =>
    suffixes.some((suffix) => input.endsWith(suffix)),
  )
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

function parseArtifactDirectory(args) {
  if (args.length === 0) return null
  assert.deepEqual(
    args.slice(0, 1),
    ['--artifacts-dir'],
    'Usage: node scripts/check-packed-consumers.mjs [--artifacts-dir <path>]',
  )
  assert.equal(
    args.length,
    2,
    'Usage: node scripts/check-packed-consumers.mjs [--artifacts-dir <path>]',
  )
  return resolve(process.cwd(), args[1])
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}
