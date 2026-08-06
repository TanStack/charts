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
