import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import {
  dirname,
  extname,
  join,
  posix,
  relative,
  resolve,
  sep,
} from 'node:path'
import { compile as compileOctane } from 'octane/compiler'
import ts from 'typescript'
import { chartLibraries } from './benchmark/chart-libraries.mjs'
import {
  comparisonCapabilityCoverage,
  comparisonChartTypes,
  comparisonOfficialSources,
  comparisonTiers,
  formatComparisonImplementation,
} from './benchmark/comparison-capabilities.mjs'
import {
  extractMarkdownLinks,
  maskMarkdownCode,
} from './packed-markdown-links.mjs'

const bannedChartLibraryHosts = new Set([
  'ag-grid.com',
  'apexcharts.com',
  'bklit.com',
  'chartjs.org',
  'commerce.nearform.com',
  'echarts.apache.org',
  'highcharts.com',
  'nivo.rocks',
  'observablehq.com',
  'plotly.com',
  'recharts.github.io',
  'recharts.org',
  'tradingview.github.io',
])

const allowedChartLibraryLinks = new Map([
  ['overview.md', new Set(['https://observablehq.com/plot/'])],
  ['comparison.md', new Set(Object.values(comparisonOfficialSources))],
])

const publicEntryPaths = [
  'README.md',
  'packages/charts-core/README.md',
  'packages/charts-scales/README.md',
  'packages/preact-charts/README.md',
  'packages/react-charts/README.md',
  'packages/react-native-charts/README.md',
  'packages/vue-charts/README.md',
  'packages/solid-charts/README.md',
  'packages/svelte-charts/README.md',
  'packages/angular-charts/README.md',
  'packages/lit-charts/README.md',
  'packages/alpine-charts/README.md',
  'packages/octane-charts/README.md',
]

export async function validateDocsContract(repositoryRoot) {
  const docsRoot = resolve(repositoryRoot, 'docs')
  const configPath = resolve(docsRoot, 'config.json')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const markdownFiles = await walkMarkdown(docsRoot)
  const failures = []

  validateConfig(config, markdownFiles, docsRoot, failures)

  const cases = await readCatalogCases(repositoryRoot)
  const catalogExamples = new Map()
  const markdownSources = new Map()

  for (const file of markdownFiles) {
    const source = await readFile(file, 'utf8')
    const path = slash(relative(docsRoot, file))
    markdownSources.set(path, source)
    validateFrontmatter(path, source, failures)
    validatePublicLinks(path, source, failures)
    await validateMarkdownLinks(path, source, markdownFiles, docsRoot, failures)
    validateChartExamples(path, source, cases, catalogExamples, failures)
  }

  const publicEntrySources = new Map()
  for (const path of publicEntryPaths) {
    publicEntrySources.set(
      path,
      await readFile(resolve(repositoryRoot, path), 'utf8'),
    )
  }
  const publicSources = new Map([...markdownSources, ...publicEntrySources])

  validatePublicEntryLinks(publicEntrySources, failures)
  await validateApiCoverage(repositoryRoot, markdownSources, failures)
  await validateComparisonEvidence(repositoryRoot, markdownSources, failures)
  await validateDocumentedTanStackImports(
    repositoryRoot,
    publicSources,
    failures,
  )
  const exampleGroups = validateExampleGroups(
    repositoryRoot,
    markdownSources,
    failures,
  )
  const standaloneExamples = validateStandaloneExamples(
    repositoryRoot,
    publicSources,
    failures,
  )
  const apiExampleFragments = [...publicSources].flatMap(([path, source]) =>
    documentedApiExampleFragments(source).map((_, index) => ({
      path,
      fragment: index + 1,
    })),
  )

  return {
    config,
    catalogExamples: [...catalogExamples.keys()].sort(),
    exampleGroups,
    failures,
    markdownFiles: [...markdownSources.keys()].sort(),
    standaloneExamples,
    apiExampleFragments,
  }
}

export async function assertDocsContract(repositoryRoot) {
  const result = await validateDocsContract(repositoryRoot)
  assert.equal(
    result.failures.length,
    0,
    `Documentation contract failed:\n${result.failures.join('\n')}`,
  )
  return result
}

export function flattenConfigPaths(config) {
  const paths = []

  for (const section of config.sections ?? []) {
    visitNavigationNodes(section.children, paths)
    for (const framework of section.frameworks ?? []) {
      visitNavigationNodes(framework.children, paths)
    }
  }

  return paths
}

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return null

  const values = {}
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const value = unquote(line.slice(separator + 1).trim())
    if (key) values[key] = value
  }
  return values
}

export function parseChartExampleDirective(source) {
  const match = source.match(
    /^ {0,3}<!--\s*::chart-example\s+id=([a-z0-9]+(?:-[a-z0-9]+)*)\s+height=(\d+)\s*-->\s*$/,
  )
  if (!match) return null
  return { id: match[1], height: Number(match[2]) }
}

export function markdownTableRows(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => /^\s*\|.*\|\s*$/.test(line))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    )
}

export function formatComparisonRange(byteValues) {
  const minimum = Math.min(...byteValues) / 1024
  const maximum = Math.max(...byteValues) / 1024
  return `${minimum.toFixed(2)}–${maximum.toFixed(2)} KiB`
}

export function isPublicChartLibraryLinkAllowed(path, href) {
  const url = new URL(href)
  const host = url.hostname.replace(/^www\./, '')
  return (
    !bannedChartLibraryHosts.has(host) ||
    allowedChartLibraryLinks.get(path)?.has(url.href) === true
  )
}

