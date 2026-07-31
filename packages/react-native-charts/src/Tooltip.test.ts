import { describe, expect, it, vi } from 'vitest'
import type { ChartPoint, ChartScene } from '@tanstack/charts/types'
import { createNativeTooltipContent, placeNativeTooltip } from './Tooltip'

vi.mock('react-native', () => ({
  Text: 'span',
  View: 'div',
}))

describe('native tooltip model', () => {
  it('builds the supported shared-axis default content', () => {
    const points = [point('alpha', 'Alpha', 3), point('beta', 'Beta', 7)]

    expect(createNativeTooltipContent(points, scene(points))).toEqual({
      title: 'x: 1',
      rows: [
        { label: 'Alpha', value: '3', color: '#2563eb' },
        { label: 'Beta', value: '7', color: '#f97316' },
      ],
    })
  })

  it('chooses and clamps a placement inside the native layout boundary', () => {
    expect(
      placeNativeTooltip(
        { x: 4, y: 4 },
        { width: 20, height: 10 },
        { width: 100, height: 60 },
        'top',
        10,
      ),
    ).toEqual({ left: 8, top: 8, placement: 'top' })
  })
})

function point(
  key: string,
  groupLabel: string,
  yValue: number,
): ChartPoint<unknown, number, number> {
  return {
    key,
    markId: 'series',
    group: key,
    groupLabel,
    datum: null,
    datumIndex: 0,
    xValue: 1,
    yValue,
    x: 20,
    y: yValue * 4,
    color: key === 'alpha' ? '#2563eb' : '#f97316',
  }
}

function scene(
  points: readonly ChartPoint<unknown, number, number>[],
): ChartScene<unknown, number, number> {
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes: [],
    points,
    scales: {},
    colors: {
      type: 'ordinal',
      domain: ['alpha', 'beta'],
      range: ['#2563eb', '#f97316'],
      map: (value) => (value === 'beta' ? '#f97316' : '#2563eb'),
    },
    gradients: [],
    theme: {
      foreground: '#111827',
      muted: '#6b7280',
      grid: '#d1d5db',
      background: 'transparent',
      palette: ['#2563eb', '#f97316'],
    },
  }
}
