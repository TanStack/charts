import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { dot } from './dot'
import { mountChart } from './dom'
import { composeChartLayers } from './layers'
import { createChartScene, defineChart } from './scene'
import { createSvgChartRenderer } from './svg-surface'
import type { ChartLayerRenderer, ChartRenderer } from './dom-types'

const layer = (): ChartLayerRenderer => ({
  ...createSvgChartRenderer(),
  kind: 'chart-layer-renderer',
  compose: composeChartLayers,
})

describe('public layer compositor', () => {
  it('preserves chart types and caches by renderer identity, not id', () => {
    const first = createSvgChartRenderer<{ value: number }, Date, number>()
    const second = createSvgChartRenderer<{ value: number }, Date, number>()
    const composed = composeChartLayers(first)
    expectTypeOf(composed).toEqualTypeOf<
      ChartRenderer<{ value: number }, Date, number>
    >()
    expect(composeChartLayers(first)).toBe(composed)
    expect(second.id).toBe(first.id)
    expect(composeChartLayers(second)).not.toBe(composed)
  })

  it('adopts SVG layers, preserves order and reuses adjacent surfaces without Canvas', () => {
    const first = layer()
    const second = layer()
    const definition = (value: number) =>
      defineChart({
        marks: [
          dot([value], { id: 'first', renderer: first }),
          dot([value + 1], { id: 'adjacent', renderer: first }),
          dot([value + 2], { id: 'second', renderer: second }),
          dot([value + 3], { id: 'return', renderer: first }),
        ],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 10]) },
        },
        guides: false,
      })
    const base = createSvgChartRenderer()
    const compositor = composeChartLayers(base)
    const scene = createChartScene(definition(1), { width: 400, height: 250 })
    const options = { ariaLabel: 'Separate SVG layers', idPrefix: 'layer-test' }
    const container = document.createElement('div')
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        throw new Error('Canvas must not be used')
      })
    container.innerHTML = compositor.prerender(scene, options)
    const oldLayers = [
      ...container.querySelectorAll<HTMLElement>('.ts-chart-layer'),
    ]
    const oldSvgs = [...container.querySelectorAll('svg')]
    const surface = compositor.mount(container, () => {})
    try {
      surface.render(scene, options)
      expect(oldLayers).toHaveLength(5)
      oldLayers.forEach((node, index) =>
        expect(container.querySelectorAll('.ts-chart-layer')[index]).toBe(node),
      )
      oldSvgs.forEach((node, index) =>
        expect(container.querySelectorAll('svg')[index]).toBe(node),
      )
      expect(
        oldLayers[1]?.querySelector('[data-ts-key="first"]'),
      ).not.toBeNull()
      expect(
        oldLayers[1]?.querySelector('[data-ts-key="adjacent"]'),
      ).not.toBeNull()
      expect(
        oldLayers[2]?.querySelector('[data-ts-key="second"]'),
      ).not.toBeNull()
      expect(
        oldLayers[3]?.querySelector('[data-ts-key="return"]'),
      ).not.toBeNull()
      for (const node of oldLayers) {
        expect(node.getAttribute('aria-hidden')).toBe('true')
        expect(node.style.pointerEvents).toBe('none')
      }
      surface.render(
        createChartScene(definition(2), { width: 500, height: 300 }),
        options,
      )
      oldSvgs.forEach((node, index) =>
        expect(container.querySelectorAll('svg')[index]).toBe(node),
      )
      expect(container.querySelector('canvas')).toBeNull()
      expect(getContext).not.toHaveBeenCalled()
    } finally {
      surface.destroy()
      getContext.mockRestore()
    }
  })

  it('keeps separate host surfaces while sharing a compositor and does not remount on update', () => {
    const renderer = layer()
    const definition = (value: number) =>
      defineChart({
        marks: [dot([value], { renderer })],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      })
    const options = {
      definition: definition(1),
      width: 400,
      height: 250,
      ariaLabel: 'Layers',
    }
    const first = document.createElement('div')
    const second = document.createElement('div')
    const a = mountChart(first, options)
    const b = mountChart(second, options)
    const roots = [...first.querySelectorAll('svg')]
    try {
      a.update({ ...options, definition: definition(2) })
      roots.forEach((node, index) =>
        expect(first.querySelectorAll('svg')[index]).toBe(node),
      )
      expect(second.querySelector('svg')).not.toBe(roots[0])
      a.destroy()
      b.update({ ...options, definition: definition(3) })
      expect(second.querySelector('svg')).not.toBeNull()
    } finally {
      a.destroy()
      b.destroy()
    }
  })
})
