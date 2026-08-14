import { createElement } from 'react'
import Example, { definition } from './example'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackExampleMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const ConformanceExample = ({ input }: { input: ConformanceInput }) =>
  createElement(Example, { width: input.width, height: input.height })

export * from './example'
export const shadcnDefinition = definition

export const mount = shadcnChartMount(ConformanceExample)
export const catalogCase = tanstackExampleMount(
  () => definition,
  'Radar Chart - Grid Filled implemented with TanStack Charts',
  { guides: true, margin: true },
)
