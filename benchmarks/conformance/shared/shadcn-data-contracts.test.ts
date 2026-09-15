import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { createExampleChart as stackedRadial } from '../cases/189-shadcn-radial-stacked/example'

describe('pinned shadcn example data contracts', () => {
  it('stacks 570 mobile and 1260 desktop visitors without losing desktop values', () => {
    const scene = createChartRuntime().render(stackedRadial(), {
      width: 250,
      height: 250,
    })
    const rows = scene.points
      .map((point) => point.datum)
      .filter(
        (datum): datum is { id: string; start: number; end: number } =>
          typeof datum === 'object' &&
          datum !== null &&
          'start' in datum &&
          'end' in datum,
      )
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'mobile', start: 0, end: 570 }),
        expect.objectContaining({ id: 'desktop', start: 570, end: 1830 }),
      ]),
    )
  })
})
