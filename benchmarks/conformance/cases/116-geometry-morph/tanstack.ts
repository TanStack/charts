import { geometryMorphDefinition, modeForRevision, modeLabel } from './example'
import { morphData } from './model'
import { tanstackCase } from '../../shared/mount'

export { geometryMorphDefinition, modeForRevision, modeLabel } from './example'
export { default as Example } from './example'
export { mount } from './view'

export const catalogCase = tanstackCase(
  (input) =>
    geometryMorphDefinition(morphData, modeForRevision(input.revision)),
  'Data morphing between bars, line, area, rose, and bubbles',
)
