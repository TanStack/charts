import { springLineMotionDefinition } from './example'
import type { SpringLineTransitionMode } from './example'
export { springLineMotionDefinition } from './example'
export type { SpringLineTransitionMode } from './example'
import { springLineStages } from './model'
import { tanstackCase } from '../../shared/mount'

export { default as Example } from './example'

export { mount } from './view'

export const catalogCase = tanstackCase(
  (input) =>
    springLineMotionDefinition(
      springLineStages[Math.abs(input.revision) % springLineStages.length] ??
        springLineStages[0],
      'spring',
    ),
  'Primary and comparison series with spring motion',
)
