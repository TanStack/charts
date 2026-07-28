import * as React from 'react'
import {
  downloadData,
  downloadsRenderer,
  latencyData,
  latencyDistributionRenderer,
  type DownloadPoint,
} from '@plot-poc/fixtures'
import { Chart } from '@plot-poc/react-host'
import type { ChartRenderMetrics } from '@plot-poc/host-core'

export function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [selected, setSelected] = React.useState<DownloadPoint>()
  const [trendRender, setTrendRender] = React.useState<ChartRenderMetrics>()

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  return (
    <main className="demo">
      <header className="demo__header">
        <div>
          <p className="demo__eyebrow">React proof</p>
          <h1>Observable Plot, application ready.</h1>
          <p className="demo__lede">
            One shared definition model with container sizing, inherited themes,
            and application-facing interaction state.
          </p>
        </div>
        <button className="theme-toggle" type="button" onClick={toggleTheme}>
          Use {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </header>

      <div className="demo__grid">
        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Package momentum</h2>
              <p className="chart-card__meta">
                {selected
                  ? `${selected.package}: ${selected.downloads.toLocaleString()}`
                  : 'Point at a series to inspect its value.'}
              </p>
            </div>
            <span className="chart-card__badge">
              {trendRender
                ? `${trendRender.duration.toFixed(1)}ms render`
                : 'Measuring'}
            </span>
          </div>
          <Chart
            data={downloadData}
            renderer={downloadsRenderer}
            sizing={{ height: 330 }}
            initialSize={{ width: 760, height: 330 }}
            ariaLabel="TanStack package download trends"
            onValueChange={setSelected}
            onRender={setTrendRender}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Latency shape by plan</h2>
              <p className="chart-card__meta">
                Facets reflow vertically when their container becomes narrow.
              </p>
            </div>
            <span className="chart-card__badge">Plot transform + facets</span>
          </div>
          <Chart
            data={latencyData}
            renderer={latencyDistributionRenderer}
            sizing={{ height: 360 }}
            initialSize={{ width: 760, height: 360 }}
            ariaLabel="Request latency distributions by plan"
          />
        </section>
      </div>
    </main>
  )
}
