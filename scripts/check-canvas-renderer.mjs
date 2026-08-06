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
      import { scaleLinear } from 'd3-scale'
      import {
        createCanvasChartRenderer,
        mountCanvasChart,
      } from '@tanstack/charts/canvas'
      import { dot } from '@tanstack/charts/dot'
      import { renderChartImage } from '@tanstack/charts/export'
      import { defineChart } from '@tanstack/charts/scene'
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
            x: { scale: scaleLinear().domain([0, 1]) },
            y: { scale: scaleLinear().domain([0, 2]) },
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

        return {
          surface: surfaceResult,
          export: { type: exported.type, size: exported.size },
          interaction: {
            focused,
            selected,
            tooltipVisible,
            destroyed: interactionContainer.childElementCount === 0,
          },
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
    '<div id="surface" style="width:160px;height:90px"></div><div id="interaction" style="width:320px;height:180px"></div>',
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
