import type { ChartFocusStrategy } from './types'

export const focusDisabled: ChartFocusStrategy = {
  resolve: () => [],
  group: () => [],
  navigation: () => [],
}
