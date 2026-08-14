import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { colorLegend, defineChart, waffleY } from '@tanstack/charts'
import { alphabet } from '@charts-poc/demo-data/alphabet'

const colors = [
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#f97316',
  '#2563eb',
  '#06b6d4',
]
const letters = alphabet.map((row) => row.letter)

const waffleDefinition = (showLegend: boolean) =>
  defineChart({
    marks: [
      waffleY(alphabet, {
        y: 'frequency',
        color: 'letter',
        key: 'letter',
        unit: 0.01,
        gap: 2,
        round: true,
        radius: 2,
      }),
    ],
    guides: false,
    color: {
      domain: letters,
      range: colors,
      ...(showLegend ? { legend: colorLegend({ label: 'Letter' }) } : {}),
    },
  })

export const definition = () => waffleDefinition(true)

export const exampleAriaLabel = 'English letter frequency waffle chart'

export const createExampleChart = () =>
  defineChart(definition(), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
