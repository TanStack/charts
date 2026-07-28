import { createMarkWithScaleValues } from '@tanstack/charts/mark/scale-values'

interface Interval {
  category: string
  value: number
}

export const intervalMark = createMarkWithScaleValues<
  Interval,
  number,
  number,
  string,
  number
>(() => ({
  id: 'interval',
  channels: {},
  render: () => ({ nodes: [] }),
}))
