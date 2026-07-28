import * as React from 'react'
import { focusX } from '@tanstack/charts/focus'
import type { ChartPoint, ChartRenderContext } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import { createBarData, createTrendData } from './data'
import type { BarPoint, TrendPoint } from './data'
import {
  createBarsChart,
  createTrendChart,
  type BarInput,
  type DefinitionCounters,
  type TrendCurve,
  type TrendDisplay,
  type TrendInput,
} from './plots'

interface Diagnostics {
  points: number
  prepares: number
  renders: number
  width: number
}

const dynamicCode = `import { d3Curve, defineChart, lineY } from "@tanstack/charts"
import { extent } from "d3-array"
import { scaleLinear, scaleUtc } from "d3-scale"
import { curveCatmullRom, curveStep } from "d3-shape"

const trendChart = defineChart<TrendInput>()({
  prepare: input => ({
    points: movingAverage(input.points, input.movingAverage),
  }),
  prepareEqual: (a, b) =>
    a.points === b.points &&
    a.movingAverage === b.movingAverage,
  chart: ({ input, prepared, width, theme }) => ({
    marks: [lineY(prepared.points, {
      x: "date",
      y: "value",
      curve: resolveCurve(input.curve),
      stroke: theme.palette[0],
    })],
    x: {
      scale: scaleUtc().domain(dateDomain(prepared.points)),
      ticks: width < 440 ? 4 : 8,
    },
    y: {
      scale: scaleLinear()
        .domain(zeroIncludingDomain(prepared.points))
        .nice(5),
    },
  }),
})

<Chart
  definition={trendChart}
  input={{ points, display, curve, movingAverage, showDots }}
  height={320}
  focus={focusX}
  tooltip
/>`

const transitionCode = `import { defineChart, barY } from "@tanstack/charts"
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale"

const rankingChart = defineChart<BarInput>()({
  prepare: ({ rows, order }) => ({
    rows: sortRows(rows, order),
  }),
  chart: ({ prepared, theme }) => {
    const names = prepared.rows.map(row => row.name)
    return {
      marks: [barY(prepared.rows, {
        x: "name",
        y: "value",
        color: "name",
        key: "name",
      })],
      x: {
        scale: scaleBand()
          .domain(names)
          .paddingInner(0.1)
          .paddingOuter(0.05),
      },
      y: { scale: scaleLinear().domain([0, 100]) },
      color: {
        scale: scaleOrdinal()
          .domain(names)
          .range(theme.palette),
      },
    }
  },
})

<Chart
  definition={rankingChart}
  input={{ rows, order }}
  height={340}
  animate={animate
    ? { duration: 520, easing: "ease-out" }
    : false}
  focus={focusX}
  tooltip
/>`

