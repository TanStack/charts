import { createDecorativeMark } from './mark-decorative-internal'
import { filterMarkSceneByPoint } from './mark-scene-filter-internal'
import { valueKey } from './scales'
import type { ControlledSignal } from './interaction-signal'
import type {
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartSelectionController,
  ChartSelectionSource,
  ChartValue,
  MarkScene,
} from './types'

export type KeyedSelectionChange<
  TDatum,
  TKey extends ChartKey,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | {
      type: 'select'
      value: TKey
      point: ChartPoint<TDatum, TXValue, TYValue>
      source: ChartSelectionSource
    }
  | {
      type: 'clear'
      value: null
      point: null
      source: ChartSelectionSource
    }

export interface KeyedSelectionKeyContext<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  readonly point: ChartPoint<TDatum, TXValue, TYValue>
}

export interface KeyedSelectionOptions<
  TDatum,
  TKey extends ChartKey,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  selected: ControlledSignal<
    TKey | null,
    KeyedSelectionChange<TDatum, TKey, TXValue, TYValue>
  >
  /** Return null or undefined when a point is not selectable. */
  key: (
    datum: TDatum,
    context: KeyedSelectionKeyContext<TDatum, TXValue, TYValue>,
  ) => TKey | null | undefined
}

export interface KeyedSelection<
  TDatum,
  TKey extends ChartKey,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartSelectionController<TDatum, TXValue, TYValue> {
  readonly selected: ControlledSignal<
    TKey | null,
    KeyedSelectionChange<TDatum, TKey, TXValue, TYValue>
  >
  readonly key: KeyedSelectionOptions<TDatum, TKey, TXValue, TYValue>['key']
  readonly matches: (point: ChartPoint<TDatum, TXValue, TYValue>) => boolean
}

export function keyedSelection<
  TDatum,
  TKey extends ChartKey,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  options: KeyedSelectionOptions<TDatum, TKey, TXValue, TYValue>,
): KeyedSelection<TDatum, TKey, TXValue, TYValue> {
  const matches = (point: ChartPoint<TDatum, TXValue, TYValue>) => {
    const selected = options.selected.value
    const key = options.key(point.datum, { point })
    return (
      selected !== null &&
      key !== null &&
      key !== undefined &&
      valueKey(selected) === valueKey(key)
    )
  }

  return {
    type: 'keyed',
    selected: options.selected,
    key: options.key,
    matches,
    change(point, source) {
      if (point) {
        const next = options.key(point.datum, { point })
        if (next === null || next === undefined) return
        options.selected.onChange(next, {
          reason: {
            type: 'select',
            value: next,
            point,
            source,
          },
        })
        return
      }
      if (options.selected.value === null) return
      const next = null
      options.selected.onChange(next, {
        reason: {
          type: 'clear',
          value: next,
          point,
          source,
        },
      })
    },
  }
}

/** Paints one ordinary mark only for the selected semantic key. */
export function whenSelected<
  TDatum,
  TKey extends ChartKey,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
>(
  mark: ChartMark<
    TDatum,
    TXPointValue,
    TYPointValue,
    TXScaleValue,
    TYScaleValue
  >,
  selection: KeyedSelection<TDatum, TKey, TXPointValue, TYPointValue>,
): ChartMark<TDatum, never, never, TXScaleValue, TYScaleValue> {
  const filter = (
    scene: MarkScene<TDatum, TXPointValue, TYPointValue>,
  ): MarkScene<TDatum, TXPointValue, TYPointValue> =>
    filterMarkSceneByPoint(scene, selection.matches, {
      interaction: 'remove',
    })

  return createDecorativeMark(mark, filter, {
    conditional: 'remove',
    layoutLabels: 'remove',
  })
}
