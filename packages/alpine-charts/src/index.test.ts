import { describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { charts } from './index'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

describe('Alpine adapter', () => {
  it('registers a reactive chart directive and cleans it up', () => {
    let directive:
      | ((
          element: HTMLElement,
          value: { expression: string },
          utilities: any,
        ) => void)
      | undefined
    charts({
      directive(_name, callback) {
        directive = callback
      },
    })
    const element = document.createElement('div')
    let options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    }
    let cleanup = () => {}
    let update = () => {}

    directive?.(
      element,
      { expression: 'chartOptions' },
      {
        evaluateLater: () => (receiver: (value: unknown) => void) =>
          receiver(options),
        effect: (callback: () => void) => {
          update = callback
          callback()
        },
        cleanup: (callback: () => void) => {
          cleanup = callback
        },
      },
    )

    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Revenue',
    )
    options = { ...options, ariaLabel: 'Updated revenue' }
    update()
    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Updated revenue',
    )
    cleanup()
    expect(element.childElementCount).toBe(0)
    expect(element.classList.contains('ts-chart-host')).toBe(false)
  })
})
