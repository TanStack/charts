import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCatalogCases } from './catalog-index.mjs'

export const catalogPreviewWidth = 288
export const catalogPreviewHeight = 192

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const previewsDirectory = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'previews',
)
const manifestPath = path.join(previewsDirectory, 'manifest.json')
const manifestSchemaVersion = 1
const sourceRoots = [
  'benchmarks/conformance/cases',
  'benchmarks/conformance/shared',
  'examples/conformance/src',
  'packages/charts-core/src',
  'packages/charts-demo-data/src',
  'packages/react-charts/src',
]
const sourceFiles = [
  'benchmarks/conformance/catalog-loader.ts',
  'benchmarks/conformance/catalog.ts',
  'benchmarks/conformance/metadata.ts',
  'benchmarks/conformance/native-catalog.ts',
  'benchmarks/conformance/types.ts',
  'examples/conformance/index.html',
  'examples/conformance/package.json',
  'examples/conformance/vite.config.ts',
  'package.json',
  'packages/charts-core/package.json',
  'packages/charts-demo-data/package.json',
  'packages/react-charts/package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/catalog-index.mjs',
  'scripts/catalog-preview.mjs',
  'tsconfig.json',
]
const lightTheme = {
  foreground: '#172033',
  panel: '#ffffff',
  panelMuted: '#f7f8fb',
  border: '#dce1ea',
  muted: '#697386',
  accent: '#2563eb',
  accentMuted: '#e9f0ff',
  series: ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'],
}
const darkTheme = {
  foreground: '#edf2fb',
  panel: '#151a24',
  panelMuted: '#10151e',
  border: '#2b3342',
  muted: '#9aa6b9',
  accent: '#6ea8fe',
  accentMuted: '#172746',
  series: ['#6ea8fe', '#ff9b65', '#4fd1a1', '#ae8cff', '#f679bc', '#4fd4e7'],
}
const themePaintAttributes = new Set([
  'color',
  'fill',
  'flood-color',
  'stop-color',
  'stroke',
])
export const catalogGuidePreviewCaseIds = [
  '115-definition-motion',
  '118-token-usage-calendar',
  '80-echarts-axis-pointer',
  'bar-horizontal-ranking',
]
export const catalogLegendPreviewCaseIds = ['81-recharts-interactive-legend']
export const catalogMarginPreviewCaseIds = [
  '115-definition-motion',
  '118-token-usage-calendar',
  '80-echarts-axis-pointer',
  '81-recharts-interactive-legend',
  '88-echarts-free-cursor',
  'bar-horizontal-ranking',
]
export const catalogTextPreviewCaseIds = [
  '02-multi-line-end-labels',
  '30-slopegraph',
  '36-hierarchy-tree',
  '58-select-extrema',
  '59-grouped-reducer-bars',
  '80-echarts-axis-pointer',
  '81-recharts-interactive-legend',
  '88-echarts-free-cursor',
  '93-labeled-pie',
  '94-center-donut',
  '98-needle-gauge',
  '115-definition-motion',
  '117-focus-cursor-motion',
  '118-token-usage-calendar',
  '119-stacked-bar-band-cursor',
  'bar-horizontal-ranking',
  'heatmap-labeled',
]
const guidePreviewCaseIdSet = new Set(catalogGuidePreviewCaseIds)
const legendPreviewCaseIdSet = new Set(catalogLegendPreviewCaseIds)
const textPreviewCaseIdSet = new Set(catalogTextPreviewCaseIds)

