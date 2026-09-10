import { describe, expect, it } from 'vitest'
import { layoutCategoricalLegendFlow } from './legend-layout-internal'

describe('categorical legend flow layout', () => {
  it('wraps measured items without stretching them', () => {
    expect(layoutCategoricalLegendFlow([66, 86, 66], 200, 20, 'start')).toEqual(
      {
        rows: 2,
        items: [
          { index: 0, row: 0, x: 0, width: 66 },
          { index: 1, row: 0, x: 86, width: 86 },
          { index: 2, row: 1, x: 0, width: 66 },
        ],
      },
    )
  })

  it('centers each wrapped row', () => {
    expect(
      layoutCategoricalLegendFlow([66, 86, 66], 200, 20, 'center'),
    ).toEqual({
      rows: 2,
      items: [
        { index: 0, row: 0, x: 14, width: 66 },
        { index: 1, row: 0, x: 100, width: 86 },
        { index: 2, row: 1, x: 67, width: 66 },
      ],
    })
  })
})
