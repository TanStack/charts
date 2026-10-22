import { useMemo, type CSSProperties } from 'react'
import { defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { CityMap, cityMark, cityFocus } from '@tanstack/charts/react/city'
import { districtMasks, districtColors, storesForRevision } from './data'
import './styles.css'

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
    <div className="sc-example sc-city-map" style={{ width }}>
      <article
        className="sc-card sc-default"
        style={
          {
            width,
            '--atlas-city-height': `${Math.max(520, height - 160)}px`,
          } as CSSProperties
        }
      >
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>City Map - Store Health</h2>
            <p>Orders and store health across category districts</p>
          </div>
        </header>
        <div className="sc-card-content">
          <CityMap
            data={records}
            title="Store health"
            ariaLabel={exampleAriaLabel}
            showMonitor={false}
            showEnvironmentControls={false}
            showCompass={false}
            showInstructions={false}
            showSearch={false}
            lightingMode="day"
          />
        </div>
        <footer className="sc-card-footer">
          <span>{records.length} stores across 7 districts</span>
          <span className="sc-footer-note">
            Building heights represent orders. Select a building for details.
          </span>
        </footer>
      </article>
    </div>
  )
}
