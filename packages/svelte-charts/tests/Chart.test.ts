import { mount, tick, unmount } from 'svelte'
import { describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import Chart from '../src/Chart.svelte'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

describe('Svelte adapter', () => {
  it('mounts and cleans up the shared host', async () => {
    const target = document.createElement('div')
    const component = mount(Chart, {
      target,
      props: {
        definition,
        width: 480,
        height: 260,
        ariaLabel: 'Revenue',
      },
    })

    await tick()
    expect(target.querySelector('svg')).not.toBeNull()
    await unmount(component)
    expect(target.childElementCount).toBe(0)
  })
})
