# `@tanstack/charts-scales`

This compatibility package remains supported for existing applications. New
applications can install only `@tanstack/charts` and use its exact scale
subpaths.

```sh
pnpm add @tanstack/charts
```

Import only the required family:

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scalePoint } from '@tanstack/charts/scales/point'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
```

## Common chart

Pass a factory when Charts should infer the domain from mark channels:

```ts
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const revenue = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 76 },
]

const chart = defineChart({
  marks: [barY(revenue, { x: 'month', y: 'value' })],
  scales: {
    x: { scale: () => scaleBand<string>().padding(0.2) },
    y: { scale: scaleLinear, nice: true, grid: true },
  },
})
```

Pass an instance when the domain is application state:

```ts
const normalized = scaleLinear().domain([0, 1])
```

TanStack Charts copies the scale before assigning its responsive positional
range. The source instance is not mutated.

## Included families

| Entry      | Use                                                      | Main methods                                                                |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/linear`  | Numeric line, area, scatter, rule, and quantitative axes | `domain`, `range`, `invert`, `clamp`, `ticks`, `tickFormat`, `nice`, `copy` |
| `/band`    | Bars, cells, and categorical intervals                   | `padding`, `paddingInner`, `paddingOuter`, `align`, `round`, `bandwidth`    |
| `/point`   | Categorical line and dot positions                       | `padding`, `align`, `round`, `step`, zero `bandwidth`, `copy`               |
| `/ordinal` | Categorical colors or other discrete outputs             | Explicit or implicit domains, cyclic ranges, `unknown`, `copy`              |

Each entry also exports its matching `LinearScale`, `BandScale`, `PointScale`,
or `OrdinalScale` type.

Band, point, and ordinal domains accept strings, numbers, and dates as discrete
values. Equal date timestamps and duplicate primitives share one domain entry.
Linear domains and ranges are numeric, finite, and two-stop. Its formatter is
deliberately basic; pass an axis formatter when `Intl.NumberFormat` is enough.

## Upgrade one scale to D3

Keep the compact scales until a chart needs semantics they do not provide. Add
`d3-scale` for:

- continuous local-time or UTC axes;
- log, power, square-root, symlog, or radial mappings;
- sequential, diverging, quantile, quantize, or threshold color;
- piecewise domains, nonnumeric ranges, or custom interpolation;
- D3 format specifiers and locale-aware scale formatting.

Compact and D3 scales share the callable, `domain`, `range`, and `copy`
contract used by Charts, so they can be mixed:

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from 'd3-scale'

const axes = {
  x: { scale: scaleUtc, nice: true },
  y: { scale: scaleLinear, nice: true },
}
```

Application source importing `d3-scale` must declare it and
`@types/d3-scale` directly. Unsupported D3 methods do not warn or fall back at
runtime; select D3 before authoring against a method outside this documented
subset.
