import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { build as esbuild } from 'esbuild'
import ts from 'typescript'
import { build as viteBuild } from 'vite'
import solid from 'vite-plugin-solid'
import { validatePackedMarkdownLinks } from './packed-markdown-links.mjs'

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname, '..')
const artifactDirectory = parseArtifactDirectory(process.argv.slice(2))
const temporaryDirectory = await mkdtemp(
  resolve(tmpdir(), 'tanstack-charts-framework-packages-'),
)
const tarballDirectory = artifactDirectory ?? temporaryDirectory
const packageNames = [
  'preact-charts',
  'vue-charts',
  'solid-charts',
  'svelte-charts',
  'angular-charts',
  'lit-charts',
  'alpine-charts',
]
const standardPackages = [
  ['preact-charts', 'preact'],
  ['vue-charts'],
  ['lit-charts'],
  ['alpine-charts'],
]

try {
  await mkdir(tarballDirectory, { recursive: true })
  for (const [directory, jsxImportSource] of standardPackages) {
    await buildStandardPackage(directory, jsxImportSource)
  }
  await buildSolidPackage()
  await buildSveltePackage()
  await buildAngularPackage()

  for (const directory of packageNames) {
    await verifyPackage(directory)
  }

  console.log(
    `Framework package gate passed for ${packageNames.length} adapters.`,
  )
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

async function buildStandardPackage(directory, jsxImportSource) {
  const packageRoot = resolve(root, 'packages', directory)
  const sourceRoot = resolve(packageRoot, 'src')
  const outputRoot = resolve(packageRoot, 'dist')
  await rm(outputRoot, { recursive: true, force: true })
  const entryPoints = (await walk(sourceRoot)).filter(isRuntimeSource)

  await esbuild({
    entryPoints,
    outdir: outputRoot,
    outbase: sourceRoot,
    bundle: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    jsx: 'automatic',
    jsxImportSource,
    legalComments: 'none',
    logLevel: 'silent',
  })
  await buildDeclarations(packageRoot)
  await rewriteGeneratedSpecifiers(outputRoot)
}

async function buildSolidPackage() {
  const packageRoot = resolve(root, 'packages', 'solid-charts')
  const outputRoot = resolve(packageRoot, 'dist')
  await rm(outputRoot, { recursive: true, force: true })
  await viteBuild({
    configFile: false,
    logLevel: 'silent',
    plugins: [solid()],
    build: {
      emptyOutDir: true,
      lib: {
        entry: resolve(packageRoot, 'src/index.ts'),
        formats: ['es'],
      },
      outDir: outputRoot,
      rollupOptions: {
        external: (id) =>
          id.startsWith('@tanstack/charts') || id.startsWith('solid-js'),
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  })
  await buildDeclarations(packageRoot)
  await rewriteGeneratedSpecifiers(outputRoot)
}

async function buildSveltePackage() {
  await run(
    'pnpm',
    [
      '--filter',
      '@tanstack/svelte-charts',
      'exec',
      'svelte-check',
      '--tsconfig',
      './tsconfig.json',
    ],
    root,
  )
  await run(
    'pnpm',
    [
      '--filter',
      '@tanstack/svelte-charts',
      'exec',
      'svelte-package',
      '-i',
      'src',
      '-o',
      'dist',
    ],
    root,
  )
}

async function buildAngularPackage() {
  await run(
    'pnpm',
    [
      '--filter',
      '@tanstack/angular-charts',
      'exec',
      'ng-packagr',
      '-p',
      'ng-package.json',
      '-c',
      'tsconfig.lib.json',
    ],
    root,
  )
}

async function buildDeclarations(packageRoot) {
  const sourceRoot = resolve(packageRoot, 'src')
  const outputRoot = resolve(packageRoot, 'dist')
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
  const program = ts.createProgram([resolve(sourceRoot, 'index.ts')], options)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    throw new Error(
      `Declaration build failed for ${packageRoot}:\n${formatDiagnostics(
        diagnostics,
      )}`,
    )
  }
  const result = program.emit()
  assert.equal(result.emitSkipped, false)
}

async function verifyPackage(directory) {
  const packageRoot = resolve(root, 'packages', directory)
  const manifest = JSON.parse(
    await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
  )
  assert.equal(manifest.private, false)
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.sideEffects, false)
  assert.equal(manifest.publishConfig?.provenance, true)
  assert.deepEqual(
    Object.keys(manifest.exports).sort(),
    Object.keys(manifest.publishConfig.exports).sort(),
  )

  for (const conditions of Object.values(manifest.publishConfig.exports)) {
    for (const target of Object.values(conditions)) {
      assert.ok(
        await isFile(resolve(packageRoot, target)),
        `${manifest.name} is missing ${target}`,
      )
    }
  }

  const tarball = resolve(
    tarballDirectory,
    `${directory}-${manifest.version}.tgz`,
  )
  const { stdout } = await run(
    'pnpm',
    ['pack', '--out', tarball, '--json'],
    packageRoot,
  )
  const packed = JSON.parse(stdout)
  const files = new Set(packed.files.map((file) => file.path))
  assert.equal(
    [...files].some(
      (file) =>
        file.startsWith('src/') ||
        file.includes('.test.') ||
        file.includes('/tests/'),
    ),
    false,
    `${manifest.name} leaked source or tests`,
  )
  for (const conditions of Object.values(manifest.publishConfig.exports)) {
    for (const target of Object.values(conditions)) {
      assert.ok(
        files.has(target.replace(/^\.\//, '')),
        `${manifest.name} tarball omitted ${target}`,
      )
    }
  }
  await verifyPackedMarkdownLinks(packageRoot, manifest.name, files)

  if (directory === 'svelte-charts' || directory === 'angular-charts') return
  const entry = manifest.publishConfig.exports['.'].import
  await esbuild({
    entryPoints: [resolve(packageRoot, entry)],
    bundle: true,
    packages: 'external',
    platform: 'neutral',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  })
}

async function verifyPackedMarkdownLinks(
  packageRoot,
  packageName,
  packedFiles,
) {
  const markdownSources = new Map()
  for (const file of [...packedFiles]
    .filter((path) => path.endsWith('.md'))
    .sort()) {
    markdownSources.set(
      file,
      await readFile(resolve(packageRoot, ...file.split('/')), 'utf8'),
    )
  }
  validatePackedMarkdownLinks({
    packageName,
    packedFiles,
    markdownSources,
  })
}

function isRuntimeSource(file) {
  if (!/\.(?:ts|tsx)$/.test(file)) return false
  if (/\.d\.ts$/.test(file)) return false
  return !/\.(?:test|type-test)\.(?:ts|tsx)$/.test(file)
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
  if (/\.(?:[cm]?js|json|css|wasm|svelte)$/.test(specifier)) return specifier
  if (/\.(?:ts|tsx)$/.test(specifier)) {
    return specifier.replace(/\.(?:ts|tsx)$/, '.js')
  }
  return `${specifier}.js`
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

async function run(command, args, cwd) {
  return execFileAsync(command, args, {
    cwd,
    env: { ...process.env, CI: 'true' },
    maxBuffer: 20 * 1024 * 1024,
  })
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
    'Usage: node scripts/check-framework-adapters.mjs [--artifacts-dir <path>]',
  )
  assert.equal(
    args.length,
    2,
    'Usage: node scripts/check-framework-adapters.mjs [--artifacts-dir <path>]',
  )
  return resolve(process.cwd(), args[1])
}