export function comparisonBaselineContractFailures(baseline, expectedVersions) {
  const failures = []
  if (baseline.schemaVersion !== 4) {
    failures.push('comparison bundle baseline must use schema version 4')
  }
  if (
    !sameStrings(baseline.matrix?.chartTypes ?? [], comparisonChartTypes) ||
    !sameStrings(baseline.matrix?.tiers ?? [], comparisonTiers)
  ) {
    failures.push('comparison bundle baseline matrix metadata is stale')
  }
  for (const library of chartLibraries) {
    const manifestVersion = expectedVersions[library.id]
    const baselineVersion = baseline.packageVersions?.[library.id]
    if (
      !baselineVersion ||
      (library.id !== 'tanstack' && baselineVersion !== manifestVersion)
    ) {
      failures.push(
        `comparison bundle baseline version is stale for ${library.label}: expected ${manifestVersion}`,
      )
    }
    const source = baseline.sources?.[library.id]
    if (library.id === 'tanstack') {
      if (
        source?.kind !== 'workspace' ||
        !/^[0-9a-f]{40}$/u.test(source.revision)
      ) {
        failures.push(
          'comparison bundle baseline must record the TanStack workspace revision',
        )
      }
      if (!/^sha256:[0-9a-f]{64}$/u.test(source?.inputDigest)) {
        failures.push(
          'comparison bundle baseline must record the TanStack workspace input digest',
        )
      }
    } else if (
      source?.kind !== 'package' ||
      source.packageName !== library.packageName ||
      source.version !== manifestVersion
    ) {
      failures.push(
        `comparison bundle baseline package provenance is stale for ${library.label}`,
      )
    }
  }

  const expectedBundleIds = new Set(
    chartLibraries.flatMap((library) =>
      comparisonChartTypes.flatMap((chartType) =>
        comparisonTiers.map((tier) => `${library.id}-${chartType}-${tier}`),
      ),
    ),
  )
  const actualBundleIds = new Set(Object.keys(baseline.bundles ?? {}))
  if (
    expectedBundleIds.size !== actualBundleIds.size ||
    [...expectedBundleIds].some((id) => !actualBundleIds.has(id))
  ) {
    failures.push(
      `comparison bundle baseline must contain the complete ${expectedBundleIds.size}-case matrix`,
    )
  }

  return failures
}

function validateConfig(config, markdownFiles, docsRoot, failures) {
  if (
    config.$schema !==
    'https://raw.githubusercontent.com/TanStack/tanstack.com/main/tanstack-docs-config.schema.json'
  ) {
    failures.push('docs/config.json must use the TanStack docs schema')
  }
  if (!Array.isArray(config.sections) || config.sections.length === 0) {
    failures.push('docs/config.json must define at least one section')
  }
  if (!config.docSearch || typeof config.docSearch !== 'object') {
    failures.push('docs/config.json must define docSearch')
  }

  const configured = flattenConfigPaths(config)
  const seen = new Set()
  for (const path of configured) {
    if (seen.has(path)) {
      failures.push(`docs/config.json lists ${path} more than once`)
    }
    seen.add(path)
    const file = resolve(docsRoot, `${path}.md`)
    if (!markdownFiles.includes(file)) {
      failures.push(`docs/config.json points to missing page: ${path}.md`)
    }
  }

  for (const file of markdownFiles) {
    const path = slash(relative(docsRoot, file)).replace(/\.md$/, '')
    if (!seen.has(path)) {
      failures.push(
        `Documentation page is absent from docs/config.json: ${path}.md`,
      )
    }
  }
}

function validateFrontmatter(path, source, failures) {
  const frontmatter = parseFrontmatter(source)
  if (!frontmatter) {
    failures.push(`${path} is missing frontmatter`)
    return
  }
  if (!frontmatter.title) failures.push(`${path} is missing frontmatter title`)
  if (!frontmatter.description) {
    failures.push(`${path} is missing frontmatter description`)
  }
  if (/^#\s+/m.test(maskCode(source))) {
    failures.push(
      `${path} repeats its frontmatter title as a level-one heading`,
    )
  }
}

