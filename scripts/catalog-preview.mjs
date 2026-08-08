import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import {
  catalogPreviewHeight,
  catalogPreviewWidth,
} from './catalog-artifact.mjs'

const chartAssetThemes = {
  dark: {
    background: '#071219',
    foreground: '#d9edf1',
    muted: '#91a9b4',
    grid: '#d9edf1',
    gridOpacity: '0.13',
    axisOpacity: '0.28',
    textOpacity: '0.62',
    series: ['#61e8ff', '#ff806f', '#b9f227', '#c4a7ff', '#ffd85e', '#91a9b4'],
  },
  light: {
    background: '#ffffff',
    foreground: '#071219',
    muted: '#667c87',
    grid: '#071219',
    gridOpacity: '0.1',
    axisOpacity: '0.32',
    textOpacity: '0.6',
    series: ['#2497bd', '#e46244', '#39a84b', '#805ad5', '#e69a16', '#667c87'],
  },
}

export async function createCatalogPreviews(cases, rootDirectory) {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'error',
    root: rootDirectory,
    server: {
      hmr: false,
      middlewareMode: true,
      watch: null,
      ws: false,
    },
  })
  const previews = new Map()

  try {
    for (const { metadata } of [...cases].sort(
      (left, right) => left.metadata.order - right.metadata.order,
    )) {
      const modulePath = `/packages/react-charts-catalog/src/cases/${metadata.id}.ts`
      const loaded = await server.ssrLoadModule(modulePath)
      assert(
        typeof loaded.default === 'function',
        `invalid catalog preview component ${metadata.id}`,
      )

      const html = renderToStaticMarkup(
        createElement(loaded.default, {
          aspectRatio: catalogPreviewWidth / catalogPreviewHeight,
          idPrefix: `charts-landing-gallery-${metadata.id}`,
          initialWidth: catalogPreviewWidth,
          interactive: false,
          preview: true,
        }),
      )
      previews.set(
        metadata.id,
        Buffer.from(
          themeCatalogPreviewSvg(extractCatalogPreviewSvg(html, metadata.id)),
        ),
      )
    }
  } finally {
    await server.close()
  }

  return previews
}

export function extractCatalogPreviewSvg(html, caseId) {
  const start = html.indexOf('<svg')
  const end = html.indexOf('</svg>', start)
  assert(
    start !== -1 && end !== -1,
    `catalog case did not render an SVG: ${caseId}`,
  )

  const svg = html.slice(start, end + '</svg>'.length)
  validateCatalogPreviewSvg(svg, caseId, false)
  return svg
}

export function themeCatalogPreviewSvg(svg) {
  const namespacedSvg = svg.startsWith('<svg xmlns=')
    ? svg
    : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const rootEnd = namespacedSvg.indexOf('>')
  assert(rootEnd !== -1, 'catalog preview has an invalid SVG root')
  const styles = `<style>.ts-chart__legend{display:none}.ts-chart text{font-size:9px}${themeCss(chartAssetThemes.light)}@media(prefers-color-scheme:dark){${themeCss(chartAssetThemes.dark)}}</style>`
  const themed = `${namespacedSvg.slice(0, rootEnd + 1)}${styles}${namespacedSvg.slice(rootEnd + 1)}`
  validateCatalogPreviewSvg(themed, 'themed preview')
  return themed
}

export function validateCatalogPreviewSvg(svg, caseId, requireTheme = true) {
  assert(typeof svg === 'string', `catalog preview ${caseId} must be text`)
  assert(
    svg.startsWith('<svg') && svg.endsWith('</svg>'),
    `catalog preview ${caseId} must contain one SVG root`,
  )
  assert(
    svg.includes('class="ts-chart"'),
    `catalog preview ${caseId} did not render a chart SVG`,
  )
  assert(
    svg.includes(
      `viewBox="0 0 ${catalogPreviewWidth} ${catalogPreviewHeight}"`,
    ),
    `catalog preview ${caseId} has invalid dimensions`,
  )
  if (requireTheme) {
    assert(
      svg.includes('xmlns="http://www.w3.org/2000/svg"') &&
        svg.includes('<style>') &&
        svg.includes('@media(prefers-color-scheme:dark)'),
      `catalog preview ${caseId} is missing its portable theme`,
    )
  }
}

function themeCss(theme) {
  const variables = [
    `--ts-chart-background:${theme.background}`,
    `--ts-chart-foreground:${theme.foreground}`,
    `--ts-chart-muted:${theme.muted}`,
    ...theme.series.map((color, index) => `--ts-chart-${index + 1}:${color}`),
  ].join(';')

  return `:root{${variables};color:${theme.foreground}}.ts-chart__grid{stroke:${theme.grid};stroke-opacity:${theme.gridOpacity}}.ts-chart__axes line,.ts-chart__axes path{stroke:${theme.foreground};stroke-opacity:${theme.axisOpacity}}.ts-chart__axes text{fill:${theme.foreground};fill-opacity:${theme.textOpacity}}`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
