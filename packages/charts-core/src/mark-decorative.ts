import { createDecorativeMark } from './mark-decorative-internal'
import { stripMarkSceneInteraction } from './mark-scene-filter-internal'
import type { ChartMark, DecorativeChartMark } from './types'

/** Keeps one mark's scale and painted geometry while removing interaction ownership. */
export function decorative<
  const TMark extends ChartMark<any, any, any, any, any>,
>(mark: TMark): DecorativeChartMark<TMark> {
  return createDecorativeMark(
    mark,
    (scene) =>
      stripMarkSceneInteraction(scene, {
        conditional: 'reject',
      }),
    {
      conditional: 'reject',
      layoutLabels: 'preserve',
    },
  ) as unknown as DecorativeChartMark<TMark>
}