function validatePublicLinks(path, source, failures) {
  const urls = source.matchAll(/https?:\/\/[^\s<>"')\]]+/g)
  for (const match of urls) {
    let url
    try {
      url = new URL(match[0].replace(/[.,;:]$/, ''))
    } catch {
      failures.push(`${path} contains an invalid URL: ${match[0]}`)
      continue
    }
    const host = url.hostname.replace(/^www\./, '')
    if (!isPublicChartLibraryLinkAllowed(path, url.href)) {
      failures.push(`${path} links to another charting library: ${url.href}`)
    }
    if (host === 'd3js.org' && path !== 'concepts/scales-and-d3.md') {
      failures.push(
        `${path} links directly to D3 instead of concepts/scales-and-d3.md: ${url.href}`,
      )
    }
  }

  if (/\bfrom\s+['"]d3['"]/.test(source)) {
    failures.push(
      `${path} imports the D3 umbrella package instead of a granular module`,
    )
  }
}

async function validateMarkdownLinks(
  path,
  source,
  markdownFiles,
  docsRoot,
  failures,
) {
  const files = new Set(markdownFiles)
  for (const link of extractMarkdownLinks(source)) {
    const destination = link.destination.trim()
    if (
      destination.startsWith('?') ||
      destination.startsWith('//') ||
      /^[a-z][a-z\d+.-]*:/i.test(destination)
    ) {
      continue
    }

    const hashIndex = destination.indexOf('#')
    const pathAndQuery =
      hashIndex === -1 ? destination : destination.slice(0, hashIndex)
    const rawFragment = hashIndex === -1 ? '' : destination.slice(hashIndex + 1)
    const pathname = pathAndQuery.split('?', 1)[0]
    if (pathname && extname(pathname) !== '.md') {
      failures.push(
        `${path}:${link.line} internal documentation links must include .md: ${destination}`,
      )
      continue
    }

    let decodedPath
    let fragment
    try {
      decodedPath = decodeURIComponent(pathname)
      fragment = decodeURIComponent(rawFragment)
    } catch {
      failures.push(
        `${path}:${link.line} has invalid URL encoding: ${destination}`,
      )
      continue
    }
    const target = decodedPath
      ? resolve(docsRoot, dirname(path), decodedPath)
      : resolve(docsRoot, path)
    if (!target.startsWith(`${docsRoot}${sep}`) && target !== docsRoot) {
      failures.push(
        `${path}:${link.line} links outside canonical docs: ${destination}`,
      )
    } else if (!files.has(target)) {
      failures.push(
        `${path}:${link.line} links to a missing page: ${destination}`,
      )
    } else if (
      fragment &&
      !markdownHeadingAnchors(await readFile(target, 'utf8')).has(fragment)
    ) {
      failures.push(
        `${path}:${link.line} links to a missing heading: ${destination}`,
      )
    }
  }
}

export function validateChartExamples(
  path,
  source,
  cases,
  catalogExamples,
  failures,
) {
  const visibleSource = maskMarkdownCode(source)

  if (/<iframe\b/i.test(visibleSource)) {
    failures.push(
      `${path} must use a chart-example directive instead of an iframe`,
    )
  }

  for (const line of visibleSource.split(/\r?\n/)) {
    if (!line.includes('::chart-example')) continue

    const example = parseChartExampleDirective(line)
    if (!example) {
      failures.push(
        `${path} has an invalid chart-example directive; expected <!-- ::chart-example id=case-id height=480 -->`,
      )
      continue
    }
    if (!cases.has(example.id)) {
      failures.push(`${path} references an unknown catalog case: ${example.id}`)
    }

    const previous = catalogExamples.get(example.id)
    if (previous) {
      failures.push(
        `${path} duplicates catalog example ${example.id} already used by ${previous}`,
      )
    } else {
      catalogExamples.set(example.id, path)
    }

    if (example.height < 480 || example.height > 1_200) {
      failures.push(`${path} chart-example height must be between 480 and 1200`)
    }
  }
}

function validatePublicEntryLinks(sources, failures) {
  for (const [path, source] of sources) {
    validatePublicLinks(path, source, failures)
  }
}

async function validateDocumentedTanStackImports(
  repositoryRoot,
  markdownSources,
  failures,
) {
  const packages = [['packages/charts-core', '@tanstack/charts']]
  const exportsBySpecifier = new Map()

  for (const [packagePath, packageName] of packages) {
    const packageRoot = resolve(repositoryRoot, packagePath)
    const manifest = JSON.parse(
      await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
    )
    for (const [subpath, sourcePath] of Object.entries(manifest.exports)) {
      const specifier =
        subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
      const resolvedSourcePath = resolveExportSource(sourcePath)
      exportsBySpecifier.set(
        specifier,
        await exportedNamesFromSourceFile(
          resolve(packageRoot, resolvedSourcePath),
        ),
      )
    }
  }

  for (const [path, source] of markdownSources) {
    for (const error of typedCodeFenceSyntaxErrors(source)) {
      failures.push(
        `${path} typed code fence ${error.fence} has invalid syntax: ${error.message}`,
      )
    }
    for (const code of typedCodeFences(source)) {
      for (const match of code.matchAll(
        /(?:\bfrom\s+|\bimport\s*\(\s*)['"](@charts-poc\/[^'"]+)['"]/g,
      )) {
        failures.push(
          `${path} imports private workspace package ${match[1]} from public documentation`,
        )
      }
      for (const [specifier, names] of importedNamesBySpecifier(code)) {
        if (!specifier.startsWith('@tanstack/')) continue
        const available = exportsBySpecifier.get(specifier)
        if (!available) {
          failures.push(`${path} imports unknown TanStack entry ${specifier}`)
          continue
        }
        for (const name of names) {
          if (!available.has(name)) {
            failures.push(
              `${path} imports ${name} from ${specifier}, but that entry does not export it`,
            )
          }
        }
      }
    }
  }
}

async function validateApiCoverage(repositoryRoot, markdownSources, failures) {
  await validatePackageCoverage(
    resolve(repositoryRoot, 'packages/charts-core'),
    '@tanstack/charts',
    joinSources(markdownSources, ''),
    [...markdownSources]
      .map(([path, source]) => stripNameOnlyApiInventories(path, source))
      .join('\n'),
    failures,
  )
}

async function validateComparisonEvidence(
  repositoryRoot,
  markdownSources,
  failures,
) {
  const source = markdownSources.get('comparison.md')
  if (!source) return

  const rows = markdownTableRows(source)
  const rootManifest = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  )
  const baseline = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'benchmarks/comparison/bundle-baseline.json'),
      'utf8',
    ),
  )
  const manifestVersions = new Map()

  for (const library of chartLibraries) {
    const version = library.packagePath
      ? JSON.parse(
          await readFile(resolve(repositoryRoot, library.packagePath), 'utf8'),
        ).version
      : (rootManifest.dependencies?.[library.packageName] ??
        rootManifest.devDependencies?.[library.packageName])
    manifestVersions.set(library.id, version)
    const packageCell = `\`${library.packageName}\``
    const sourceCell =
      library.id === 'tanstack'
        ? `workspace \`${baseline.sources?.tanstack?.revision?.slice(0, 7)}\``
        : `npm \`${version}\``
    if (
      !rows.some((row) => row.includes(packageCell) && row.includes(sourceCell))
    ) {
      failures.push(
        `comparison.md must pair ${packageCell} with measured source ${sourceCell}`,
      )
    }
  }

  for (const sourceUrl of Object.values(comparisonOfficialSources)) {
    if (!source.includes(`](${sourceUrl})`)) {
      failures.push(
        `comparison.md is missing reviewed official source ${sourceUrl}`,
      )
    }
  }

  const capabilityHeadings = {
    'Multi-series composition': 'Multi-series',
    'Canvas output': 'Canvas or WebGL output',
  }
  for (const capability of comparisonCapabilityCoverage) {
    const heading =
      capabilityHeadings[capability.capability] ?? capability.capability
    const header = rows.find(
      (row) => row[0] === 'Library' && row.includes(heading),
    )
    const column = header?.indexOf(heading) ?? -1
    for (const library of chartLibraries) {
      const implementation = capability.implementations[library.id]
      const expected = formatComparisonImplementation(implementation)
      const libraryCell = `[${library.label}](`
      if (
        !header ||
        !rows.some(
          (row) =>
            row.length === header.length &&
            row[0].startsWith(libraryCell) &&
            row[column] === expected,
        )
      ) {
        failures.push(
          `comparison.md capability cell is stale: ${library.label} / ${capability.capability}`,
        )
      }
    }
  }

  failures.push(
    ...comparisonBaselineContractFailures(
      baseline,
      Object.fromEntries(manifestVersions),
    ),
  )

  const baselineDate = baseline.generatedAt?.slice(0, 10)
  if (
    !baselineDate ||
    !source.includes(`Baseline date: \`${baselineDate}\`.`)
  ) {
    failures.push(
      'comparison.md baseline date does not match the tracked bundle baseline',
    )
  }

  for (const library of chartLibraries) {
    const bundles = Object.entries(baseline.bundles ?? {})
      .filter(([id]) => id.startsWith(`${library.id}-`))
      .map(([, bundle]) => bundle)
    if (!bundles.length) continue

    const fullRange = formatComparisonRange(
      bundles.map((bundle) => bundle.gzipBytes),
    )
    const incrementalRange = formatComparisonRange(
      bundles.map((bundle) => bundle.incrementalGzipBytes),
    )
    const expectedIncremental =
      fullRange === incrementalRange ? '—' : incrementalRange
    if (
      !rows.some(
        (row) =>
          row[0] === library.label &&
          row[1] === fullRange &&
          row[2] === expectedIncremental,
      )
    ) {
      failures.push(
        `comparison.md bundle row is stale for ${library.label}: ${fullRange}`,
      )
    }
  }
}