export async function writeCatalogPreviews() {
  const cases = await orderedCatalogCases()
  const sourceHash = await createCatalogPreviewSourceHash()
  const { JSDOM } = await import('jsdom')
  const { createServer } = await import('vite')
  const { chromium } = await import('playwright')
  const server = await createServer({
    configFile: path.join(
      rootDirectory,
      'examples',
      'conformance',
      'vite.config.ts',
    ),
    logLevel: 'error',
    root: path.join(rootDirectory, 'examples', 'conformance'),
    server: {
      host: '127.0.0.1',
      hmr: false,
      port: 0,
      strictPort: false,
    },
  })
  let browser

  try {
    await server.listen()
    const origin = server.resolvedUrls?.local[0]
    assert(origin, 'catalog preview server did not publish a local URL')
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      colorScheme: 'light',
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      viewport: {
        width: catalogPreviewWidth,
        height: catalogPreviewHeight,
      },
    })
    const assets = []
    await fs.mkdir(previewsDirectory, { recursive: true })

    for (const entry of cases) {
      const lightSvg = await renderCatalogPreviewVariant(
        context,
        origin,
        entry,
        'light',
      )
      const darkSvg = await renderCatalogPreviewVariant(
        context,
        origin,
        entry,
        'dark',
      )
      const portableSvg = createPortableCatalogPreviewSvg(
        lightSvg,
        darkSvg,
        entry.id,
        JSDOM,
      )
      validateCatalogPreviewXml(portableSvg, entry.id, JSDOM)
      const assetPath = path.join(previewsDirectory, `${entry.id}.svg`)
      await fs.writeFile(assetPath, portableSvg, 'utf8')
      assets.push(assetRecord(entry.id, portableSvg))
    }

    await fs.writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: manifestSchemaVersion,
          width: catalogPreviewWidth,
          height: catalogPreviewHeight,
          sourceHash,
          assets,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    await removeStalePreviewAssets(new Set(cases.map((entry) => entry.id)))
    console.log(`Generated ${assets.length} source-derived catalog previews.`)
  } finally {
    await browser?.close()
    await server.close()
  }
}

export async function checkCatalogPreviews() {
  const cases = await orderedCatalogCases()
  const { JSDOM } = await import('jsdom')
  const expectedIds = cases.map((entry) => entry.id)
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  validateManifest(manifest, expectedIds)

  const currentSourceHash = await createCatalogPreviewSourceHash()
  assert(
    manifest.sourceHash === currentSourceHash,
    'catalog preview sources changed; run pnpm catalog:previews',
  )

  const assetNames = (await fs.readdir(previewsDirectory))
    .filter((name) => name.endsWith('.svg'))
    .sort()
  const expectedNames = expectedIds.map((id) => `${id}.svg`).sort()
  assert(
    JSON.stringify(assetNames) === JSON.stringify(expectedNames),
    'catalog preview asset coverage does not match catalog-index.json',
  )

  for (const asset of manifest.assets) {
    const source = await fs.readFile(
      path.join(previewsDirectory, `${asset.id}.svg`),
      'utf8',
    )
    validateCatalogPreviewSvg(source, asset.id)
    validateCatalogPreviewXml(source, asset.id, JSDOM)
    validateCatalogPreviewPresentation(source, asset.id)
    const actual = assetRecord(asset.id, source)
    assert(
      actual.sha256 === asset.sha256 && actual.bytes === asset.bytes,
      `catalog preview ${asset.id} does not match manifest.json`,
    )
  }

  console.log(`Validated ${manifest.assets.length} catalog previews.`)
}

export function createPortableCatalogPreviewSvg(
  lightSvg,
  darkSvg,
  caseId,
  JSDOM,
) {
  validateCatalogPreviewSvg(lightSvg, caseId, false)
  validateCatalogPreviewSvg(darkSvg, caseId, false)
  const lightDocument = parseCatalogPreviewXml(lightSvg, caseId, JSDOM)
  const darkDocument = parseCatalogPreviewXml(darkSvg, caseId, JSDOM)

  try {
    const lightRoot = lightDocument.window.document.documentElement
    const darkRoot = darkDocument.window.document.documentElement
    const paints = applyThemePaints(lightRoot, darkRoot, caseId)
    lightRoot.insertAdjacentHTML('afterbegin', portableThemeStyle(paints))
    const result = `${lightRoot.outerHTML}\n`
    validateCatalogPreviewSvg(result, caseId)
    validateCatalogPreviewPresentation(result, caseId)
    return result
  } finally {
    lightDocument.window.close()
    darkDocument.window.close()
  }
}

