import { createExampleChart, exampleAriaLabel } from './example'
import { tanstackExampleMount } from '../../shared/mount'

export * from './example'

export const mount = tanstackExampleMount(
  createExampleChart,
  exampleAriaLabel,
  { margin: true },
)

export const catalogCase = mount
