import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
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
import { extractMarkdownLinks } from './packed-markdown-links.mjs'

export const catalogOrigin = 'https://tanstack.com'
export const catalogBasePath = '/charts/catalog/'

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
  'packages/react-charts-catalog/README.md',
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
  const embeddedCases = new Map()
  const markdownSources = new Map()

  for (const file of markdownFiles) {
    const source = await readFile(file, 'utf8')
    const path = slash(relative(docsRoot, file))
    markdownSources.set(path, source)
    validateFrontmatter(path, source, failures)
    validatePublicLinks(path, source, failures)
    await validateMarkdownLinks(path, source, markdownFiles, docsRoot, failures)
    validateIframes(path, source, cases, embeddedCases, failures)
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
  const standaloneExamples = validateStandaloneExamples(
    repositoryRoot,
    publicSources,
    failures,
  )

  return {
    config,
    embeddedCases: [...embeddedCases.keys()].sort(),
    failures,
    markdownFiles: [...markdownSources.keys()].sort(),
    standaloneExamples,
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

export function parseHtmlAttributes(source) {
  const attributes = {}
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of source.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? ''
  }
  return attributes
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
  if (baseline.schemaVersion !== 3) {
    failures.push('comparison bundle baseline must use schema version 3')
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

function validateIframes(path, source, cases, embeddedCases, failures) {
  const iframePattern = /<iframe\b([^>]*)>/gi
  for (const match of source.matchAll(iframePattern)) {
    const attributes = parseHtmlAttributes(match[1])
    const title = attributes.title?.trim()
    if (!title)
      failures.push(`${path} has an iframe without a meaningful title`)
    if (attributes.loading !== 'lazy') {
      failures.push(`${path} iframe must use loading="lazy"`)
    }

    const style = attributes.style ?? ''
    if (!/width\s*:\s*100%/.test(style)) {
      failures.push(`${path} iframe must use width: 100%`)
    }
    if (!/border\s*:\s*0(?:[;\s]|$)/.test(style)) {
      failures.push(`${path} iframe must use border: 0`)
    }

    let url
    try {
      url = new URL(attributes.src)
    } catch {
      failures.push(
        `${path} iframe must use an absolute URL: ${attributes.src ?? ''}`,
      )
      continue
    }
    if (url.origin !== catalogOrigin) {
      failures.push(`${path} iframe must use ${catalogOrigin}: ${url.href}`)
      continue
    }

    const expectedPrefix = `${catalogBasePath}embed/`
    if (
      !url.pathname.startsWith(expectedPrefix) ||
      !url.pathname.endsWith('/')
    ) {
      failures.push(
        `${path} iframe does not use the catalog embed route: ${url.href}`,
      )
      continue
    }

    const caseId = decodeURIComponent(
      url.pathname.slice(expectedPrefix.length, -1),
    )
    if (!cases.has(caseId)) {
      failures.push(`${path} embeds an unknown catalog case: ${caseId}`)
    }
    const previous = embeddedCases.get(caseId)
    if (previous) {
      failures.push(
        `${path} duplicates catalog embed ${caseId} already used by ${previous}`,
      )
    } else {
      embeddedCases.set(caseId, path)
    }

    const theme = url.searchParams.get('theme')
    if (!['system', 'light', 'dark'].includes(theme)) {
      failures.push(`${path} iframe must declare theme=system|light|dark`)
    }
    const height = Number(url.searchParams.get('height'))
    if (!Number.isFinite(height) || height < 480 || height > 1_200) {
      failures.push(`${path} iframe height query must be between 480 and 1200`)
    } else if (!new RegExp(`height\\s*:\\s*${height}px`).test(style)) {
      failures.push(
        `${path} iframe CSS height must match its height query (${height}px)`,
      )
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
  const packages = [
    ['packages/charts-core', '@tanstack/charts'],
    ['packages/charts-scales', '@tanstack/charts-scales'],
    ['packages/preact-charts', '@tanstack/preact-charts'],
    ['packages/react-charts', '@tanstack/react-charts'],
    ['packages/react-native-charts', '@tanstack/react-native-charts'],
    ['packages/vue-charts', '@tanstack/vue-charts'],
    ['packages/solid-charts', '@tanstack/solid-charts'],
    ['packages/svelte-charts', '@tanstack/svelte-charts'],
    ['packages/angular-charts', '@tanstack/angular-charts'],
    ['packages/lit-charts', '@tanstack/lit-charts'],
    ['packages/alpine-charts', '@tanstack/alpine-charts'],
    ['packages/octane-charts', '@tanstack/octane-charts'],
  ]
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
      const source = await readFile(
        resolve(packageRoot, resolvedSourcePath),
        'utf8',
      )
      exportsBySpecifier.set(
        specifier,
        new Set(exportedNames(source, resolvedSourcePath)),
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
  const packages = [
    ['charts-core', '@tanstack/charts', 'reference/'],
    ['charts-scales', '@tanstack/charts-scales', 'reference/'],
    ['react-charts', '@tanstack/react-charts', 'framework/react/'],
    ['preact-charts', '@tanstack/preact-charts', 'framework/preact/'],
    ['vue-charts', '@tanstack/vue-charts', 'framework/vue/'],
    ['solid-charts', '@tanstack/solid-charts', 'framework/solid/'],
    ['svelte-charts', '@tanstack/svelte-charts', 'framework/svelte/'],
    ['angular-charts', '@tanstack/angular-charts', 'framework/angular/'],
    ['lit-charts', '@tanstack/lit-charts', 'framework/lit/'],
    ['alpine-charts', '@tanstack/alpine-charts', 'framework/alpine/'],
    ['octane-charts', '@tanstack/octane-charts', 'framework/octane/'],
  ]

  for (const [directory, packageName, referencePath] of packages) {
    const referenceSources = [...markdownSources].filter(([path]) =>
      path.startsWith(referencePath),
    )
    await validatePackageCoverage(
      resolve(repositoryRoot, 'packages', directory),
      packageName,
      joinSources(markdownSources, referencePath),
      referenceSources
        .map(([path, source]) => stripNameOnlyApiInventories(path, source))
        .join('\n'),
      failures,
    )
  }
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

  for (const [subpath, sourcePath] of Object.entries(manifest.exports)) {
    const specifier =
      subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`
    if (!reference.includes(specifier)) {
      failures.push(`API reference does not name package export ${specifier}`)
    }
    const resolvedSourcePath = resolveExportSource(sourcePath)
    const source = await readFile(
      resolve(packageRoot, resolvedSourcePath),
      'utf8',
    )
    for (const name of exportedNames(source, resolvedSourcePath))
      names.add(name)
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
  const pattern =
    /<!--\s*docs-example:\s*([a-z\d-]+)\s+(typecheck|octane)\s*-->\s*```(ts|tsx|typescript)\r?\n([\s\S]*?)```/g
  for (const match of source.matchAll(pattern)) {
    examples.push({
      id: match[1],
      mode: match[2],
      language: match[3],
      source: match[4],
    })
  }
  return examples
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
      fileExists: (filename) =>
        virtualSources.has(filename) || baseHost.fileExists(filename),
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
    if (typeof node.to === 'string') paths.push(node.to)
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
  return [
    ...source.matchAll(
      /```(?:ts|tsx|js|jsx|typescript|javascript)\r?\n([\s\S]*?)```/g,
    ),
  ].map((match) => match[1])
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
