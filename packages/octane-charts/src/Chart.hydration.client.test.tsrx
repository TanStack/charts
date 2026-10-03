import { act, hydrateRoot } from 'octane'
import { octane } from 'octane/compiler/vite'
import { createServer } from 'vite'
import { expect, it, vi } from 'vitest'
import { HydrationSvgChart } from '../tests/Chart.hydration.fixture'

it('hydrates Octane SVG markup without replacing chart geometry', async () => {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'silent',
    appType: 'custom',
    plugins: [octane({ hmr: false, ssr: true })],
    resolve: {
      extensions: ['.tsrx', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },
    server: { middlewareMode: true },
    ssr: { noExternal: ['@tanstack/charts'] },
  })
  let markup: string
  try {
    const fixture = (await server.ssrLoadModule(
      '/packages/octane-charts/tests/Chart.hydration.server.tsrx',
    )) as { renderHydrationSvgChart(): string }
    markup = fixture.renderHydrationSvgChart()
  } finally {
    await server.close()
  }
  const target = document.createElement('div')
  target.innerHTML = markup
  const host = target.querySelector('.ts-chart-host')
  const svg = target.querySelector('svg')
  const line = svg?.querySelector('.ts-chart__line')
  expect(host).not.toBeNull()
  expect(svg).not.toBeNull()
  expect(line).not.toBeNull()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(() => {
      root = hydrateRoot(target, HydrationSvgChart)
    })
    expect(target.querySelector('.ts-chart-host')).toBe(host)
    expect(target.querySelector('svg')).toBe(svg)
    expect(target.querySelector('.ts-chart__line')).toBe(line)
    expect(svg?.getAttribute('aria-label')).toBe('Revenue by month')
    const update = target.querySelector('button')
    expect(update).not.toBeNull()
    await act(() => {
      update?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue by month')
    expect(target.querySelector('.ts-chart-host')).toBe(host)
    expect(target.querySelector('svg')).toBe(svg)
    expect(target.querySelector('.ts-chart__line')).toBe(line)
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    await act(() => root?.unmount())
    root = undefined
    expect(target.childElementCount).toBe(0)
  } finally {
    if (root) await act(() => root?.unmount())
    warn.mockRestore()
    error.mockRestore()
  }
}, 15_000)