export function validateCatalogPreviewSvg(
  svg,
  caseId,
  requirePortableTheme = true,
) {
  assert(typeof svg === 'string', `catalog preview ${caseId} must be text`)
  const trimmed = svg.trim()
  assert(
    trimmed.startsWith('<svg') && trimmed.endsWith('</svg>'),
    `catalog preview ${caseId} must contain one SVG root`,
  )
  assert(
    trimmed.includes('class="ts-chart"'),
    `catalog preview ${caseId} did not render a TanStack chart SVG`,
  )
  assert(
    trimmed.includes(
      `viewBox="0 0 ${catalogPreviewWidth} ${catalogPreviewHeight}"`,
    ),
    `catalog preview ${caseId} must use a ${catalogPreviewWidth}×${catalogPreviewHeight} viewBox`,
  )
  if (requirePortableTheme) {
    assert(
      trimmed.includes('xmlns="http://www.w3.org/2000/svg"') &&
        trimmed.includes('data-tanstack-catalog-preview-theme=""'),
      `catalog preview ${caseId} is missing its portable catalog theme`,
    )
    assert(
      !trimmed.includes('background:'),
      `catalog preview ${caseId} must keep a transparent background`,
    )
  }
}

export function validateCatalogPreviewPresentation(svg, caseId) {
  if (!guidePreviewCaseIdSet.has(caseId)) {
    assert(
      !svg.includes('ts-chart__axes') && !svg.includes('ts-chart__grid'),
      `catalog preview ${caseId} must omit axes and grids`,
    )
  }
  if (!legendPreviewCaseIdSet.has(caseId)) {
    assert(
      !svg.includes('ts-chart__legend'),
      `catalog preview ${caseId} must omit its legend`,
    )
  }
  if (textPreviewCaseIdSet.has(caseId)) {
    assert(
      svg.includes('<text '),
      `catalog preview ${caseId} must retain its feature-defining text`,
    )
  } else {
    assert(
      !svg.includes('<text '),
      `catalog preview ${caseId} must omit non-defining text`,
    )
  }
  if (caseId === 'heatmap-labeled') {
    assert(
      svg.includes('ts-chart__text'),
      'catalog preview heatmap-labeled must retain its rating labels',
    )
  }
  if (caseId === '89-brush-range-selection') {
    assert(
      svg.includes('data-chart-brush-selection') &&
        svg.includes('data-chart-brush-handle="start"') &&
        svg.includes('data-chart-brush-handle="end"'),
      'catalog preview 89-brush-range-selection must retain its native brush selection and handles',
    )
  }
  if (caseId === '82-chart-table-selection') {
    assert(
      svg.includes('data-ts-key="selected-observation"') &&
        svg.includes('fill="#f97316"'),
      'catalog preview 82-chart-table-selection must retain its native selected point',
    )
  }
  if (caseId === '34-pointer-tooltip') {
    assert(
      svg.includes('data-ts-key="apple-points') && svg.includes('r="7"'),
      'catalog preview 34-pointer-tooltip must retain its native focused source point',
    )
  }
  if (caseId === '35-grouped-tooltip') {
    assert(
      svg.includes('data-ts-key="focus-date-band') &&
        svg.includes('data-ts-key="grouped-points') &&
        svg.includes('r="5"'),
      'catalog preview 35-grouped-tooltip must retain its native grouped focus band and points',
    )
  }
  if (caseId === '65-voronoi-nearest-tooltip') {
    assert(
      svg.includes('data-ts-key="nearest-cells') &&
        svg.includes('data-ts-key="voronoi-points') &&
        svg.includes('r="7"'),
      'catalog preview 65-voronoi-nearest-tooltip must retain its native Voronoi cells and focused source point',
    )
  }
  if (caseId === '83-focus-context-window') {
    assert(
      svg.includes('data-tanstack-catalog-preview-surfaces') &&
        countOccurrences(svg, 'class="ts-chart') >= 3 &&
        svg.includes('data-chart-brush-selection'),
      'catalog preview 83-focus-context-window must retain its real detail, overview, and brush selection',
    )
  }
  if (caseId === '84-pinned-nested-chart-tooltip') {
    assert(
      svg.includes('data-tanstack-catalog-preview-surfaces') &&
        countOccurrences(svg, 'class="ts-chart') >= 3 &&
        svg.includes('data-ts-key="consumption-breakdown"') &&
        svg.includes('data-ts-key="focused-month-guide"'),
      'catalog preview 84-pinned-nested-chart-tooltip must retain its focused parent and real nested chart',
    )
  }
  if (caseId === '80-echarts-axis-pointer') {
    assert(
      svg.includes('axis-pointer-guide:x-rule'),
      'catalog preview 80-echarts-axis-pointer must retain its native focused axis pointer',
    )
  }
  if (caseId === '81-recharts-interactive-legend') {
    assert(
      svg.includes('ts-chart__legend') &&
        svg.includes('Manufacturing') &&
        svg.includes('Construction'),
      'catalog preview 81-recharts-interactive-legend must retain its real source legend',
    )
  }
  if (caseId === '87-echarts-synchronized-cursors') {
    assert(
      svg.includes('current-guide:x-rule') &&
        svg.includes('previous-guide:x-rule'),
      'catalog preview 87-echarts-synchronized-cursors must retain both synchronized native focus guides',
    )
  }
  if (caseId === '88-echarts-free-cursor') {
    assert(
      svg.includes('ts-chart__continuous-cursor-x-rule') &&
        svg.includes('ts-chart__continuous-cursor-y-rule') &&
        svg.includes('ts-chart__continuous-cursor-marker') &&
        svg.includes('ts-chart__continuous-cursor-x-label-text') &&
        svg.includes('ts-chart__continuous-cursor-y-label-text'),
      'catalog preview 88-echarts-free-cursor must retain its native two-dimensional cursor',
    )
  }
  if (caseId === '117-focus-cursor-motion') {
    assert(
      svg.includes('focus-motion-crosshair:x-rule') &&
        svg.includes('focus-motion-crosshair:marker') &&
        svg.includes('focus-motion-crosshair:x-label:text') &&
        svg.includes('focus-motion-crosshair:y-label:text'),
      'catalog preview 117-focus-cursor-motion must retain its native focused crosshair, marker, and labels',
    )
  }
  if (caseId === '119-stacked-bar-band-cursor') {
    assert(
      svg.includes('stacked-cursor-band:x-band') &&
        svg.includes('stacked-cursor-rule:y-rule') &&
        svg.includes('stacked-cursor-band:x-label:text') &&
        svg.includes('stacked-cursor-rule:y-label:text'),
      'catalog preview 119-stacked-bar-band-cursor must retain its native band, rule, and cursor labels',
    )
  }
  if (caseId === '91-timeline-playback-scrubber') {
    assert(
      svg.includes('data-chart-handle-role="rule"') &&
        svg.includes('data-chart-handle-role="track"') &&
        svg.includes('data-chart-handle-role="handle"'),
      'catalog preview 91-timeline-playback-scrubber must retain its native rule, track, and handle',
    )
  }
  if (caseId === '92-editable-event-range') {
    assert(
      svg.includes('data-chart-handle-role="track"') &&
        svg.includes('data-chart-handle-role="handle"'),
      'catalog preview 92-editable-event-range must retain its native edit track and handle',
    )
  }
  if (caseId === '109-us-state-choropleth') {
    assert(
      countOccurrences(svg, '<path ') === 3141,
      'catalog preview 109-us-state-choropleth must retain all 3,141 source county paths',
    )
  }
  if (caseId === '110-projection-gallery') {
    assert(
      countOccurrences(svg, '<path ') === 8,
      'catalog preview 110-projection-gallery must retain all four source projection facets',
    )
  }
  if (caseId === '90-zoomable-time-window') {
    assert(
      countOccurrences(svg, 'data-ts-key="zoom-series-points:') === 6,
      'catalog preview 90-zoomable-time-window must retain the canonical six-point cropped source window',
    )
  }
  if (caseId === '118-token-usage-calendar') {
    assert(
      countOccurrences(svg, 'data-ts-key="rect-0:') === 364 &&
        countOccurrences(svg, 'data-ts-key="x-tick-label:') === 12,
      'catalog preview 118-token-usage-calendar must retain all source cells and twelve month labels',
    )
  }
}

