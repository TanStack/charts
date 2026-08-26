import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const bundle = await build({
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  write: false,
  stdin: {
    contents: `
      import { scaleBand, scaleLinear } from 'd3-scale'
      import {
        createCanvasChartRenderer,
        mountCanvasChart,
      } from '@tanstack/charts/canvas'
      import { areaY } from '@tanstack/charts/area'
      import { areaX } from '@tanstack/charts/area-x'
      import { arrow } from '@tanstack/charts/arrow'
      import { barY } from '@tanstack/charts/bar'
      import { dot } from '@tanstack/charts/dot'
      import { renderChartImage } from '@tanstack/charts/export'
      import { facet } from '@tanstack/charts/facet'
      import { hexagon } from '@tanstack/charts/hexagon'
      import { lineY } from '@tanstack/charts/line'
      import { link } from '@tanstack/charts/link'
      import { mountChart } from '@tanstack/charts/dom'
      import { polar, radialDot, radialLine } from '@tanstack/charts/polar'
      import { rect } from '@tanstack/charts/rect'
      import { defineChart } from '@tanstack/charts/scene'
      import { text } from '@tanstack/charts/text'
      import { tickY } from '@tanstack/charts/tick'
      import { vector } from '@tanstack/charts/vector'
      import { tooltip } from '@tanstack/charts/tooltip'

      window.runCanvasRendererCheck = async () => {
        const container = document.querySelector('#surface')
        container.style.setProperty('--smoke-fill', '#00ff00')
        container.style.color = '#ff0000'
        const renderer = createCanvasChartRenderer()
        const surface = renderer.mount(container, () => {})
        const focusPoint = {
          key: 'focus',
          markId: 'dots',
          group: null,
          groupLabel: 'dots',
          datum: null,
          datumIndex: 0,
          xValue: 0,
          yValue: 0,
          x: 80,
          y: 45,
          color: '#7c3aed',
        }
        const makeScene = (width, height) => ({
          width,
          height,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          chart: { x: 0, y: 0, width, height },
          nodes: [
            {
              kind: 'rect',
              key: 'variable',
              x: 10,
              y: 10,
              width: 20,
              height: 20,
              style: { fill: 'var(--smoke-fill)' },
            },
            {
              kind: 'rect',
              key: 'current',
              x: 40,
              y: 10,
              width: 20,
              height: 20,
              style: { fill: 'currentColor' },
            },
            {
              kind: 'polyline',
              key: 'path',
              points: [],
              path: 'M10,70 C40,35 80,35 120,70',
              style: { fill: 'none', stroke: '#0000ff', strokeWidth: 4 },
            },
            {
              kind: 'rect',
              key: 'gradient',
              x: 70,
              y: 10,
              width: 40,
              height: 20,
              style: { fill: 'url(#smoke-gradient)' },
            },
            {
              kind: 'group',
              key: 'focus-layer',
              focus: {
                match: 'primary',
                points: [focusPoint],
                placement: 'over',
              },
              children: [
                {
                  kind: 'dot',
                  key: 'focus',
                  x: focusPoint.x,
                  y: focusPoint.y,
                  radius: 8,
                  style: { fill: focusPoint.color },
                },
              ],
            },
          ],
          points: [focusPoint],
          scales: {},
          colors: {
            type: 'ordinal',
            domain: [],
            range: [],
            map: () => '#2563eb',
          },
          gradients: [
            {
              id: 'smoke-gradient',
              x1: 0,
              y1: 0,
              x2: 1,
              y2: 0,
              stops: [
                { offset: 0, color: '#ffff00', opacity: 0.5 },
                { offset: 1, color: '#ff00ff' },
              ],
            },
          ],
          theme: {
            foreground: '#111111',
            muted: '#666666',
            grid: '#999999',
            background: 'transparent',
            palette: ['#2563eb'],
          },
        })
        surface.render(makeScene(160, 90), {
          ariaLabel: 'Canvas browser check',
          tabIndex: 0,
        })
        const ratio = window.devicePixelRatio
        const sceneCanvas = surface.canvas
        const focusCanvas = surface.focusCanvas
        const context = sceneCanvas.getContext('2d')
        const sample = (x, y) =>
          [...context.getImageData(x * ratio, y * ratio, 1, 1).data]
        const variableColor = sample(15, 15)
        const currentColor = sample(45, 15)
        const gradientStart = sample(75, 15)
        const gradientEnd = sample(105, 15)
        const pixels = context.getImageData(
          0,
          0,
          sceneCanvas.width,
          sceneCanvas.height,
        ).data
        let pathPixels = 0
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index] < 40 &&
            pixels[index + 1] < 40 &&
            pixels[index + 2] > 180 &&
            pixels[index + 3] > 0
          ) {
            pathPixels += 1
          }
        }
        const baseBeforeFocus = sceneCanvas.toDataURL()
        const focusBefore = focusCanvas.toDataURL()
        surface.paintFocus({
          primary: focusPoint,
          group: [focusPoint],
          source: 'programmatic',
          pinned: false,
        })
        const baseAfterFocus = sceneCanvas.toDataURL()
        const focusAfter = focusCanvas.toDataURL()
        const rootElement = surface.element
        surface.render(makeScene(200, 100), {
          ariaLabel: 'Resized Canvas browser check',
          tabIndex: 0,
        })
        const surfaceResult = {
          ratio,
          initialBacking: [160 * ratio, 90 * ratio],
          resizedBacking: [sceneCanvas.width, sceneCanvas.height],
          rootPreserved: surface.element === rootElement,
          variableColor,
          currentColor,
          gradientStart,
          gradientEnd,
          pathPixels,
          basePreservedOnFocus: baseBeforeFocus === baseAfterFocus,
          focusChanged: focusBefore !== focusAfter,
        }
        const exported = await renderChartImage(surface.element, {
          includeFocus: true,
          scale: 1,
        })
        surface.destroy()

        const data = [
          { id: 'a', x: 0, y: 1 },
          { id: 'b', x: 1, y: 2 },
        ]
        const focused = []
        const selected = []
        const interactionContainer = document.querySelector('#interaction')
        const host = mountCanvasChart(interactionContainer, {
          definition: defineChart({
            marks: [dot(data, { x: 'x', y: 'y', key: 'id' })],
            scales: {
              x: { scale: scaleLinear().domain([0, 1]) },
              y: { scale: scaleLinear().domain([0, 2]) },
            },

            tooltip,
            maxFocusDistance: 1000,
          }),
          width: 320,
          height: 180,
          ariaLabel: 'Interactive Canvas browser check',
          onFocusChange: (point) => focused.push(point?.datum?.id ?? null),
          onSelect: (point) => selected.push(point?.datum?.id ?? null),
        })
        const interactionSurface =
          interactionContainer.querySelector('.ts-chart-canvas')
        interactionSurface.focus()
        interactionSurface.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'ArrowRight',
          }),
        )
        interactionSurface.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
        )
        const tooltipVisible =
          !interactionContainer.querySelector('.ts-chart-tooltip')?.hidden
        host.destroy()

        const rows = [
          { id: 'a', category: 'A', x: 1, y: 3, low: 2, high: 4 },
          { id: 'b', category: 'B', x: 2, y: 7, low: 5, high: 8 },
          { id: 'c', category: 'C', x: 3, y: 5, low: 4, high: 6 },
        ]
        const cartesianScales = () => ({
          x: { scale: scaleLinear().domain([0, 4]), grid: true },
          y: { scale: scaleLinear().domain([0, 10]), grid: true },
        })
        const mixedDefinitions = [
          {
            id: 'composed',
            svgKey: 'bars',
            definition: defineChart(() => ({
              marks: [
                areaY(rows, {
                  id: 'area',
                  x: 'category',
                  y: 'y',
                  renderer,
                }),
                barY(rows, {
                  id: 'bars',
                  x: 'category',
                  y: 'y',
                  key: 'id',
                }),
                lineY(rows, {
                  id: 'line',
                  x: 'category',
                  y: 'high',
                  renderer,
                }),
                dot(rows, {
                  id: 'dots',
                  x: 'category',
                  y: 'y',
                  key: 'id',
                }),
              ],
              scales: {
                x: { scale: scaleBand().domain(['A', 'B', 'C']) },
                y: { scale: scaleLinear().domain([0, 10]), grid: true },
              },
            })),
          },
          {
            id: 'error-bars',
            svgKey: 'ticks',
            definition: defineChart({
              marks: [
                link(rows, {
                  id: 'intervals',
                  x1: 'x',
                  x2: 'x',
                  y1: 'low',
                  y2: 'high',
                  renderer,
                }),
                tickY(rows, { id: 'ticks', x: 'x', y: 'low' }),
                dot(rows, { id: 'estimates', x: 'x', y: 'y' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'network',
            svgKey: 'nodes',
            definition: defineChart({
              marks: [
                link(
                  [
                    { x1: 1, y1: 3, x2: 2, y2: 7 },
                    { x1: 2, y1: 7, x2: 3, y2: 5 },
                  ],
                  {
                    id: 'edges',
                    x1: 'x1',
                    y1: 'y1',
                    x2: 'x2',
                    y2: 'y2',
                    renderer,
                  },
                ),
                dot(rows, { id: 'nodes', x: 'x', y: 'y' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'ribbon',
            svgKey: 'ribbon-points',
            definition: defineChart({
              marks: [
                areaX(rows, {
                  id: 'range',
                  y: 'x',
                  x1: 'low',
                  x2: 'high',
                  renderer,
                }),
                lineY(rows, { id: 'median', x: 'x', y: 'y' }),
                dot(rows, { id: 'ribbon-points', x: 'x', y: 'y' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'heatmap',
            svgKey: 'labels',
            definition: defineChart({
              marks: [
                rect(rows, {
                  id: 'cells',
                  x1: (row) => row.x - 0.4,
                  x2: (row) => row.x + 0.4,
                  y1: (row) => row.y - 0.8,
                  y2: (row) => row.y + 0.8,
                  renderer,
                }),
                text(rows, { id: 'labels', x: 'x', y: 'y', text: 'id' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'vectors',
            svgKey: 'vector-points',
            definition: defineChart({
              marks: [
                vector(rows, {
                  id: 'vectors',
                  x: 'x',
                  y: 'y',
                  length: 18,
                  rotate: 35,
                  renderer,
                }),
                dot(rows, { id: 'vector-points', x: 'x', y: 'y' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'arrows',
            svgKey: 'arrow-points',
            definition: defineChart({
              marks: [
                arrow(rows, {
                  id: 'arrows',
                  x1: 'x',
                  y1: 'low',
                  x2: 'x',
                  y2: 'high',
                  renderer,
                }),
                dot(rows, { id: 'arrow-points', x: 'x', y: 'high' }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'hexagons',
            svgKey: 'hex-labels',
            definition: defineChart({
              marks: [
                hexagon(rows, {
                  id: 'hexes',
                  x: 'x',
                  y: 'y',
                  r: 10,
                  renderer,
                }),
                text(rows, {
                  id: 'hex-labels',
                  x: 'x',
                  y: 'y',
                  text: 'id',
                  dy: -14,
                }),
              ],
              scales: cartesianScales(),
            }),
          },
          {
            id: 'facets',
            svgKey: 'facet-dots',
            definition: defineChart({
              marks: [
                facet(
                  rows.map((row, index) => ({
                    ...row,
                    panel: index < 2 ? 'First' : 'Second',
                  })),
                  {
                    id: 'panels',
                    by: 'panel',
                    axes: 'cell',
                    chart: (data) => ({
                      marks: [
                        lineY(data, {
                          id: 'facet-lines',
                          x: 'category',
                          y: 'y',
                          renderer,
                        }),
                        dot(data, {
                          id: 'facet-dots',
                          x: 'category',
                          y: 'y',
                        }),
                      ],
                      scales: {
                        x: {
                          scale: scaleBand().domain(['A', 'B', 'C']),
                        },
                        y: { scale: scaleLinear().domain([0, 10]) },
                      },
                    }),
                  },
                ),
              ],
              scales: { x: null, y: null },
              guides: false,
            }),
          },
          {
            id: 'polar',
            svgKey: 'radial-dots',
            definition: defineChart({
              marks: [
                polar({
                  scales: {
                    angle: {
                      scale: scaleBand().domain(['A', 'B', 'C']),
                    },
                    radius: { scale: scaleLinear().domain([0, 10]) },
                  },
                  marks: [
                    radialLine(rows, {
                      id: 'radial-line',
                      angle: 'category',
                      radius: 'y',
                      renderer,
                    }),
                    radialDot(rows, {
                      id: 'radial-dots',
                      angle: 'category',
                      radius: 'y',
                    }),
                  ],
                }),
              ],
              scales: { x: null, y: null },
              guides: false,
            }),
          },
        ]
        const mixedRoot = document.querySelector('#mixed')
        const mixedResults = []
        let mixedExportSize = 0
        for (const fixture of mixedDefinitions) {
          const fixtureContainer = document.createElement('div')
          fixtureContainer.style.cssText = 'width:360px;height:220px'
          mixedRoot.append(fixtureContainer)
          const focusedKeys = []
          let renderContext
          const options = {
            definition: fixture.definition,
            width: 360,
            height: 220,
            ariaLabel: fixture.id,
            maxFocusDistance: 1_000,
            onFocusChange: (point) => focusedKeys.push(point?.key ?? null),
            onRender: (context) => {
              renderContext = context
            },
          }
          const fixtureHost = mountChart(fixtureContainer, options)
          const layerRoot = fixtureContainer.querySelector('.ts-chart-layers')
          layerRoot.focus()
          layerRoot.dispatchEvent(
            new KeyboardEvent('keydown', {
              bubbles: true,
              key: 'ArrowRight',
            }),
          )
          const canvases = [
            ...fixtureContainer.querySelectorAll(
              '.ts-chart-canvas__scene',
            ),
          ]
          const canvasInk = canvases.reduce((total, canvas) => {
            const pixels = canvas
              .getContext('2d')
              .getImageData(0, 0, canvas.width, canvas.height).data
            let ink = 0
            for (let index = 3; index < pixels.length; index += 4) {
              if (pixels[index] > 0) ink += 1
            }
            return total + ink
          }, 0)
          const originalRoot = layerRoot
          if (fixture.id === 'composed') {
            mixedExportSize = (
              await renderChartImage(layerRoot, { scale: 1 })
            ).size
          }
          fixtureHost.update({ ...options, width: 380 })
          mixedResults.push({
            id: fixture.id,
            layers: fixtureContainer.querySelectorAll('.ts-chart-layer')
              .length,
            layerTypes: [
              ...fixtureContainer.querySelectorAll('.ts-chart-layer'),
            ].map((layer) =>
              layer.querySelector('.ts-chart-canvas') ? 'canvas' : 'svg',
            ),
            canvases: canvases.length,
            svgs: fixtureContainer.querySelectorAll('svg').length,
            canvasInk,
            svgMark:
              fixtureContainer.querySelector(
                '[data-ts-key*="' + fixture.svgKey + '"]',
              ) !== null,
            rootPreserved:
              fixtureContainer.querySelector('.ts-chart-layers') ===
              originalRoot,
            focused: focusedKeys.length > 0,
            callbackSurface:
              renderContext?.surface.element === originalRoot &&
              renderContext?.surface.layers?.length ===
                fixtureContainer.querySelectorAll('.ts-chart-layer').length &&
              renderContext?.svg instanceof SVGSVGElement,
          })
          fixtureHost.destroy()
        }

        const updateContainer = document.createElement('div')
        updateContainer.style.cssText = 'width:360px;height:220px'
        mixedRoot.append(updateContainer)
        const updateDefinition = (values) => {
          const data = values.map((value, index) => ({
            id: String(index),
            category: String.fromCharCode(65 + index),
            value,
          }))
          return defineChart({
            marks: [
              areaY(data, {
                id: 'updated-area',
                x: 'category',
                y: 'value',
                renderer,
              }),
              dot(data, {
                id: 'updated-dots',
                x: 'category',
                y: 'value',
                key: 'id',
              }),
            ],
            scales: {
              x: { scale: scaleBand().domain(['A', 'B', 'C']) },
              y: { scale: scaleLinear().domain([0, 10]), grid: true },
            },
            tooltip,
            maxFocusDistance: 1_000,
            svgAnimation: {
              duration: 100,
              respectReducedMotion: false,
            },
          })
        }
        const updateOptions = {
          width: 360,
          height: 220,
          ariaLabel: 'Mixed renderer update',
        }
        const updateHost = mountChart(updateContainer, {
          ...updateOptions,
          definition: updateDefinition([2, 5, 7]),
        })
        const updateRoot = updateContainer.querySelector('.ts-chart-layers')
        const canvasHash = () => {
          const canvas = updateContainer.querySelector(
            '.ts-chart-canvas__scene',
          )
          const pixels = canvas
            .getContext('2d')
            .getImageData(0, 0, canvas.width, canvas.height).data
          let hash = 2166136261
          for (const value of pixels) {
            hash ^= value
            hash = Math.imul(hash, 16777619)
          }
          return hash >>> 0
        }
        const dotSelector = '[data-ts-key="updated-dots"] circle'
        const initialDot = updateContainer.querySelector(dotSelector)
        const initialCy = Number(initialDot.getAttribute('cy'))
        const initialCanvasHash = canvasHash()

        updateHost.update({
          ...updateOptions,
          definition: updateDefinition([8, 3, 4]),
        })
        await new Promise((resolve) => setTimeout(resolve, 220))

        const updatedDot = updateContainer.querySelector(dotSelector)
        const updatedCx = Number(updatedDot.getAttribute('cx'))
        const updatedCy = Number(updatedDot.getAttribute('cy'))
        const updatedCanvasHash = canvasHash()
        const rootBounds = updateRoot.getBoundingClientRect()
        updateRoot.dispatchEvent(
          new MouseEvent('pointermove', {
            bubbles: true,
            clientX: rootBounds.left + updatedCx,
            clientY: rootBounds.top + updatedCy,
          }),
        )
        const updatedPoint = updateHost
          .getScene()
          .points.find((point) => point.markId === 'updated-dots')
        if (!updatedPoint) throw new Error('Expected updated SVG focus point')
        updateHost.interaction.setControlledFocus(updatedPoint, {
          source: 'pointer',
        })
        const focus = updateContainer.querySelector(
          '[data-ts-focus-layer="over"]:not([data-ts-focus-guide-layer]) circle[visibility="visible"]',
        )
        const tooltipElement = updateContainer.querySelector(
          '.ts-chart-tooltip',
        )
        const focusCx = Number(focus?.getAttribute('cx'))
        const focusCy = Number(focus?.getAttribute('cy'))
        const updateResult = {
          rootPreserved:
            updateContainer.querySelector('.ts-chart-layers') === updateRoot,
          canvasChanged: initialCanvasHash !== updatedCanvasHash,
          svgChanged: initialCy !== updatedCy,
          focusAligned:
            Math.abs(focusCx - updatedCx) < 0.01 &&
            Math.abs(focusCy - updatedCy) < 0.01,
          tooltipVisible: tooltipElement ? !tooltipElement.hidden : false,
        }
        updateHost.destroy()

        return {
          surface: surfaceResult,
          export: { type: exported.type, size: exported.size },
          interaction: {
            focused,
            selected,
            tooltipVisible,
            destroyed: interactionContainer.childElementCount === 0,
          },
          mixed: mixedResults,
          mixedExportSize,
          update: updateResult,
        }
      }
    `,
    loader: 'ts',
    resolveDir: root,
    sourcefile: 'canvas-renderer-check.ts',
  },
})

