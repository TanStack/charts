import { motionUpdatesDefinition, readEasing, springRegime } from './example'
import type { UpdateSettings } from './example'
export { motionUpdatesDefinition, readEasing, springRegime } from './example'
export type { UpdateSettings } from './example'
import { updateStages as stages } from './model'
import { tanstackCase } from '../../shared/mount'

export { default as Example } from './example'

export { mount } from './view'

export const catalogCase = tanstackCase(
  (input) =>
    motionUpdatesDefinition(
      stages[Math.abs(input.revision) % stages.length] ?? stages[0],
      {
        duration: 1_100,
        easing: undefined,
        spring: false,
        stiffness: 170,
        damping: 14,
        mass: 1,
      },
    ),
  'Keyed actuals and targets during interrupted updates',
)