export function validateCatalogPreviewXml(svg, caseId, JSDOM) {
  let document
  try {
    document = parseCatalogPreviewXml(svg, caseId, JSDOM)
  } catch (error) {
    throw new Error(`catalog preview ${caseId} is not valid XML`, {
      cause: error,
    })
  } finally {
    document?.window.close()
  }
}

export async function createCatalogPreviewSourceHash() {
  const files = [...sourceFiles]
  for (const sourceRoot of sourceRoots) {
    files.push(...(await recursiveFiles(sourceRoot)))
  }
  files.sort()

  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file)
    hash.update('\0')
    hash.update(
      catalogPreviewSourceHashInput(
        file,
        await fs.readFile(path.join(rootDirectory, file)),
      ),
    )
    hash.update('\0')
  }
  return hash.digest('hex')
}

export function catalogPreviewSourceHashInput(file, contents) {
  if (path.basename(file) !== 'package.json') return contents

  const manifest = JSON.parse(contents.toString('utf8'))
  delete manifest.version
  return JSON.stringify(manifest)
}

function portableThemeStyle(paints) {
  return `<style data-tanstack-catalog-preview-theme="">:root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${lightTheme.foreground};${themeVariables(lightTheme)}${themePaintVariables(paints, 'light')}}@media(prefers-color-scheme:dark){:root{color-scheme:dark;color:${darkTheme.foreground};${themeVariables(darkTheme)}${themePaintVariables(paints, 'dark')}}}</style>`
}

