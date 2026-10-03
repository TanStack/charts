import '@angular/compiler'
import { Component } from '@angular/core'
import {
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser'
import { renderApplication } from '@angular/platform-server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import { HydrationChartHost } from '../tests/Chart.hydration.server'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from './index'
import type { ChartOptions } from './index'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  scales: {
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  },
})

@Component({
  selector: 'test-server-chart',
  standalone: true,
  imports: [Chart],
  template: '<tanstack-chart [options]="options" />',
})
class ServerChartHost {
  options: ChartOptions<(typeof rows)[number]> = {
    definition,
    height: 260,
    ariaLabel: 'Server revenue',
  }
}

describe('Angular adapter SSR', () => {
  it('hydrates server markup in place and cleans up', async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
        import { createServer } from 'vite'
        const server = await createServer({
          configFile: false, logLevel: 'silent', appType: 'custom',
          server: { middlewareMode: true },
          ssr: { noExternal: ['@tanstack/charts'] },
        })
        try {
          const fixture = await server.ssrLoadModule('/packages/angular-charts/tests/Chart.hydration.server.ts')
          const html = await fixture.renderHydrationChart()
          process.stdout.write('\\nHYDRATION_HTML:' + JSON.stringify(html))
        } finally {
          await server.close()
        }
      `,
      ],
      { maxBuffer: 1024 * 1024 },
    )
    const marker = '\nHYDRATION_HTML:'
    expect(stdout).toContain(marker)
    const html: string = JSON.parse(
      stdout.slice(stdout.lastIndexOf(marker) + marker.length),
    )
    const target = document.body
    const serverDocument = new DOMParser().parseFromString(html, 'text/html')
    const serverNodes = Array.from(serverDocument.body.childNodes, (node) =>
      document.importNode(node, true),
    )
    target.append(...serverNodes)
    const svg = target.querySelector('svg')
    const line = target.querySelector('.ts-chart__line')
    expect(svg).not.toBeNull()
    expect(line).not.toBeNull()
    const app = await bootstrapApplication(HydrationChartHost, {
      providers: [provideClientHydration()],
    })
    try {
      await app.whenStable()
      const host = app.components[0].instance as HydrationChartHost
      expect(host.renderCount).toBeGreaterThan(0)
      expect(target.querySelector('svg')).toBe(svg)
      expect(target.querySelector('.ts-chart__line')).toBe(line)
      host.options.update((options) => ({
        ...options,
        ariaLabel: 'Updated server revenue',
      }))
      await app.whenStable()
      expect(target.querySelector('svg')).toBe(svg)
      await vi.waitFor(() => {
        expect(svg?.getAttribute('aria-label')).toBe('Updated server revenue')
      })
    } finally {
      app.destroy()
      for (const node of serverNodes) node.parentNode?.removeChild(node)
    }
  })

  it('server-renders complete SVG without mounting the DOM host', async () => {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(ServerChartHost, { providers: [] }, context),
      {
        document:
          '<!doctype html><html><body><test-server-chart></test-server-chart></body></html>',
      },
    )

    expect(html).toContain('<svg')
    expect(html).toContain('class="ts-chart__line"')
    expect(html).toContain('aria-label="Server revenue"')
  })
})
