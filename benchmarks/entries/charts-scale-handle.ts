import { mountChart } from '../../packages/charts-core/src/dom'
import { handleX } from '../../packages/charts-core/src/interaction-handle'
import { controlledSignal } from '../../packages/charts-core/src/interaction-signal'

const values = [0, 1, 2, 3] as const

export const value = controlledSignal<number>(1, () => {})
export const horizontalHandle = handleX({
  value,
  values,
  cross: { edge: 'bottom' },
  ariaLabel: 'Timeline position',
})

export { mountChart }