async function validatePackageCoverage(
  packageRoot,
  packageName,
  reference,
  symbolReference,
  failures,
) {
  const manifest = JSON.parse(
    await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
  )
  const names = new Set()
  const exportedSpecifiers = new Set()
  const documentedSpecifiers = new Set(
    [...reference.matchAll(/^\|\s*`(@tanstack\/[^`]+)`\s*\|/gm)].map(
      (match) => match[1],
    ),
  )

  for (const [subpath, sourcePath] of Object.entries(manifest.exports)) {
    const specifier =
      subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
    exportedSpecifiers.add(specifier)
    if (!reference.includes(specifier)) {
      failures.push(`API reference does not name package export ${specifier}`)
    }
    const resolvedSourcePath = resolveExportSource(sourcePath)
    for (const name of await exportedNamesFromSourceFile(
      resolve(packageRoot, resolvedSourcePath),
    )) {
      names.add(name)
    }
  }

  for (const specifier of documentedSpecifiers) {
    if (
      (specifier === packageName || specifier.startsWith(`${packageName}/`)) &&
      !exportedSpecifiers.has(specifier)
    ) {
      failures.push(`API reference import map names stale export ${specifier}`)
    }
  }

  for (const name of [...names].sort()) {
    if (!apiReferenceCoversExport(symbolReference, name)) {
      failures.push(
        `${packageName} API reference does not cover exported symbol ${name}`,
      )
    }
  }
}

function sameStrings(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

export function stripNameOnlyApiInventories(path, source) {
  const lines = source.split('\n')
  const output = []
  let fence = null
  let strippedSectionLevel = null
  let stripExportsParagraph = false

  for (const line of lines) {
    const marker = markdownFenceMarker(line)
    const outsideFence = fence === null
    const heading = outsideFence ? markdownHeading(line) : null

    if (
      strippedSectionLevel !== null &&
      heading &&
      heading.level <= strippedSectionLevel
    ) {
      strippedSectionLevel = null
    }
    if (
      stripExportsParagraph &&
      outsideFence &&
      (/^[ \t]*$/.test(line) || heading || marker)
    ) {
      stripExportsParagraph = false
    }

    if (
      strippedSectionLevel === null &&
      outsideFence &&
      heading &&
      isNameOnlyApiSection(path, heading)
    ) {
      strippedSectionLevel = heading.level
      continue
    }
    if (
      strippedSectionLevel === null &&
      !stripExportsParagraph &&
      outsideFence &&
      /^[ \t]*Exports:\s*/.test(line)
    ) {
      stripExportsParagraph = true
      continue
    }

    if (strippedSectionLevel === null && !stripExportsParagraph)
      output.push(line)
    fence = updateMarkdownFence(fence, marker)
  }

  return output.join('\n')
}

export function apiReferenceCoversExport(reference, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\w$])${escaped}(?=$|[^\\w$])`, 'm').test(reference)
}

function resolveExportSource(source) {
  if (typeof source === 'string') return source
  for (const condition of ['svelte', 'solid', 'import', 'default']) {
    if (typeof source?.[condition] === 'string') return source[condition]
  }
  throw new TypeError('Package export does not identify a source file')
}

async function exportedNamesFromSourceFile(filename, seen = new Set()) {
  const resolvedFilename = resolve(filename)
  if (seen.has(resolvedFilename)) return new Set()
  seen.add(resolvedFilename)

  const source = await readFile(resolvedFilename, 'utf8')
  const names = new Set(exportedNames(source, resolvedFilename))
  const file = ts.createSourceFile(
    resolvedFilename,
    source,
    ts.ScriptTarget.Latest,
    true,
    resolvedFilename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  for (const statement of file.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.exportClause ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.')
    ) {
      continue
    }
    const target = await resolveReexportSourceFile(
      resolvedFilename,
      statement.moduleSpecifier.text,
    )
    for (const name of await exportedNamesFromSourceFile(target, seen)) {
      names.add(name)
    }
  }

  return names
}

