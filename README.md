<h1 align="center">TanStack Charts</h1>

<p align="center">
  <strong>D3's power. A chart library's ergonomics.</strong>
</p>

<p align="center">
  A tiny TypeScript visualization grammar for responsive, accessible,
  server-rendered application charts.
</p>

<p align="center">
  <a href="#quick-look">Quick look</a> ·
  <a href="./packages/charts-core/README.md">Documentation</a> ·
  <a href="./examples/charts-react">React example</a> ·
  <a href="./benchmarks/conformance">Conformance catalog</a> ·
  <a href="./PLAN.md">Roadmap</a>
</p>

> [!IMPORTANT]
> TanStack Charts is currently a private `0.0.0` product proof. The packages
> are not published or ready for production use yet.

Most chart libraries are easy until the chart stops being standard. TanStack
Charts gives you one typed grammar that can grow from a familiar line or bar
chart into a product-specific visualization without replacing your data model
or dropping down to a separate API.

- **Keep your data as it is.** Marks consume arrays, objects, tuples, and
  iterables directly. Different layers can use different datum types.
- **Bring native D3 primitives.** Use D3 scales, curves, transforms, and layout
  output instead of relearning a parallel math API.
- **Build from common to custom.** Layer built-in marks or implement a custom
  mark against the same public scene protocol.
- **Get the application runtime too.** Responsive layout, automatic guide
  margins, themes, interaction, animation, accessibility, SVG SSR, hydration,
  and export are part of the system.
- **Pay for what you import.** Marks, renderers, interactions, and specialized
  D3 capabilities have independent, tree-shakeable entry points.

## Quick look

```tsx
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'

const revenue = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 76 },
  { month: 'Apr', value: 64 },
]

const revenueChart = defineChart({
  marks: [
    barY(revenue, {
      x: 'month',
      y: 'value',
    }),
  ],
  x: {
    scale: scaleBand()
      .domain(revenue.map((row) => row.month))
      .padding(0.2),
  },
  y: {
    scale: scaleLinear()
      .domain([0, max(revenue, (row) => row.value) ?? 0])
      .nice(),
    label: 'Revenue',
    grid: true,
  },
})

export function RevenueChart() {
  return (
    <Chart
      definition={revenueChart}
      height={320}
      ariaLabel="Monthly revenue"
      tooltip
    />
  )
}
```

Marks consume the original rows, channels describe their visual encodings, and
configured D3 scales own the domain and mapping. TanStack copies those scales,
assigns their responsive pixel ranges, compiles a renderer-neutral keyed scene,
and hands that scene to the selected host.

Definitions are framework-independent. The same `revenueChart` can render
through React, Octane, the vanilla DOM host, or static SVG.

## Packages

| Package                                               | Role                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`@tanstack/charts`](./packages/charts-core)          | Marks, channels, guides, scene compilation, static SVG, vanilla DOM lifecycle, and optional export |
| [`@tanstack/react-charts`](./packages/react-charts)   | Thin React lifecycle adapter with SSR and hydration                                                |
| [`@tanstack/octane-charts`](./packages/octane-charts) | Thin Octane lifecycle adapter with equivalent scene output                                         |

The earlier Observable Plot host experiment remains under `@plot-poc/*` for
migration evidence and benchmark comparison. The private
[`@tanstack/charts-d3`](./packages/charts-core-d3) package preserves a
superseded backend experiment.

## Core model

TanStack Charts deliberately splits ownership:

| D3 owns                                                      | TanStack Charts owns                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Scales, shapes, transforms, color, spatial math, and layouts | Marks, channels, responsive ranges, guide layout, scene compilation, rendering, and lifecycle |

This boundary keeps D3 visible and replaceable at the algorithm level while
giving applications a consistent runtime. There is no global registry,
library-owned dataframe, or chart-type configuration model.

For live application state, `defineChart<Input>()` keeps expensive preparation
separate from visual construction and responsive layout. The definition drives
host prop and callback inference, so normal authoring does not require adapter
generics, mark-array annotations, or casts. See
[`dynamic-charts.md`](./packages/charts-core/docs/dynamic-charts.md) for the
complete pattern.

## Documentation

| Start here                                                                                                                     | Use it for                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| [`packages/charts-core/README.md`](./packages/charts-core/README.md)                                                           | API overview and implemented grammar            |
| [`packages/charts-core/docs/recipes.md`](./packages/charts-core/docs/recipes.md)                                               | Common charts and composition patterns          |
| [`packages/charts-core/docs/dynamic-charts.md`](./packages/charts-core/docs/dynamic-charts.md)                                 | State, preparation, memoization, and animation  |
| [`packages/charts-core/docs/responsive-theme-accessibility.md`](./packages/charts-core/docs/responsive-theme-accessibility.md) | Sizing, themes, guide layout, and accessibility |
| [`packages/charts-core/docs/custom-marks.md`](./packages/charts-core/docs/custom-marks.md)                                     | Custom marks and scene protocol                 |
| [`packages/charts-core/docs/bundle-and-performance.md`](./packages/charts-core/docs/bundle-and-performance.md)                 | Import boundaries and performance rules         |
| [`packages/charts-core/docs/observable-plot-migration.md`](./packages/charts-core/docs/observable-plot-migration.md)           | Observable Plot concept mapping                 |
| [`packages/charts-core/llms.txt`](./packages/charts-core/llms.txt)                                                             | Compact documentation map for humans and agents |

Architecture decisions and open production gates live in
[`PLAN.md`](./PLAN.md). Evidence from real authoring and migration work is
tracked in [`API-FRICTION.md`](./API-FRICTION.md).

## Development

The workspace requires Node.js 22 or newer and pnpm 11.

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Run a local example:

```sh
pnpm dev:charts-react
pnpm dev:charts-octane
pnpm dev:sandbox
pnpm dev:conformance
```

The repository includes three complementary benchmark suites:

- [`benchmarks/bundle-size`](./benchmarks/bundle-size) locks ordinary consumer
  bundles and isolates optional feature costs.
- [`benchmarks/comparison`](./benchmarks/comparison) compares equivalent line,
  bar, area, and scatter consumers across chart libraries.
- [`benchmarks/conformance`](./benchmarks/conformance) exercises a broad,
  typed catalog against Observable Plot, Recharts, and Apache ECharts.

```sh
pnpm bundle:check
pnpm performance
pnpm benchmark:check
pnpm conformance:quick
```

These measurements are development evidence, not release claims. See each
suite's README for its protocol, output, and limitations.
