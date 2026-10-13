import { createDecorativeMark } from './mark-decorative-internal'
import {
  collectMarkScenePoints,
  stripMarkSceneInteraction,
} from './mark-scene-filter-internal'
import type { ChartMark, DecorativeChartMark } from './types'

/** Keeps one mark's scale and painted geometry while removing interaction ownership. */
export function decorative<
  const TMark extends ChartMark<any, any, any, any, any, any, any>,
>(
  mark: TMark & { readonly __focusFiltered?: never },
): DecorativeChartMark<TMark> {
  return createDecorativeMark(
    mark,
    (scene, { id, states }) =>
      stripMarkSceneInteraction(
        states
          ? {
              ...scene,
              nodes: [
                {
                  kind: 'group',
                  key: `states:${id}`,
                  children: scene.nodes,
                  states: { ...states, points: collectMarkScenePoints(scene) },
                },
              ],
            }
          : scene,
        {
          conditional: 'preserve-states',
        },
      ),
    {
      conditional: 'preserve-states',
      layoutLabels: 'preserve',
    },
  ) as unknown as DecorativeChartMark<TMark>
}