async function resolveReexportSourceFile(importer, specifier) {
  const base = resolve(dirname(importer), specifier)
  const candidates = extname(base)
    ? [base]
    : [
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.tsrx`,
        resolve(base, 'index.ts'),
        resolve(base, 'index.tsx'),
        resolve(base, 'index.tsrx'),
      ]

  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf8')
      return candidate
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }

  throw new Error(`${importer} re-exports missing source ${specifier}`)
}

export function exportedNames(source, filename = 'source.ts') {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const names = []

  for (const statement of file.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        names.push(element.name.text)
      }
      continue
    }

    if (!hasExportModifier(statement)) continue
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (statement.name) names.push(statement.name.text)
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text)
      }
    }
  }

  return names
}

export function importedNamesBySpecifier(source) {
  const file = ts.createSourceFile(
    'example.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const imports = new Map()

  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue
    }
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    const names = imports.get(statement.moduleSpecifier.text) ?? []
    for (const element of bindings.elements) {
      names.push((element.propertyName ?? element.name).text)
    }
    imports.set(statement.moduleSpecifier.text, names)
  }

  return imports
}

export function typedCodeFenceSyntaxErrors(source) {
  const errors = []
  for (const [index, code] of typedCodeFences(source).entries()) {
    const file = ts.createSourceFile(
      'example.tsx',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    for (const diagnostic of file.parseDiagnostics) {
      const position = file.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
      errors.push({
        fence: index + 1,
        message: `${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n',
        )} (${position.line + 1}:${position.character + 1})`,
      })
    }
  }
  return errors
}

export function documentedStandaloneExamples(source) {
  const examples = []
  const fences = codeFences(source)
  const pattern =
    /<!--\s*docs-example:\s*([a-z\d-]+)\s+(typecheck|octane)\s*-->/g
  for (const match of source.matchAll(pattern)) {
    const markerEnd = match.index + match[0].length
    const fence = fences.find(
      (candidate) =>
        candidate.start >= markerEnd &&
        /^\s*$/.test(source.slice(markerEnd, candidate.start)),
    )
    if (
      !fence ||
      !['typescript', 'tsx', 'ts', 'tsrx'].includes(fence.language)
    ) {
      continue
    }
    if (/(?:^|\s)group=/.test(fence.meta)) continue
    examples.push({
      id: match[1],
      mode: match[2],
      language: fence.language,
      source: fence.source,
    })
  }
  return examples
}

export function documentedApiExampleFragments(source) {
  const fragments = []
  const pattern = /```(ts|tsx|typescript)\r?\n([\s\S]*?)```/g
  for (const match of source.matchAll(pattern)) {
    if (!match[2].includes('@tanstack/')) continue
    const prefix = source.slice(Math.max(0, match.index - 100), match.index)
    if (/<!--\s*docs-example:[^>]+-->\s*$/.test(prefix)) continue
    fragments.push({ language: match[1], source: match[2] })
  }
  return fragments
}

const chartDocumentationDependencies = [
  '@tanstack/charts',
  'd3-geo',
  'd3-scale',
  'd3-shape',
]

const documentationEnvironments = new Map([
  [
    'charts',
    {
      compiler: 'typescript',
      dependencies: new Set(chartDocumentationDependencies),
      entryExtensions: new Set(['.ts', '.tsx']),
      fileExtensions: new Set(['.ts', '.tsx']),
      bootstrapExtension: '.ts',
      bootstrap: (importPath, groupId) =>
        `import definition from ${JSON.stringify(importPath)}\nimport { mountChart } from '@tanstack/charts'\nconst host = mountChart(document.createElement('div'), { definition, height: 320, ariaLabel: ${JSON.stringify(`Documentation example: ${groupId}`)} })\nhost.destroy()\n`,
    },
  ],
  [
    'charts-octane',
    {
      compiler: 'octane',
      dependencies: new Set([...chartDocumentationDependencies, 'octane']),
      entryExtensions: new Set(['.tsrx']),
      fileExtensions: new Set(['.ts', '.tsx', '.tsrx']),
      bootstrapExtension: '.ts',
      bootstrap: (importPath) =>
        `import App from ${JSON.stringify(importPath)}\nconst entry = App\nvoid entry\n`,
    },
  ],
  [
    'charts-react',
    {
      compiler: 'typescript',
      dependencies: new Set([
        ...chartDocumentationDependencies,
        'react',
        'react-dom',
      ]),
      entryExtensions: new Set(['.tsx']),
      fileExtensions: new Set(['.ts', '.tsx']),
      bootstrapExtension: '.tsx',
      bootstrap: (importPath) =>
        `import App from ${JSON.stringify(importPath)}\nconst example = <App />\nvoid example\n`,
    },
  ],
])

export function documentationEnvironmentBootstrap(
  environment,
  groupId,
  importPath,
) {
  return documentationEnvironments
    .get(environment)
    ?.bootstrap(importPath, groupId)
}

export function documentedExampleGroups(source) {
  return parseDocumentedExampleGroups(source).groups
}

export function documentedExampleGroupErrors(source) {
  return parseDocumentedExampleGroups(source).errors
}

function parseDocumentedExampleGroups(source) {
  const groups = new Map()
  const errors = []

  for (const fence of codeFences(source)) {
    const metadata = parseCodeFenceMetadata(fence.meta)
    const groupId = metadata.values.get('group')
    const hasGroupedMetadata =
      groupId !== undefined ||
      metadata.values.has('env') ||
      metadata.values.has('file') ||
      metadata.flags.has('entry') ||
      metadata.flags.has('collapsed') ||
      metadata.flags.has('hidden')

    if (!hasGroupedMetadata) continue
    if (!groupId) {
      errors.push(
        `code fence ${fence.index} has grouped metadata without group=<id>`,
      )
      continue
    }
    if (!/^[a-z\d]+(?:-[a-z\d]+)*$/.test(groupId)) {
      errors.push(
        `code fence ${fence.index} has invalid group ID ${JSON.stringify(groupId)}`,
      )
    }
    for (const duplicate of metadata.duplicates) {
      errors.push(
        `code fence ${fence.index} repeats metadata key ${JSON.stringify(duplicate)}`,
      )
    }
    for (const unknown of metadata.unknown) {
      errors.push(
        `code fence ${fence.index} uses unknown grouped metadata ${JSON.stringify(unknown)}`,
      )
    }

    const file = metadata.values.get('file')
    if (!file) {
      errors.push(
        `group ${groupId} code fence ${fence.index} must declare file=/src/...`,
      )
      continue
    }
    if (
      !file.startsWith('/src/') ||
      file.includes('\\') ||
      posix.normalize(file) !== file
    ) {
      errors.push(
        `group ${groupId} code fence ${fence.index} has invalid file path ${JSON.stringify(file)}`,
      )
      continue
    }
    if (metadata.flags.has('hidden')) {
      errors.push(
        `group ${groupId} file ${file} cannot declare hidden; environments own hidden files`,
      )
    }

    const group = groups.get(groupId) ?? {
      id: groupId,
      environments: [],
      files: [],
    }
    const environment = metadata.values.get('env')
    if (environment) group.environments.push(environment)
    group.files.push({
      path: file,
      language: fence.language,
      source: fence.source,
      entry: metadata.flags.has('entry'),
      collapsed: metadata.flags.has('collapsed'),
      hidden: metadata.flags.has('hidden'),
      environment,
      fence: fence.index,
    })
    groups.set(groupId, group)
  }

  for (const group of groups.values()) {
    const environments = new Set(group.environments)
    if (group.environments.length !== 1) {
      errors.push(
        `group ${group.id} must declare env=<name> on exactly one fence`,
      )
    }
    const environment = group.environments[0]
    const environmentContract = documentationEnvironments.get(environment)
    if (environment && !environmentContract) {
      errors.push(
        `group ${group.id} uses unknown documentation environment ${JSON.stringify(environment)}`,
      )
    }
    if (environments.size > 1) {
      errors.push(`group ${group.id} declares conflicting environments`)
    }
    group.env = environment
    delete group.environments

    const paths = new Set()
    for (const file of group.files) {
      if (paths.has(file.path)) {
        errors.push(`group ${group.id} repeats file ${file.path}`)
      }
      paths.add(file.path)
    }
    const entries = group.files.filter((file) => file.entry)
    if (entries.length !== 1) {
      errors.push(`group ${group.id} must declare exactly one entry file`)
    } else if (entries[0].collapsed || entries[0].hidden) {
      errors.push(`group ${group.id} entry file must be visible`)
    } else if (!environment) {
      // The missing environment is already reported above.
    } else if (entries[0].environment !== environment) {
      errors.push(`group ${group.id} must declare env=<name> on its entry file`)
    }

    if (environmentContract) {
      for (const file of group.files) {
        const extension = posix.extname(file.path)
        if (!environmentContract.fileExtensions.has(extension)) {
          errors.push(
            `group ${group.id} file ${file.path} is not supported by env=${environment}`,
          )
        }
        for (const specifier of importedModuleSpecifiers(
          file.source,
          file.path,
        )) {
          if (specifier.startsWith('.')) {
            const target = posix.resolve(posix.dirname(file.path), specifier)
            if (target !== '/src' && !target.startsWith('/src/')) {
              errors.push(
                `group ${group.id} file ${file.path} imports ${JSON.stringify(specifier)} outside /src`,
              )
            }
            continue
          }
          if (specifier.startsWith('/')) {
            errors.push(
              `group ${group.id} file ${file.path} must use relative imports for project files, not ${JSON.stringify(specifier)}`,
            )
            continue
          }
          const dependency = packageNameFromSpecifier(specifier)
          if (!environmentContract.dependencies.has(dependency)) {
            errors.push(
              `group ${group.id} file ${file.path} imports ${JSON.stringify(specifier)}, which env=${environment} does not provide`,
            )
          }
        }
      }
      if (
        entries.length === 1 &&
        !environmentContract.entryExtensions.has(posix.extname(entries[0].path))
      ) {
        errors.push(
          `group ${group.id} entry ${entries[0].path} must use ${formatAllowedExtensions(environmentContract.entryExtensions)} for env=${environment}`,
        )
      }
    }
  }

  return { groups: [...groups.values()], errors }
}

function parseCodeFenceMetadata(meta) {
  const valueKeys = new Set(['group', 'env', 'file'])
  const flagKeys = new Set(['entry', 'collapsed', 'hidden'])
  const values = new Map()
  const flags = new Set()
  const duplicates = []
  const unknown = []
  for (const token of meta.trim().split(/\s+/).filter(Boolean)) {
    const separator = token.indexOf('=')
    if (separator === -1) {
      if (flags.has(token)) duplicates.push(token)
      if (!flagKeys.has(token)) unknown.push(token)
      flags.add(token)
      continue
    }
    const key = token.slice(0, separator)
    const value = token.slice(separator + 1)
    if (values.has(key)) duplicates.push(key)
    if (!valueKeys.has(key)) unknown.push(key)
    values.set(key, value)
  }
  return { values, flags, duplicates, unknown }
}

function importedModuleSpecifiers(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') || filename.endsWith('.tsrx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )
  const specifiers = new Set()

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.add(node.moduleReference.expression.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(file)
  return specifiers
}

function packageNameFromSpecifier(specifier) {
  const segments = specifier.split('/')
  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0]
}

function formatAllowedExtensions(extensions) {
  return [...extensions].join(' or ')
}

function hasDefaultExport(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') || filename.endsWith('.tsrx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )
  return file.statements.some((statement) => {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      return true
    }
    if (
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
      )
    ) {
      return true
    }
    return (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some(
        (element) => element.name.text === 'default',
      )
    )
  })
}

export function markdownHeadingAnchors(source) {
  const anchors = new Set()
  const counts = new Map()
  const withoutCode = source.replace(/```[\s\S]*?```/g, '')

  for (const match of withoutCode.matchAll(/^#{2,6}\s+(.+?)\s*#*\s*$/gm)) {
    const heading = match[1]
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[`*_~]/g, '')
      .trim()
      .toLowerCase()
    const base = heading
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
      .replace(/\s+/g, '-')
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    anchors.add(count === 0 ? base : `${base}-${count}`)
  }

  return anchors
}

