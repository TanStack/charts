# TanStack Charts proof

This repository contains the working proof for TanStack Charts: a tiny,
framework-agnostic TypeScript visualization grammar inspired by Observable
Plot with D3 as its algorithm layer. TanStack owns marks, channels, scene
compilation, rendering, and lifecycle. Named `d3-*` modules own scales, shape,
transforms, color, and spatial math.

The product packages are:

- [`@tanstack/charts`](./packages/charts-core) — marks, channels, scales, guides,
  scene calculation, static SVG, vanilla DOM host, and optional export
- [`@tanstack/react-charts`](./packages/react-charts) — thin React adapter
- [`@tanstack/octane-charts`](./packages/octane-charts) — thin Octane adapter
- [`examples/sandbox`](./examples/sandbox) — dynamic React API workbench
- [`examples/charts-react`](./examples/charts-react) — interactive React proof
- [`examples/charts-octane`](./examples/charts-octane) — equivalent Octane proof
- [`examples/conformance`](./examples/conformance) — side-by-side chart catalog
  comparison

The earlier Observable Plot host experiment remains under `@plot-poc/*` so its
behavior, benchmarks, and migration evidence can be compared without occupying
the product package names.

The private [`@tanstack/charts-d3`](./packages/charts-core-d3) package preserves
the superseded all-at-once D3 backend experiment. Its parity and bundle
findings remain as historical evidence in the plan.

See [PLAN.md](./PLAN.md) for the architecture, scope, evidence, and decision
gates. Observed authoring difficulty is tracked in
[API-FRICTION.md](./API-FRICTION.md). Package-level, task-oriented
documentation begins at
[`packages/charts-core/llms.txt`](./packages/charts-core/llms.txt).

## D3-native API

```tsx
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import {
  d3Curve,
  defineChart,
  lineY,
  ruleY,
} from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const downloadMax = max(rows, (row) => row.downloads) ?? 0

const downloads = defineChart({
  marks: [
    ruleY([0]),
    lineY(rows, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: 'id',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: { scale: scaleUtc().domain(dateDomain).nice() },
  y: {
    scale: scaleLinear().domain([0, downloadMax]).nice(),
    label: 'Weekly downloads',
    grid: true,
  },
})

<Chart
  definition={downloads}
  height={320}
  ariaLabel="Weekly package downloads"
  tooltip
/>
```

Dynamic definitions keep application input, data preparation, and visual
construction separate:

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart } from '@tanstack/charts'

interface Input {
  rows: readonly Row[]
  accent: string
}

const ranking = defineChart<Input>()({
  prepare: (input) => [...input.rows].sort((a, b) => b.value - a.value),
  prepareEqual: (a, b) => a.rows === b.rows,
  chart: ({ input, prepared, width }) => ({
    marks: [
      barX(prepared, {
        x: 'value',
        y: 'name',
        key: 'id',
        fill: input.accent,
      }),
    ],
    x: {
      scale: scaleLinear()
        .domain([0, max(prepared, (row) => row.value) ?? 0])
        .nice(),
      ticks: width < 420 ? 4 : 7,
    },
    y: {
      scale: scaleBand()
        .domain(prepared.map((row) => row.name))
        .padding(0.1),
    },
  }),
})
```

The supplied band scale owns bar position, thickness, padding, alignment,
rounding, and reversal. A bar fills that bandwidth unless `inset` is explicit.
Side-by-side bars supply a second D3 band scale through `groupScale`; `z` alone
only identifies the series.

Guide margins are automatic. The compiler measures formatted tick labels,
rotations, endpoint overhang, and axis titles, then gives the remaining space
to the plot. Omit `margin` for this default; a numeric side is a hard lock, and
`margin: 0` disables automatic space on every side. Static rendering uses a
deterministic estimator, while the DOM host refines the same layout with the
container’s actual font metrics and corrects it after web fonts load.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm bundle:check
pnpm performance
pnpm benchmark:check
```

The package bundle gate locks ordinary line, SVG, DOM, React, custom-scale,
and representative-mark consumers to exact minified and gzip baselines.
Optional features use isolated entries and budgets; see
[`benchmarks/bundle-size`](./benchmarks/bundle-size).

Cross-library bundle and browser comparisons are documented in
[`benchmarks/comparison`](./benchmarks/comparison). Run `pnpm benchmark` for
the standard basic, interactive, and advanced line, bar, area, and scatter
matrix, or
`pnpm benchmark -- --profile=quick` for a fast local pass.

The chart-catalog conformance corpus is documented in
[`benchmarks/conformance`](./benchmarks/conformance). It compares capability,
semantic and visual output, runtime and bundle cost, type safety, and AI
authoring experience from the same typed fixtures. The current 66-case suite
pairs 60 useful Observable Plot recipes and six distinct Recharts/shadcn use
cases with TanStack Charts. Expansion continues while recipes, granular D3, or
optional marks leave byte-locked ordinary consumers unchanged.

```sh
pnpm conformance:quick
pnpm conformance
pnpm conformance:size
```

The paired AI-authoring smoke cohort is explicit and separate from the runtime
corpus:

```sh
pnpm conformance:ai:prepare
pnpm conformance:ai:score
# Invokes an external agent only when deliberately configured:
pnpm conformance:ai:run
```

Run a TanStack demo:

```sh
pnpm dev:charts-react
pnpm dev:charts-octane
pnpm dev:sandbox
pnpm dev:conformance
```

The dynamic sandbox is normally available at
[`http://localhost:5183`](http://localhost:5183). The React demo uses port 5191;
Octane uses port 5192. The conformance gallery uses port 5194.
