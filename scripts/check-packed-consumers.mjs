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

const optionalHierarchyInputGroups = [
  'hierarchyFlat',
  'hierarchyTree',
  'hierarchyTreemap',
  'hierarchySunburst',
  'd3Hierarchy',
]
const optionalSankeyInputGroups = ['networkSankey', 'd3Sankey']
const optionalFocusInputGroups = ['focusGuide']
const optionalGuideNodeInputGroups = ['guideNodes']
const optionalInteractionInputGroups = [
  'interactionSignal',
  'interactiveLegend',
  'keyedSelection',
  'decorativeMarkPublic',
  'decorativeMarkLifecycle',
  'markSceneFilter',
]
const optionalInteractionAxisInputGroups = ['interactionAxis']
const optionalInteractionRangeInputGroups = ['interactionRange']
const optionalCursorInputGroups = ['interactionCursor']
const optionalHandleInputGroups = ['interactionHandle']
const optionalBrushInputGroups = ['interactionBrush', 'd3Brush', 'd3Selection']
const optionalZoomInputGroups = ['interactionZoom', 'd3Zoom']

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
    '@types/d3-contour': installedDependency('@types/d3-contour'),
    '@types/d3-delaunay': installedDependency('@types/d3-delaunay'),
    '@types/d3-force': installedDependency('@types/d3-force'),
    '@types/d3-geo': installedDependency('@types/d3-geo'),
    '@types/d3-hierarchy': installedDependency('@types/d3-hierarchy'),
    '@types/d3-scale': installedDependency('@types/d3-scale'),
    '@types/d3-shape': installedDependency('@types/d3-shape'),
    '@types/d3-zoom': installedDependency('@types/d3-zoom'),
    '@types/react': installedDependency('@types/react'),
    'd3-array': installedDependency('d3-array'),
    'd3-brush': installedDependency('d3-brush'),
    'd3-contour': installedDependency('d3-contour'),
    'd3-delaunay': installedDependency('d3-delaunay'),
    'd3-force': installedDependency('d3-force'),
    'd3-geo': installedDependency('d3-geo'),
    'd3-hierarchy': installedDependency('d3-hierarchy'),
    'd3-hexbin': installedDependency('d3-hexbin'),
    'd3-scale': installedDependency('d3-scale'),
    'd3-selection': installedDependency('d3-selection'),
    'd3-shape': installedDependency('d3-shape'),
    'd3-zoom': installedDependency('d3-zoom'),
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
    `packages:\n  - '.'\noverrides:\n  'd3-sankey': ${JSON.stringify(
      installedDependency('d3-sankey'),
    )}\n  '@tanstack/charts': ${JSON.stringify(
      coreTarball,
    )}\n  '@tanstack/charts-scales': ${JSON.stringify(
      scalesTarball,
    )}\n  'd3-array': ${JSON.stringify(
      installedDependency('d3-array'),
    )}\n  'd3-brush': ${JSON.stringify(
      installedDependency('d3-brush'),
    )}\n  'd3-contour': ${JSON.stringify(
      installedDependency('d3-contour'),
    )}\n  'd3-delaunay': ${JSON.stringify(
      installedDependency('d3-delaunay'),
    )}\n  'd3-force': ${JSON.stringify(
      installedDependency('d3-force'),
    )}\n  'd3-geo': ${JSON.stringify(
      installedDependency('d3-geo'),
    )}\n  'd3-hierarchy': ${JSON.stringify(
      installedDependency('d3-hierarchy'),
    )}\n  'd3-hexbin': ${JSON.stringify(
      installedDependency('d3-hexbin'),
    )}\n  'd3-scale': ${JSON.stringify(
      installedDependency('d3-scale'),
    )}\n  'd3-selection': ${JSON.stringify(
      installedDependency('d3-selection'),
    )}\n  'd3-shape': ${JSON.stringify(
      installedDependency('d3-shape'),
    )}\n  '@types/d3-shape': ${JSON.stringify(
      installedDependency('@types/d3-shape'),
    )}\n  '@types/d3-contour': ${JSON.stringify(
      installedDependency('@types/d3-contour'),
    )}\n  '@types/d3-force': ${JSON.stringify(
      installedDependency('@types/d3-force'),
    )}\n  '@types/d3-geo': ${JSON.stringify(
      installedDependency('@types/d3-geo'),
    )}\n  '@types/d3-hierarchy': ${JSON.stringify(
      installedDependency('@types/d3-hierarchy'),
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
    import { scaleBand, scaleLinear, scalePoint } from 'd3-scale'
    import { scaleBand as compactScaleBand } from '@tanstack/charts-scales/band'
    import { scaleLinear as compactScaleLinear } from '@tanstack/charts-scales/linear'
    import { scaleOrdinal as compactScaleOrdinal } from '@tanstack/charts-scales/ordinal'
    import { scalePoint as compactScalePoint } from '@tanstack/charts-scales/point'
    import {
      areaY,
      barX,
      barY,
      boxY,
      compositeMark,
      createChartScene,
      defineChart,
      differenceY,
      dot,
      link,
      lineX,
      lineY,
      linearRegressionY,
      rect,
      renderChartSvg,
      ridgelineY,
      violinY,
    } from '@tanstack/charts'
    import { stack } from '@tanstack/charts/stack'
    import { mosaicX, mosaicY } from '@tanstack/charts/transform/mosaic'
    import { waterfall } from '@tanstack/charts/transform/waterfall'
    import { canvasChartRenderer } from '@tanstack/charts/canvas'
    import { focusGuideX } from '@tanstack/charts/focus/guide'
    import { brushX } from '@tanstack/charts/interaction/brush'
    import { continuousCursor } from '@tanstack/charts/interaction/cursor'
    import { handleX } from '@tanstack/charts/interaction/handle'
    import { controlledSignal } from '@tanstack/charts/interaction/signal'
    import { zoomX } from '@tanstack/charts/interaction/zoom'
    import { interactiveColorLegend } from '@tanstack/charts/legend'
    import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
    import { motion } from '@tanstack/charts/motion'
    import { createChartSpring } from '@tanstack/charts/spring'
    import {
      polar,
      radialBarAngle,
      radialBarRadius,
    } from '@tanstack/charts/polar'
    import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
    import { sankeyDiagram } from '@tanstack/charts/network/sankey'
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
    const packedBrushChanges = []
    const packedBrush = brushX({
      range: controlledSignal({ start: 0, end: 1 }, (next, reason) => {
        packedBrushChanges.push({ next, reason })
      }),
      values: [0, 1, 2],
    })
    assert.equal(packedBrush.id, 'brush-x')
    assert.equal(typeof packedBrush.resolve, 'function')
    assert.deepEqual(packedBrushChanges, [])
    const packedCursorChanges = []
    const packedCursor = continuousCursor({
      position: controlledSignal({ x: 1, y: 2 }, (next, reason) => {
        packedCursorChanges.push({ next, reason })
      }),
    })
    assert.equal(packedCursor.id, 'continuous-cursor')
    assert.equal(typeof packedCursor.resolve, 'function')
    assert.deepEqual(packedCursorChanges, [])
    const packedHandleChanges = []
    const packedHandle = handleX({
      value: controlledSignal(1, (next, reason) => {
        packedHandleChanges.push({ next, reason })
      }),
      values: [0, 1, 2],
      cross: { edge: 'bottom' },
    })
    assert.equal(packedHandle.id, 'handle-x')
    assert.equal(typeof packedHandle.resolve, 'function')
    assert.deepEqual(packedHandleChanges, [])
    const packedZoomChanges = []
    const packedZoom = zoomX({
      window: controlledSignal({ start: 0, end: 10 }, (next, reason) => {
        packedZoomChanges.push({ next, reason })
      }),
      extent: [0, 10],
      scaleExtent: [1, 8],
    })
    assert.equal(packedZoom.id, 'zoom-x')
    assert.equal(typeof packedZoom.resolve, 'function')
    assert.deepEqual(packedZoomChanges, [])

    const rows = [
      { id: 'a', x: 0, y: 2 },
      { id: 'b', x: 1, y: 5 },
    ]
    const definition = defineChart({
      marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
      x: {
        scale: scaleLinear().domain([0, 1]),
        axis: {
          ticks: { values: [0, 1] },
          tickLabels: {
            fontSize: 13,
            opacity: 0.62,
            anchor: ({ index }) => index === 0 ? 'start' : undefined,
            dx: ({ index, bandwidth }) => index === 0 ? -bandwidth / 2 : undefined,
          },
        },
      },
      y: { scale: scaleLinear().domain([0, 5]) },
    })
    const scene = createChartScene(definition, { width: 320, height: 180 })
    const coreSvg = renderChartSvg(scene, { ariaLabel: 'Packed core chart' })
    assert.match(coreSvg, /<path/)
    assert.match(coreSvg, /font-size="13"/)
    assert.match(coreSvg, /opacity="0.62"/)
    assert.match(coreSvg, /text-anchor="start"/)

    const horizontalDefinition = defineChart({
      marks: [lineX(rows, { x: 'y', y: 'id', key: 'id' })],
      x: { scale: scaleLinear().domain([0, 5]) },
      y: { scale: scaleBand().domain(['a', 'b']) },
    })
    const horizontalScene = createChartScene(horizontalDefinition, {
      width: 320,
      height: 180,
    })
    assert.deepEqual(
      horizontalScene.points.map(({ xValue, yValue }) => [xValue, yValue]),
      [[2, 'a'], [5, 'b']],
    )
    horizontalScene.points.forEach((point) => {
      assert.equal(point.datum, rows[point.datumIndex])
    })

    const ridgeRows = [
      { id: 'a:0', category: 'A', x: 0, height: 0 },
      { id: 'a:1', category: 'A', x: 1, height: 1 },
      { id: 'b:0', category: 'B', x: 0, height: 0.25 },
      { id: 'b:1', category: 'B', x: 1, height: 0.75 },
    ]
    const ridgeScene = createChartScene(defineChart({
      marks: [ridgelineY(ridgeRows, {
        x: 'x',
        y: 'category',
        height: 'height',
        key: 'id',
      })],
      guides: false,
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scalePoint().domain(['A', 'B']) },
    }), { width: 320, height: 180 })
    const ridgeSvg = renderChartSvg(ridgeScene, {
      ariaLabel: 'Packed ridgeline chart',
    })
    assert.equal(ridgeScene.points.length, ridgeRows.length)
    ridgeScene.points.forEach((point) => {
      assert.equal(point.datum, ridgeRows[point.datumIndex])
    })
    assert.match(ridgeSvg, /ts-chart__ridgeline-y/)

    const violinRows = [
      { id: 'a:0', category: 'A', value: 0, width: 0 },
      { id: 'a:1', category: 'A', value: 1, width: 1 },
      { id: 'b:0', category: 'B', value: 0, width: 0.25 },
      { id: 'b:1', category: 'B', value: 1, width: 0.75 },
    ]
    const violinScene = createChartScene(defineChart({
      marks: [violinY(violinRows, {
        x: 'category',
        y: 'value',
        width: 'width',
        key: 'id',
      })],
      guides: false,
      x: { scale: scalePoint().domain(['A', 'B']) },
      y: { scale: scaleLinear().domain([0, 1]) },
    }), { width: 320, height: 180 })
    const violinSvg = renderChartSvg(violinScene, {
      ariaLabel: 'Packed violin chart',
    })
    assert.equal(violinScene.points.length, violinRows.length)
    violinScene.points.forEach((point) => {
      assert.equal(point.datum, violinRows[point.datumIndex])
    })
    assert.match(violinSvg, /ts-chart__violin-y/)

    const regressionDefinition = defineChart({
      marks: [
        linearRegressionY(rows, {
          x: 'x',
          y: 'y',
          ci: 0,
          samples: 3,
        }),
      ],
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
    })
    const regressionScene = createChartScene(regressionDefinition, {
      width: 320,
      height: 180,
    })
    assert.deepEqual(
      regressionScene.points.map(({ xValue, yValue }) => [xValue, yValue]),
      [[0, 2], [0.5, 3.5], [1, 5]],
    )
    regressionScene.points.forEach(({ datum }) => {
      assert.equal(datum.source[0], rows[0])
      assert.equal(datum.source[1], rows[1])
      assert.deepEqual(datum.sourceIndexes, [0, 1])
    })

    const differenceDefinition = defineChart({
      marks: [
        differenceY(rows, {
          id: 'packed-difference',
          x: 'x',
          y1: 3,
          y2: 'y',
        }),
      ],
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
    })
    const differenceScene = createChartScene(differenceDefinition, {
      width: 320,
      height: 180,
    })
    const comparisonPoints = differenceScene.points.filter(
      ({ markId }) => markId === 'packed-difference:comparison',
    )
    const primaryPoints = differenceScene.points.filter(
      ({ markId }) => markId === 'packed-difference:primary',
    )
    assert.equal(comparisonPoints.length, rows.length)
    assert.equal(primaryPoints.length, rows.length)
    rows.forEach((row, index) => {
      assert.equal(comparisonPoints[index].datum, row)
      assert.equal(primaryPoints[index].datum, row)
    })

    const packedStreamRows = [
      { x: 0, series: 'A', value: 2 },
      { x: 0, series: 'B', value: 1 },
      { x: 1, series: 'A', value: 1 },
      { x: 1, series: 'B', value: 3 },
    ]
    const packedStreamDefinition = defineChart({
      marks: [
        areaY(packedStreamRows, {
          x: 'x',
          y: 'value',
          z: 'series',
          layout: stack({ order: 'inside-out', offset: 'wiggle' }),
        }),
      ],
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
    })
    const packedStreamScene = createChartScene(packedStreamDefinition, {
      width: 320,
      height: 180,
    })
    assert.equal(packedStreamScene.points.length, packedStreamRows.length)
    assert.equal(
      Math.min(...packedStreamScene.points.map(({ y1Value }) => y1Value)),
      0,
    )
    packedStreamScene.points.forEach((point) => {
      assert.equal(point.datum, packedStreamRows[point.datumIndex])
    })

    const packedLikertRows = [
      { question: 'Q1', response: 'Disagree', count: 2 },
      { question: 'Q1', response: 'Neutral', count: 2 },
      { question: 'Q1', response: 'Agree', count: 3 },
    ]
    const packedLikertDefinition = defineChart({
      marks: [
        barX(packedLikertRows, {
          x: 'count',
          y: 'question',
          z: 'response',
          layout: stack({
            order: ['Disagree', 'Neutral', 'Agree'],
            anchor: { series: 'Neutral', fraction: 0.5 },
          }),
        }),
      ],
      x: { scale: scaleLinear() },
      y: { scale: scaleBand() },
    })
    const packedLikertScene = createChartScene(packedLikertDefinition, {
      width: 320,
      height: 180,
    })
    const packedNeutral = packedLikertScene.points.find(
      ({ datum }) => datum.response === 'Neutral',
    )
    assert.equal(packedNeutral?.x1Value, -1)
    assert.equal(packedNeutral?.x2Value, 1)
    packedLikertScene.points.forEach((point) => {
      assert.equal(point.datum, packedLikertRows[point.datumIndex])
    })

    const packedWaterfallRows = [
      { order: 2, value: -1 },
      { order: 1, value: 3 },
    ]
    const packedWaterfall = waterfall(packedWaterfallRows, {
      value: 'value',
      orderBy: 'order',
      total: true,
    })
    assert.deepEqual(
      packedWaterfall.map(({ start, end, kind }) => ({ start, end, kind })),
      [
        { start: 0, end: 3, kind: 'increase' },
        { start: 3, end: 2, kind: 'decrease' },
        { start: 0, end: 2, kind: 'total' },
      ],
    )
    assert.equal(packedWaterfall[0].source[0], packedWaterfallRows[1])
    assert.deepEqual(packedWaterfall[2].sourceIndexes, [1, 0])

    const packedMosaicRows = [
      { question: 'A', response: 'No', count: 1 },
      { question: 'A', response: 'Yes', count: 3 },
      { question: 'B', response: 'No', count: 2 },
      { question: 'B', response: 'Yes', count: 2 },
    ]
    const packedMosaicOptions = {
      x: 'question',
      y: 'response',
      value: 'count',
      xOrder: ['A', 'B'],
      yOrder: ['No', 'Yes'],
    }
    const packedMosaicY = mosaicY(packedMosaicRows, packedMosaicOptions)
    const packedMosaicX = mosaicX(packedMosaicRows, packedMosaicOptions)
    assert.deepEqual(
      packedMosaicY.map(({ x1, x2, y1, y2 }) => [x1, x2, y1, y2]),
      [
        [0, 0.5, 0, 0.25],
        [0, 0.5, 0.25, 1],
        [0.5, 1, 0, 0.5],
        [0.5, 1, 0.5, 1],
      ],
    )
    assert.deepEqual(
      packedMosaicX.map(({ y1, y2 }) => [y1, y2]),
      [[0, 0.375], [0.375, 1], [0, 0.375], [0.375, 1]],
    )
    packedMosaicY.forEach((cell, index) => {
      assert.equal(cell.source[0], packedMosaicRows[index])
      assert.deepEqual(cell.sourceIndexes, [index])
    })

    const packedSummaryRows = [
      { category: 'A', median: 3, q1: 2, q3: 5 },
    ]
    const packedBoxRows = [
      { id: 'a', category: 'B', value: 0 },
      { id: 'b', category: 'B', value: 0 },
      { id: 'c', category: 'B', value: 0 },
      { id: 'd', category: 'B', value: 0 },
      { id: 'e', category: 'B', value: 10 },
    ]
    const packedCompositeDefinition = defineChart({
      marks: [
        compositeMark([
          barY(packedSummaryRows, {
            id: 'body',
            x: 'category',
            y: 'median',
            y1: 'q1',
            y2: 'q3',
          }),
        ], { id: 'packed-composite' }),
        boxY(packedBoxRows, {
          id: 'packed-box',
          x: 'category',
          y: 'value',
          key: 'id',
        }),
      ],
      x: { scale: scaleBand().domain(['A', 'B']) },
      y: { scale: scaleLinear().domain([0, 10]) },
    })
    const packedCompositeScene = createChartScene(packedCompositeDefinition, {
      width: 320,
      height: 180,
    })
    assert.equal(
      packedCompositeScene.points.filter(
        ({ markId }) => markId === 'packed-composite:body',
      ).length,
      1,
    )
    assert.equal(
      packedCompositeScene.points.filter(
        ({ markId }) => markId === 'packed-box:box',
      ).length,
      1,
    )
    assert.equal(
      packedCompositeScene.points.filter(
        ({ markId }) => markId === 'packed-box:outlier',
      ).length,
      1,
    )
    const packedCompositeSvg = renderChartSvg(packedCompositeScene, {
      ariaLabel: 'Packed composite and box marks',
    })
    assert.match(packedCompositeSvg, /ts-chart__bar/)
    assert.match(packedCompositeSvg, /ts-chart__dot/)

    const focusGuideDefinition = defineChart({
      marks: [
        lineY(rows, { x: 'x', y: 'y', key: 'id' }),
        focusGuideX(rows, {
          id: 'packed-focus-guide',
          x: 'x',
          y: 'y',
          key: 'id',
          yRule: {},
          marker: {},
          xLabel: {},
          yLabel: {},
        }),
      ],
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 5]) },
      focusRing: false,
    })
    const focusGuideScene = createChartScene(focusGuideDefinition, {
      width: 320,
      height: 180,
    })
    assert.equal(
      focusGuideScene.points.some(({ markId }) => markId === 'packed-focus-guide'),
      false,
    )
    assert.match(
      renderChartSvg(focusGuideScene, { ariaLabel: 'Packed focus guide' }),
      /data-ts-focus-retarget="true"/,
    )

    const packedSelectionChanges = []
    const packedSelection = keyedSelection({
      selected: controlledSignal('b', (next, reason) => {
        packedSelectionChanges.push({ next, reason })
      }),
      key: (datum) => datum.id,
    })
    const packedSelectionDefinition = defineChart({
      marks: [
        dot(rows, {
          id: 'packed-selection-points',
          x: 'x',
          y: 'y',
          key: 'id',
        }),
        whenSelected(
          dot(rows, {
            id: 'packed-selection-overlay',
            x: 'x',
            y: 'y',
            key: 'id',
            r: 7,
            fill: '#f97316',
          }),
          packedSelection,
        ),
      ],
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 5]) },
      selection: packedSelection,
    })
    const packedSelectionScene = createChartScene(
      packedSelectionDefinition,
      { width: 320, height: 180 },
    )
    assert.equal(packedSelectionScene.points.length, rows.length)
    assert.equal(
      packedSelectionScene.points.every(
        ({ markId }) => markId === 'packed-selection-points',
      ),
      true,
    )
    assert.match(
      renderChartSvg(packedSelectionScene, {
        ariaLabel: 'Packed selected overlay',
      }),
      /data-ts-key="packed-selection-overlay"/,
    )
    packedSelection.change(packedSelectionScene.points[0], 'pointer')
    assert.equal(packedSelectionChanges.at(-1).next, 'a')
    assert.equal(packedSelectionChanges.at(-1).reason.type, 'select')
    packedSelection.change(null, 'pointer')
    assert.equal(packedSelectionChanges.at(-1).next, null)
    assert.equal(packedSelectionChanges.at(-1).reason.type, 'clear')

    let packedVisibleChange
    const packedInteractiveLegendDefinition = defineChart({
      marks: [lineY([
        { id: 'a', x: 0, y: 2, series: 'one' },
        { id: 'b', x: 1, y: 5, series: 'two' },
      ], {
        x: 'x',
        y: 'y',
        color: 'series',
        key: 'id',
      })],
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 5]) },
      color: {
        domain: ['one', 'two'],
        legend: interactiveColorLegend({
          visible: controlledSignal(['one'], (next, reason) => {
            packedVisibleChange = { next, reason }
          }),
        }),
      },
    })
    const packedInteractiveLegendScene = createChartScene(
      packedInteractiveLegendDefinition,
      { width: 320, height: 180 },
    )
    assert.equal(packedInteractiveLegendScene.points.length, 1)
    assert.equal(packedInteractiveLegendScene.controls.length, 1)
    packedInteractiveLegendScene.controls[0].toggle('two')
    assert.deepEqual(packedVisibleChange.next, ['one', 'two'])
    assert.equal(packedVisibleChange.reason.value, 'two')
    assert.match(
      renderChartSvg(packedInteractiveLegendScene, {
        ariaLabel: 'Packed interactive legend',
      }),
      /ts-chart__legend--interactive-fallback/,
    )

    const radialRows = [
      { id: 'alpha', value: 8 },
      { id: 'beta', value: 5 },
    ]
    const radialDefinition = defineChart({
      marks: [
        polar({
          angle: { scale: () => scaleBand() },
          radius: {
            scale: scaleLinear().domain([0, 8]),
            range: [({ radius }) => radius * 0.25, ({ radius }) => radius],
          },
          marks: [
            radialBarRadius(radialRows, {
              angle: 'id',
              radius: 'value',
              key: 'id',
              fill: '#2563eb',
            }),
          ],
        }),
        polar({
          angle: { scale: scaleLinear().domain([0, 8]) },
          radius: {
            scale: () => scaleBand(),
            range: [({ radius }) => radius * 0.2, ({ radius }) => radius],
          },
          marks: [
            radialBarAngle(radialRows, {
              angle: 'value',
              radius: 'id',
              key: 'id',
              cornerRadius: 'full',
              fill: '#7c3aed',
            }),
          ],
        }),
      ],
    })
    const radialSvg = renderChartSvg(
      createChartScene(radialDefinition, { width: 320, height: 180 }),
      { ariaLabel: 'Packed polar bars' },
    )
    assert.match(radialSvg, /ts-chart__radial-bar-radius/)
    assert.match(radialSvg, /ts-chart__radial-bar-angle/)
    assert.equal(radialSvg.match(/<path/g)?.length, 4)

    const hierarchyRows = [
      { id: 'root', parentId: null, amount: 0 },
      { id: 'alpha', parentId: 'root', amount: 4 },
      { id: 'beta', parentId: 'root', amount: 6 },
      { id: 'gamma', parentId: 'beta', amount: 3 },
    ]
    const hierarchyDefinition = defineChart({
      marks: [
        polar({
          marks: [
            sunburst(hierarchyRows, {
              id: 'packed-sunburst',
              nodeId: 'id',
              parentId: 'parentId',
              value: 'amount',
              innerRadius: ({ radius }) => radius * 0.15,
              ringPadding: 2,
              color: 'branchId',
            }),
          ],
        }),
      ],
    })
    const hierarchyScene = createChartScene(hierarchyDefinition, {
      width: 320,
      height: 180,
    })
    const hierarchySvg = renderChartSvg(hierarchyScene, {
      ariaLabel: 'Packed hierarchy sunburst',
    })
    assert.equal(hierarchySvg.match(/<path/g)?.length, 3)
    const hierarchyPoints = hierarchyScene.points.filter(
      ({ markId }) => markId === 'packed-sunburst',
    )
    assert.equal(hierarchyPoints.length, 3)
    for (const point of hierarchyPoints) {
      assert.ok(hierarchyRows.includes(point.datum.data))
      assert.equal(point.datum.source.length, 1)
      assert.equal(point.datum.source[0], point.datum.data)
      assert.deepEqual(point.datum.sourceIndexes, [
        hierarchyRows.indexOf(point.datum.data),
      ])
    }

    const sankeyNodes = [
      { id: 'source', label: 'Source' },
      { id: 'middle', label: 'Middle' },
      { id: 'target', label: 'Target' },
    ]
    const sankeyLinks = [
      { id: 'source-middle', source: 'source', target: 'middle', value: 6 },
      { id: 'middle-target', source: 'middle', target: 'target', value: 4 },
    ]
    const sankeyDefinition = defineChart({
      marks: [
        sankeyDiagram({
          id: 'packed-sankey',
          nodes: sankeyNodes,
          links: sankeyLinks,
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          value: 'value',
          marks: ({ nodes, links }) => [
            link(links, {
              id: 'links',
              x1: 'x1',
              y1: 'y1',
              x2: 'x2',
              y2: 'y2',
              key: 'key',
              strokeWidth: (flow) => flow.width,
            }),
            rect(nodes, {
              id: 'nodes',
              x1: 'x0',
              x2: 'x1',
              y1: 'y0',
              y2: 'y1',
              key: 'key',
            }),
          ],
        }),
      ],
      guides: false,
    })
    const sankeyScene = createChartScene(sankeyDefinition, {
      width: 320,
      height: 180,
    })
    const sankeySvg = renderChartSvg(sankeyScene, {
      ariaLabel: 'Packed Sankey chart',
    })
    assert.equal(sankeySvg.match(/<rect/g)?.length, 3)
    assert.equal(sankeySvg.match(/<line/g)?.length, 2)
    const sankeyNodePoints = sankeyScene.points.filter(
      ({ markId }) => markId === 'packed-sankey:nodes',
    )
    assert.equal(sankeyNodePoints.length, sankeyNodes.length)
    for (const point of sankeyNodePoints) {
      assert.ok(sankeyNodes.includes(point.datum.data))
      assert.equal(point.datum.source[0], point.datum.data)
    }

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
      type ChartAxisTickLabelContext,
      type ChartAxisTickLabelValue,
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
      type MosaicOptions as RootMosaicOptions,
      type MosaicXDatum as RootMosaicXDatum,
      type MosaicYDatum as RootMosaicYDatum,
      type ViolinPosition as RootViolinPosition,
      type ViolinXCurve as RootViolinXCurve,
      type ViolinXOptions as RootViolinXOptions,
      type ViolinYCurve as RootViolinYCurve,
      type ViolinYOptions as RootViolinYOptions,
    } from '@tanstack/charts'
    import { canvasChartRenderer } from '@tanstack/charts/canvas'
    import {
      focusGuideX,
      focusGuideY,
      type FocusGuideLabelOptions,
      type FocusGuideOptions,
    } from '@tanstack/charts/focus/guide'
    import {
      controlledSignal,
      type ControlledSignal,
    } from '@tanstack/charts/interaction/signal'
    import {
      brushX,
      type BrushRange,
      type BrushXChange,
    } from '@tanstack/charts/interaction/brush'
    import {
      continuousCursor,
      type ContinuousCursorChange,
      type ContinuousCursorOptions,
      type ContinuousCursorPosition,
    } from '@tanstack/charts/interaction/cursor'
    import {
      handleX,
      type HandleXChange,
      type HandleXCross,
      type HandleXOptions,
    } from '@tanstack/charts/interaction/handle'
    import {
      zoomX,
      type ZoomXChange,
      type ZoomXOptions,
      type ZoomXWindow,
    } from '@tanstack/charts/interaction/zoom'
    import {
      keyedSelection,
      whenSelected,
      type KeyedSelection,
      type KeyedSelectionChange,
      type KeyedSelectionOptions,
    } from '@tanstack/charts/selection'
    import {
      interactiveColorLegend,
      type InteractiveColorLegendChange,
    } from '@tanstack/charts/legend'
    import { motion, type ChartMotionOptions } from '@tanstack/charts/motion'
    import {
      createChartSpring,
      type ChartSpringOptions,
    } from '@tanstack/charts/spring'
    import {
      lineX,
      lineY,
      type LineXOptions,
      type LineYOptions,
    } from '@tanstack/charts/line'
    import {
      linearRegressionX,
      linearRegressionY,
      type LinearRegressionXDatum,
      type LinearRegressionXOptions,
      type LinearRegressionYDatum,
      type LinearRegressionYOptions,
    } from '@tanstack/charts/regression'
    import {
      differenceX,
      differenceY,
      type DifferenceAreaDatum,
      type DifferenceDatum,
      type DifferenceIndependent,
      type DifferenceSign,
      type DifferenceXOptions,
      type DifferenceYOptions,
    } from '@tanstack/charts/difference'
    import {
      ridgelineX,
      ridgelineY,
      type RidgelineCurve,
      type RidgelinePosition,
      type RidgelineStateStyle,
      type RidgelineXOptions,
      type RidgelineYOptions,
    } from '@tanstack/charts/ridgeline'
    import {
      violinX,
      violinY,
      type ViolinPosition,
      type ViolinXCurve,
      type ViolinXOptions,
      type ViolinYCurve,
      type ViolinYOptions,
    } from '@tanstack/charts/violin'
    import {
      alignX,
      alignY,
      composeViews,
      fill,
      grid,
      inset,
      layer,
      shareX,
      shareY,
      viewGrid,
      type ViewAnchor,
      type ViewGridItem,
      type ViewLink,
      type ViewScaleLink,
      type ViewTrack,
    } from '@tanstack/charts/view'
    import { link } from '@tanstack/charts/link'
    import { rect } from '@tanstack/charts/rect'
    import { barY } from '@tanstack/charts/bar'
    import {
      boxY,
      type BoxDatum,
    } from '@tanstack/charts/box'
    import {
      compositeMark,
      type CompositeMarkOptions,
    } from '@tanstack/charts/mark/composite'
    import {
      stack,
      type StackAnchor,
      type StackOrder,
    } from '@tanstack/charts/stack'
    import type {
      BoxDatum as UniversalBoxDatum,
      CompositeMarkOptions as UniversalCompositeMarkOptions,
      DifferenceAreaDatum as UniversalDifferenceAreaDatum,
      DifferenceDatum as UniversalDifferenceDatum,
      DifferenceIndependent as UniversalDifferenceIndependent,
      DifferenceSign as UniversalDifferenceSign,
      DifferenceXOptions as UniversalDifferenceXOptions,
      DifferenceYOptions as UniversalDifferenceYOptions,
      LineXOptions as UniversalLineXOptions,
      LineYOptions as UniversalLineYOptions,
      LinearRegressionXDatum as UniversalLinearRegressionXDatum,
      LinearRegressionXOptions as UniversalLinearRegressionXOptions,
      LinearRegressionYDatum as UniversalLinearRegressionYDatum,
      LinearRegressionYOptions as UniversalLinearRegressionYOptions,
      MosaicOptions as UniversalMosaicOptions,
      MosaicXDatum as UniversalMosaicXDatum,
      MosaicYDatum as UniversalMosaicYDatum,
      RidgelineCurve as UniversalRidgelineCurve,
      RidgelinePosition as UniversalRidgelinePosition,
      RidgelineStateStyle as UniversalRidgelineStateStyle,
      RidgelineXOptions as UniversalRidgelineXOptions,
      RidgelineYOptions as UniversalRidgelineYOptions,
      ViolinPosition as UniversalViolinPosition,
      ViolinXCurve as UniversalViolinXCurve,
      ViolinXOptions as UniversalViolinXOptions,
      ViolinYCurve as UniversalViolinYCurve,
      ViolinYOptions as UniversalViolinYOptions,
      StackAnchor as UniversalStackAnchor,
      StackOrder as UniversalStackOrder,
      WaterfallDatum as UniversalWaterfallDatum,
      WaterfallKind as UniversalWaterfallKind,
      WaterfallOptions as UniversalWaterfallOptions,
    } from '@tanstack/charts/types'
    import {
      pie,
      polar,
      radialBarAngle,
      radialBarRadius,
      radialRule,
      radialText,
      type PieDatum,
      type PieOptions,
      type PolarRadiusOptions,
      type RadialBarAngleOptions,
      type RadialBarRadiusOptions,
      type RadialRuleOptions,
      type RadialTextOptions,
    } from '@tanstack/charts/polar'
    import {
      sunburst,
      type SunburstNode,
      type SunburstNodeComparator,
      type SunburstOptions,
      type SunburstParentOptions,
      type SunburstPathOptions,
    } from '@tanstack/charts/hierarchy/sunburst'
    import {
      sankeyDiagram,
      type SankeyLink,
      type SankeyNode,
      type SankeyNodeComparator,
    } from '@tanstack/charts/network/sankey'
    import {
      fold,
      type FoldDatum,
      type FoldOptions,
      type FoldOutputNames,
    } from '@tanstack/charts/transform/fold'
    import {
      mosaicX,
      mosaicY,
      type MosaicOptions,
      type MosaicXDatum,
      type MosaicYDatum,
    } from '@tanstack/charts/transform/mosaic'
    import type {
      MosaicOptions as UniversalBarrelMosaicOptions,
      MosaicXDatum as UniversalBarrelMosaicXDatum,
      MosaicYDatum as UniversalBarrelMosaicYDatum,
    } from '@tanstack/charts/universal'
    import {
      waterfall,
      type WaterfallDatum,
      type WaterfallKind,
      type WaterfallOptions,
      type WaterfallStepDatum,
      type WaterfallTotalDatum,
    } from '@tanstack/charts/transform/waterfall'
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

    const lineYOptions: LineYOptions<Row> = {
      x: 'category',
      y: 'value',
      key: 'id',
    }
    const lineXOptions: LineXOptions<Row> = {
      x: 'value',
      y: 'category',
      key: 'id',
    }
    const lineRows: readonly Row[] = [
      { id: 'line-a', category: 'A', value: 4 },
    ]
    const packedLines = [
      lineY(lineRows, lineYOptions),
      lineX(lineRows, lineXOptions),
    ]
    type UniversalLineXOptionsParity = Expect<
      Equal<UniversalLineXOptions<Row>, LineXOptions<Row>>
    >
    type UniversalLineYOptionsParity = Expect<
      Equal<UniversalLineYOptions<Row>, LineYOptions<Row>>
    >
    const lineOptionsParity: [
      UniversalLineXOptionsParity,
      UniversalLineYOptionsParity,
    ] = [true, true]
    void [lineYOptions, lineXOptions, lineRows, packedLines, lineOptionsParity]

    const regressionYOptions: LinearRegressionYOptions<Row> = {
      x: 'value',
      y: 'value',
      ci: 0,
      samples: 2,
    }
    const regressionXOptions: LinearRegressionXOptions<Row> = {
      x: 'value',
      y: 'value',
      ci: 0,
      samples: 2,
    }
    const packedRegressions = [
      linearRegressionY(lineRows, regressionYOptions),
      linearRegressionX(lineRows, regressionXOptions),
    ]
    type UniversalRegressionYOptionsParity = Expect<
      Equal<UniversalLinearRegressionYOptions<Row>, LinearRegressionYOptions<Row>>
    >
    type UniversalRegressionXOptionsParity = Expect<
      Equal<UniversalLinearRegressionXOptions<Row>, LinearRegressionXOptions<Row>>
    >
    type UniversalRegressionYDatumParity = Expect<
      Equal<UniversalLinearRegressionYDatum<Row>, LinearRegressionYDatum<Row>>
    >
    type UniversalRegressionXDatumParity = Expect<
      Equal<UniversalLinearRegressionXDatum<Row>, LinearRegressionXDatum<Row>>
    >
    const regressionParity: [
      UniversalRegressionYOptionsParity,
      UniversalRegressionXOptionsParity,
      UniversalRegressionYDatumParity,
      UniversalRegressionXDatumParity,
    ] = [true, true, true, true]
    void [
      regressionYOptions,
      regressionXOptions,
      packedRegressions,
      regressionParity,
    ]

    const differenceYOptions: DifferenceYOptions<Row, number> = {
      x: 'value',
      y1: 'value',
      y2: 'value',
    }
    const differenceXOptions: DifferenceXOptions<Row, number> = {
      x1: 'value',
      x2: 'value',
      y: 'value',
    }
    const packedDifferences = [
      differenceY(lineRows, differenceYOptions),
      differenceX(lineRows, differenceXOptions),
    ]
    type UniversalDifferenceYOptionsParity = Expect<
      Equal<UniversalDifferenceYOptions<Row, number>, DifferenceYOptions<Row, number>>
    >
    type UniversalDifferenceXOptionsParity = Expect<
      Equal<UniversalDifferenceXOptions<Row, number>, DifferenceXOptions<Row, number>>
    >
    type UniversalDifferenceAreaDatumParity = Expect<
      Equal<UniversalDifferenceAreaDatum<Row, number>, DifferenceAreaDatum<Row, number>>
    >
    type UniversalDifferenceDatumParity = Expect<
      Equal<UniversalDifferenceDatum<Row, number>, DifferenceDatum<Row, number>>
    >
    type UniversalDifferenceIndependentParity = Expect<
      Equal<UniversalDifferenceIndependent, DifferenceIndependent>
    >
    type UniversalDifferenceSignParity = Expect<
      Equal<UniversalDifferenceSign, DifferenceSign>
    >
    const differenceParity: [
      UniversalDifferenceYOptionsParity,
      UniversalDifferenceXOptionsParity,
      UniversalDifferenceAreaDatumParity,
      UniversalDifferenceDatumParity,
      UniversalDifferenceIndependentParity,
      UniversalDifferenceSignParity,
    ] = [true, true, true, true, true, true]
    void [
      differenceYOptions,
      differenceXOptions,
      packedDifferences,
      differenceParity,
    ]

    const ridgelineYOptions: RidgelineYOptions<Row, number, string> = {
      x: 'value',
      y: 'category',
      height: 'value',
      key: 'id',
    }
    const ridgelineXOptions: RidgelineXOptions<Row, number, string> = {
      x: 'category',
      y: 'value',
      height: 'value',
      key: 'id',
    }
    const packedRidgelines = [
      ridgelineY(lineRows, ridgelineYOptions),
      ridgelineX(lineRows, ridgelineXOptions),
    ]
    type UniversalRidgelineYOptionsParity = Expect<
      Equal<
        UniversalRidgelineYOptions<Row, number, string>,
        RidgelineYOptions<Row, number, string>
      >
    >
    type UniversalRidgelineXOptionsParity = Expect<
      Equal<
        UniversalRidgelineXOptions<Row, number, string>,
        RidgelineXOptions<Row, number, string>
      >
    >
    type UniversalRidgelinePositionParity = Expect<
      Equal<UniversalRidgelinePosition, RidgelinePosition>
    >
    type UniversalRidgelineCurveParity = Expect<
      Equal<UniversalRidgelineCurve, RidgelineCurve>
    >
    type UniversalRidgelineStateStyleParity = Expect<
      Equal<UniversalRidgelineStateStyle<Row>, RidgelineStateStyle<Row>>
    >
    const ridgelineParity: [
      UniversalRidgelineYOptionsParity,
      UniversalRidgelineXOptionsParity,
      UniversalRidgelinePositionParity,
      UniversalRidgelineCurveParity,
      UniversalRidgelineStateStyleParity,
    ] = [true, true, true, true, true]
    void [
      ridgelineYOptions,
      ridgelineXOptions,
      packedRidgelines,
      ridgelineParity,
    ]

    const violinYOptions: ViolinYOptions<Row, number, string> = {
      x: 'category',
      y: 'value',
      width: 'value',
      key: 'id',
    }
    const violinXOptions: ViolinXOptions<Row, number, string> = {
      x: 'value',
      y: 'category',
      width: 'value',
      key: 'id',
    }
    const packedViolins = [
      violinY(lineRows, violinYOptions),
      violinX(lineRows, violinXOptions),
    ]
    type UniversalViolinYOptionsParity = Expect<
      Equal<
        UniversalViolinYOptions<Row, number, string>,
        ViolinYOptions<Row, number, string>
      >
    >
    type UniversalViolinXOptionsParity = Expect<
      Equal<
        UniversalViolinXOptions<Row, number, string>,
        ViolinXOptions<Row, number, string>
      >
    >
    type UniversalViolinPositionParity = Expect<
      Equal<UniversalViolinPosition, ViolinPosition>
    >
    type UniversalViolinYCurveParity = Expect<
      Equal<UniversalViolinYCurve, ViolinYCurve>
    >
    type UniversalViolinXCurveParity = Expect<
      Equal<UniversalViolinXCurve, ViolinXCurve>
    >
    type RootViolinYOptionsParity = Expect<
      Equal<
        RootViolinYOptions<Row, number, string>,
        ViolinYOptions<Row, number, string>
      >
    >
    type RootViolinXOptionsParity = Expect<
      Equal<
        RootViolinXOptions<Row, number, string>,
        ViolinXOptions<Row, number, string>
      >
    >
    type RootViolinPositionParity = Expect<
      Equal<RootViolinPosition, ViolinPosition>
    >
    type RootViolinYCurveParity = Expect<
      Equal<RootViolinYCurve, ViolinYCurve>
    >
    type RootViolinXCurveParity = Expect<
      Equal<RootViolinXCurve, ViolinXCurve>
    >
    const violinParity: [
      UniversalViolinYOptionsParity,
      UniversalViolinXOptionsParity,
      UniversalViolinPositionParity,
      UniversalViolinYCurveParity,
      UniversalViolinXCurveParity,
      RootViolinYOptionsParity,
      RootViolinXOptionsParity,
      RootViolinPositionParity,
      RootViolinYCurveParity,
      RootViolinXCurveParity,
    ] = [true, true, true, true, true, true, true, true, true, true]
    void [
      violinYOptions,
      violinXOptions,
      packedViolins,
      violinParity,
    ]

    const packedViewTrack: ViewTrack = { id: 'main', grow: 1 }
    const packedViewLink: ViewLink = { x: 'main' }
    const packedViewChart = defineChart({
      marks: [lineY(lineRows, lineYOptions)],
      x: { scale: compactScaleLinear().domain([0, 5]) },
      y: { scale: compactScaleLinear().domain([0, 5]) },
    })
    const packedViewItem: ViewGridItem<
      typeof packedViewChart,
      'main',
      'main'
    > = {
      id: 'main',
      row: 'main',
      column: 'main',
      chart: packedViewChart,
    }
    const packedViews = viewGrid({
      rows: [packedViewTrack],
      columns: [{ id: 'main', grow: 1 }],
      views: [packedViewItem],
    })
    const packedViewAnchor: ViewAnchor = 'top-right'
    const packedLayeredViews = composeViews({
      views: {
        main: packedViewChart,
        summary: packedViewChart,
      },
      layout: layer(
        fill('main'),
        inset('summary', {
          relativeTo: 'main',
          anchor: packedViewAnchor,
          width: 80,
          height: 60,
          offset: 8,
        }),
      ),
    })
    const packedGridLayout = grid({
      rows: [{ id: 'main', grow: 1 }],
      columns: [{ id: 'main', grow: 1 }],
      cells: { main: { row: 'main', column: 'main' } },
    })
    const packedScaleLinks: readonly ViewScaleLink<'main' | 'summary'>[] = [
      shareX('summary', 'main'),
      shareY('summary', 'main'),
      alignX('summary', 'main'),
      alignY('summary', 'main'),
    ]
    const packedViewDatum: ChartSpecDatum<typeof packedViews> = lineRows[0]!
    void [
      packedViewTrack,
      packedViewLink,
      packedViewItem,
      packedViews,
      packedViewAnchor,
      packedLayeredViews,
      packedGridLayout,
      packedScaleLinks,
      packedViewDatum,
    ]

    const packedStackOrder: StackOrder = 'inside-out'
    const packedStackAnchor: StackAnchor = {
      series: 'Neutral',
      fraction: 0.5,
    }
    const packedStackLayout = stack({
      order: packedStackOrder,
      offset: 'wiggle',
    })
    const packedAnchoredStackLayout = stack({
      order: ['Disagree', 'Neutral', 'Agree'],
      anchor: packedStackAnchor,
    })
    type UniversalStackAnchorParity = Expect<
      Equal<UniversalStackAnchor, StackAnchor>
    >
    type UniversalStackOrderParity = Expect<
      Equal<UniversalStackOrder, StackOrder>
    >
    const universalStackAnchorParity: UniversalStackAnchorParity = true
    const universalStackOrderParity: UniversalStackOrderParity = true
    void [
      packedStackLayout,
      packedAnchoredStackLayout,
      universalStackAnchorParity,
      universalStackOrderParity,
    ]

    interface WideRow {
      id: string
      count: number
      label: string
    }
    const wideRows: readonly WideRow[] = [
      { id: 'a', count: 4, label: 'Alpha' },
    ]
    const foldOptions: FoldOptions<WideRow, readonly ['count']> = {
      fields: ['count'],
    }
    const outputNames: FoldOutputNames<'metric', 'reading'> = {
      key: 'metric',
      value: 'reading',
    }
    const foldedRows = fold(wideRows, {
      fields: ['count', 'label'],
      as: outputNames,
    })
    const foldedDatum: FoldDatum<
      WideRow,
      readonly ['count', 'label'],
      typeof outputNames
    > = foldedRows[0]!
    if (foldedDatum.metric === 'count') {
      type ValueIsNumber = Expect<Equal<typeof foldedDatum.reading, number>>
      const check: ValueIsNumber = true
      void check
    } else {
      type ValueIsString = Expect<Equal<typeof foldedDatum.reading, string>>
      const check: ValueIsString = true
      void check
    }
    if (false) {
      // @ts-expect-error Fold output renaming requires both names.
      fold(wideRows, { fields: ['count'], as: { key: 'metric' } })
    }
    void [foldOptions, foldedRows]

    const waterfallOptions: WaterfallOptions<Row> = {
      value: 'value',
      orderBy: 'value',
      total: true,
    }
    const waterfallRows = waterfall(lineRows, waterfallOptions)
    const waterfallDatum: WaterfallDatum<Row> = waterfallRows[0]!
    const waterfallKind: WaterfallKind = waterfallDatum.kind
    if (waterfallDatum.kind === 'total') {
      const total: WaterfallTotalDatum<Row> = waterfallDatum
      void total
    } else {
      const step: WaterfallStepDatum<Row> = waterfallDatum
      void step
    }
    type UniversalWaterfallDatumParity = Expect<
      Equal<UniversalWaterfallDatum<Row>, WaterfallDatum<Row>>
    >
    type UniversalWaterfallKindParity = Expect<
      Equal<UniversalWaterfallKind, WaterfallKind>
    >
    type UniversalWaterfallOptionsParity = Expect<
      Equal<UniversalWaterfallOptions<Row>, WaterfallOptions<Row>>
    >
    const waterfallParity: [
      UniversalWaterfallDatumParity,
      UniversalWaterfallKindParity,
      UniversalWaterfallOptionsParity,
    ] = [true, true, true]
    void [waterfallOptions, waterfallRows, waterfallKind, waterfallParity]

    interface MosaicRow {
      question: string
      response: string
      count: number
    }
    const mosaicRows: readonly MosaicRow[] = [
      { question: 'A', response: 'No', count: 1 },
      { question: 'A', response: 'Yes', count: 3 },
      { question: 'B', response: 'No', count: 2 },
      { question: 'B', response: 'Yes', count: 2 },
    ]
    const mosaicOptions: MosaicOptions<MosaicRow> = {
      x: 'question',
      y: 'response',
      value: 'count',
      xOrder: ['A', 'B'],
      yOrder: ['No', 'Yes'],
    }
    const mosaicYRows = mosaicY(mosaicRows, {
      x: 'question',
      y: 'response',
      value: 'count',
    })
    const mosaicXRows = mosaicX(mosaicRows, {
      x: 'question',
      y: 'response',
      value: 'count',
    })
    const mosaicYDatum: MosaicYDatum<MosaicRow, string, string> =
      mosaicYRows[0]!
    const mosaicXDatum: MosaicXDatum<MosaicRow, string, string> =
      mosaicXRows[0]!
    type RootMosaicOptionsParity = Expect<
      Equal<RootMosaicOptions<MosaicRow>, MosaicOptions<MosaicRow>>
    >
    type RootMosaicXDatumParity = Expect<
      Equal<RootMosaicXDatum<MosaicRow>, MosaicXDatum<MosaicRow>>
    >
    type RootMosaicYDatumParity = Expect<
      Equal<RootMosaicYDatum<MosaicRow>, MosaicYDatum<MosaicRow>>
    >
    type UniversalMosaicOptionsParity = Expect<
      Equal<UniversalMosaicOptions<MosaicRow>, MosaicOptions<MosaicRow>>
    >
    type UniversalMosaicXDatumParity = Expect<
      Equal<UniversalMosaicXDatum<MosaicRow>, MosaicXDatum<MosaicRow>>
    >
    type UniversalMosaicYDatumParity = Expect<
      Equal<UniversalMosaicYDatum<MosaicRow>, MosaicYDatum<MosaicRow>>
    >
    type UniversalBarrelMosaicOptionsParity = Expect<
      Equal<UniversalBarrelMosaicOptions<MosaicRow>, MosaicOptions<MosaicRow>>
    >
    type UniversalBarrelMosaicXDatumParity = Expect<
      Equal<UniversalBarrelMosaicXDatum<MosaicRow>, MosaicXDatum<MosaicRow>>
    >
    type UniversalBarrelMosaicYDatumParity = Expect<
      Equal<UniversalBarrelMosaicYDatum<MosaicRow>, MosaicYDatum<MosaicRow>>
    >
    const mosaicParity: [
      RootMosaicOptionsParity,
      RootMosaicXDatumParity,
      RootMosaicYDatumParity,
      UniversalMosaicOptionsParity,
      UniversalMosaicXDatumParity,
      UniversalMosaicYDatumParity,
      UniversalBarrelMosaicOptionsParity,
      UniversalBarrelMosaicXDatumParity,
      UniversalBarrelMosaicYDatumParity,
    ] = [true, true, true, true, true, true, true, true, true]
    void [
      mosaicOptions,
      mosaicYRows,
      mosaicXRows,
      mosaicYDatum,
      mosaicXDatum,
      mosaicParity,
    ]

    interface PieRow {
      id: string
      amount: number
      label: string
    }
    const pieRows: readonly PieRow[] = [
      { id: 'a', amount: 2, label: 'Alpha' },
      { id: 'b', amount: 1, label: 'Beta' },
    ]
    const pieOptions: PieOptions<PieRow> = {
      value: 'amount',
      gapAngle: 0.01,
    }
    const pieSlices = pie(pieRows, pieOptions)
    const pieSlice: PieDatum<PieRow> = pieSlices[0]!
    type PieValueIsNumber = Expect<Equal<typeof pieSlice.value, number>>
    type PiePadIsZero = Expect<Equal<typeof pieSlice.padAngle, 0>>
    const pieChecks: [PieValueIsNumber, PiePadIsZero] = [true, true]
    const radialTextOptions: RadialTextOptions<PieDatum<PieRow>> = {
      angle: 'angle',
      radius: 1,
      radiusOffset: (row, index, data) =>
        row.fraction * 10 + index + data.length,
      text: 'label',
      anchor: 'outside',
      key: 'id',
    }
    const radialRuleOptions: RadialRuleOptions<PieDatum<PieRow>> = {
      angle: 'angle',
      radius1: 1,
      radius2: 1,
      radius1Offset: -2,
      radius2Offset: (row) => row.fraction * 10,
      key: 'id',
    }
    const radialLabels = radialText(pieSlices, radialTextOptions)
    const radialLeaders = radialRule(pieSlices, radialRuleOptions)
    const polarRadiusOptions: PolarRadiusOptions<number> = {
      scale: scaleLinear().domain([0, 2]),
      range: [0, ({ radius }) => radius * 0.8],
    }
    const radialBarRadiusOptions: RadialBarRadiusOptions<PieRow> = {
      angle: 'id',
      radius: 'amount',
      radius1: (row, index, data) => row.amount - index / data.length,
      color: 'id',
      key: 'id',
    }
    const radialBarAngleOptions: RadialBarAngleOptions<PieRow> = {
      angle: 'amount',
      angle1: 0,
      radius: 'id',
      cornerRadius: 'full',
      color: 'id',
      key: 'id',
    }
    const radiusBars = radialBarRadius(pieRows, radialBarRadiusOptions)
    const angleBars = radialBarAngle(pieRows, radialBarAngleOptions)
    const radialBarDefinition = defineChart({
      marks: [
        polar({
          angle: { scale: () => scaleBand<string>() },
          radius: polarRadiusOptions,
          marks: [radiusBars],
        }),
        polar({
          angle: { scale: scaleLinear().domain([0, 2]) },
          radius: {
            scale: () => scaleBand<string>(),
            range: [0, ({ radius }) => radius],
          },
          marks: [angleBars],
        }),
      ],
    })
    if (false) {
      // @ts-expect-error Pie values must be numeric or nullish.
      pie(pieRows, { value: 'label' })
      // @ts-expect-error Radial radius bars require a numeric radius channel.
      radialBarRadius(pieRows, { angle: 'id', radius: 'label' })
    }
    void [
      pieOptions,
      pieSlices,
      pieChecks,
      radialTextOptions,
      radialRuleOptions,
      radialLabels,
      radialLeaders,
      polarRadiusOptions,
      radialBarRadiusOptions,
      radialBarAngleOptions,
      radiusBars,
      angleBars,
      radialBarDefinition,
    ]

    interface HierarchyRow {
      id: string
      parentId: string | null
      path: string
      amount: number
    }
    const hierarchyRows: readonly HierarchyRow[] = [
      { id: 'root', parentId: null, path: 'root', amount: 0 },
      { id: 'alpha', parentId: 'root', path: 'root.alpha', amount: 4 },
      { id: 'beta', parentId: 'root', path: 'root.beta', amount: 6 },
    ]
    const sunburstComparator: SunburstNodeComparator<HierarchyRow> = (
      left,
      right,
    ) => right.value - left.value || left.id.localeCompare(right.id)
    const sunburstParentOptions: SunburstParentOptions<HierarchyRow> = {
      nodeId: 'id',
      parentId: 'parentId',
      value: 'amount',
      sort: sunburstComparator,
      innerRadius: ({ radius }) => radius * 0.1,
      outerRadius: ({ radius }) => radius * 0.9,
      ringPadding: 2,
      color: 'branchId',
    }
    const sunburstOptions: SunburstOptions<HierarchyRow> =
      sunburstParentOptions
    const sunburstParentMark = sunburst(hierarchyRows, sunburstOptions)
    const sunburstPathOptions: SunburstPathOptions<HierarchyRow> = {
      path: 'path',
      delimiter: '.',
      value: 'amount',
      color: (node) => node.branchId,
    }
    const sunburstPathMark = sunburst(hierarchyRows, sunburstPathOptions)
    const identifySunburstNode = (node: SunburstNode<HierarchyRow>) => {
      type DataIsRawRow = Expect<
        Equal<typeof node.data, HierarchyRow | null>
      >
      type BranchIsNullable = Expect<
        Equal<typeof node.branchId, string | null>
      >
      const checks: [DataIsRawRow, BranchIsNullable] = [true, true]
      void checks
      return node.id
    }
    if (false) {
      sunburst(hierarchyRows, {
        nodeId: 'id',
        parentId: 'parentId',
        // @ts-expect-error Sunburst values must be numeric or nullish.
        value: 'path',
      })
    }
    void [
      sunburstComparator,
      sunburstOptions,
      sunburstParentMark,
      sunburstPathOptions,
      sunburstPathMark,
      identifySunburstNode,
    ]

    interface SankeyNodeRow {
      id: string
      label: string
      order: number
    }
    interface SankeyLinkRow {
      id: string
      source: string
      target: string
      value: number
    }
    const sankeyNodes: readonly SankeyNodeRow[] = [
      { id: 'source', label: 'Source', order: 0 },
      { id: 'target', label: 'Target', order: 1 },
    ]
    const sankeyLinks: readonly SankeyLinkRow[] = [
      { id: 'source-target', source: 'source', target: 'target', value: 4 },
    ]
    const sankeyNodeSort: SankeyNodeComparator<SankeyNodeRow, string> = (
      left,
      right,
    ) => left.data.order - right.data.order
    const sankeyMark = sankeyDiagram({
      nodes: sankeyNodes,
      links: sankeyLinks,
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      value: 'value',
      nodeSort: sankeyNodeSort,
      marks: ({ nodes, links }) => [
        link(links, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'key',
          strokeWidth: (flow) => flow.width,
        }),
        rect(nodes, {
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
          key: 'key',
        }),
      ] as const,
    })
    const sankeyDefinition = defineChart({
      marks: [sankeyMark],
      guides: false,
    })
    type PackedSankeyNode = SankeyNode<
      SankeyNodeRow,
      SankeyLinkRow,
      string
    >
    type PackedSankeyLink = SankeyLink<
      SankeyNodeRow,
      SankeyLinkRow,
      string
    >
    type SankeyDatumIsResolvedUnion = Expect<
      Equal<
        ChartSpecDatum<typeof sankeyDefinition>,
        PackedSankeyNode | PackedSankeyLink
      >
    >
    const sankeyDatumCheck: SankeyDatumIsResolvedUnion = true
    const identifySankeyNode = (node: PackedSankeyNode) => node.data.id
    const identifySankeyLink = (flow: PackedSankeyLink) => flow.data.id
    if (false) {
      sankeyDiagram({
        nodes: sankeyNodes,
        links: sankeyLinks,
        nodeKey: 'id',
        source: 'source',
        target: 'target',
        // @ts-expect-error Sankey link values must be numeric.
        value: 'source',
        marks: ({ nodes }) => [rect(nodes, {})],
      })
    }
    void [
      sankeyNodeSort,
      sankeyMark,
      sankeyDefinition,
      sankeyDatumCheck,
      identifySankeyNode,
      identifySankeyLink,
    ]

    const rows: readonly Row[] = [
      { id: 'a', category: 'Alpha', value: 4 },
      { id: 'b', category: 'Beta', value: 8 },
    ]
    const packedBoxMark = boxY(rows, {
      x: 'category',
      y: 'value',
      key: 'id',
    })
    const packedBoxDefinition = defineChart({
      marks: [packedBoxMark],
      x: { scale: scaleBand<string>() },
      y: { scale: scaleLinear() },
    })
    type PackedBoxDatumIsDerived = Expect<
      Equal<ChartSpecDatum<typeof packedBoxDefinition>, BoxDatum<Row, string>>
    >
    type PackedBoxXIsString = Expect<
      Equal<ChartSpecXValue<typeof packedBoxDefinition>, string>
    >
    type PackedBoxYIsNumber = Expect<
      Equal<ChartSpecYValue<typeof packedBoxDefinition>, number>
    >
    type UniversalBoxTypeParity = Expect<
      Equal<UniversalBoxDatum<Row, string>, BoxDatum<Row, string>>
    >
    const packedCompositeOptions: CompositeMarkOptions<Row> = {
      id: 'packed-composite',
      motion: ({ datum }) => ({ delay: datum?.value ?? 0 }),
    }
    const packedCompositeMark = compositeMark(
      [barY(rows, { x: 'category', y: 'value', key: 'id' })],
      packedCompositeOptions,
    )
    type UniversalCompositeTypeParity = Expect<
      Equal<
        UniversalCompositeMarkOptions<Row>,
        CompositeMarkOptions<Row>
      >
    >
    const packedBoxChecks: [
      PackedBoxDatumIsDerived,
      PackedBoxXIsString,
      PackedBoxYIsNumber,
      UniversalBoxTypeParity,
      UniversalCompositeTypeParity,
    ] = [true, true, true, true, true]
    void [
      packedBoxMark,
      packedBoxDefinition,
      packedBoxChecks,
      packedCompositeMark,
    ]
    const packedTickFontSize: ChartAxisTickLabelValue<string, number> = ({
      value,
      index,
      position,
      bandwidth,
    }) => {
      type ValueIsString = Expect<Equal<typeof value, string>>
      type IndexIsNumber = Expect<Equal<typeof index, number>>
      type PositionIsNumber = Expect<Equal<typeof position, number>>
      type BandwidthIsNumber = Expect<Equal<typeof bandwidth, number>>
      const checks: [
        ValueIsString,
        IndexIsNumber,
        PositionIsNumber,
        BandwidthIsNumber,
      ] = [true, true, true, true]
      void checks
      return index === 0 ? 13 : undefined
    }
    const packedTickAnchor = (
      context: ChartAxisTickLabelContext<string>,
    ) => (context.index === 0 ? 'start' as const : undefined)
    const focusGuideOptions: FocusGuideOptions<Row, 'category', 'value'> = {
      x: 'category',
      y: 'value',
      key: 'id',
      xRule: {},
      yRule: {},
      marker: {},
      xLabel: {
        format(value, point) {
          type ValueIsString = Expect<Equal<typeof value, string>>
          type PointDatumIsRow = Expect<Equal<typeof point.datum, Row>>
          const checks: [ValueIsString, PointDatumIsRow] = [true, true]
          void checks
          return value
        },
      },
      yLabel: { format: (value) => String(value) },
    }
    const packedFocusGuideX = focusGuideX(rows, focusGuideOptions)
    const packedFocusGuideY = focusGuideY(rows, focusGuideOptions)
    const packedFocusLabel: FocusGuideLabelOptions<
      Row,
      string,
      string,
      number
    > = {
      format: (value, point) => value + point.datum.id,
    }
    void [
      focusGuideOptions,
      packedFocusGuideX,
      packedFocusGuideY,
      packedFocusLabel,
    ]
    type PackedSeries = 'one' | 'two'
    const packedVisibleSignal: ControlledSignal<
      readonly PackedSeries[],
      InteractiveColorLegendChange<PackedSeries>
    > = controlledSignal<
      readonly PackedSeries[],
      InteractiveColorLegendChange<PackedSeries>
    >(['one'], () => {})
    const packedInteractiveLegend = interactiveColorLegend({
      visible: packedVisibleSignal,
    })
    const packedBrushRange: ControlledSignal<
      BrushRange<Date>,
      BrushXChange<Date>
    > = controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
      { start: new Date('2026-01-01'), end: new Date('2026-02-01') },
      (_next, reason) => reason.value.start.toISOString(),
    )
    const packedBrush = brushX({
      range: packedBrushRange,
      values: [new Date('2026-01-01'), new Date('2026-02-01')],
    })
    const packedCursorPosition: ContinuousCursorPosition<Date, number> = {
      x: new Date('2026-01-15'),
      y: 3,
    }
    const packedCursorSignal: ControlledSignal<
      ContinuousCursorPosition<Date, number> | null,
      ContinuousCursorChange<Date, number>
    > = controlledSignal<
      ContinuousCursorPosition<Date, number> | null,
      ContinuousCursorChange<Date, number>
    >(packedCursorPosition, (_next, reason) => reason.type)
    const packedCursorOptions: ContinuousCursorOptions<Date, number> = {
      position: packedCursorSignal,
      xLabel: { format: (value) => value.toISOString() },
      yLabel: { format: (value) => value.toFixed(1) },
    }
    const packedCursor = continuousCursor(packedCursorOptions)
    type PackedCursorXIsDate = Expect<
      Equal<typeof packedCursor.__xValue, Date | undefined>
    >
    type PackedCursorYIsNumber = Expect<
      Equal<typeof packedCursor.__yValue, number | undefined>
    >
    const packedCursorChecks: [PackedCursorXIsDate, PackedCursorYIsNumber] = [
      true,
      true,
    ]
    const packedHandleValue: ControlledSignal<
      Date,
      HandleXChange<Date>
    > = controlledSignal<Date, HandleXChange<Date>>(
      new Date('2026-01-15'),
      (_next, reason) => reason.source,
    )
    const packedHandleCross: HandleXCross<number> = { value: 3 }
    const packedHandleOptions: HandleXOptions<Date, number> = {
      value: packedHandleValue,
      values: [
        new Date('2026-01-01'),
        new Date('2026-01-15'),
        new Date('2026-02-01'),
      ],
      cross: packedHandleCross,
      ruleStyle: false,
      format: (value) => value.toISOString(),
    }
    const packedHandle = handleX(packedHandleOptions)
    const packedZoomWindow: ControlledSignal<
      ZoomXWindow<Date>,
      ZoomXChange<Date>
    > = controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
      { start: new Date('2026-01-01'), end: new Date('2026-02-01') },
      (_next, reason) => reason.action,
    )
    const packedZoomOptions: ZoomXOptions<Date> = {
      window: packedZoomWindow,
      extent: [new Date('2026-01-01'), new Date('2026-03-01')],
      scaleExtent: [1, 8],
    }
    const packedZoom = zoomX(packedZoomOptions)
    const packedSelectionOptions: KeyedSelectionOptions<
      Row,
      string,
      string,
      number
    > = {
      selected: controlledSignal<
        string | null,
        KeyedSelectionChange<Row, string, string, number>
      >('b', () => {}),
      key: (datum) => datum.id,
    }
    const packedKeyedSelection: KeyedSelection<
      Row,
      string,
      string,
      number
    > = keyedSelection(packedSelectionOptions)
    const packedSelectedMark = whenSelected(
      lineY(rows, { x: 'category', y: 'value', key: 'id' }),
      packedKeyedSelection,
    )
    void [
      packedInteractiveLegend,
      packedBrushRange,
      packedBrush,
      packedCursorPosition,
      packedCursorSignal,
      packedCursorOptions,
      packedCursor,
      packedCursorChecks,
      packedHandleValue,
      packedHandleCross,
      packedHandleOptions,
      packedHandle,
      packedZoomWindow,
      packedZoomOptions,
      packedZoom,
      packedSelectionOptions,
      packedKeyedSelection,
      packedSelectedMark,
    ]
    const definition = defineChart({
      marks: [lineY(rows, { x: 'category', y: 'value', key: 'id' })],
      x: {
        scale: scaleBand<string>().domain(rows.map((row) => row.category)),
        axis: {
          tickLabels: {
            fontSize: packedTickFontSize,
            anchor: packedTickAnchor,
          },
        },
      },
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
    import { controlledSignal } from '@tanstack/charts/interaction/signal'
    import {
      keyedSelection,
      whenSelected,
      type KeyedSelectionChange,
    } from '@tanstack/charts/selection'
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
    const selected = controlledSignal<
      string | null,
      KeyedSelectionChange<Row, string, number, number>
    >('b', () => {})
    const selection = keyedSelection<Row, string, number, number>({
      selected,
      key: (datum) => datum.id,
    })
    const definition: ChartDefinition<Row, number, number> = defineChart({
      marks: [
        lineY(rows, { x: 'x', y: 'y', key: 'id' }),
        whenSelected(
          lineY(rows, { id: 'selected', x: 'x', y: 'y', key: 'id' }),
          selection,
        ),
      ],
      x: { scale: scaleLinear() },
      y: { scale: scaleLinear() },
      selection,
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
    void [point, tooltip, tooltipToken, portalToken, selected, selection]
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
    focusGuide: ['/@tanstack/charts/dist/focus-guide.js'],
    focusMark: ['/@tanstack/charts/dist/focus-mark.js'],
    guideNodes: ['/@tanstack/charts/dist/guide-nodes-internal.js'],
    interactionSignal: ['/@tanstack/charts/dist/interaction-signal.js'],
    interactionBrush: ['/@tanstack/charts/dist/interaction-brush.js'],
    interactionCursor: ['/@tanstack/charts/dist/interaction-cursor.js'],
    interactionHandle: ['/@tanstack/charts/dist/interaction-handle.js'],
    interactionZoom: ['/@tanstack/charts/dist/interaction-zoom.js'],
    interactionAxis: ['/@tanstack/charts/dist/interaction-axis-internal.js'],
    interactionRange: ['/@tanstack/charts/dist/interaction-range-internal.js'],
    interactiveLegend: ['/@tanstack/charts/dist/interactive-legend.js'],
    keyedSelection: ['/@tanstack/charts/dist/selection.js'],
    decorativeMarkPublic: ['/@tanstack/charts/dist/mark-decorative.js'],
    decorativeMarkLifecycle: [
      '/@tanstack/charts/dist/mark-decorative-internal.js',
    ],
    markSceneFilter: ['/@tanstack/charts/dist/mark-scene-filter-internal.js'],
    scenePointOwnership: [
      '/@tanstack/charts/dist/scene-point-ownership-internal.js',
    ],
    categoricalLegendLayout: [
      '/@tanstack/charts/dist/legend-layout-internal.js',
    ],
    reactTooltip: ['/@tanstack/react-charts/dist/tooltip.js'],
    polarPie: ['/@tanstack/charts/dist/polar-pie.js'],
    transformFold: ['/@tanstack/charts/dist/transform-fold.js'],
    transformMosaic: ['/@tanstack/charts/dist/transform-mosaic.js'],
    transformWaterfall: ['/@tanstack/charts/dist/transform-waterfall.js'],
    regressionMark: ['/@tanstack/charts/dist/regression.js'],
    differenceMark: ['/@tanstack/charts/dist/difference.js'],
    viewComposition: [
      '/@tanstack/charts/dist/view.js',
      '/@tanstack/charts/dist/view-layout.js',
    ],
    sceneEmbed: ['/@tanstack/charts/dist/scene-embed-internal.js'],
    sceneNamespace: ['/@tanstack/charts/dist/scene-child-id-internal.js'],
    facetMark: ['/@tanstack/charts/dist/facet.js'],
    transformInternal: ['/@tanstack/charts/dist/transform-internal.js'],
    proportionalInterval: [
      '/@tanstack/charts/dist/proportional-interval-internal.js',
    ],
    transformOther: [
      '/@tanstack/charts/dist/transform.js',
      '/@tanstack/charts/dist/transform-bin.js',
      '/@tanstack/charts/dist/transform-bin-time.js',
      '/@tanstack/charts/dist/transform-bin-xy.js',
      '/@tanstack/charts/dist/transform-cumulative.js',
      '/@tanstack/charts/dist/transform-group.js',
      '/@tanstack/charts/dist/transform-normalize.js',
      '/@tanstack/charts/dist/transform-rank.js',
      '/@tanstack/charts/dist/transform-reduce.js',
      '/@tanstack/charts/dist/transform-reduce-internal.js',
      '/@tanstack/charts/dist/transform-select.js',
      '/@tanstack/charts/dist/transform-stack.js',
      '/@tanstack/charts/dist/transform-window.js',
    ],
    spatialHexbin: ['/@tanstack/charts/dist/spatial-hexbin.js'],
    spatialDensity: ['/@tanstack/charts/dist/spatial-density.js'],
    spatialContour: [
      '/@tanstack/charts/dist/spatial-contour.js',
      '/@tanstack/charts/dist/spatial-contour-internal.js',
    ],
    spatialGrouping: ['/@tanstack/charts/dist/spatial-group-internal.js'],
    spatialDelaunay: [
      '/@tanstack/charts/dist/spatial-delaunay.js',
      '/@tanstack/charts/dist/spatial-delaunay-internal.js',
    ],
    spatialVoronoi: [
      '/@tanstack/charts/dist/spatial-voronoi.js',
      '/@tanstack/charts/dist/spatial-voronoi-internal.js',
    ],
    networkForce: ['/@tanstack/charts/dist/network-force.js'],
    networkGraph: ['/@tanstack/charts/dist/network-graph-internal.js'],
    networkSankey: ['/@tanstack/charts/dist/network-sankey.js'],
    resolvedLayoutChild: ['/@tanstack/charts/dist/resolved-layout-child.js'],
    compositeMarkPublic: ['/@tanstack/charts/dist/mark-composite.js'],
    compositeMarkKernel: ['/@tanstack/charts/dist/mark-composite-internal.js'],
    boxMark: ['/@tanstack/charts/dist/box.js'],
    areaXMark: ['/@tanstack/charts/dist/area-x.js'],
    ridgelineMark: ['/@tanstack/charts/dist/ridgeline.js'],
    violinMark: ['/@tanstack/charts/dist/violin.js'],
    mappedSpacing: ['/@tanstack/charts/dist/mapped-spacing-internal.js'],
    transformStatistics: [
      '/@tanstack/charts/dist/transform-statistics-internal.js',
    ],
    compositeMotion: ['/@tanstack/charts/dist/composite-motion-internal.js'],
    hierarchyFlat: ['/@tanstack/charts/dist/hierarchy-flat-internal.js'],
    hierarchyTree: ['/@tanstack/charts/dist/hierarchy-tree.js'],
    hierarchyTreemap: ['/@tanstack/charts/dist/hierarchy-treemap.js'],
    hierarchySunburst: ['/@tanstack/charts/dist/hierarchy-sunburst.js'],
    polarMarkInfrastructure: ['/@tanstack/charts/dist/polar-mark-internal.js'],
    polarSector: ['/@tanstack/charts/dist/polar-sector-internal.js'],
    d3GeometryRuntime: [
      '/d3-delaunay/',
      '/d3-contour/',
      '/d3-geo/',
      '/d3-hexbin/',
      '/d3-shape/',
      '/delaunator/',
      '/robust-predicates/',
    ],
    d3Hexbin: ['/d3-hexbin/'],
    d3Contour: ['/d3-contour/'],
    d3Geo: ['/d3-geo/'],
    d3Delaunay: ['/d3-delaunay/', '/delaunator/', '/robust-predicates/'],
    d3Force: ['/d3-force/'],
    d3Sankey: ['/d3-sankey/'],
    d3Hierarchy: ['/d3-hierarchy/'],
    d3Brush: ['/d3-brush/'],
    d3Zoom: ['/d3-zoom/'],
    d3Selection: ['/d3-selection/'],
    d3Shape: ['/d3-shape/'],
    d3Path: ['/d3-path/'],
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
      inputBoundary: {
        forbid: [
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
          'polarPie',
          'viewComposition',
        ],
      },
      source: `
        export * from '@tanstack/charts/universal'
      `,
    },
    {
      label: 'Core',
      filename: 'core.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        forbid: [
          'd3GeometryRuntime',
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'spatialContour',
          'spatialGrouping',
          'spatialDelaunay',
          'spatialVoronoi',
          'd3Delaunay',
          'transformFold',
          'transformMosaic',
          'transformWaterfall',
          'regressionMark',
          'differenceMark',
          'viewComposition',
          'ridgelineMark',
          'violinMark',
          'mappedSpacing',
          'polarPie',
          'scenePointOwnership',
        ],
      },
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
      label: 'Controlled signal',
      filename: 'interaction-signal.ts',
      minimumBytes: 40,
      external: [],
      inputBoundary: {
        require: ['interactionSignal'],
        forbid: [
          'interactiveLegend',
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
        ],
      },
      source: `
        export { controlledSignal } from '@tanstack/charts/interaction/signal'
      `,
    },
    {
      label: 'Controlled keyed selection subpath',
      filename: 'keyed-selection.ts',
      external: [],
      rendererBoundary: 'neutral',
      inputBoundary: {
        require: ['interactionSignal', 'keyedSelection'],
        forbid: [
          'interactiveLegend',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
        ],
      },
      source: `
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        import { keyedSelection } from '@tanstack/charts/selection'
        const selected = controlledSignal('a', () => {})
        export const selection = keyedSelection({
          selected,
          key: (datum) => datum.id,
        })
      `,
    },
    {
      label: 'Continuous cursor subpath',
      filename: 'continuous-cursor.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionCursor',
          'interactionAxis',
          'guideNodes',
        ],
        forbid: [
          'interactionBrush',
          'd3Brush',
          'd3Selection',
          'focusGuide',
          'focusMark',
          'interactiveLegend',
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { mountChart } from '@tanstack/charts/dom'
        import { continuousCursor } from '@tanstack/charts/interaction/cursor'
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        export const position = controlledSignal({ x: 1, y: 2 }, () => {})
        export const cursor = continuousCursor({
          position,
          xLabel: { format: (value) => \`x \${value}\` },
          yLabel: { format: (value) => \`y \${value}\` },
        })
        export { mountChart }
      `,
    },
    {
      label: 'Horizontal handle subpath',
      filename: 'handle-x.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionHandle',
          'interactionAxis',
          'interactionRange',
        ],
        forbid: [
          'interactionBrush',
          'interactionCursor',
          'interactionZoom',
          'd3Brush',
          'd3Zoom',
          'd3Selection',
          'focusGuide',
          'focusMark',
          'guideNodes',
          'interactiveLegend',
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { mountChart } from '@tanstack/charts/dom'
        import { handleX } from '@tanstack/charts/interaction/handle'
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        const values = [0, 1, 2, 3]
        export const value = controlledSignal(1, () => {})
        export const horizontalHandle = handleX({
          value,
          values,
          cross: { edge: 'bottom' },
        })
        export { mountChart }
      `,
    },
    {
      label: 'Horizontal brush subpath',
      filename: 'brush-x.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionBrush',
          'interactionAxis',
          'interactionRange',
          'd3Brush',
          'd3Selection',
        ],
        forbid: [
          'interactiveLegend',
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { mountChart } from '@tanstack/charts/dom'
        import { brushX } from '@tanstack/charts/interaction/brush'
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        const values = [0, 1, 2, 3]
        export const range = controlledSignal(
          { start: values[1], end: values[2] },
          () => {},
        )
        export const horizontalBrush = brushX({ range, values })
        export { mountChart }
      `,
    },
    {
      label: 'Horizontal zoom subpath',
      filename: 'zoom-x.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactionZoom',
          'interactionAxis',
          'interactionRange',
          'd3Zoom',
          'd3Selection',
        ],
        forbid: [
          'interactionBrush',
          'interactionCursor',
          'd3Brush',
          'interactiveLegend',
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { mountChart } from '@tanstack/charts/dom'
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        import { zoomX } from '@tanstack/charts/interaction/zoom'
        export const window = controlledSignal(
          { start: 0, end: 10 },
          () => {},
        )
        export const horizontalZoom = zoomX({
          window,
          extent: [0, 10],
          scaleExtent: [1, 8],
        })
        export { mountChart }
      `,
    },
    {
      label: 'Selected overlay subpath',
      filename: 'selected-overlay.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'keyedSelection',
          'decorativeMarkLifecycle',
          'markSceneFilter',
          'scenePointOwnership',
        ],
        forbid: [
          'interactiveLegend',
          'decorativeMarkPublic',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { dot } from '@tanstack/charts/dot'
        import { controlledSignal } from '@tanstack/charts/interaction/signal'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', x: 0, y: 2 },
          { id: 'b', x: 1, y: 5 },
        ]
        const selection = keyedSelection({
          selected: controlledSignal('b', () => {}),
          key: (datum) => datum.id,
        })
        const definition = defineChart({
          marks: [
            dot(rows, { id: 'points', x: 'x', y: 'y', key: 'id' }),
            whenSelected(
              dot(rows, {
                id: 'selected-point',
                x: 'x',
                y: 'y',
                key: 'id',
                r: 7,
                fill: '#f97316',
              }),
              selection,
            ),
          ],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
          selection,
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed selected overlay' },
        )
      `,
    },
    {
      label: 'Decorative mark subpath',
      filename: 'decorative-mark.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'markSceneFilter',
        ],
        forbid: [
          'interactionSignal',
          'interactiveLegend',
          'keyedSelection',
          'categoricalLegendLayout',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { lineY } from '@tanstack/charts/line'
        import { decorative } from '@tanstack/charts/mark/decorative'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const definition = defineChart({
          marks: [decorative(lineY([2, 5, 3]))],
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed decorative line' },
        )
      `,
    },
    {
      label: 'Interactive legend subpath',
      filename: 'interactive-legend.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'interactionSignal',
          'interactiveLegend',
          'markSceneFilter',
          'categoricalLegendLayout',
        ],
        forbid: [
          'keyedSelection',
          'decorativeMarkPublic',
          'decorativeMarkLifecycle',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        export { mountChart } from '@tanstack/charts/dom'
        export { controlledSignal } from '@tanstack/charts/interaction/signal'
        export { interactiveColorLegend } from '@tanstack/charts/legend'
      `,
    },
    {
      label: 'Horizontal line mark',
      filename: 'line-x.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        forbid: [
          'transformFold',
          'transformMosaic',
          'transformWaterfall',
          'regressionMark',
          'differenceMark',
          'viewComposition',
          'ridgelineMark',
          'violinMark',
          'mappedSpacing',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { lineX } from '@tanstack/charts/line'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleBand, scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', category: 'A', value: 2 },
          { id: 'b', category: 'B', value: 5 },
        ]
        const definition = defineChart({
          marks: [lineX(rows, { x: 'value', y: 'category', key: 'id' })],
          x: { scale: scaleLinear().domain([0, 5]) },
          y: { scale: scaleBand().domain(['A', 'B']) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed horizontal line chart' },
        )
      `,
    },
    {
      label: 'Linear regression mark',
      filename: 'regression.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'regressionMark',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'd3Shape',
        ],
        forbid: ['boxMark', 'transformWaterfall'],
      },
      source: `
        import { linearRegressionY } from '@tanstack/charts/regression'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 1 },
          { x: 3, y: 4 },
          { x: 4, y: 5 },
        ]
        const definition = defineChart({
          marks: [linearRegressionY(rows, { x: 'x', y: 'y', samples: 8 })],
          x: { scale: scaleLinear() },
          y: { scale: scaleLinear() },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed linear regression chart' },
        )
      `,
    },
    {
      label: 'Difference mark',
      filename: 'difference.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'differenceMark',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'resolvedLayoutChild',
          'd3Shape',
        ],
        forbid: ['boxMark', 'regressionMark', 'transformWaterfall'],
      },
      source: `
        import { differenceY } from '@tanstack/charts/difference'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { x: 0, comparison: 2, primary: 1 },
          { x: 1, comparison: 2, primary: 3 },
          { x: 2, comparison: 2, primary: 4 },
          { x: 3, comparison: 2, primary: 1 },
        ]
        const definition = defineChart({
          marks: [differenceY(rows, {
            x: 'x',
            y1: 'comparison',
            y2: 'primary',
          })],
          x: { scale: scaleLinear() },
          y: { scale: scaleLinear() },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed difference chart' },
        )
      `,
    },
    {
      label: 'Coordinated views',
      filename: 'view.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'viewComposition',
          'sceneEmbed',
          'sceneNamespace',
          'compositeMotion',
        ],
        forbid: [
          'facetMark',
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { dot } from '@tanstack/charts/dot'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { composeViews, grid, shareX } from '@tanstack/charts/view'
        import { scaleLinear } from 'd3-scale'
        const rows = [{ x: 0, y: 1 }, { x: 1, y: 2 }]
        const x = scaleLinear().domain([0, 1])
        const definition = composeViews({
          views: {
            overview: defineChart({
              marks: [dot(rows, { x: 'x', y: 'y' })],
              x: { scale: x },
              y: { scale: scaleLinear().domain([0, 2]) },
              guides: false,
            }),
            main: defineChart({
              marks: [dot(rows, { x: 'x', y: 'y' })],
              x: { scale: x },
              y: { scale: scaleLinear().domain([0, 2]) },
            }),
          },
          layout: grid({
            rows: [
              { id: 'overview', size: 48 },
              { id: 'main', grow: 1 },
            ],
            columns: [{ id: 'main', grow: 1 }],
            cells: {
              overview: { row: 'overview', column: 'main' },
              main: { row: 'main', column: 'main' },
            },
          }),
          links: [shareX('overview', 'main')],
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed coordinated views' },
        )
      `,
    },
    {
      label: 'Core renderer',
      filename: 'core-renderer.ts',
      external: [],
      rendererBoundary: 'neutral',
      inputBoundary: {
        forbid: [
          'tooltip',
          'tooltipPortal',
          'motion',
          'transformFold',
          'transformMosaic',
          'transformWaterfall',
          'polarPie',
        ],
      },
      source: `
        export { mountChartRenderer } from '@tanstack/charts/renderer'
      `,
    },
    {
      label: 'Transform fold',
      filename: 'transform-fold.ts',
      external: [],
      inputBoundary: {
        require: ['transformFold', 'transformInternal'],
        forbid: [
          'transformMosaic',
          'transformWaterfall',
          'transformOther',
          'd3Runtime',
        ],
      },
      source: `
        import { fold } from '@tanstack/charts/transform/fold'
        const rows = [
          { id: 'a', current: 4, previous: 2 },
          { id: 'b', current: 7, previous: 5 },
        ]
        export const output = fold(rows, {
          fields: ['current', 'previous'],
          as: { key: 'period', value: 'value' },
        })
      `,
    },
    {
      label: 'Transform mosaic',
      filename: 'transform-mosaic.ts',
      external: [],
      inputBoundary: {
        require: [
          'transformMosaic',
          'transformInternal',
          'proportionalInterval',
        ],
        forbid: [
          'transformFold',
          'transformWaterfall',
          'transformOther',
          'd3Runtime',
        ],
      },
      source: `
        import { mosaicX, mosaicY } from '@tanstack/charts/transform/mosaic'
        const rows = [
          { question: 'A', response: 'No', count: 1 },
          { question: 'A', response: 'Yes', count: 3 },
          { question: 'B', response: 'No', count: 2 },
          { question: 'B', response: 'Yes', count: 2 },
        ]
        const options = {
          x: 'question',
          y: 'response',
          value: 'count',
          xOrder: ['A', 'B'],
          yOrder: ['No', 'Yes'],
        }
        export const output = {
          x: mosaicX(rows, options),
          y: mosaicY(rows, options),
        }
      `,
    },
    {
      label: 'Transform waterfall',
      filename: 'transform-waterfall.ts',
      external: [],
      inputBoundary: {
        require: ['transformWaterfall', 'transformInternal'],
        forbid: [
          'transformFold',
          'transformMosaic',
          'transformOther',
          'd3Runtime',
        ],
      },
      source: `
        import { waterfall } from '@tanstack/charts/transform/waterfall'
        const rows = [
          { order: 2, value: -1 },
          { order: 1, value: 3 },
        ]
        export const output = waterfall(rows, {
          value: 'value',
          orderBy: 'order',
          total: true,
        })
      `,
    },
    {
      label: 'Composite mark',
      filename: 'composite-mark.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'compositeMarkPublic',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
        ],
        forbid: ['boxMark', 'transformStatistics'],
      },
      source: `
        import { barY } from '@tanstack/charts/bar'
        import { compositeMark } from '@tanstack/charts/mark/composite'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleBand, scaleLinear } from 'd3-scale'
        const rows = [{ id: 'a', category: 'A', value: 4 }]
        const definition = defineChart({
          marks: [compositeMark([
            barY(rows, {
              id: 'body',
              x: 'category',
              y: 'value',
              key: 'id',
            }),
          ], { id: 'packed-composite' })],
          x: { scale: scaleBand() },
          y: { scale: scaleLinear() },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed composite mark' },
        )
      `,
    },
    {
      label: 'Box mark',
      filename: 'box-mark.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'boxMark',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'transformStatistics',
          'transformInternal',
        ],
        forbid: ['compositeMarkPublic'],
      },
      source: `
        import { boxY } from '@tanstack/charts/box'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleBand, scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', category: 'A', value: 0 },
          { id: 'b', category: 'A', value: 0 },
          { id: 'c', category: 'A', value: 0 },
          { id: 'd', category: 'A', value: 0 },
          { id: 'e', category: 'A', value: 10 },
        ]
        const definition = defineChart({
          marks: [boxY(rows, {
            x: 'category',
            y: 'value',
            key: 'id',
          })],
          x: { scale: scaleBand() },
          y: { scale: scaleLinear() },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed box mark' },
        )
      `,
    },
    {
      label: 'Ridgeline mark',
      filename: 'ridgeline.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['ridgelineMark', 'mappedSpacing', 'transformInternal'],
        forbid: [
          'transformOther',
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { ridgelineY } from '@tanstack/charts/ridgeline'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear, scalePoint } from 'd3-scale'
        const rows = [
          { id: 'a:0', category: 'A', x: 0, height: 0 },
          { id: 'a:1', category: 'A', x: 1, height: 1 },
          { id: 'b:0', category: 'B', x: 0, height: 0.25 },
          { id: 'b:1', category: 'B', x: 1, height: 0.75 },
        ]
        const definition = defineChart({
          marks: [ridgelineY(rows, {
            x: 'x',
            y: 'category',
            height: 'height',
            key: 'id',
          })],
          guides: false,
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scalePoint().domain(['A', 'B']) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed ridgeline mark' },
        )
      `,
    },
    {
      label: 'Violin mark',
      filename: 'violin.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['violinMark', 'mappedSpacing', 'transformInternal'],
        forbid: [
          'transformOther',
          'ridgelineMark',
          'areaXMark',
          'compositeMarkPublic',
          'compositeMarkKernel',
          'resolvedLayoutChild',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { violinY } from '@tanstack/charts/violin'
        import { scaleLinear, scalePoint } from 'd3-scale'
        const rows = [
          { id: 'a:0', category: 'A', value: 0, width: 0 },
          { id: 'a:1', category: 'A', value: 1, width: 1 },
          { id: 'b:0', category: 'B', value: 0, width: 0.25 },
          { id: 'b:1', category: 'B', value: 1, width: 0.75 },
        ]
        const definition = defineChart({
          marks: [violinY(rows, {
            x: 'category',
            y: 'value',
            width: 'width',
            key: 'id',
          })],
          guides: false,
          x: { scale: scalePoint().domain(['A', 'B']) },
          y: { scale: scaleLinear().domain([0, 1]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed violin mark' },
        )
      `,
    },
    {
      label: 'Polar pie allocation',
      filename: 'polar-pie.ts',
      external: [],
      inputBoundary: {
        require: ['polarPie', 'transformInternal'],
        forbid: ['transformOther', 'd3Runtime'],
      },
      source: `
        import { pie } from '@tanstack/charts/polar'
        const rows = [
          { id: 'a', amount: 4 },
          { id: 'b', amount: 3 },
          { id: 'c', amount: 2 },
        ]
        export const output = pie(rows, {
          value: 'amount',
          gapAngle: 0.02,
        })
      `,
    },
    {
      label: 'Network force layout',
      filename: 'network-force.ts',
      external: [],
      inputBoundary: {
        require: ['networkForce', 'networkGraph', 'd3Force'],
        forbid: ['spatialDensity', 'spatialContour', 'spatialGrouping'],
      },
      source: `
        import { forceLayout } from '@tanstack/charts/network/force'
        const nodes = [
          { id: 'a', group: 'one' },
          { id: 'b', group: 'one' },
          { id: 'c', group: 'two' },
        ]
        const links = [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'c' },
        ]
        export const layout = forceLayout(nodes, links, {
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          iterations: 40,
          forces: [
            { type: 'link', distance: 20 },
            { type: 'manyBody', strength: -20 },
            { type: 'center' },
          ],
        })
      `,
    },
    {
      label: 'Network Sankey mark',
      filename: 'network-sankey.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'networkSankey',
          'networkGraph',
          'resolvedLayoutChild',
          'compositeMarkKernel',
          'compositeMotion',
          'sceneNamespace',
          'd3Sankey',
        ],
        forbid: ['networkForce', 'd3Force', 'spatialGrouping'],
      },
      source: `
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { link } from '@tanstack/charts/link'
        import { rect } from '@tanstack/charts/rect'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { sankeyDiagram } from '@tanstack/charts/network/sankey'
        const nodes = [
          { id: 'source', label: 'Source' },
          { id: 'middle', label: 'Middle' },
          { id: 'target', label: 'Target' },
        ]
        const links = [
          { id: 'source-middle', source: 'source', target: 'middle', value: 6 },
          { id: 'middle-target', source: 'middle', target: 'target', value: 4 },
        ]
        const definition = defineChart({
          marks: [sankeyDiagram({
            nodes,
            links,
            nodeKey: 'id',
            source: 'source',
            target: 'target',
            value: 'value',
            marks: ({ nodes: laidOutNodes, links: laidOutLinks }) => [
              link(laidOutLinks, {
                x1: 'x1',
                y1: 'y1',
                x2: 'x2',
                y2: 'y2',
                key: 'key',
                strokeWidth: (flow) => flow.width,
              }),
              rect(laidOutNodes, {
                x1: 'x0',
                x2: 'x1',
                y1: 'y0',
                y2: 'y1',
                key: 'key',
              }),
            ],
          })],
          guides: false,
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed Sankey chart' },
        )
      `,
    },
    {
      label: 'Tick-label accessors',
      filename: 'tick-label-accessors.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        forbid: [
          'focusGuide',
          'focusMark',
          'motion',
          'spring',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { lineY } from '@tanstack/charts/line'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const definition = defineChart({
          marks: [lineY([4, 9, 7])],
          x: {
            scale: scaleLinear().domain([0, 2]),
            axis: {
              ticks: { values: [0, 1, 2] },
              tickLabels: {
                fontSize: 13,
                opacity: 0.62,
                anchor: ({ index }) => index === 0 ? 'start' : undefined,
                dx: ({ index, bandwidth }) => index === 0 ? -bandwidth / 2 : undefined,
              },
            },
          },
          y: { scale: scaleLinear().domain([0, 10]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed tick-label chart' },
        )
      `,
    },
    {
      label: 'Focus guide mark',
      filename: 'focus-guide.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['focusGuide', 'focusMark', 'guideNodes'],
        forbid: [
          'motion',
          'spring',
          'tooltip',
          'tooltipPortal',
          'd3GeometryRuntime',
        ],
      },
      source: `
        import { dot } from '@tanstack/charts/dot'
        import { focusGuideX } from '@tanstack/charts/focus/guide'
        import { createChartScene, defineChart } from '@tanstack/charts/scene'
        import { renderChartSvg } from '@tanstack/charts/svg'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', x: 1, y: 2 },
          { id: 'b', x: 2, y: 4 },
        ]
        const definition = defineChart({
          marks: [
            dot(rows, { x: 'x', y: 'y', key: 'id' }),
            focusGuideX(rows, {
              x: 'x',
              y: 'y',
              key: 'id',
              yRule: {},
              marker: {},
              xLabel: {},
              yLabel: {},
            }),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scaleLinear().domain([0, 3]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed focus guide chart' },
        )
      `,
    },
    {
      label: 'Hierarchy tree layout',
      filename: 'hierarchy-tree.ts',
      external: [],
      inputBoundary: {
        require: ['hierarchyFlat', 'hierarchyTree', 'd3Hierarchy'],
        forbid: ['networkForce', 'd3Force', 'spatialGrouping'],
      },
      source: `
        import { treeLayout } from '@tanstack/charts/hierarchy/tree'
        const rows = [
          { name: 'root' },
          { name: 'root.alpha' },
          { name: 'root.beta' },
          { name: 'root.beta.gamma' },
        ]
        export const layout = treeLayout(rows, {
          path: 'name',
          delimiter: '.',
        })
      `,
    },
    {
      label: 'Hierarchy treemap mark',
      filename: 'hierarchy-treemap.ts',
      external: [],
      inputBoundary: {
        require: ['hierarchyFlat', 'hierarchyTreemap', 'd3Hierarchy'],
        forbid: ['hierarchyTree', 'networkForce', 'd3Force', 'spatialGrouping'],
      },
      source: `
        import { treemap } from '@tanstack/charts/hierarchy/treemap'
        const rows = [
          { name: 'root', size: 0 },
          { name: 'root.alpha', size: 4 },
          { name: 'root.beta', size: 6 },
          { name: 'root.beta.gamma', size: 3 },
        ]
        export const mark = treemap(rows, {
          path: 'name',
          delimiter: '.',
          value: 'size',
          ratio: 4 / 3,
          round: true,
          color: (node) => node.ancestorIds.at(-1) ?? node.id,
          label: 'name',
        })
      `,
    },
    {
      label: 'Hierarchy sunburst mark',
      filename: 'hierarchy-sunburst.ts',
      external: [],
      inputBoundary: {
        require: [
          'hierarchyFlat',
          'hierarchySunburst',
          'polarMarkInfrastructure',
          'polarSector',
          'd3Hierarchy',
          'd3Shape',
        ],
        forbid: [
          'hierarchyTree',
          'hierarchyTreemap',
          'polarPie',
          'networkForce',
          'd3Force',
          'spatialGrouping',
        ],
      },
      source: `
        import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
        const rows = [
          { id: 'root', parentId: null, amount: 0 },
          { id: 'alpha', parentId: 'root', amount: 4 },
          { id: 'beta', parentId: 'root', amount: 6 },
          { id: 'gamma', parentId: 'beta', amount: 3 },
        ]
        export const mark = sunburst(rows, {
          nodeId: 'id',
          parentId: 'parentId',
          value: 'amount',
          color: 'branchId',
          innerRadius: ({ radius }) => radius * 0.15,
          ringPadding: 2,
        })
      `,
    },
    {
      label: 'Spatial density',
      filename: 'spatial-density.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'spatialDensity',
          'spatialContour',
          'spatialGrouping',
          'd3Contour',
        ],
      },
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { densityContour } from '@tanstack/charts/spatial/density'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { x: 0, y: 2 },
          { x: 0.1, y: 2.1 },
          { x: 1, y: 5 },
        ]
        const definition = defineChart({
          marks: [densityContour(rows, {
            x: 'x',
            y: 'y',
            thresholds: [0.0001],
          })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed spatial density chart' },
        )
      `,
    },
    {
      label: 'Spatial contour',
      filename: 'spatial-contour.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['spatialContour', 'd3Contour'],
        forbid: ['spatialDensity', 'spatialGrouping', 'd3Geo'],
      },
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { contour } from '@tanstack/charts/spatial/contour'
        const values = [0, 0, 0, 0, 8, 0, 0, 0, 0]
        const definition = defineChart({
          marks: [contour(values, {
            width: 3,
            height: 3,
            thresholds: [4],
          })],
          guides: false,
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed spatial contour chart' },
        )
      `,
    },
    {
      label: 'Spatial hexbin',
      filename: 'spatial-hexbin.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: { require: ['spatialHexbin', 'd3Hexbin'] },
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { hexbin } from '@tanstack/charts/spatial/hexbin'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { x: 0, y: 2 },
          { x: 0.1, y: 2.1 },
          { x: 1, y: 5 },
        ]
        const definition = defineChart({
          marks: [hexbin(rows, { x: 'x', y: 'y', binWidth: 20 })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed spatial hexbin chart' },
        )
      `,
    },
    {
      label: 'Spatial Delaunay',
      filename: 'spatial-delaunay.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: ['spatialDelaunay', 'spatialGrouping', 'd3Delaunay'],
      },
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { delaunayLink } from '@tanstack/charts/spatial/delaunay'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', x: 0, y: 0 },
          { id: 'b', x: 1, y: 0 },
          { id: 'c', x: 0, y: 1 },
        ]
        const definition = defineChart({
          marks: [delaunayLink(rows, { x: 'x', y: 'y', key: 'id' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed spatial Delaunay chart' },
        )
      `,
    },
    {
      label: 'Spatial Voronoi',
      filename: 'spatial-voronoi.ts',
      external: [],
      rendererBoundary: 'svg',
      inputBoundary: {
        require: [
          'spatialVoronoi',
          'spatialGrouping',
          'spatialDelaunay',
          'd3Delaunay',
        ],
      },
      source: `
        import {
          createChartScene,
          defineChart,
          renderChartSvg,
        } from '@tanstack/charts'
        import { voronoi } from '@tanstack/charts/spatial/voronoi'
        import { scaleLinear } from 'd3-scale'
        const rows = [
          { id: 'a', group: 'one', x: 0, y: 0 },
          { id: 'b', group: 'two', x: 1, y: 0 },
          { id: 'c', group: 'one', x: 0, y: 1 },
        ]
        const definition = defineChart({
          marks: [
            voronoi(rows, {
              x: 'x',
              y: 'y',
              key: 'id',
              color: 'group',
              fillOpacity: 0.2,
              stroke: '#fff',
            }),
          ],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        })
        export const svg = renderChartSvg(
          createChartScene(definition, { width: 320, height: 180 }),
          { ariaLabel: 'Packed spatial Voronoi chart' },
        )
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
          'networkForce',
          'd3Force',
          ...optionalHierarchyInputGroups,
          'motion',
          'transformFold',
          'transformWaterfall',
          'polarPie',
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
    assert.ok(
      contents.byteLength > (entry.minimumBytes ?? 100),
      `${entry.label} bundle is empty`,
    )
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
      optionalSubpathIsolatedBoundary(entry.inputBoundary),
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

function optionalSubpathIsolatedBoundary(boundary = {}) {
  const hierarchyRequired = (boundary.require ?? []).some((group) =>
    optionalHierarchyInputGroups.includes(group),
  )
  const sankeyRequired = (boundary.require ?? []).some((group) =>
    optionalSankeyInputGroups.includes(group),
  )
  const focusRequired = (boundary.require ?? []).some((group) =>
    optionalFocusInputGroups.includes(group),
  )
  const guideNodesRequired = (boundary.require ?? []).some((group) =>
    optionalGuideNodeInputGroups.includes(group),
  )
  const interactionRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionInputGroups.includes(group),
  )
  const interactionAxisRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionAxisInputGroups.includes(group),
  )
  const interactionRangeRequired = (boundary.require ?? []).some((group) =>
    optionalInteractionRangeInputGroups.includes(group),
  )
  const cursorRequired = (boundary.require ?? []).some((group) =>
    optionalCursorInputGroups.includes(group),
  )
  const handleRequired = (boundary.require ?? []).some((group) =>
    optionalHandleInputGroups.includes(group),
  )
  const brushRequired = (boundary.require ?? []).some((group) =>
    optionalBrushInputGroups.includes(group),
  )
  const zoomRequired = (boundary.require ?? []).some((group) =>
    optionalZoomInputGroups.includes(group),
  )

  return {
    ...boundary,
    forbid: [
      ...new Set([
        ...(boundary.forbid ?? []),
        ...(hierarchyRequired ? [] : optionalHierarchyInputGroups),
        ...(sankeyRequired ? [] : optionalSankeyInputGroups),
        ...(focusRequired ? [] : optionalFocusInputGroups),
        ...(guideNodesRequired ? [] : optionalGuideNodeInputGroups),
        ...(interactionRequired ? [] : optionalInteractionInputGroups),
        ...(interactionAxisRequired ? [] : optionalInteractionAxisInputGroups),
        ...(interactionRangeRequired
          ? []
          : optionalInteractionRangeInputGroups),
        ...(cursorRequired ? [] : optionalCursorInputGroups),
        ...(handleRequired ? [] : optionalHandleInputGroups),
        ...(brushRequired ? [] : optionalBrushInputGroups),
        ...(zoomRequired ? [] : optionalZoomInputGroups),
      ]),
    ],
  }
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
