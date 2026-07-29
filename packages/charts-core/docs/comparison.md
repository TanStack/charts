---
title: Compare Libraries
description: Compare TanStack Charts with Chart.js, Apache ECharts, Recharts, and Observable Plot using pinned packages and reproducible fixtures.
---

TanStack Charts is currently an unpublished `0.0.0` product proof, not a
production replacement for the established releases below. This comparison
records the architectural differences and evidence available today without
turning untested behavior into a checkmark.

## Tested versions

| Library                                                                                | Package              | Pinned version |
| -------------------------------------------------------------------------------------- | -------------------- | -------------- |
| [TanStack Charts](./overview.md)                                                       | `@tanstack/charts`   | `0.0.0`        |
| [Chart.js](https://www.chartjs.org/docs/latest/)                                       | `chart.js`           | `4.5.1`        |
| [Apache ECharts](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/) | `echarts`            | `6.1.0`        |
| [Recharts](https://recharts.github.io/en-US/)                                          | `recharts`           | `3.10.1`       |
| [Observable Plot](https://observablehq.com/plot/features/plots)                        | `@observablehq/plot` | `0.6.17`       |

These are exact repository pins, not the latest versions inferred at page
render time.

## Capability matrix

- ✅ First-party path in the pinned package
- 🟡 Requires application or host composition, or an explicit lifecycle step
- 🔴 No first-party path in the pinned package

| Capability               | TanStack Charts      | Chart.js       | Apache ECharts         | Recharts                   | Observable Plot            |
| ------------------------ | -------------------- | -------------- | ---------------------- | -------------------------- | -------------------------- |
| Axes and grid            | ✅ Built in          | ✅ Built in    | ✅ Components          | ✅ Components              | ✅ Marks and scales        |
| Legend                   | ✅ Built in          | ✅ Plugin      | ✅ Component           | ✅ Component               | ✅ Legend API              |
| Pointer tooltip          | ✅ Built in          | ✅ Plugin      | ✅ Component           | ✅ Component               | ✅ Tip mark                |
| Multi-series composition | ✅ Built in          | ✅ Datasets    | ✅ Series              | ✅ Components              | ✅ Marks and transforms    |
| Selection                | ✅ `onSelect`        | ✅ Event API   | ✅ Event API           | ✅ Event props             | 🟡 Host composition        |
| Animation                | ✅ Built in          | ✅ Built in    | ✅ Built in            | ✅ Built in                | 🟡 Host-owned              |
| Responsive resize        | ✅ Observed          | ✅ Observed    | 🟡 Explicit `resize()` | ✅ `ResponsiveContainer`   | 🟡 Host rerender           |
| SVG output               | ✅ Default           | 🔴 Canvas only | ✅ Optional renderer   | ✅ Default                 | ✅ Default                 |
| Canvas output            | ✅ Optional renderer | ✅ Default     | ✅ Default             | 🔴 No first-party renderer | 🔴 No first-party renderer |
| Framework-neutral core   | ✅ Core + adapters   | ✅ Yes         | ✅ Yes                 | 🔴 React only              | ✅ Yes                     |

A checkmark means the named path exists; it does not claim identical defaults,
accessibility, output, or performance.

The standard suite exercises axes, guides, tooltips, legends, and multi-series
composition. Selection, animation, and resize paths are recorded but excluded
from timing. Renderer and framework rows follow each package's documented
output model.

## Bundle snapshot

Baseline date: `2026-07-29`.

Each range covers 12 independently built, minified browser consumers: line,
bar, area, and scatter at basic, interactive, and advanced tiers. Full size is
a cold-page bundle. Only Recharts has a separate incremental result because
that lane externalizes React and React DOM.

| Library         | Full cold-page gzip | React externalized |
| --------------- | ------------------: | -----------------: |
| TanStack Charts |     19.02–22.23 KiB |                  — |
| Chart.js        |     44.70–58.21 KiB |                  — |
| Apache ECharts  |   153.10–173.18 KiB |                  — |
| Recharts        |   153.00–168.18 KiB |   94.88–109.87 KiB |
| Observable Plot |     83.34–91.94 KiB |                  — |

The tracked baseline records the package versions and complete chart/tier
matrix; the deterministic bundle gate rejects either kind of drift.

The range is not an install size or a runtime-speed ranking. The comparison
builds the current TanStack workspace source and the pinned competitor
packages. Browser timing is meaningful only within one machine and browser
run, so this page does not publish a cross-machine timing leaderboard.

## Broader conformance

The catalog corpus contains 100 TanStack/reference pairs: 68 sourced from
Observable Plot, 21 from Recharts, and 11 from Apache ECharts. Sixteen pairs
carry executable interaction scenarios. Those counts describe selected
reference coverage, not each library's feature ceiling or a list of built-in
TanStack chart types. Chart.js participates in the standard and stress suites,
not the catalog corpus.

TanStack deliberately keeps several responsibilities outside the default
runtime:

| Responsibility                                      | Owner                                      |
| --------------------------------------------------- | ------------------------------------------ |
| Binning, stacking, statistics, and spatial layouts  | Application code using granular D3 modules |
| Brush, zoom, scrubber, and editor state             | Application state and optional D3 behavior |
| Data fetching, cleaning, filtering, and persistence | The application's data and state layers    |

Choose Chart.js when Canvas-first standard charts and its plugin ecosystem fit
the application. Choose Apache ECharts for a broad built-in controller and
chart catalog with Canvas or SVG output. Choose Recharts for a React-native SVG
component model. Choose Observable Plot for concise exploratory marks and
transforms. Choose TanStack Charts when one typed, framework-independent
definition must grow from standard charts into application-specific SVG or
Canvas composition while keeping D3 and state ownership explicit.

## Evidence and reproduction

- [Standard comparison protocol](https://github.com/TanStack/charts/blob/9d23a50af0cb2ea9fa157e06dabf9f7ce4255b1b/benchmarks/comparison/README.md)
- [Tracked bundle baseline](https://github.com/TanStack/charts/blob/9d23a50af0cb2ea9fa157e06dabf9f7ce4255b1b/benchmarks/comparison/bundle-baseline.json)
- [Stress protocol](https://github.com/TanStack/charts/blob/9d23a50af0cb2ea9fa157e06dabf9f7ce4255b1b/benchmarks/comparison/stress/README.md)
- [Catalog conformance protocol](https://github.com/TanStack/charts/blob/9d23a50af0cb2ea9fa157e06dabf9f7ce4255b1b/benchmarks/conformance/README.md)

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