let browser
try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 800, height: 600 },
  })
  const page = await context.newPage()
  await page.setContent(
    '<div id="surface" style="width:160px;height:90px"></div><div id="interaction" style="width:320px;height:180px"></div><div id="mixed"></div>',
  )
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  const result = await page.evaluate(() => window.runCanvasRendererCheck())

  assert.equal(result.surface.ratio, 2)
  assert.deepEqual(result.surface.initialBacking, [320, 180])
  assert.deepEqual(result.surface.resizedBacking, [400, 200])
  assert.equal(result.surface.rootPreserved, true)
  assert.deepEqual(result.surface.variableColor, [0, 255, 0, 255])
  assert.deepEqual(result.surface.currentColor, [255, 0, 0, 255])
  assert.ok(result.surface.gradientStart[3] > 0)
  assert.ok(result.surface.gradientEnd[3] > 0)
  assert.notDeepEqual(result.surface.gradientStart, result.surface.gradientEnd)
  assert.ok(result.surface.pathPixels > 100)
  assert.equal(result.surface.basePreservedOnFocus, true)
  assert.equal(result.surface.focusChanged, true)
  assert.equal(result.export.type, 'image/png')
  assert.ok(result.export.size > 100)
  assert.deepEqual(result.interaction.focused.slice(0, 2), ['a', 'b'])
  assert.deepEqual(result.interaction.selected, ['b'])
  assert.equal(result.interaction.tooltipVisible, true)
  assert.equal(result.interaction.destroyed, true)
  assert.equal(result.mixed.length, 10)
  assert.ok(result.mixedExportSize > 100)
  assert.equal(result.update.rootPreserved, true)
  assert.equal(result.update.canvasChanged, true)
  assert.equal(result.update.svgChanged, true)
  assert.equal(result.update.focusAligned, true, JSON.stringify(result.update))
  assert.equal(result.update.tooltipVisible, true)
  for (const fixture of result.mixed) {
    assert.ok(fixture.layers >= 3, fixture.id + ' omitted mixed layers')
    assert.ok(fixture.canvases >= 1, fixture.id + ' omitted Canvas')
    assert.ok(fixture.svgs >= 2, fixture.id + ' omitted SVG framing layers')
    assert.ok(fixture.canvasInk > 20, fixture.id + ' produced no Canvas ink')
    assert.equal(fixture.svgMark, true, fixture.id + ' omitted its SVG mark')
    assert.equal(
      fixture.rootPreserved,
      true,
      fixture.id + ' replaced its root on update',
    )
    assert.equal(fixture.focused, true, fixture.id + ' lost keyboard focus')
    assert.equal(
      fixture.callbackSurface,
      true,
      fixture.id + ' exposed an invalid render callback surface',
    )
  }
  assert.deepEqual(result.mixed[0].layerTypes, [
    'svg',
    'canvas',
    'svg',
    'canvas',
    'svg',
  ])
  await context.close()
  console.log('Canvas renderer browser check passed.')
} catch (error) {
  throw new Error(
    'Canvas renderer browser check failed. Install the matching browser with "pnpm browser:install".',
    { cause: error },
  )
} finally {
  await browser?.close()
}
