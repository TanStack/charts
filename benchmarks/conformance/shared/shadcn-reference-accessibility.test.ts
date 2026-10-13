import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createShadcnRechartsExample } from './shadcn-catalog-recharts'
import { getShadcnCatalogSpec, shadcnColors } from './shadcn-catalog-data'

describe('shadcn reference accessibility', () => {
  it.each([
    [
      'chart-bar-interactive',
      '.recharts-bar-rectangle path',
      91,
      [shadcnColors[1]],
    ],
    [
      'chart-bar-negative',
      '.recharts-bar-rectangle path',
      6,
      [shadcnColors[0], shadcnColors[1]],
    ],
    ['chart-line-dots-colors', '.recharts-line-curve', 1, [shadcnColors[1]]],
    ['chart-line-label-custom', '.recharts-line-curve', 1, [shadcnColors[1]]],
    [
      'chart-radar-icons',
      '.recharts-radar-polygon .recharts-polygon',
      2,
      [shadcnColors[0], shadcnColors[1]],
    ],
    [
      'chart-radar-label-custom',
      '.recharts-radar-polygon .recharts-polygon',
      2,
      [shadcnColors[0], shadcnColors[1]],
    ],
    [
      'chart-radar-lines-only',
      '.recharts-radar-polygon .recharts-polygon',
      2,
      [shadcnColors[0], shadcnColors[1]],
    ],
    [
      'chart-radar-radius',
      '.recharts-radar-polygon .recharts-polygon',
      2,
      [shadcnColors[0], shadcnColors[1]],
    ],
    [
      'chart-radial-simple',
      'path.recharts-radial-bar-sector',
      5,
      [...shadcnColors],
    ],
    [
      'chart-radial-label',
      'path.recharts-radial-bar-sector',
      5,
      [...shadcnColors],
    ],
    [
      'chart-radial-grid',
      'path.recharts-radial-bar-sector',
      5,
      [...shadcnColors],
    ],
  ] as const)(
    'keeps upstream data counts and paints on mount and revision: %s',
    async (name, selector, count, colors) => {
      const root = document.createElement('div')
      document.body.append(root)
      const handle = await act(async () =>
        createShadcnRechartsExample(name).mount(root, {
          width: 640,
          height: 600,
          revision: 0,
        }),
      )
      try {
        for (const revision of [0, 1]) {
          if (revision)
            await act(async () =>
              handle.update({ width: 320, height: 600, revision }),
            )
          const marks = [...root.querySelectorAll(selector)]
          expect(marks).toHaveLength(count)
          const paints = marks.map((mark) =>
            mark.getAttribute(
              name.startsWith('chart-line') ? 'stroke' : 'fill',
            ),
          )
          expect(new Set(paints)).toEqual(new Set(colors))
          if (name === 'chart-radar-lines-only')
            expect(
              marks.every((mark) => mark.getAttribute('fill-opacity') === '0'),
            ).toBe(true)
        }
      } finally {
        await act(async () => handle.destroy())
        root.remove()
      }
    },
  )
  it.each([
    ['chart-bar-active', '.recharts-bar-rectangle path', 5],
    ['chart-bar-mixed', '.recharts-bar-rectangle path', 5],
    ['chart-line-interactive', '.recharts-line-curve', 1],
    [
      'chart-radial-stacked',
      'path.recharts-radial-bar-sector, .recharts-radial-bar-sector path',
      2,
    ],
  ])(
    'preserves the pinned datum count through resize and revision: %s',
    async (name, selector, count) => {
      const root = document.createElement('div')
      document.body.append(root)
      const handle = await act(async () =>
        createShadcnRechartsExample(name).mount(root, {
          width: 640,
          height: 600,
          revision: 0,
        }),
      )
      try {
        expect(root.querySelectorAll(selector)).toHaveLength(count)
        await act(async () =>
          handle.update({ width: 320, height: 600, revision: 1 }),
        )
        expect(root.querySelectorAll(selector)).toHaveLength(count)
      } finally {
        await act(async () => handle.destroy())
        root.remove()
      }
    },
  )
  it.each([
    ['chart-radial-text', '200'],
    ['chart-radial-shape', '1,260'],
  ])(
    'preserves the pinned single-Safari radial example: %s',
    async (name, value) => {
      const root = document.createElement('div')
      document.body.append(root)
      const handle = await act(async () =>
        createShadcnRechartsExample(name).mount(root, {
          width: 640,
          height: 600,
          revision: 0,
        }),
      )
      try {
        const values = root.querySelectorAll(
          'path.recharts-radial-bar-sector, .recharts-radial-bar-sector path',
        )
        expect(values).toHaveLength(1)
        expect(values[0]?.getAttribute('fill')).toBe(shadcnColors[1])
        expect(
          [...root.querySelectorAll('svg text')].map(
            (text) => text.textContent,
          ),
        ).toContain(value)
        expect(
          root.querySelectorAll('circle.sc-radial-value-grid'),
        ).toHaveLength(2)
      } finally {
        await act(async () => handle.destroy())
        root.remove()
      }
    },
  )
  it('uses the pinned custom bar paint and both label placements', async () => {
    const root = document.createElement('div')
    document.body.append(root)
    const handle = await act(async () =>
      createShadcnRechartsExample('chart-bar-label-custom').mount(root, {
        width: 640,
        height: 600,
        revision: 0,
      }),
    )
    try {
      const bars = root.querySelectorAll('.recharts-bar-rectangle path')
      expect(bars).toHaveLength(6)
      expect(
        [...bars].every((bar) => bar.getAttribute('fill') === shadcnColors[1]),
      ).toBe(true)
      const labels = [...root.querySelectorAll('.recharts-label')].map(
        (label) => label.textContent,
      )
      expect(labels).toHaveLength(12)
      expect(labels).toContain('January')
      expect(labels).toContain('186')
    } finally {
      await act(async () => handle.destroy())
      root.remove()
    }
  })
  it.each([
    'chart-area-linear',
    'chart-bar-label-custom',
    'chart-bar-default',
    'chart-line-dots',
    'chart-pie-donut',
    'chart-radar-grid-none',
    'chart-radial-text',
    'chart-tooltip-label-custom',
  ])('names the rendered chart on mount and update: %s', async (name) => {
    const root = document.createElement('div')
    document.body.append(root)
    const input = { width: 640, height: 600, revision: 0 }
    const handle = await act(async () =>
      createShadcnRechartsExample(name).mount(root, input),
    )
    try {
      for (const revision of [0, 1]) {
        if (revision)
          await act(async () =>
            handle.update({ ...input, revision, width: 320 }),
          )
        const charts = root.querySelectorAll('svg[aria-label]')
        expect(charts).toHaveLength(1)
        expect(charts[0]?.getAttribute('aria-label')).toBe(
          getShadcnCatalogSpec(name).title,
        )
      }
    } finally {
      await act(async () => handle.destroy())
      root.remove()
    }
  })
})
