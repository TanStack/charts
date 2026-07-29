import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import type { ConformanceInput } from '../types'
import { tanstackMount } from './mount'

type Point = {
  id: string
  x: number
  y: number
}

const rows: Point[] = [{ id: 'a', x: 1, y: 2 }]
const definition = defineChart<ConformanceInput>()(() => ({
  marks: [
    dot(rows, {
      x: 'x',
      y: 'y',
      key: 'id',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 4]) },
}))

describe('tanstackMount', () => {
  it('keeps benchmark comparisons passive', () => {
    const container = document.createElement('div')
    const handle = tanstackMount(definition, 'Passive chart')(container, {
      width: 320,
      height: 180,
      revision: 0,
    })
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('tabindex')).toBe('-1')
    svg?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(container.querySelector('.ts-chart-tooltip')).toBeNull()

    handle.destroy()
  })

  it('enables keyboard focus and tooltips for embeds', () => {
    const container = document.createElement('div')
    const handle = tanstackMount(definition, 'Interactive chart', {
      format: (point) => `Point ${point.datum.id}`,
    })(container, {
      width: 320,
      height: 180,
      revision: 0,
      interactive: true,
    })
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('tabindex')).toBe('0')
    svg?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toBe(
      'Point a',
    )

    handle.destroy()
  })
})
