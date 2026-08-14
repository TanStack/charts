import { focusCursorMotionDefinition } from './example'
export { focusCursorMotionDefinition } from './example'
import { tanstackCase } from '../../shared/mount'

export { default as Example } from './example'

export { mount } from './view'

export const catalogCase = tanstackCase(
  focusCursorMotionDefinition,
  'Grouped line chart with animated focus and crosshair',
  true,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'series-points' && point.datum.id === 'Alpha:Sat',
        ) ?? null
      )
    },
  },
)
