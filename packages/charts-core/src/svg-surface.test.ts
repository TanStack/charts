import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { crosshair } from './crosshair'
import { dot } from './dot'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { renderChartSvgWithResources } from './svg-resources'
import { createSvgChartRenderer, svgChartRenderer } from './svg-surface'

describe('SVG surface coordinates', () => {
  it('mounts viewport content with the fixed authored plot clip', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(
            [
              { x: 0, y: 0 },
              { x: 10, y: 1 },
              { x: 20, y: 2 },
              { x: 30, y: 3 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        x: {
          scale: scaleLinear().domain([0, 30]),
          viewport: { domain: [10, 20], translate: 32 },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
      }),
      { width: 640, height: 320 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, {
      ariaLabel: 'Clipped history',
      idPrefix: 'viewport',
    })

    const marks = container.querySelector<SVGGElement>('g.ts-chart__marks')
    const content = marks?.querySelector<SVGGElement>(
      'g.ts-chart__viewport-content',
    )
    const viewportClip = marks?.querySelector<SVGGElement>(
      'g.ts-chart__viewport-clip',
    )
    const clip = viewportClip?.querySelector('clipPath rect')
    expect(marks?.getAttribute('clip-path')).toBeNull()
    expect(viewportClip?.getAttribute('clip-path')).toMatch(
      /^url\(#viewport-ts-chart-clip-/,
    )
    expect(content?.getAttribute('transform')).toBe('translate(32 0)')
    expect(Number(clip?.getAttribute('x'))).toBeCloseTo(scene.chart.x)
    expect(Number(clip?.getAttribute('width'))).toBeCloseTo(scene.chart.width)

    surface.destroy()
  })

  it('applies viewport translation revisions without generic interpolation', () => {
    const definition = (translate: number) =>
      defineChart({
        marks: [
          lineY(
            [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
            { x: 'x', y: 'y' },
          ),
        ],
        x: {
          scale: scaleLinear().domain([0, 2]),
          viewport: { domain: [0.5, 1.5], translate },
        },
        y: { scale: scaleLinear().domain([0, 2]) },
        guides: false,
      })
    const scene = (translate: number) =>
      createChartScene(definition(translate), { width: 480, height: 260 })
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene(0), { ariaLabel: 'Viewport animation' })
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    surface.render(scene(40), {
      ariaLabel: 'Viewport animation',
      animation: { duration: 120 },
    })

    expect(requestFrame).not.toHaveBeenCalled()
    expect(
      container
        .querySelector('g.ts-chart__viewport-content')
        ?.getAttribute('transform'),
    ).toBe('translate(40 0)')
    requestFrame.mockRestore()
    surface.destroy()
  })

  it('maps client coordinates through the rendered SVG transform', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]) },
        margin: 0,
      }),
      { width: 640, height: 480 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Coordinate mapping' })

    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected an SVG chart surface')

    const left = 29
    const top = 277.8828125
    const renderedWidth = 604
    const renderedHeight = 480
    const scale = renderedWidth / scene.width
    const verticalInset = (renderedHeight - scene.height * scale) / 2

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({
        x: left,
        y: top,
        width: renderedWidth,
        height: renderedHeight,
      }),
    )
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => ({
        inverse: () => ({
          a: 1 / scale,
          b: 0,
          c: 0,
          d: 1 / scale,
          e: -left / scale,
          f: -(top + verticalInset) / scale,
        }),
      })),
    })

    const expected = { x: 603.84, y: 28.76 }
    const resolved = surface.clientToScene?.(
      scene,
      left + expected.x * scale,
      top + verticalInset + expected.y * scale,
    )

    expect(resolved?.x).toBeCloseTo(expected.x)
    expect(resolved?.y).toBeCloseTo(expected.y)

    surface.destroy()
  })

  it('falls back to bounds when the DOM has no SVG screen matrix', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' })],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]) },
        margin: 0,
      }),
      { width: 640, height: 480 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Fallback coordinate mapping' })

    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected an SVG chart surface')

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 10, y: 20, width: 320, height: 240 }),
    )
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => null),
    })

    expect(surface.clientToScene?.(scene, 170, 140)).toEqual({
      x: 320,
      y: 240,
    })

    surface.destroy()
  })

  it('paints keyed renderer-native focus guides without reconciling marks', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(
            [
              { id: 'a', x: 1, y: 2 },
              { id: 'b', x: 3, y: 4 },
            ],
            { x: 'x', y: 'y', key: 'id' },
          ),
          crosshair({
            x: { label: { format: (value) => `x=${value}` } },
            y: { label: true },
            marker: true,
            strokeDasharray: '3 2',
          }),
        ],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([0, 5]) },
        guides: false,
        margin: 20,
      }),
      { width: 320, height: 200 },
    )
    const [first, second] = scene.points
    if (!first || !second) throw new Error('Expected crosshair focus points')
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Crosshair' })
    const baseMark = container.querySelector(
      `circle[data-ts-key="${first.key}"]`,
    )
    expect(
      container.querySelector('[data-ts-focus-guide-layer="over"]'),
    ).toBeNull()

    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'keyboard',
      pinned: false,
    })

    const layer = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="over"]',
    )
    const xRule = layer?.querySelector<SVGLineElement>(
      '[data-ts-key$=":x-rule"]',
    )
    expect(layer?.getAttribute('visibility')).toBe('visible')
    expect(Number(xRule?.getAttribute('x1'))).toBeCloseTo(first.x)
    expect(xRule?.getAttribute('stroke-dasharray')).toBe('3 2')
    expect(layer?.querySelector('[data-ts-key$=":marker"]')).not.toBeNull()
    const labels = [
      ...(layer?.querySelectorAll<SVGTextElement>('[data-ts-key*="x-label"]') ??
        []),
    ]
    expect(labels.map((label) => label.textContent)).toEqual(['x=1', 'x=1'])
    expect(labels[0]?.dataset.tsKey).toMatch(/:halo$/)
    expect(labels[1]?.dataset.tsKey).toMatch(/:text$/)
    expect(layer?.querySelector('clipPath > rect')).not.toBeNull()

    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'pointer',
      pinned: false,
    })
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    expect(Number(xRule?.getAttribute('x1'))).toBeCloseTo(second.x)
    expect(container.querySelector(`circle[data-ts-key="${first.key}"]`)).toBe(
      baseMark,
    )

    surface.paintFocus(null)
    expect(layer?.getAttribute('visibility')).toBe('hidden')
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    surface.destroy()
  })

  it('renders a datum-free controlled cursor before the static scene', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          crosshair({ marker: true }),
          dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' }),
        ],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]), grid: true },
        margin: 0,
      }),
      { width: 200, height: 100 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Free cursor' })
    const state = {
      anchor: 'normalized' as const,
      normalized: { x: 0.25, y: 0.75 },
      source: 'programmatic' as const,
      pinned: true,
    }
    surface.paintFocus(null, null, {
      state,
      axes: 'xy',
      x: { position: 50, normalized: 0.25, value: 0.5 },
      y: { position: 75, normalized: 0.75, value: 0.5 },
    })
    const layer = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="under"]',
    )
    const grid = container.querySelector('g.ts-chart__grid')
    const marks = container.querySelector('g.ts-chart__marks')
    expect(layer?.nextElementSibling).toBe(grid)
    expect(grid?.nextElementSibling).toBe(marks)
    expect(layer?.getAttribute('visibility')).toBe('visible')
    expect(
      layer?.querySelector('[data-ts-key$=":x-rule"]')?.getAttribute('x1'),
    ).toBe('50')
    expect(
      layer?.querySelector('[data-ts-key$=":y-rule"]')?.getAttribute('y1'),
    ).toBe('75')
    surface.destroy()
  })

  it('serializes dynamic guides through the selected resource renderer', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(
            [
              { id: 'a', x: 1, y: 2 },
              { id: 'b', x: 3, y: 4 },
            ],
            { x: 'x', y: 'y', key: 'id' },
          ),
          crosshair({ stroke: 'url(#cursor)' }),
        ],
        gradients: [
          {
            id: 'cursor',
            stops: [
              { offset: 0, color: 'red' },
              { offset: 1, color: 'blue' },
            ],
          },
        ],
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scaleLinear().domain([0, 5]) },
        guides: false,
        margin: 20,
      }),
      { width: 320, height: 200 },
    )
    const [first, second] = scene.points
    if (!first || !second) throw new Error('Expected resource guide points')
    const renderSvg = vi.fn((currentScene, options) => {
      const markup = renderChartSvgWithResources(
        currentScene,
        options,
      ).replaceAll('<line ', '<line data-custom-guide="true" ')
      const template = document.createElement('template')
      template.innerHTML = markup
      const root = template.content.firstElementChild
      root
        ?.querySelectorAll('defs[data-ts-key$=":clip-defs"]')
        .forEach((definition) => root.prepend(definition))
      return root?.outerHTML ?? markup
    })
    const container = document.createElement('div')
    const surface = createSvgChartRenderer(renderSvg).mount(container, () => {})
    const renderOptions = {
      ariaLabel: 'Resource crosshair',
      idPrefix: 'chart:one',
    }
    surface.render(scene, renderOptions)
    const gradient = container.querySelector<SVGLinearGradientElement>(
      'linearGradient[data-ts-key="gradient:cursor"]',
    )
    expect(gradient?.id).toBe('chartone-cursor')

    surface.paintFocus({
      primary: first,
      group: [first],
      source: 'pointer',
      pinned: false,
    })
    const layer = container.querySelector<SVGGElement>(
      '[data-ts-focus-guide-layer="over"]',
    )
    const xRule = layer?.querySelector<SVGLineElement>(
      '[data-ts-key$=":x-rule"]',
    )
    const clippedGroup = layer?.querySelector<SVGGElement>('[clip-path]')
    const clipReference = clippedGroup?.getAttribute('clip-path')
    const clipId = /^url\(#([^)]+)\)$/.exec(clipReference ?? '')?.[1]
    expect(xRule?.getAttribute('stroke')).toBe('url(#chartone-cursor)')
    expect(xRule?.getAttribute('data-custom-guide')).toBe('true')
    expect(clipId).toMatch(/^chartone-ts-chart-clip-/)
    expect(layer?.querySelector(`clipPath[id="${clipId}"]`)).not.toBeNull()
    expect(
      layer?.querySelector('defs[data-ts-key$=":renderer-defs"]'),
    ).not.toBeNull()
    expect(renderSvg.mock.calls.at(-1)?.[1]).toMatchObject(renderOptions)
    expect(renderSvg.mock.calls.at(-1)?.[0].gradients).toBe(scene.gradients)

    surface.paintFocus({
      primary: second,
      group: [second],
      source: 'keyboard',
      pinned: false,
    })
    expect(container.querySelector('[data-ts-focus-guide-layer="over"]')).toBe(
      layer,
    )
    expect(layer?.querySelector('[data-ts-key$=":x-rule"]')).toBe(xRule)
    expect(layer?.querySelector(`clipPath[id="${clipId}"]`)).not.toBeNull()
    expect(
      layer?.querySelector('defs[data-ts-key$=":renderer-defs"]'),
    ).not.toBeNull()
    surface.destroy()
  })

  it('adds guide clipping when a custom serializer omits group resources', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot([{ x: 1, y: 1 }], { x: 'x', y: 'y' }), crosshair()],
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleLinear().domain([0, 2]) },
        guides: false,
      }),
      { width: 200, height: 120 },
    )
    const point = scene.points[0]
    if (!point) throw new Error('Expected custom guide point')
    const renderSvg = (
      currentScene: typeof scene,
      options: { ariaLabel: string },
    ) =>
      renderChartSvg(currentScene, options).replaceAll(
        '<line ',
        '<line data-custom-guide="true" ',
      )
    const container = document.createElement('div')
    const surface = createSvgChartRenderer(renderSvg).mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Custom crosshair' })
    surface.paintFocus({
      primary: point,
      group: [point],
      source: 'pointer',
      pinned: false,
    })
    const layer = container.querySelector('[data-ts-focus-guide-layer="over"]')
    expect(
      layer?.querySelector('line')?.getAttribute('data-custom-guide'),
    ).toBe('true')
    expect(layer?.querySelector('[clip-path]')).not.toBeNull()
    expect(layer?.querySelector('clipPath > rect')).not.toBeNull()
    surface.destroy()
  })
})
