import { describe, expect, it } from 'vitest'
import { chartSizingStyle, resolveChartSize } from './sizing'

describe('chart sizing', () => {
  it('treats fixed height as Plot height while allowing host content to grow', () => {
    expect(chartSizingStyle({ height: 320 })).toEqual({
      width: '100%',
      minHeight: 320,
      minWidth: 0,
    })
    expect(
      resolveChartSize({ width: 640, height: 348 }, { height: 320 }),
    ).toEqual({
      width: 640,
      height: 320,
    })
  })

  it('derives and clamps aspect-ratio height from container width', () => {
    expect(
      resolveChartSize(
        { width: 900, height: 0 },
        { aspectRatio: 2, minHeight: 240, maxHeight: 400 },
      ),
    ).toEqual({
      width: 900,
      height: 400,
    })
  })

  it('uses measured dimensions when filling an explicitly sized container', () => {
    expect(
      resolveChartSize({ width: 640, height: 480 }, { fill: true }),
    ).toEqual({
      width: 640,
      height: 480,
    })
  })
})
