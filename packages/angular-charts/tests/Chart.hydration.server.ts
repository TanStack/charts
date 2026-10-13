import '@angular/compiler'
import { Component, signal } from '@angular/core'
import {
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser'
import {
  provideServerRendering,
  renderApplication,
} from '@angular/platform-server'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from '../src/index'
import type { ChartOptions } from '../src/index'

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
  selector: 'test-hydration-chart',
  standalone: true,
  imports: [Chart],
  template: '<tanstack-chart [options]="options()" />',
})
export class HydrationChartHost {
  renderCount = 0
  options = signal<ChartOptions<(typeof rows)[number]>>({
    definition,
    height: 260,
    ariaLabel: 'Server revenue',
    onRender: () => {
      this.renderCount++
    },
  })
}

export function renderHydrationChart() {
  return renderApplication(
    (context) =>
      bootstrapApplication(
        HydrationChartHost,
        {
          providers: [provideClientHydration(), provideServerRendering()],
        },
        context,
      ),
    {
      document:
        '<!doctype html><html><body><test-hydration-chart></test-hydration-chart></body></html>',
    },
  )
}