function themeVariables(theme) {
  return `--panel:${theme.panel};--panel-muted:${theme.panelMuted};--border:${theme.border};--muted:${theme.muted};--accent:${theme.accent};--accent-muted:${theme.accentMuted};${theme.series.map((color, index) => `--ts-chart-${index + 1}:${color};`).join('')}`
}

function themePaintVariables(paints, theme) {
  return paints
    .map(
      (paint, index) => `--ts-catalog-preview-paint-${index}:${paint[theme]};`,
    )
    .join('')
}

function applyThemePaints(lightRoot, darkRoot, caseId) {
  const paints = []
  const paintIndexes = new Map()
  compareThemeNodes(lightRoot, darkRoot, caseId, paints, paintIndexes)
  return paints
}

function compareThemeNodes(lightNode, darkNode, caseId, paints, paintIndexes) {
  assert(
    lightNode.nodeType === darkNode.nodeType &&
      lightNode.nodeName === darkNode.nodeName,
    `catalog preview ${caseId} changed structure between light and dark themes`,
  )

  if (lightNode.nodeType === 1) {
    const lightAttributes = new Map(
      [...lightNode.attributes].map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
    )
    const darkAttributes = new Map(
      [...darkNode.attributes].map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
    )
    const attributeNames = [
      ...new Set([...lightAttributes.keys(), ...darkAttributes.keys()]),
    ].sort()

    for (const name of attributeNames) {
      const light = lightAttributes.get(name)
      const dark = darkAttributes.get(name)
      if (light === dark) continue
      assert(
        light !== undefined &&
          dark !== undefined &&
          themePaintAttributes.has(name),
        `catalog preview ${caseId} changed non-paint attribute ${name} between light and dark themes`,
      )
      const key = `${light}\0${dark}`
      let index = paintIndexes.get(key)
      if (index === undefined) {
        index = paints.length
        paintIndexes.set(key, index)
        paints.push({ light, dark })
      }
      lightNode.setAttribute(name, `var(--ts-catalog-preview-paint-${index})`)
    }
  } else {
    assert(
      lightNode.nodeValue === darkNode.nodeValue,
      `catalog preview ${caseId} changed text between light and dark themes`,
    )
  }

  assert(
    lightNode.childNodes.length === darkNode.childNodes.length,
    `catalog preview ${caseId} changed structure between light and dark themes`,
  )
  for (let index = 0; index < lightNode.childNodes.length; index += 1) {
    compareThemeNodes(
      lightNode.childNodes[index],
      darkNode.childNodes[index],
      caseId,
      paints,
      paintIndexes,
    )
  }
}

