import { describe, expect, it, vi } from 'vitest'
import { mountChart } from './dom'
import { focusGroupX, focusGroupY, focusNearestX, focusNearestY } from './focus'
import { focusGrid } from './focus-grid'
import { cell } from './rect'
import { defineChart } from './scene'
import { bandAxes } from './test-scales'
import { tooltip } from './tooltip'
import type { ChartPoint } from './types'

// A 3x3 grid with the center cell missing, plus a label point that shares the
// top-left cell. Rows are y = 0, 10, 20 and columns are x = 0, 10, 20.
const points: ChartPoint[] = [
  point('a1', 0, 0),
  point('a1-label', 0, 0),
  point('a2', 10, 0),
  point('a3', 20, 0),
  point('b1', 0, 10),
  point('b3', 20, 10),
  point('c1', 0, 20),
  point('c2', 10, 20),
  point('c3', 20, 20),
]

function step(from: string | null, key: string, modifier = false) {
  const current = from
    ? (points.find((candidate) => candidate.key === from) ?? null)
    : null
  return focusGrid.step(points, { point: current, key, modifier })?.key
}

describe('grid focus strategy', () => {
  it('moves within rows and columns and skips missing cells', () => {
    expect(step('a1', 'ArrowRight')).toBe('a2')
    expect(step('a2', 'ArrowLeft')).toBe('a1')
    expect(step('a2', 'ArrowDown')).toBe('c2')
    expect(step('c2', 'ArrowUp')).toBe('a2')
    expect(step('b1', 'ArrowRight')).toBe('b3')
    expect(step('b3', 'ArrowLeft')).toBe('b1')
    // A label sharing a cell moves like the cell it labels.
    expect(step('a1-label', 'ArrowDown')).toBe('b1')
  })

  it('stays on the edge cell and handles row and grid extremes', () => {
    expect(step('a3', 'ArrowRight')).toBe('a3')
    expect(step('c1', 'ArrowDown')).toBe('c1')
    expect(step('b3', 'Home')).toBe('b1')
    expect(step('b1', 'End')).toBe('b3')
    expect(step('b3', 'Home', true)).toBe('a1')
    expect(step('a1', 'End', true)).toBe('c3')
    expect(step(null, 'ArrowDown')).toBe('a1')
    expect(step('a1', 'Enter')).toBeUndefined()
  })

  it('orders the fallback task list row by row and resolves inside a cell', () => {
    expect(focusGrid.navigation(points).map((item) => item.key)).toEqual([
      'a1',
      'a2',
      'a3',
      'b1',
      'b3',
      'c1',
      'c2',
      'c3',
    ])
    expect(
      focusGrid
        .resolve(points, { x: 14, y: 16, maxDistance: 1 })
        .map((item) => item.key),
    ).toEqual(['c2'])
  })

  it('leaves the built-in strategies on navigation order', () => {
    for (const strategy of [
      focusGroupX,
      focusGroupY,
      focusNearestX,
      focusNearestY,
    ]) {
      expect('step' in strategy).toBe(false)
    }
  })

  it('drives mounted keyboard focus and keeps row and column in the tooltip', () => {
    const rows = [
      { team: 'Core', quarter: 'Q1', score: 72 },
      { team: 'Core', quarter: 'Q2', score: 78 },
      { team: 'Cloud', quarter: 'Q1', score: 66 },
      { team: 'Cloud', quarter: 'Q2', score: 74 },
    ]
    const definition = defineChart(
      defineChart({
        marks: [cell(rows, { x: 'quarter', y: 'team', color: 'score' })],
        ...bandAxes(['Q1', 'Q2'], ['Core', 'Cloud']),
      }),
      { focus: focusGrid, tooltip },
    )
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const host = mountChart(container, {
      definition,
      width: 320,
      height: 200,
      ariaLabel: 'Scores',
      onFocusChange,
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    const focused = () => onFocusChange.mock.calls.at(-1)?.[0]?.datum

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(focused()).toBe(rows[0])
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
    )
    expect(focused()).toBe(rows[2])
    svg.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'End',
        ctrlKey: true,
      }),
    )
    expect(focused()).toBe(rows[3])
    const text = container.querySelector('.ts-chart-tooltip')?.textContent
    expect(text).toContain('Q2')
    expect(text).toContain('Cloud')
    host.destroy()
  })
})

function point(key: string, x: number, y: number): ChartPoint {
  return {
    color: 'currentColor',
    datum: null,
    datumIndex: 0,
    group: null,
    groupLabel: '',
    key,
    markId: 'test',
    x,
    xValue: x,
    y,
    yValue: y,
  }
}
