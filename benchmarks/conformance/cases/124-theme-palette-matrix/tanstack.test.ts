import { act } from 'react'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { paletteMatrixDefinition } from './example'
import { paletteMatrixRows, palettePaint, paletteTreatments } from './model'
import { mount as plotMount } from './plot'
import { mount } from './tanstack'
import type { ConformanceInput } from '../../types'

const input = {
  width: 288,
  height: 192,
  revision: 0,
  interactive: false,
  preview: true,
} satisfies ConformanceInput

describe('theme palette matrix', () => {
  it('keeps geometry and source identity equal across three token palettes', () => {
    const rows = paletteMatrixRows(0)
    const scenes = paletteTreatments.map((treatment) =>
      createChartScene(paletteMatrixDefinition(rows, treatment), {
        width: 480,
        height: 160,
      }),
    )
    const geometry = scenes.map((scene) =>
      scene.points.map((point) => ({
        markId: point.markId,
        id: point.datum.id,
        x: point.x,
        y: point.y,
      })),
    )

    expect(scenes).toHaveLength(3)
    expect(geometry[1]).toEqual(geometry[0])
    expect(geometry[2]).toEqual(geometry[0])
    expect(new Set(scenes.map((scene) => scene.theme.palette[0])).size).toBe(3)
    scenes.forEach((scene) => {
      scene.points.forEach((point) => expect(rows).toContain(point.datum))
      expect(scene.gradients).toHaveLength(1)
    })
  })

  it('keeps every treatment on CSS-variable paints with light-dark fallbacks', () => {
    const rows = paletteMatrixRows(0)

    paletteTreatments.forEach((treatment) => {
      const definition = paletteMatrixDefinition(rows, treatment)
      const primary = palettePaint(treatment, 'primary')

      expect(primary).toContain(`--ts-matrix-${treatment.id}-primary`)
      expect(primary).toContain('light-dark(')
      expect(definition.theme?.palette).toEqual([
        primary,
        palettePaint(treatment, 'secondary'),
      ])
      expect(definition.gradients?.[0]?.stops).toEqual([
        { offset: 0, color: primary, opacity: 0.02 },
        { offset: 0.55, color: primary, opacity: 0.16 },
        { offset: 1, color: primary, opacity: 0.52 },
      ])
      expect(definition.motion).toMatchObject({
        transition: { type: 'spring' },
      })
    })
  })

  it('mounts three actual preview SVG surfaces with scoped gradients', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    let handle!: ReturnType<typeof mount>

    await act(async () => {
      handle = mount(container, input)
    })

    const surfaces = [...container.querySelectorAll('svg.ts-chart')]
    const gradientIds = surfaces.map(
      (surface) => surface.querySelector('linearGradient')?.id,
    )

    expect(
      container.querySelector(
        '[data-catalog-preview-composition="theme-palette-matrix"]',
      ),
    ).not.toBeNull()
    expect(surfaces).toHaveLength(3)
    expect(surfaces.every((surface) => surface.querySelector('path'))).toBe(
      true,
    )
    expect(gradientIds.every(Boolean)).toBe(true)
    expect(new Set(gradientIds).size).toBe(3)
    expect(handle.driver?.readState()).toMatchObject({
      rowCount: 8,
      paletteCount: 3,
      svgCount: 3,
      palettes: ['neutral', 'vibrant', 'monochrome'],
    })

    await act(async () => {
      handle.destroy()
    })
    container.remove()
  })

  it.each([
    ['TanStack', mount],
    ['Plot', plotMount],
  ] as const)(
    'opts every %s palette into both color schemes',
    async (_, mountCase) => {
      const container = document.createElement('div')
      document.body.append(container)
      let handle: ReturnType<typeof mountCase> | undefined

      try {
        await act(async () => {
          handle = mountCase(container, input)
        })

        const panels = [
          ...container.querySelectorAll<HTMLElement>(
            '[data-palette-treatment]',
          ),
        ]
        expect(panels).toHaveLength(3)
        expect(
          panels.every((panel) => panel.style.colorScheme === 'light dark'),
        ).toBe(true)
      } finally {
        try {
          if (handle) {
            await act(async () => {
              handle?.destroy()
            })
          }
        } finally {
          container.remove()
        }
      }
    },
  )

  it('reserves enough compact label width for every palette name', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    let handle!: ReturnType<typeof mount>

    await act(async () => {
      handle = mount(container, {
        ...input,
        width: 390,
        height: 480,
        preview: false,
      })
    })

    const panels = [
      ...container.querySelectorAll<HTMLElement>('[data-palette-treatment]'),
    ]
    expect(panels).toHaveLength(3)
    expect(
      panels.every((panel) =>
        panel.style.gridTemplateColumns.startsWith('120px'),
      ),
    ).toBe(true)
    expect(container.textContent).toContain('Monochrome')

    await act(async () => {
      handle.destroy()
    })
    container.remove()
  })

  it('scopes resources across multiple mounted palette matrices', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)
    let firstHandle!: ReturnType<typeof mount>
    let secondHandle!: ReturnType<typeof mount>

    await act(async () => {
      firstHandle = mount(first, input)
      secondHandle = mount(second, input)
    })

    const ids = [
      ...document.querySelectorAll('linearGradient[id], clipPath[id]'),
    ]
      .filter((element) => first.contains(element) || second.contains(element))
      .map((element) => element.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)

    await act(async () => {
      firstHandle.destroy()
      secondHandle.destroy()
    })
    first.remove()
    second.remove()
  })
})