function parseCatalogPreviewXml(svg, caseId, JSDOM) {
  const namespaced = svg.includes('xmlns="http://www.w3.org/2000/svg"')
    ? svg
    : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const document = new JSDOM(namespaced, { contentType: 'image/svg+xml' })
  try {
    assert(
      document.window.document.documentElement.localName === 'svg' &&
        document.window.document.documentElement.namespaceURI ===
          'http://www.w3.org/2000/svg',
      `catalog preview ${caseId} must contain an SVG XML document`,
    )
  } catch (error) {
    document.window.close()
    throw error
  }
  return document
}

async function renderCatalogPreviewVariant(context, origin, entry, theme) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  try {
    const url = new URL(`embed/${encodeURIComponent(entry.id)}/`, origin)
    url.searchParams.set('height', String(catalogPreviewHeight))
    url.searchParams.set('preview', '1')
    url.searchParams.set('revision', '0')
    url.searchParams.set('theme', theme)
    await page.goto(url.href, { waitUntil: 'networkidle' })
    await page.locator('svg.ts-chart').first().waitFor()
    await page.evaluate(async () => {
      await document.fonts?.ready
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
    })
    assert(
      errors.length === 0,
      `catalog preview ${entry.id} (${theme}) logged errors:\n${errors.join('\n')}`,
    )
    return await page.locator('svg.ts-chart').evaluateAll((allElements) => {
      const elements = allElements.filter((element) => {
        const bounds = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        )
      })
      const container = elements[0]?.closest('.embed-chart')
      if (!container) throw new Error('Catalog preview has no chart container')
      const containerBounds = container.getBoundingClientRect()
      const overflow = elements.flatMap((element) =>
        [...element.querySelectorAll('text')].flatMap((label) => {
          if (!label.textContent?.trim()) return []
          const style = getComputedStyle(label)
          if (style.display === 'none' || style.visibility === 'hidden')
            return []
          const bounds = label.getBoundingClientRect()
          const tolerance = 1
          return bounds.left < containerBounds.left - tolerance ||
            bounds.top < containerBounds.top - tolerance ||
            bounds.right > containerBounds.right + tolerance ||
            bounds.bottom > containerBounds.bottom + tolerance
            ? [
                `${label.textContent.trim()} (${Math.round(bounds.left - containerBounds.left)},${Math.round(bounds.top - containerBounds.top)} ${Math.round(bounds.width)}×${Math.round(bounds.height)})`,
              ]
            : []
        }),
      )
      if (overflow.length > 0) {
        throw new Error(
          `Catalog preview has clipped SVG labels:\n${overflow.join('\n')}`,
        )
      }

      function cloneSurface(element) {
        const source = element.cloneNode(true)
        const controls = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'g',
        )
        controls.setAttribute('data-tanstack-catalog-preview-controls', '')
        controls.setAttribute('aria-hidden', 'true')
        for (const overlay of element.parentElement?.querySelectorAll(
          ':scope > svg:not(.ts-chart)',
        ) ?? []) {
          const clone = overlay.cloneNode(true)
          clone
            .querySelectorAll(
              '.overlay, [data-chart-handle-surface], [style*="display: none"]',
            )
            .forEach((node) => node.remove())
          controls.append(...clone.childNodes)
        }
        if (controls.childNodes.length > 0) source.append(controls)
        return source
      }

      if (elements.length === 1) {
        return cloneSurface(elements[0]).outerHTML
      }

      const composed = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      composed.setAttribute('class', 'ts-chart')
      composed.setAttribute('width', '100%')
      composed.setAttribute('height', '100%')
      composed.setAttribute('viewBox', '0 0 288 192')
      composed.setAttribute('role', 'img')
      composed.setAttribute(
        'aria-label',
        container.closest('[aria-label]')?.getAttribute('aria-label') ??
          'Chart preview',
      )
      composed.setAttribute('data-tanstack-catalog-preview-surfaces', '')

      for (const element of elements) {
        const bounds = element.getBoundingClientRect()
        const source = cloneSurface(element)
        source.setAttribute('x', String(bounds.left - containerBounds.left))
        source.setAttribute('y', String(bounds.top - containerBounds.top))
        source.setAttribute('width', String(bounds.width))
        source.setAttribute('height', String(bounds.height))
        source.setAttribute('aria-hidden', 'true')
        composed.append(source)
      }
      return composed.outerHTML
    })
  } finally {
    await page.close()
  }
}

