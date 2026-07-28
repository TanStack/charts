import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { describe, expect, it } from 'vitest'
import {
  createStressSource,
  prepareStressInput,
  prepareStressUpdate,
} from '../stress/data'
import {
  groupedVisibleSeriesRows,
  multiSeriesWideRows,
  seriesColor,
  seriesFromColor,
  visibleSeries,
} from './tier'
import {
  rechartsGroupedPointerTarget,
  rechartsLineSeriesProbe,
  rechartsScatterItemCount,
} from './recharts'

type RechartsScatterShape = NonNullable<
  React.ComponentProps<typeof Scatter>['shape']
>
type RechartsScatterShapeRenderer = Extract<
  RechartsScatterShape,
  (...args: never[]) => unknown
>

function renderRechartsScatter(shape?: RechartsScatterShape) {
  const container = document.createElement('div')
  const root = createRoot(container)
  const data = [
    { x: 1, y: 3 },
    { x: 2, y: 1 },
    { x: 3, y: 2 },
  ]

  flushSync(() => {
    root.render(
      React.createElement(
        ScatterChart,
        { width: 400, height: 300 },
        React.createElement(XAxis, {
          dataKey: 'x',
          domain: [0, 4],
          type: 'number',
        }),
        React.createElement(YAxis, {
          dataKey: 'y',
          domain: [0, 4],
          type: 'number',
        }),
        React.createElement(Scatter, {
          data,
          isAnimationActive: false,
          shape,
        }),
      ),
    )
  })

  return { container, root }
}

const nestedScatterSymbol: RechartsScatterShapeRenderer = ({
  className,
  cx,
  cy,
}) => {
  return React.createElement('circle', {
    className: `${className ?? ''} recharts-scatter-symbol`.trim(),
    cx,
    cy,
    r: 2,
  })
}

describe('multi-series benchmark adapter preparation', () => {
  const source = createStressSource('stats-multi-series-line', 2_080, 0)
  const initial = prepareStressInput(
    'stats-multi-series-line',
    source,
    800,
    400,
  )

  it('preserves a complete long-form group and wide row for every x bucket', () => {
    const groups = groupedVisibleSeriesRows(initial.input)
    const wide = multiSeriesWideRows(initial.input)

    expect(groups).toHaveLength(8)
    expect(groups.every(([, rows]) => rows.length === 260)).toBe(true)
    expect(wide).toHaveLength(260)
    expect(
      wide.every((row) =>
        visibleSeries(initial.input).every(
          (series) => typeof row[series] === 'number',
        ),
      ),
    ).toBe(true)
  })

  it('keeps color identity stable across series reorder and visibility changes', () => {
    const reordered = prepareStressUpdate(
      'stats-multi-series-line',
      'reorder',
      source,
      initial,
      800,
      400,
    )
    const hidden = prepareStressUpdate(
      'stats-multi-series-line',
      'toggle-series',
      source,
      initial,
      800,
      400,
    )

    for (const series of initial.input.seriesDomain ?? []) {
      const color = seriesColor(initial.input, series)
      expect(seriesColor(reordered.input, series)).toBe(color)
      expect(seriesColor(hidden.input, series)).toBe(color)
      expect(seriesFromColor(initial.input, color)).toBe(series)
    }
    expect(visibleSeries(hidden.input)).toHaveLength(7)
    expect(multiSeriesWideRows(hidden.input)).toHaveLength(260)
  })

  it('reads Recharts path identity independently of DOM order', () => {
    const reordered = prepareStressUpdate(
      'stats-multi-series-line',
      'reorder',
      source,
      initial,
      800,
      400,
    )
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    for (const series of initial.input.seriesOrder ?? []) {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      )
      path.classList.add('recharts-line-curve')
      path.setAttribute('name', series)
      path.setAttribute('stroke', seriesColor(initial.input, series))
      path.setAttribute('d', 'M0,0L1,1L2,2')
      svg.append(path)
    }

    const paths = rechartsLineSeriesProbe(svg, reordered.input)

    expect(paths.map(({ series }) => series)).toEqual(
      reordered.input.seriesOrder,
    )
    for (const { series, color, vertices } of paths) {
      expect(color).toBe(seriesColor(initial.input, series))
      expect(vertices).toBe(3)
    }
  })

  it('maps a reordered grouped pointer target through the scale domain', () => {
    const reordered = prepareStressUpdate(
      'stats-multi-series-line',
      'reorder',
      source,
      initial,
      800,
      400,
    )

    const target = rechartsGroupedPointerTarget(reordered.input, 0.5)

    expect(target?.row.x).toBe(129)
    expect(target?.domainRatio).toBe(129 / 259)
    expect(target?.hitRegionRatio).toBe(129.4 / 259)
  })

  it('keeps an even point-count target inside its Recharts hit region', () => {
    const standardSource = createStressSource(
      'stats-multi-series-line',
      12_480,
      0,
    )
    const standard = prepareStressInput(
      'stats-multi-series-line',
      standardSource,
      800,
      400,
    )

    const target = rechartsGroupedPointerTarget(standard.input, 0.5)

    expect(target?.row.x).toBe(260)
    expect(target?.domainRatio).toBe(260 / 519)
    expect(target?.hitRegionRatio).toBe(260.4 / 519)
  })

  it('counts one semantic Recharts scatter item for default and nested custom shapes', () => {
    const defaultScatter = renderRechartsScatter()
    const customScatter = renderRechartsScatter(nestedScatterSymbol)

    expect(
      defaultScatter.container.querySelectorAll('.recharts-scatter-symbol'),
    ).toHaveLength(3)
    expect(rechartsScatterItemCount(defaultScatter.container)).toBe(3)
    expect(
      customScatter.container.querySelectorAll('.recharts-scatter-symbol'),
    ).toHaveLength(6)
    expect(rechartsScatterItemCount(customScatter.container)).toBe(3)

    flushSync(() => {
      defaultScatter.root.unmount()
      customScatter.root.unmount()
    })
  })
})
