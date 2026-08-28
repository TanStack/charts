import { colorLegend, colorLegendItems } from '@tanstack/charts/legend'

export const legend = colorLegend<'Revenue' | 'Orders'>({
  placement: 'bottom',
  items: colorLegendItems({
    justify: 'center',
    gap: 20,
    rowGap: 10,
    indicator: {
      width: 20,
      height: 14,
      gap: 6,
      shape: (series) => (series === 'Revenue' ? 'line-dot' : 'square'),
    },
    label: {
      fontSize: 14,
      fill: (_series, { color }) => color,
    },
  }),
})
