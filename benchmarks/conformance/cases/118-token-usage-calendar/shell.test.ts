import { describe, expect, it } from 'vitest'
import { calendarChartHeight } from './layout'
import { withTokenActivityShell } from './shell'
import type { ConformanceInput, ConformanceMount } from '../../types'

describe('token activity shell', () => {
  it('keeps the gallery interactive and aligns only the first month label', () => {
    const inputs: ConformanceInput[] = []
    const mountChart: ConformanceMount = (container, input) => {
      inputs.push(input)
      container.innerHTML = `
        <svg class="ts-chart">
          <g class="ts-chart__axes">
            <text x="14" text-anchor="middle">Aug</text>
            <text x="92" text-anchor="middle">Jul</text>
          </g>
          <rect data-ts-key="rect-0:first" x="10" width="8"></rect>
          <rect data-ts-key="rect-0:last" x="100" width="8"></rect>
        </svg>
      `
      return {
        update(nextInput) {
          inputs.push(nextInput)
        },
        destroy() {},
      }
    }
    const container = document.createElement('div')
    container.style.minHeight = '480px'
    const mount = withTokenActivityShell(mountChart)
    const handle = mount(container, {
      width: 320,
      height: 180,
      revision: 0,
      interactive: true,
    })
    const labels = container.querySelectorAll('text')
    const shell = container.querySelector<HTMLElement>('.token-activity-shell')

    expect(inputs[0]?.interactive).toBe(true)
    expect(inputs[0]?.width).toBe(320)
    expect(inputs[0]?.height).toBe(calendarChartHeight(320))
    expect(shell?.style.width).toBe('100%')
    expect(shell?.style.height).toBe(`${calendarChartHeight(320)}px`)
    expect(container.style.minHeight).toBe(`${calendarChartHeight(320)}px`)
    expect(labels[0]?.getAttribute('x')).toBe('10')
    expect(labels[0]?.getAttribute('text-anchor')).toBe('start')
    expect(labels[1]?.getAttribute('x')).toBe('92')
    expect(labels[1]?.getAttribute('text-anchor')).toBe('middle')

    handle.update({
      width: 960,
      height: 240,
      revision: 1,
      interactive: true,
    })
    expect(inputs[1]?.interactive).toBe(true)
    expect(inputs[1]?.width).toBe(960)
    expect(inputs[1]?.height).toBe(calendarChartHeight(960))
    expect(shell?.style.height).toBe(`${calendarChartHeight(960)}px`)
    expect(container.style.minHeight).toBe(`${calendarChartHeight(960)}px`)

    handle.destroy()
    expect(container.style.minHeight).toBe('480px')
  })
})
