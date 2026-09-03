import { composeInitializedMarks } from './mark-composite-internal'
import { compositeChildMarkId } from './mark-composite-internal'
import type { ChartValue, InitializedMark, ResolvedMarkLayout } from './types'

type AnyInitializedMark = InitializedMark<any, any, any>

type ChildDatum<TMark> =
  TMark extends InitializedMark<infer TDatum, any, any> ? TDatum : never

type ChildXValue<TMark> =
  TMark extends InitializedMark<any, infer TXValue, any> ? TXValue : never

type ChildYValue<TMark> =
  TMark extends InitializedMark<any, any, infer TYValue> ? TYValue : never

/** Adopts the resolved fields of a direct child mark without nesting layouts. */
export function adoptResolvedChildMark<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  child: InitializedMark<TDatum, TXValue, TYValue>,
): ResolvedMarkLayout<TDatum, TXValue, TYValue> {
  if (child.resolveLayout) {
    throw new TypeError(
      `Resolved layout cannot adopt child mark "${child.id}" because it has its own layout`,
    )
  }
  return {
    channels: child.channels,
    states: child.states,
    postDomain: child.postDomain,
    layoutLabels: child.layoutLabels,
    render: child.render,
  }
}

/** Composes direct child marks that already express final pixel coordinates. */
export function composeResolvedChildMarks<
  const TChildren extends readonly AnyInitializedMark[],
>(
  parentId: string,
  children: TChildren,
): ResolvedMarkLayout<
  ChildDatum<TChildren[number]>,
  ChildXValue<TChildren[number]>,
  ChildYValue<TChildren[number]>
> {
  const composition = composeInitializedMarks(parentId, children, {
    coordinates: 'pixel',
    owner: 'Resolved layout',
  })
  return {
    channels: composition.channels,
    layoutLabels: composition.layoutLabels,
    render: composition.render,
  }
}

/** Resolves one direct child's stable mark and scene namespace. */
export const resolvedChildMarkId = compositeChildMarkId
