# Bundle and performance

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

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

Current independent subpaths include `area`, `bar`, `curves`, `dot`, `facet`,
`focus`, `legend`, `line`, `rect`, `rule`, `text`, `scene`, `svg`,
`svg/resources`, `runtime`, `dom`, `export`, `scales/color`, `scales/time`,
`scales/transforms`, and `transforms`.
The dot mark also exposes its area-correct size scale at `scales/radius`.
Dense interactive scenes can opt into `spatial`; ordinary charts retain the
smaller linear nearest-point scan.

The scene and static SVG paths do not import the DOM host. Marks do not import
frameworks. Calendar ticks, non-linear and continuous-color scale math, curve
algorithms, legends, transforms, DOM interaction, and export are absent unless
imported.

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
- Use the built-in linear nearest-point scan for ordinary charts. For dense
  interactive scenes, pass `spatialIndex={createGridPointIndex}` after importing
  it from `@tanstack/charts/spatial`.
- Prefer static SVG when no live interaction or responsive measurement is
  needed.

## POC measurements

Directional esbuild + gzip measurements on the repository fixtures:

| Consumer                                   |     Gzip |
| ------------------------------------------ | -------: |
| Line scene                                 |  4.02 kB |
| Line plus static SVG                       |  5.13 kB |
| UTC line plus static SVG                   |  6.02 kB |
| Histogram plus static SVG                  |  6.51 kB |
| Facets plus static SVG                     |  5.63 kB |
| Representative marks                       |  7.03 kB |
| Full vanilla DOM host                      |  7.95 kB |
| DOM host plus spatial index                |  8.94 kB |
| React adapter, React external              |  8.47 kB |
| React line, React external                 |  9.25 kB |
| Vanilla Stats parity surface               | 14.03 kB |
| React Stats parity surface, React external | 14.58 kB |

These numbers change as the proof grows and are not release promises. The
repository’s bundle fixtures are the source of truth.

Run `pnpm bundle:check` in CI. It fails when a native consumer exceeds its
profile-specific gzip ceiling.

The deterministic rendering benchmark currently measures:

| Render case                         |  Median |      p95 |
| ----------------------------------- | ------: | -------: |
| Plot trend, 78 points, 1024px       | 4.75 ms | 15.03 ms |
| Native line plus SVG, same data     | 0.19 ms |  0.43 ms |
| Stateful Plot update, same data     | 3.05 ms |  4.40 ms |
| Native keyed host update, same data | 1.66 ms |  3.18 ms |
| Native line scene, 10,000 points    | 1.78 ms |  3.55 ms |
| Native line plus SVG, 10,000 points | 3.51 ms |  4.93 ms |

Run `pnpm performance` to reproduce the full matrix. These are local POC
measurements, not cross-device guarantees.
