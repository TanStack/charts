import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { CityMap, cityMark, cityFocus } from '@tanstack/charts/react/city'
import { districtMasks, districtColors, storesForRevision } from './data'

export interface ChartOptions {
  revision: number
}
export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export function createExampleChart(input: ChartOptions) {
  return defineChart({
    marks: [cityMark(storesForRevision(input.revision))],
    scales: {
      x: { scale: scaleLinear, axis: false },
      y: { scale: scaleLinear, axis: false },
    },
    color: { domain: districtMasks, range: districtColors },
    margin: 0,
    guides: false,
    focus: cityFocus,
  })
}

export const exampleAriaLabel = 'Store health city'
export const chart = createExampleChart({ revision: 0 })

export default function Example({
  width = 960,
  height = 720,
  revision = 0,
}: ExampleProps) {
  const records = useMemo(() => storesForRevision(revision), [revision])
  return (
    <div style={{ width, minHeight: height }}>
      <CityMap
        data={records}
        title="Store health"
        ariaLabel={exampleAriaLabel}
        showEnvironmentControls
      />
    </div>
  )
}
