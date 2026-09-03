import { definitionMotionDefinition } from './example'
export { definitionMotionDefinition } from './example'
import { definitionMotionStages } from './model'
import { tanstackCase } from '../../shared/mount'

export { default as Example } from './example'

export { mount } from './view'

export const catalogCase = tanstackCase(
  (input) =>
    definitionMotionDefinition(
      definitionMotionStages[
        Math.abs(input.revision) % definitionMotionStages.length
      ] ?? definitionMotionStages[0],
      input.preview === true,
    ),
  'Definition-owned chart, mark, datum, and guide motion',
  true,
  { guides: true, margin: true },
)