function validateStandaloneExamples(repositoryRoot, sources, failures) {
  const examples = []
  const seen = new Set()

  for (const [path, source] of sources) {
    for (const example of documentedStandaloneExamples(source)) {
      if (seen.has(example.id)) {
        failures.push(
          `Standalone documentation example ID is duplicated: ${example.id}`,
        )
        continue
      }
      seen.add(example.id)
      examples.push({ ...example, path })
    }
  }

  for (const example of examples.filter(({ mode }) => mode === 'octane')) {
    for (const mode of ['client', 'server']) {
      const compiled = compileOctane(
        example.source,
        `/docs-examples/${example.id}.tsrx`,
        { mode, dev: false, hmr: false },
      )
      for (const diagnostic of compiled.diagnostics) {
        failures.push(
          `${example.path} standalone example ${example.id} failed Octane ${mode} compilation: ${diagnostic.message}`,
        )
      }
    }
  }

  const virtualSources = new Map()
  const virtualOrigins = new Map()
  for (const example of examples.filter(({ mode }) => mode === 'typecheck')) {
    const extension = example.language === 'tsx' ? '.tsx' : '.ts'
    const filename = resolve(
      repositoryRoot,
      'docs',
      '.typecheck',
      `${example.id}${extension}`,
    )
    virtualSources.set(filename, example.source)
    virtualOrigins.set(filename, `${example.path}#${example.id}`)
  }

  if (virtualSources.size > 0) {
    const options = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      types: [],
      verbatimModuleSyntax: true,
    }
    const baseHost = ts.createCompilerHost(options)
    const host = {
      ...baseHost,
      directoryExists: (directory) =>
        [...virtualSources.keys()].some((filename) =>
          filename.startsWith(`${directory}${sep}`),
        ) || baseHost.directoryExists(directory),
      fileExists: (filename) =>
        virtualSources.has(filename) || baseHost.fileExists(filename),
      getDirectories: (directory) => {
        const directories = new Set(baseHost.getDirectories(directory))
        for (const filename of virtualSources.keys()) {
          if (!filename.startsWith(`${directory}${sep}`)) continue
          const remainder = filename.slice(directory.length + 1)
          const child = remainder.split(sep)[0]
          if (child && child !== remainder) directories.add(child)
        }
        return [...directories]
      },
      readFile: (filename) =>
        virtualSources.get(filename) ?? baseHost.readFile(filename),
      getSourceFile: (filename, languageVersion, onError, shouldCreate) => {
        const source = virtualSources.get(filename)
        if (source === undefined) {
          return baseHost.getSourceFile(
            filename,
            languageVersion,
            onError,
            shouldCreate,
          )
        }
        return ts.createSourceFile(
          filename,
          source,
          languageVersion,
          true,
          filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        )
      },
    }
    const program = ts.createProgram([...virtualSources.keys()], options, host)
    for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
      const filename = diagnostic.file?.fileName
      const origin = filename
        ? (virtualOrigins.get(filename) ??
          slash(relative(repositoryRoot, filename)))
        : 'documentation examples'
      const position =
        diagnostic.file && diagnostic.start !== undefined
          ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
          : null
      failures.push(
        `${origin}${position ? `:${position.line + 1}:${position.character + 1}` : ''} failed type checking: ${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n',
        )}`,
      )
    }
  }

  return examples.map(({ id, mode, path }) => ({ id, mode, path }))
}

