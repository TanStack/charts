import { createExampleChart, exampleAriaLabel } from './example'
import { tanstackExampleMount } from '../../shared/mount'

export * from './example'

export const mount = tanstackExampleMount(createExampleChart, exampleAriaLabel)

export const catalogCase = mount
