import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { catalogCase, freeCursorDefinition, mount } from './tanstack'
import type {
  ChartDefinition,
  ChartSpecDatum,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import type { CompleteCar } from './model'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned free cursor', () => {
  it('keeps plotting data raw and the cursor independent of datum focus', () => {
    const definition = freeCursorDefinition(null, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height - 68,
    })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<CompleteCar>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<CompleteCar, number, number>
    >()
    expect(definition.marks).toHaveLength(2)
    expect(scene.points).toHaveLength(6)
    expect(
      scene.points.every(({ markId }) => markId === 'free-cursor-dots'),
    ).toBe(true)
    expect(scene.controls).toHaveLength(1)
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'dot'),
    ).toHaveLength(6)
    expect(cursorFallback(scene.nodes)?.children).toEqual([])
  })

  it('renders an accepted semantic position through the static fallback', () => {
    const scene = createChartScene(
      freeCursorDefinition({ x: 101.8, y: 20.8 }, () => {}),
      { width: input.width, height: input.height - 68 },
    )
    const children = cursorFallback(scene.nodes)?.children ?? []

    expect(children.filter((node) => node.kind === 'rule')).toHaveLength(2)
    expect(
      children.find(
        (node) =>
          node.kind === 'label' &&
          node.className === 'ts-chart__continuous-cursor-x-label-text',
      ),
    ).toMatchObject({ kind: 'label', text: 'HP 101.8' })
    expect(
      children.find(
        (node) =>
          node.kind === 'label' &&
          node.className === 'ts-chart__continuous-cursor-y-label-text',
      ),
    ).toMatchObject({ kind: 'label', text: 'MPG 20.8' })
  })

  it('renders the actual free cursor and crosshair in the catalog preview', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = catalogCase.mount(container, {
      width: 288,
      height: 192,
      revision: 0,
      preview: true,
    })

    expect(
      container.querySelectorAll('.ts-chart__continuous-cursor-x-rule'),
    ).toHaveLength(1)
    expect(
      container.querySelectorAll('.ts-chart__continuous-cursor-y-rule'),
    ).toHaveLength(1)
    expect(
      container.querySelector('.ts-chart__continuous-cursor-marker'),
    ).not.toBeNull()
    expect(
      container.querySelector('.ts-chart__continuous-cursor-x-label-text')
        ?.textContent,
    ).toBe('HP 101.8')
    expect(
      container.querySelector('.ts-chart__continuous-cursor-y-label-text')
        ?.textContent,
    ).toBe('MPG 20.8')
    expect(
      container
        .querySelector('.ts-chart__continuous-cursor-x-label-text')
        ?.getAttribute('fill'),
    ).toBe('Canvas')
    expect(
      container
        .querySelector('.ts-chart__continuous-cursor-x-label-box')
        ?.getAttribute('fill'),
    ).toBe('CanvasText')

    handle.destroy()
    container.remove()
  })

  it('previews without rendering, pins on touch, survives leave, and clears on Escape', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mount(container, input)
    const driver = handle.driver
    const surface = container.querySelector<SVGSVGElement>('svg.ts-chart')
    const overlay = container.querySelector<SVGSVGElement>(
      '[data-chart-cursor="continuous-cursor"]',
    )
    if (!driver || !surface || !overlay) {
      throw new Error('Expected a mounted free cursor')
    }
    mockBounds(surface, input.width, input.height - 68)
    Object.defineProperty(surface, 'getScreenCTM', {
      configurable: true,
      value: vi.fn(() => null),
    })
    const scene = createChartScene(
      freeCursorDefinition(null, () => {}),
      {
        width: input.width,
        height: input.height - 68,
      },
    )
    const preview = {
      x: scene.chart.x + scene.chart.width * 0.37,
      y: scene.chart.y + scene.chart.height * 0.64,
    }

    overlay.dispatchEvent(pointer('pointermove', preview.x, preview.y))

    expect(driver.readState()).toMatchObject({
      cursor: {
        visible: true,
        xNormalized: expect.closeTo(0.37, 2),
        yNormalized: expect.closeTo(0.64, 2),
        xValue: 101.8,
        yValue: 20.8,
        pinned: false,
      },
      render: { count: 1 },
    })
    expect(
      container.querySelector('[data-conformance-free-cursor-status]')
        ?.textContent,
    ).toContain('HP 101.8 · MPG 20.8')

    overlay.dispatchEvent(pointer('pointerleave', preview.x, preview.y))
    expect(driver.readState()).toMatchObject({
      cursor: { visible: false, pinned: false },
    })

    const touch = {
      x: scene.chart.x + scene.chart.width * 0.25,
      y: scene.chart.y + scene.chart.height * 0.25,
    }
    overlay.dispatchEvent(pointer('pointerdown', touch.x, touch.y, 'touch'))
    overlay.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: touch.x,
        clientY: touch.y,
      }),
    )
    expect(driver.readState()).toMatchObject({
      cursor: {
        visible: true,
        xValue: 85,
        yValue: 32.5,
        pinned: true,
      },
    })

    overlay.dispatchEvent(pointer('pointerleave', touch.x, touch.y, 'touch'))
    expect(driver.readState()).toMatchObject({
      cursor: { visible: true, pinned: true },
    })

    overlay.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(driver.readState()).toMatchObject({
      cursor: { visible: false, pinned: false },
    })

    handle.destroy()
    container.remove()
  })

  it('contains no copied scale, manual plotting overlay, or React controller', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/88-echarts-free-cursor',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(existsSync(resolve(directory, 'view.tsx'))).toBe(false)
    for (const forbidden of [
      "from 'react'",
      '@tanstack/charts/react',
      'createElementNS',
      'data-conformance-overlay',
      '.copy()',
      '.invert(',
      'focusDisabled',
      "addEventListener('pointermove'",
      "addEventListener('pointerdown'",
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain('continuousCursor({')
    expect(source).toContain('controlledSignal<')
    expect(source).toContain('(next, { reason }) => onChange(next, reason)')
    expect(source).toContain('decorative(')
  })
})

function cursorFallback(nodes: readonly SceneNode[]) {
  return nodes.find(
    (node): node is SceneGroup =>
      node.kind === 'group' &&
      node.key === 'behavior:continuous-cursor:fallback',
  )
}

function flatten(nodes: readonly SceneNode[]): readonly SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function pointer(
  type: string,
  clientX: number,
  clientY: number,
  pointerType = 'mouse',
) {
  const event = new MouseEvent(type, { bubbles: true, clientX, clientY })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

function mockBounds(element: Element, width: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width, height }),
  )
}