export function validateExampleGroups(repositoryRoot, sources, failures) {
  const groups = []
  const seen = new Map()

  for (const [path, source] of sources) {
    for (const error of documentedExampleGroupErrors(source)) {
      failures.push(`${path} has invalid runnable example metadata: ${error}`)
    }
    for (const group of documentedExampleGroups(source)) {
      const previous = seen.get(group.id)
      if (previous && previous !== path) {
        failures.push(
          `Runnable documentation group ${group.id} is duplicated in ${previous} and ${path}`,
        )
        continue
      }
      seen.set(group.id, path)
      groups.push({ ...group, path })
    }
  }

  for (const group of groups) {
    if (!group.env || group.files.filter((file) => file.entry).length !== 1) {
      continue
    }
    const entry = group.files.find((file) => file.entry)
    const environment = documentationEnvironments.get(group.env)
    if (!environment) continue
    if (!hasDefaultExport(entry.source, entry.path)) {
      failures.push(
        `${group.path}#${group.id} entry ${entry.path} must default-export the value loaded by env=${group.env}`,
      )
    }
    if (environment.compiler === 'octane') {
      validateOctaneCompilation(group, failures)
    }
    validateExampleGroupTypes(repositoryRoot, group, environment, failures)
  }

  return groups.map(({ id, env, path, files }) => ({
    id,
    env,
    path,
    files: files.map((file) => file.path),
  }))
}

function validateOctaneCompilation(group, failures) {
  for (const file of group.files.filter(({ path }) => path.endsWith('.tsrx'))) {
    for (const mode of ['client', 'server']) {
      const compiled = compileOctane(file.source, file.path, {
        mode,
        dev: false,
        hmr: false,
      })
      for (const diagnostic of compiled.diagnostics) {
        failures.push(
          `${group.path}#${group.id}${file.path} failed Octane ${mode} compilation: ${diagnostic.message}`,
        )
      }
    }
  }
}

function validateExampleGroupTypes(
  repositoryRoot,
  group,
  environment,
  failures,
) {
  const groupRoot = resolve(
    repositoryRoot,
    'docs',
    '.typecheck',
    'groups',
    group.id,
  )
  const virtualSources = new Map()
  const virtualOrigins = new Map()
  const roots = []

  for (const file of group.files) {
    const semanticPath = semanticExamplePath(file.path)
    const filename = resolve(groupRoot, semanticPath.slice(1))
    if (virtualSources.has(filename)) {
      failures.push(
        `${group.path}#${group.id} files collide during semantic checking at ${semanticPath}`,
      )
      continue
    }
    virtualSources.set(filename, file.source)
    virtualOrigins.set(filename, `${group.path}#${group.id}${file.path}`)
    roots.push(filename)
  }

  const entry = group.files.find((file) => file.entry)
  const semanticEntryPath = semanticExamplePath(entry.path)
  const importPath = `.${semanticEntryPath.replace(/\.(?:ts|tsx)$/u, '')}`
  const bootstrapFilename = resolve(
    groupRoot,
    `__entry${environment.bootstrapExtension}`,
  )
  const bootstrapSource = documentationEnvironmentBootstrap(
    group.env,
    group.id,
    importPath,
  )
  virtualSources.set(bootstrapFilename, bootstrapSource)
  virtualOrigins.set(bootstrapFilename, `${group.path}#${group.id} bootstrap`)
  roots.push(bootstrapFilename)

  const isOctane = environment.compiler === 'octane'
  if (isOctane) {
    const jsxTypesFilename = resolve(groupRoot, '__octane-jsx.d.ts')
    virtualSources.set(
      jsxTypesFilename,
      `declare namespace JSX {\n  interface IntrinsicElements {\n    [name: string]: Record<string, unknown>\n  }\n}\n`,
    )
    virtualOrigins.set(
      jsxTypesFilename,
      `${group.path}#${group.id} Octane JSX environment`,
    )
    roots.push(jsxTypesFilename)
  }
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: isOctane ? ts.JsxEmit.Preserve : ts.JsxEmit.ReactJSX,
    types: [],
    verbatimModuleSyntax: true,
  }
  const baseHost = ts.createCompilerHost(options)
  const insideGroupRoot = (filename) =>
    filename === groupRoot || filename.startsWith(`${groupRoot}${sep}`)
  const virtualDirectoryExists = (directory) =>
    directory === groupRoot ||
    [...virtualSources.keys()].some((filename) =>
      filename.startsWith(`${directory}${sep}`),
    )
  const host = {
    ...baseHost,
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map((moduleName) => {
        if (
          isOctane &&
          moduleName.startsWith('.') &&
          moduleName.endsWith('.tsrx')
        ) {
          const resolvedFileName = resolve(
            dirname(containingFile),
            `${moduleName.slice(0, -5)}.tsx`,
          )
          if (virtualSources.has(resolvedFileName)) {
            return {
              resolvedFileName,
              extension: ts.Extension.Tsx,
              isExternalLibraryImport: false,
            }
          }
        }
        return ts.resolveModuleName(moduleName, containingFile, options, host)
          .resolvedModule
      }),
    directoryExists: (directory) =>
      insideGroupRoot(directory)
        ? virtualDirectoryExists(directory)
        : baseHost.directoryExists(directory),
    fileExists: (filename) =>
      insideGroupRoot(filename)
        ? virtualSources.has(filename)
        : baseHost.fileExists(filename),
    getDirectories: (directory) => {
      if (!insideGroupRoot(directory)) return baseHost.getDirectories(directory)
      const directories = new Set()
      for (const filename of virtualSources.keys()) {
        if (!filename.startsWith(`${directory}${sep}`)) continue
        const remainder = filename.slice(directory.length + 1)
        const child = remainder.split(sep)[0]
        if (child && child !== remainder) directories.add(child)
      }
      return [...directories]
    },
    readFile: (filename) =>
      virtualSources.get(filename) ??
      (insideGroupRoot(filename) ? undefined : baseHost.readFile(filename)),
    getSourceFile: (filename, languageVersion, onError, shouldCreate) => {
      const source = virtualSources.get(filename)
      if (source === undefined) {
        if (insideGroupRoot(filename)) return undefined
        return baseHost.getSourceFile(
          filename,
          languageVersion,
          onError,
          shouldCreate,
        )
      }
      return ts.createSourceFile(
        filename,
        source,
        languageVersion,
        true,
        filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      )
    },
  }
  const program = ts.createProgram(roots, options, host)
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const filename = diagnostic.file?.fileName
    const origin = filename
      ? (virtualOrigins.get(filename) ??
        slash(relative(repositoryRoot, filename)))
      : `${group.path}#${group.id}`
    const position =
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        : null
    failures.push(
      `${origin}${position ? `:${position.line + 1}:${position.character + 1}` : ''} failed type checking: ${ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      )}`,
    )
  }
}

