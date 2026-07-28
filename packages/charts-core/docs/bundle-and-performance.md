# Bundle and performance

## Import boundaries

The root is an ergonomic, tree-shakeable barrel:

```ts
import { defineChart, lineY } from '@tanstack/charts'
```

Use subpaths when a build policy requires a hard capability boundary:

```ts
import { lineY } from '@tanstack/charts/line'
import { mountChart } from '@tanstack/charts/dom'
import { serializeChartSvg } from '@tanstack/charts/export'
```

Current independent subpaths include `area`, `bar`, `d3/shape`, `dom`, `dot`,
`export`, `facet`, `focus`, `legend`, `line`, `reconcile`, `rect`, `rule`,
`runtime`, `scene`, `svg`, `svg/resources`, and `text`. Scale, transform, curve,
and spatial algorithms come directly from granular `d3-*` packages. TanStack
does not mirror those modules behind convenience wrappers.

The scene and static SVG paths do not import the DOM host. Marks do not import
frameworks. Continuous and temporal scales, continuous color, curves,
transforms, spatial indexes, DOM interaction, and export are absent unless
selected. The default categorical color mapping uses D3 ordinal scale
semantics. A straight line or area does not import `d3-shape`.

Every chart supplies its positional scales to `createChartScene`. The chart
copies each scale and computes its responsive pixel range; the supplied scale
owns its domain, mapping, ticks, and labels. Use `x: null` or `y: null` only
when no mark materializes that dimension. Even one `d3-scale` linear scale has
a meaningful bundle floor, so consumers pay for the exact D3 families they
import.

## Dynamic loading

For a route that rarely displays charts, split the complete chart boundary:

```ts
const ChartPanel = lazy(() => import('./ChartPanel'))
```

Split by user-visible capability, not by individual mark inside one eagerly
rendered chart. Loading a dozen tiny mark chunks usually costs more than it
saves.

## Runtime rules

- Define definitions once.
- Keep immutable input field identities stable.
- Use `prepareEqual` to isolate data work from visual options.
- Supply stable datum keys for reconciliation.
- Avoid emitting invisible scene nodes.
- Ordinary focus uses D3’s linear `least` primitive. For dense scenes, build a
  `ChartSpatialIndexFactory` with `d3-quadtree`, Delaunay, or another index and
  pass it through `spatialIndex`.
- Prefer static SVG when no live interaction or responsive measurement is
  needed.

```ts
import { quadtree } from 'd3-quadtree'
import type { ChartPoint, ChartSpatialIndexFactory } from '@tanstack/charts'

const spatialIndex: ChartSpatialIndexFactory<Row> = (points) => {
  const tree = quadtree<ChartPoint<Row>>()
    .x((point) => point.x)
    .y((point) => point.y)
    .addAll([...points])

  return {
    findNearest: (x, y, maxDistance = Infinity) =>
      tree.find(x, y, Number.isFinite(maxDistance) ? maxDistance : undefined) ??
      null,
  }
}
```

## Current POC measurements

Directional esbuild + gzip measurements on the post-strict-migration
repository fixtures:

| Consumer                                    |  Minified |     Gzip |
| ------------------------------------------- | --------: | -------: |
| Core host                                   |   6.97 kB |  2.85 kB |
| D3-scale `lineY` scene                      |  27.92 kB | 11.13 kB |
| D3-scale `lineY` plus static SVG            |  30.90 kB | 12.22 kB |
| D3-scale UTC `lineY` plus static SVG        |  45.37 kB | 16.77 kB |
| D3-scale histogram plus static SVG          |  33.88 kB | 13.35 kB |
| D3-scale facets plus static SVG             |  32.54 kB | 12.81 kB |
| Representative marks                        |  38.56 kB | 14.36 kB |
| Vanilla DOM host                            |  19.64 kB |  7.63 kB |
| Direct D3 quadtree plus DOM host            |  45.22 kB | 17.65 kB |
| React adapter, React external               |  21.32 kB |  8.18 kB |
| React `lineY`, React external               |  42.35 kB | 16.49 kB |
| Vanilla Stats parity surface                |  77.99 kB | 27.59 kB |
| React Stats parity surface                  |  79.72 kB | 28.13 kB |
| Custom-scale `lineY`                        |   9.16 kB |  3.59 kB |
| D3 linear-scale `lineY`                     |  27.85 kB | 11.09 kB |
| D3 curved `lineY`                           |  34.87 kB | 13.29 kB |
| D3 time plus linear-scale `lineY`           |  42.32 kB | 15.62 kB |
| Minimal Observable Plot line                | 261.54 kB | 89.26 kB |
| Dynamic TanStack Charts sandbox application | 268.14 kB | 85.56 kB |

These numbers change as the proof grows and are not release promises. The
repository’s bundle fixtures are the source of truth. Historical measurements
are retained and explicitly labeled in the repository plan.

Run `pnpm bundle:check` in CI. It fails when a product consumer exceeds its
profile-specific gzip ceiling.

The deterministic rendering benchmark currently measures:

| Product render case                           | Median |    p95 |
| --------------------------------------------- | -----: | -----: |
| D3-scale line plus SVG, 78 points, 320px      | 0.12ms | 0.18ms |
| D3-scale line plus SVG, 78 points, 1024px     | 0.11ms | 0.15ms |
| D3-scale line scene, 10,000 points, 1024px    | 1.42ms | 2.95ms |
| D3-scale line plus SVG, 10,000 points, 1024px | 3.01ms | 4.30ms |
| D3-scale keyed host update, 78 points, 1024px | 0.88ms | 1.59ms |

Run `pnpm performance` to reproduce the full matrix. These are local POC
measurements, not cross-device guarantees.

The current verification checkpoint is TypeScript clean, 29 files and 120
standard tests, 2 files and 4 Octane server tests, 2 files and 4 Octane client
tests, and a passing `bundle:check`.
