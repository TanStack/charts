import { valueKey } from './scales'
import type { ChartKey, ResolvedColorScale } from './types'

export interface CategoricalLegendItem<TValue extends ChartKey = ChartKey> {
  key: string
  value: TValue
  label: string
  color: string
}

export interface CategoricalLegendLayout {
  columns: number
  rows: number
  itemWidth: number
}

export interface CategoricalLegendFlowItem {
  index: number
  row: number
  x: number
  width: number
}

export interface CategoricalLegendFlowLayout {
  rows: number
  items: readonly CategoricalLegendFlowItem[]
}

export function resolveCategoricalLegendItems<
  TValue extends ChartKey = ChartKey,
>(
  colors: ResolvedColorScale,
  format: (value: TValue) => string = String,
): readonly CategoricalLegendItem<TValue>[] {
  return colors.domain.map((value) => ({
    key: valueKey(value),
    value: value as TValue,
    label: format(value as TValue),
    color: colors.map(value),
  }))
}

export function layoutCategoricalLegendItems(
  itemCount: number,
  width: number,
  minimumItemWidth: number,
): CategoricalLegendLayout {
  const columns = Math.max(
    1,
    Math.min(itemCount || 1, Math.floor(width / minimumItemWidth) || 1),
  )
  return {
    columns,
    rows: Math.ceil(itemCount / columns),
    itemWidth: width / columns,
  }
}

export function layoutCategoricalLegendFlow(
  itemWidths: readonly number[],
  width: number,
  gap: number,
  justify: 'start' | 'center',
): CategoricalLegendFlowLayout {
  const availableWidth = Math.max(0, finiteNumber(width))
  const itemGap = Math.max(0, finiteNumber(gap))
  const rows: { indexes: number[]; width: number }[] = []

  itemWidths.forEach((candidateWidth, index) => {
    const itemWidth = Math.min(
      availableWidth,
      Math.max(0, finiteNumber(candidateWidth)),
    )
    const row = rows.at(-1)
    const nextWidth = row ? row.width + itemGap + itemWidth : itemWidth
    if (!row || nextWidth > availableWidth) {
      rows.push({ indexes: [index], width: itemWidth })
      return
    }
    row.indexes.push(index)
    row.width = nextWidth
  })

  const items: CategoricalLegendFlowItem[] = []
  rows.forEach((row, rowIndex) => {
    let x = justify === 'center' ? (availableWidth - row.width) / 2 : 0
    row.indexes.forEach((index) => {
      const itemWidth = Math.min(
        availableWidth,
        Math.max(0, finiteNumber(itemWidths[index])),
      )
      items.push({ index, row: rowIndex, x, width: itemWidth })
      x += itemWidth + itemGap
    })
  })

  return { rows: rows.length, items }
}

function finiteNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