export function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [unrelatedRenders, setUnrelatedRenders] = React.useState(0)
  const [trendSeed, setTrendSeed] = React.useState(1)
  const [trendPoints, setTrendPoints] = React.useState(() => createTrendData(1))
  const [display, setDisplay] = React.useState<TrendDisplay>('area')
  const [curve, setCurve] = React.useState<TrendCurve>('catmull-rom')
  const [movingAverage, setMovingAverage] = React.useState(1)
  const [showDots, setShowDots] = React.useState(true)
  const [panelWidth, setPanelWidth] = React.useState(100)
  const [barSeed, setBarSeed] = React.useState(1)
  const [barRows, setBarRows] = React.useState(() => createBarData(1))
  const [barOrder, setBarOrder] = React.useState<'name' | 'value'>('value')
  const [animate, setAnimate] = React.useState(true)
  const [trendFocus, setTrendFocus] =
    React.useState<ChartPoint<TrendPoint> | null>(null)
  const [barFocus, setBarFocus] = React.useState<ChartPoint<BarPoint> | null>(
    null,
  )
  const trendCounters = React.useRef<DefinitionCounters>({ prepares: 0 })
  const barCounters = React.useRef<DefinitionCounters>({ prepares: 0 })
  const trendRenders = React.useRef(0)
  const barRenders = React.useRef(0)
  const trendDefinition = React.useMemo(
    () => createTrendChart(trendCounters.current),
    [],
  )
  const barDefinition = React.useMemo(
    () => createBarsChart(barCounters.current),
    [],
  )
  const trendInput = React.useMemo<TrendInput>(
    () => ({
      points: trendPoints,
      display,
      curve,
      movingAverage,
      showDots,
    }),
    [curve, display, movingAverage, showDots, trendPoints],
  )
  const barInput = React.useMemo<BarInput>(
    () => ({ rows: barRows, order: barOrder }),
    [barOrder, barRows],
  )
  const [trendDiagnostics, setTrendDiagnostics] = React.useState<Diagnostics>()
  const [barDiagnostics, setBarDiagnostics] = React.useState<Diagnostics>()

  const captureTrendRender = React.useCallback(
    (context: ChartRenderContext<TrendPoint>) => {
      trendRenders.current += 1
      setTrendDiagnostics({
        points: context.scene.points.length,
        prepares: trendCounters.current.prepares,
        renders: trendRenders.current,
        width: context.scene.width,
      })
    },
    [],
  )

  const captureBarRender = React.useCallback(
    (context: ChartRenderContext<BarPoint>) => {
      barRenders.current += 1
      setBarDiagnostics({
        points: context.scene.points.length,
        prepares: barCounters.current.prepares,
        renders: barRenders.current,
        width: context.scene.width,
      })
    },
    [],
  )

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  const refreshTrend = () => {
    const nextSeed = trendSeed + 1
    setTrendSeed(nextSeed)
    setTrendPoints(createTrendData(nextSeed))
  }

  const refreshBars = () => {
    setBarSeed((currentSeed) => {
      const nextSeed = currentSeed + 1
      setBarRows(createBarData(nextSeed))
      return nextSeed
    })
  }

  const burstBars = () => {
    for (let index = 0; index < 6; index++) {
      window.setTimeout(refreshBars, index * 110)
    }
  }

  return (
    <main className="lab">
      <header className="lab-header">
        <div>
          <p className="kicker">TanStack Charts · D3-native sandbox</p>
          <h1>Change everything. Watch what actually rerenders.</h1>
          <p className="lede">
            Plot-style marks, explicit D3 scales and curves, cached preparation,
            responsive ranges, and interruptible keyed motion.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </button>
          <button
            type="button"
            onClick={() => setUnrelatedRenders((count) => count + 1)}
          >
            Parent render · {unrelatedRenders}
          </button>
        </div>
      </header>

      <section className="explanation">
        <div>
          <strong>Parent render</strong>
          <span>should not redraw or prepare either chart.</span>
        </div>
        <div>
          <strong>Visual controls</strong>
          <span>redraw without repeating unrelated preparation.</span>
        </div>
        <div>
          <strong>Burst update</strong>
          <span>interrupts motion from the currently visible geometry.</span>
        </div>
      </section>

      <article className="workbench">
        <div className="workbench-header">
          <div>
            <p className="section-index">01 · arbitrary dynamic options</p>
            <h2>Weekly adoption index</h2>
            <p className="focus-readout">
              {trendFocus
                ? `${trendFocus.datum.date.toLocaleDateString()} · ${trendFocus.datum.value.toFixed(1)}`
                : 'Move over the chart to inspect a week.'}
            </p>
          </div>
          <DiagnosticsView diagnostics={trendDiagnostics} />
        </div>

        <div className="controls">
          <Field label="Display">
            <select
              value={display}
              onChange={(event) =>
                setDisplay(event.target.value as TrendDisplay)
              }
            >
              <option value="area">Area</option>
              <option value="line">Line</option>
            </select>
          </Field>
          <Field label="Curve">
            <select
              value={curve}
              onChange={(event) => setCurve(event.target.value as TrendCurve)}
            >
              <option value="catmull-rom">Catmull–Rom</option>
              <option value="linear">Linear</option>
              <option value="step">Step</option>
            </select>
          </Field>
          <Field label={`Average · ${movingAverage}`}>
            <input
              min="1"
              max="8"
              type="range"
              value={movingAverage}
              onChange={(event) => setMovingAverage(Number(event.target.value))}
            />
          </Field>
          <Field label={`Container · ${panelWidth}%`}>
            <input
              min="42"
              max="100"
              type="range"
              value={panelWidth}
              onChange={(event) => setPanelWidth(Number(event.target.value))}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={showDots}
              onChange={(event) => setShowDots(event.target.checked)}
            />
            Dots
          </label>
          <button type="button" onClick={refreshTrend}>
            New data
          </button>
        </div>

        <div className="chart-stage">
          <div className="responsive-frame" style={{ width: `${panelWidth}%` }}>
            <Chart
              definition={trendDefinition}
              input={trendInput}
              height={320}
              initialWidth={920}
              ariaLabel="Dynamic weekly adoption index"
              focus={focusX}
              tooltip={{
                format: (point) =>
                  `${point.datum.date.toLocaleDateString()}\nIndex ${point.datum.value.toFixed(1)}`,
              }}
              onFocusChange={setTrendFocus}
              onRender={captureTrendRender}
            />
          </div>
        </div>

        <CodeSample code={dynamicCode} />
      </article>

      <article className="workbench">
        <div className="workbench-header">
          <div>
            <p className="section-index">02 · state-to-state motion</p>
            <h2>Package ranking</h2>
            <p className="focus-readout">
              {barFocus
                ? `${barFocus.datum.name} · ${barFocus.datum.value}`
                : 'Move over a bar to inspect its score.'}
            </p>
          </div>
          <DiagnosticsView diagnostics={barDiagnostics} />
        </div>

        <div className="controls">
          <Field label="Order">
            <select
              value={barOrder}
              onChange={(event) =>
                setBarOrder(event.target.value as 'name' | 'value')
              }
            >
              <option value="value">Score</option>
              <option value="name">Name</option>
            </select>
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={animate}
              onChange={(event) => setAnimate(event.target.checked)}
            />
            Animate
          </label>
          <button type="button" onClick={refreshBars}>
            Next state · {barSeed}
          </button>
          <button type="button" onClick={burstBars}>
            Burst update
          </button>
        </div>

        <div className="chart-stage">
          <Chart
            definition={barDefinition}
            input={barInput}
            height={340}
            initialWidth={920}
            ariaLabel="Animated package ranking"
            animate={animate ? { duration: 520, easing: 'ease-out' } : false}
            focus={focusX}
            tooltip={{
              format: (point) =>
                `${point.datum.name}\nScore ${point.datum.value}`,
            }}
            onFocusChange={setBarFocus}
            onRender={captureBarRender}
          />
        </div>

        <CodeSample code={transitionCode} />
      </article>
    </main>
  )
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function DiagnosticsView({
  diagnostics,
}: {
  diagnostics: Diagnostics | undefined
}) {
  return (
    <dl className="diagnostics">
      <div>
        <dt>renders</dt>
        <dd>{diagnostics?.renders ?? '—'}</dd>
      </div>
      <div>
        <dt>prepares</dt>
        <dd>{diagnostics?.prepares ?? '—'}</dd>
      </div>
      <div>
        <dt>points</dt>
        <dd>{diagnostics?.points ?? '—'}</dd>
      </div>
      <div>
        <dt>width</dt>
        <dd>{diagnostics ? `${diagnostics.width}px` : '—'}</dd>
      </div>
    </dl>
  )
}

function CodeSample({ code }: { code: string }) {
  return (
    <details className="code-sample">
      <summary>Show abbreviated source</summary>
      <pre>
        <code>{code}</code>
      </pre>
    </details>
  )
}
