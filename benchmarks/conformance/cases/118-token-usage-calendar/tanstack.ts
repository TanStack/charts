import { createExampleChart, exampleAriaLabel } from './example'
import { tanstackExampleMount } from '../../shared/mount'
import { withTokenActivityShell } from './shell'

export * from './example'

export const catalogCase = tanstackExampleMount(
  createExampleChart,
  exampleAriaLabel,
  { guides: true, margin: true },
)

export const mount = withTokenActivityShell(catalogCase)
