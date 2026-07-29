/** @jsxImportSource solid-js */
import { render } from 'solid-js/web'
import { createSignal } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

describe('Solid adapter', () => {
  it('mounts and cleans up the shared host', () => {
    const target = document.createElement('div')
    let setLabel!: (label: string) => void
    const dispose = render(() => {
      const [label, set] = createSignal('Revenue')
      setLabel = set
      return (
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel={label()}
        />
      )
    }, target)

    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    setLabel('Updated revenue')
    expect(target.querySelector('svg')).toBe(svg)
    expect(svg?.getAttribute('aria-label')).toBe('Updated revenue')
    dispose()
    expect(target.childElementCount).toBe(0)
  })
})