async function orderedCatalogCases() {
  return (await readCatalogCases())
    .map(({ metadata }) => metadata)
    .sort((left, right) => left.order - right.order)
}

function assetRecord(id, source) {
  return {
    id,
    sha256: createHash('sha256').update(source).digest('hex'),
    bytes: Buffer.byteLength(source),
  }
}

function validateManifest(manifest, expectedIds) {
  assert(
    manifest && typeof manifest === 'object' && !Array.isArray(manifest),
    'catalog preview manifest must contain an object',
  )
  assert(
    manifest.schemaVersion === manifestSchemaVersion &&
      manifest.width === catalogPreviewWidth &&
      manifest.height === catalogPreviewHeight &&
      typeof manifest.sourceHash === 'string' &&
      Array.isArray(manifest.assets),
    'catalog preview manifest has an invalid contract',
  )
  const actualIds = manifest.assets.map((asset) => asset.id)
  assert(
    JSON.stringify(actualIds) === JSON.stringify(expectedIds),
    'catalog preview manifest cases do not match catalog-index.json',
  )
  for (const asset of manifest.assets) {
    assert(
      asset &&
        typeof asset.id === 'string' &&
        /^[a-f0-9]{64}$/u.test(asset.sha256) &&
        Number.isSafeInteger(asset.bytes) &&
        asset.bytes > 0,
      `catalog preview manifest entry ${asset?.id ?? 'unknown'} is invalid`,
    )
  }
}

async function recursiveFiles(relativeDirectory) {
  const directory = path.join(rootDirectory, relativeDirectory)
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await recursiveFiles(relativePath)))
    } else if (entry.isFile()) {
      files.push(relativePath)
    }
  }
  return files
}

async function removeStalePreviewAssets(expectedIds) {
  for (const name of await fs.readdir(previewsDirectory)) {
    if (!name.endsWith('.svg')) continue
    const id = name.slice(0, -'.svg'.length)
    if (!expectedIds.has(id)) {
      await fs.unlink(path.join(previewsDirectory, name))
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function countOccurrences(source, search) {
  return source.split(search).length - 1
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const write = process.argv.includes('--write')
  const check = process.argv.includes('--check')
  assert(write !== check, 'Use exactly one of --write or --check')
  await (write ? writeCatalogPreviews() : checkCatalogPreviews())
}
