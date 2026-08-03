---
title: Compare Libraries
description: Compare TanStack Charts with measured and documentation-reviewed charting libraries.
---

TanStack Charts `0.6.4` is a pre-alpha release. Its results on this page measure
the current workspace source and pinned competitor packages. This comparison
records architectural differences and reproducible evidence without turning
untested behavior into a checkmark.

## Tested versions

| Library                                                                                | Package              | Measured source     |
| -------------------------------------------------------------------------------------- | -------------------- | ------------------- |
| [TanStack Charts](./overview.md)                                                       | `@tanstack/charts`   | workspace `3fdff48` |
| [Chart.js](https://www.chartjs.org/docs/latest/)                                       | `chart.js`           | npm `4.5.1`         |
| [Apache ECharts](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/) | `echarts`            | npm `6.1.0`         |
| [Recharts](https://recharts.github.io/en-US/)                                          | `recharts`           | npm `3.10.1`        |
| [Observable Plot](https://observablehq.com/plot/features/plots)                        | `@observablehq/plot` | npm `0.6.17`        |

The competitor versions are exact package pins, not latest versions inferred
at page render time. The measured TanStack workspace revision is `3fdff48`.

## Capability matrix

- ✅ Documented first-party component or API
- 🟡 Requires application composition, an external package, or explicit lifecycle work
- 🔴 No documented first-party path

“Measured” libraries are installed at the pinned versions above and exercised
by the controlled suite. “Docs” entries are reviewed against the linked
official documentation and carry no bundle or performance claim. Library rows
are sorted by GitHub repository stars read on `2026-07-31`, with TanStack
Charts pinned first. Stars are an ordering key, not an adoption measure.

| Library                                                                                | Axes and grid       | Legend        | Pointer tooltip   | Multi-series            | Selection                | Animation         | Responsive resize        | Evidence |
| -------------------------------------------------------------------------------------- | ------------------- | ------------- | ----------------- | ----------------------- | ------------------------ | ----------------- | ------------------------ | -------- |
| [TanStack Charts](./overview.md)                                                       | ✅ Built in         | ✅ Built in   | ✅ Built in       | ✅ Built in             | ✅ `onSelect`            | ✅ Built in       | ✅ Observed              | Measured |
| [D3](./concepts/scales-and-d3.md)                                                      | ✅ Modules          | 🟡 Authored   | 🟡 Authored       | ✅ Primitives           | ✅ Brush and events      | ✅ Transitions    | 🟡 Host layout           | Docs     |
| [Chart.js](https://www.chartjs.org/docs/latest/)                                       | ✅ Built in         | ✅ Plugin     | ✅ Plugin         | ✅ Datasets             | ✅ Event API             | ✅ Built in       | ✅ Observed              | Measured |
| [Apache ECharts](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/) | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Series               | ✅ Event API             | ✅ Built in       | 🟡 Explicit `resize()`   | Measured |
| [Recharts](https://recharts.github.io/en-US/)                                          | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Components           | ✅ Event props           | ✅ Built in       | ✅ `ResponsiveContainer` | Measured |
| [visx](https://github.com/airbnb/visx)                                                 | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Primitives           | ✅ Brush                 | 🟡 External       | ✅ `ParentSize`          | Docs     |
| [Plotly.js](https://plotly.com/javascript/)                                            | ✅ Built in         | ✅ Built in   | ✅ Built in       | ✅ Traces and subplots  | ✅ Box and lasso         | ✅ Built in       | ✅ Responsive config     | Docs     |
| [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)                | ✅ Built in         | 🟡 Host       | 🟡 Host           | ✅ Series               | 🟡 Events and host       | 🔴 No transitions | ✅ `autoSize`            | Docs     |
| [ApexCharts](https://apexcharts.com/docs/installation/)                                | ✅ Built in         | ✅ Built in   | ✅ Built in       | ✅ Series               | ✅ Point and range       | ✅ Built in       | ✅ Breakpoints           | Docs     |
| [Nivo](https://nivo.rocks/about/)                                                      | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Series               | ✅ Event props           | ✅ React Spring   | ✅ Responsive components | Docs     |
| [Highcharts](https://www.highcharts.com/docs/getting-started/system-requirements)      | ✅ Built in         | ✅ Built in   | ✅ Built in       | ✅ Series               | ✅ Point and range       | ✅ Built in       | ✅ Reflow                | Docs     |
| [Victory](https://commerce.nearform.com/open-source/victory/)                          | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Components           | ✅ Events and containers | ✅ `animate`      | ✅ Responsive container  | Docs     |
| [uPlot](https://github.com/leeoniya/uPlot)                                             | ✅ Built in         | ✅ Built in   | 🟡 Plugin or host | ✅ Series               | ✅ Cursor and select     | 🔴 No transitions | 🟡 `setSize()`           | Docs     |
| [Vega-Lite](https://vega.github.io/vega-lite/)                                         | ✅ Guides           | ✅ Built in   | ✅ Encoding       | ✅ Layers and views     | ✅ Parameters            | 🟡 Vega or host   | ✅ Container sizing      | Docs     |
| [Observable Plot](https://observablehq.com/plot/features/plots)                        | ✅ Marks and scales | ✅ Legend API | ✅ Tip mark       | ✅ Marks and transforms | 🟡 Host composition      | 🟡 Host-owned     | 🟡 Host rerender         | Measured |
| [Bklit UI](https://bklit.com/docs/installation)                                        | ✅ Components       | ✅ Component  | ✅ Component      | ✅ `ComposedChart`      | ✅ Brush                 | ✅ Motion         | ✅ Container measure     | Docs     |
| [AG Charts](https://www.ag-grid.com/charts/javascript/installation/)                   | ✅ Components       | ✅ Component  | ✅ Component      | ✅ Series               | ✅ Enterprise            | ✅ Enterprise     | ✅ Auto-size             | Docs     |

License color:

- 🟢 Permissive open source; commercial use allowed
- 🟡 Open core or mixed open/proprietary offering
- 🟠 Commercial use is conditional or revenue-limited
- 🔴 Paid license required for commercial use

| Library                                                                                | SVG output           | Canvas or WebGL output     | Framework-neutral core | License / paid tier                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------- | -------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| [TanStack Charts](./overview.md)                                                       | ✅ Default           | ✅ Optional renderer       | ✅ Core + adapters     | 🟢 MIT                                                                                              |
| [D3](./concepts/scales-and-d3.md)                                                      | ✅ Yes               | ✅ Yes                     | ✅ Yes                 | 🟢 ISC                                                                                              |
| [Chart.js](https://www.chartjs.org/docs/latest/)                                       | 🔴 Canvas only       | ✅ Default                 | ✅ Yes                 | 🟢 MIT                                                                                              |
| [Apache ECharts](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/) | ✅ Optional renderer | ✅ Default                 | ✅ Yes                 | 🟢 Apache-2.0                                                                                       |
| [Recharts](https://recharts.github.io/en-US/)                                          | ✅ Default           | 🔴 No first-party renderer | 🔴 React only          | 🟢 MIT                                                                                              |
| [visx](https://github.com/airbnb/visx)                                                 | ✅ Default           | 🔴 No renderer             | 🔴 React only          | 🟢 MIT                                                                                              |
| [Plotly.js](https://plotly.com/javascript/)                                            | ✅ Common traces     | ✅ WebGL traces            | ✅ Yes                 | 🟢 MIT                                                                                              |
| [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)                | 🔴 No renderer       | ✅ Default                 | ✅ Yes                 | 🟢 Apache-2.0                                                                                       |
| [ApexCharts](https://apexcharts.com/docs/installation/)                                | ✅ Default           | 🔴 No renderer             | ✅ Yes                 | 🟠 [Free under $2M revenue; commercial or OEM otherwise](https://apexcharts.com/license/community/) |
| [Nivo](https://nivo.rocks/about/)                                                      | ✅ Default           | ✅ Selected charts         | 🔴 React only          | 🟢 MIT                                                                                              |
| [Highcharts](https://www.highcharts.com/docs/getting-started/system-requirements)      | ✅ Default           | ✅ Boost WebGL             | ✅ Yes                 | 🔴 [Commercial; separate non-commercial terms](https://shop.highcharts.com/license-16.0.pdf)        |
| [Victory](https://commerce.nearform.com/open-source/victory/)                          | ✅ Web               | ✅ Native Skia             | 🔴 React only          | 🟢 MIT                                                                                              |
| [uPlot](https://github.com/leeoniya/uPlot)                                             | 🔴 No renderer       | ✅ Default                 | ✅ Yes                 | 🟢 MIT                                                                                              |
| [Vega-Lite](https://vega.github.io/vega-lite/)                                         | ✅ Yes               | ✅ Canvas                  | ✅ Yes                 | 🟢 BSD-3-Clause                                                                                     |
| [Observable Plot](https://observablehq.com/plot/features/plots)                        | ✅ Default           | 🔴 No first-party renderer | ✅ Yes                 | 🟢 ISC                                                                                              |
| [Bklit UI](https://bklit.com/docs/installation)                                        | ✅ Default           | 🔴 No renderer             | 🔴 React only          | 🟡 [MIT components; proprietary Studio](https://github.com/bklit/bklit-ui#license)                  |
| [AG Charts](https://www.ag-grid.com/charts/javascript/installation/)                   | 🔴 No renderer       | ✅ Default                 | ✅ Yes                 | 🟡 [MIT Community; paid Enterprise](https://www.ag-grid.com/charts/javascript/licensing/)           |

A checkmark means the named path exists; it does not claim identical defaults,
accessibility, output, or performance.

The standard suite exercises axes, guides, tooltips, legends, and multi-series
composition. Selection, animation, and resize paths are recorded but excluded
from timing. Renderer and framework rows follow each package's documented
output model.

## Bundle snapshot

Baseline date: `2026-08-03`.

Controlled ranges cover 12 independently built, minified browser consumers:
line, bar, area, and scatter at basic, interactive, and advanced tiers. Only
Recharts has a separate incremental result because that lane externalizes
React and React DOM.

External figures are not comparable to the controlled cold-page ranges. Most
come from a [Bundlephobia main-export snapshot published on July 7,
2026](https://apexcharts.com/blog/state-of-javascript-charting-2026/). The
Vega-Lite, AG Charts, and uPlot main exports were read from Bundlephobia on July
31, 2026. Modular imports can be smaller, especially for
[AG Charts](https://www.ag-grid.com/charts/javascript/module-registry/).

| Library            | Bundle size                            | React externalized | Evidence                                                   |
| ------------------ | -------------------------------------- | -----------------: | ---------------------------------------------------------- |
| TanStack Charts    | 28.64–34.09 KiB                        |                  — | Controlled suite                                           |
| D3                 | 90 KB gzip                             |                  — | External main export                                       |
| Chart.js           | 44.70–58.21 KiB                        |                  — | Controlled suite                                           |
| Apache ECharts     | 153.10–173.18 KiB                      |                  — | Controlled suite                                           |
| Recharts           | 153.08–168.27 KiB                      |   94.96–109.96 KiB | Controlled suite                                           |
| visx               | 49 KB gzip                             |                  — | External `@visx/xychart` main export                       |
| Plotly.js          | ~250 kB partial; ~3.6 MB full min+gzip |                  — | [Vendor distribution figures](https://plotly.com/graphs/)  |
| Lightweight Charts | 60 KB gzip                             |                  — | External main export                                       |
| ApexCharts         | 164 KB gzip                            |                  — | External main export                                       |
| Nivo               | 143 KB gzip                            |                  — | External main export                                       |
| Highcharts         | 100 KB gzip                            |                  — | External main export                                       |
| Victory            | 105 KB gzip                            |                  — | External main export                                       |
| uPlot              | 22 KB gzip                             |                  — | External `uplot@1.6.32` main export                        |
| Vega-Lite          | 87 KB gzip                             |                  — | External `vega-lite@6.4.3`; excludes the peer Vega runtime |
| Observable Plot    | 83.34–91.94 KiB                        |                  — | Controlled suite                                           |
| Bklit UI           | —                                      |                  — | Registry-installed source; no fixed package bundle         |
| AG Charts          | 367 KB gzip                            |                  — | External `ag-charts-community@14.0.2` main export          |

The tracked baseline distinguishes the TanStack workspace revision from
competitor package versions and records the complete chart/tier matrix; the
deterministic bundle gate rejects either kind of drift.

The table does not report install size or runtime speed. The controlled
comparison builds the current TanStack workspace source and the pinned
competitor packages. Browser timing is meaningful only within one machine and
browser run, so this page does not publish a cross-machine timing leaderboard.

## Broader conformance

The catalog corpus contains 100 TanStack/reference pairs: 68 sourced from
Observable Plot, 21 from Recharts, and 11 from Apache ECharts. Sixteen pairs
carry executable interaction scenarios. Those counts describe selected
reference coverage, not each library's feature ceiling or a list of built-in
TanStack chart types. Chart.js participates in the standard and stress suites,
not the catalog corpus.

The catalog displays each renderer entry, its transitive support and transform
files, and provenance for imported demo datasets. Its report counts the
complete authored source closure and publishes the source-line ratio for every
pair; moving a transform or layout into a support module does not remove it
from the comparison, while raw snapshot rows are not treated as chart
authoring.

TanStack deliberately keeps several responsibilities outside the default
runtime:

| Responsibility                                      | Owner                                                |
| --------------------------------------------------- | ---------------------------------------------------- |
| Binning, grouping, stacking, and statistics         | Hoistable TanStack transforms or granular D3 modules |
| Spatial layouts                                     | Application code using a suitable layout library     |
| Brush, zoom, scrubber, and editor state             | Application state and optional D3 behavior           |
| Data fetching, cleaning, filtering, and persistence | The application's data and state layers              |

Choose Chart.js when Canvas-first standard charts and its plugin ecosystem fit
the application. Choose Apache ECharts for a broad built-in controller and
chart catalog with Canvas or SVG output. Choose Recharts for a React-native SVG
component model. Choose Observable Plot for concise exploratory marks and
transforms. Choose TanStack Charts when one typed, framework-independent
definition must grow from standard charts into application-specific SVG or
Canvas composition while keeping D3 and state ownership explicit.

## Evidence and reproduction

- [Standard comparison protocol](https://github.com/TanStack/charts/blob/v0.6.4/benchmarks/comparison/README.md)
- [Current tracked bundle baseline](https://github.com/TanStack/charts/blob/main/benchmarks/comparison/bundle-baseline.json)
- [0.6.4 tagged bundle baseline](https://github.com/TanStack/charts/blob/v0.6.4/benchmarks/comparison/bundle-baseline.json)
- [Stress protocol](https://github.com/TanStack/charts/blob/v0.6.4/benchmarks/comparison/stress/README.md)
- [Catalog conformance protocol](https://github.com/TanStack/charts/blob/v0.6.4/benchmarks/conformance/README.md)

```sh
pnpm benchmark:size
pnpm benchmark:check
pnpm benchmark:stress:quick
pnpm conformance:quick
```

The browser-backed commands require the pinned Playwright browser. Read the
[bundle and performance guide](./guides/bundle-size-and-performance.md) before
interpreting results, and use the [migration guide](./guides/migrating.md) to
establish application-specific parity before replacing an existing library.
