import '@angular/compiler'
import { Component } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { renderApplication } from '@angular/platform-server'
import { describe, expect, it } from 'vitest'
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
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
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
    expect(html).toContain('aria-label="Server revenue"')
  })
})