function semanticExamplePath(path) {
  return path.endsWith('.tsrx') ? `${path.slice(0, -5)}.tsx` : path
}

async function readCatalogCases(repositoryRoot) {
  const casesRoot = resolve(repositoryRoot, 'benchmarks/conformance/cases')
  const entries = await readdir(casesRoot, { withFileTypes: true })
  const cases = new Set()
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const metadataPath = resolve(casesRoot, entry.name, 'case.json')
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      cases.add(metadata.id)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return cases
}

async function walkMarkdown(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) output.push(...(await walkMarkdown(path)))
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(path)
  }
  return output.sort()
}

function visitNavigationNodes(nodes, paths) {
  for (const node of nodes ?? []) {
    if (
      typeof node.to === 'string' &&
      !node.to.startsWith('http') &&
      !node.to.startsWith('/')
    ) {
      paths.push(node.to)
    }
    visitNavigationNodes(node.children, paths)
  }
}

function joinSources(sources, prefix) {
  return [...sources]
    .filter(([path]) => path.startsWith(prefix))
    .map(([, source]) => source)
    .join('\n')
}

function hasExportModifier(statement) {
  return statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  )
}

function maskCode(source) {
  return source.replace(/```[\s\S]*?```/g, '')
}

function markdownFenceMarker(line) {
  const match = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/)
  if (!match) return null
  return {
    character: match[1][0],
    length: match[1].length,
    suffix: line.slice(match[0].length),
  }
}

function markdownHeading(line) {
  const match = line.match(/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/)
  if (!match) return null
  return {
    level: match[1].length,
    text: match[2].trim(),
  }
}

function isNameOnlyApiSection(path, heading) {
  return (
    heading.level === 2 &&
    ((path === 'reference/index.md' && heading.text === 'Import map') ||
      (path === 'reference/types.md' &&
        heading.text === 'Capability-specific types'))
  )
}

function updateMarkdownFence(fence, marker) {
  if (!marker) return fence
  if (fence === null) {
    return {
      character: marker.character,
      length: marker.length,
    }
  }
  if (
    marker.character === fence.character &&
    marker.length >= fence.length &&
    marker.suffix.trim() === ''
  ) {
    return null
  }
  return fence
}

function typedCodeFences(source) {
  return codeFences(source)
    .filter(({ language }) =>
      ['ts', 'tsx', 'tsrx', 'js', 'jsx', 'typescript', 'javascript'].includes(
        language,
      ),
    )
    .map(({ source }) => source)
}

function codeFences(source) {
  const fences = []
  const lines = source.match(/[^\r\n]*(?:\r\n|\n|$)/g) ?? []
  let offset = 0
  let open = null

  for (const rawLine of lines) {
    if (!rawLine) continue
    const line = rawLine.replace(/\r?\n$/u, '')
    if (!open) {
      const match = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/u)
      if (match) {
        const marker = match[2]
        const info = match[3].trim()
        if (marker[0] !== '`' || !info.includes('`')) {
          const separator = info.search(/[ \t]/u)
          open = {
            start: offset,
            indent: match[1].length,
            marker: marker[0],
            length: marker.length,
            language: separator === -1 ? info : info.slice(0, separator),
            meta: separator === -1 ? '' : info.slice(separator).trim(),
            content: [],
          }
        }
      }
    } else {
      const closing = line.match(/^( {0,3})(`+|~+)[ \t]*$/u)
      if (
        closing &&
        closing[2][0] === open.marker &&
        closing[2].length >= open.length
      ) {
        fences.push({
          index: fences.length + 1,
          start: open.start,
          language: open.language,
          meta: open.meta,
          source: open.content.join(''),
        })
        open = null
      } else {
        open.content.push(stripFenceIndent(rawLine, open.indent))
      }
    }
    offset += rawLine.length
  }

  if (open) {
    fences.push({
      index: fences.length + 1,
      start: open.start,
      language: open.language,
      meta: open.meta,
      source: open.content.join(''),
    })
  }
  return fences
}

function stripFenceIndent(line, indent) {
  let removed = 0
  while (removed < indent && line[removed] === ' ') removed += 1
  return line.slice(removed)
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function slash(path) {
  return path.split(sep).join('/')
}
