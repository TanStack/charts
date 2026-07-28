# AI implementation guide

Use this file to route a charting task. It describes decisions and invariants;
the recipe files contain the code.

## Choose the smallest fitting composition

| Goal                     | Start with               | Usually add                     |
| ------------------------ | ------------------------ | ------------------------------- |
| Trend over ordered x     | `lineY`                  | `areaY`, `ruleY`, `dot`         |
| Compare categories       | `barY`                   | `ruleY([0])`, `text`            |
| Rank categories          | `barX`                   | sorting in `prepare`, animation |
| Relationship             | `dot`                    | D3 log/symlog/radial scales     |
| Numeric distribution     | D3 `bin` + `rect`        | rules, tooltip                  |
| Heatmap or matrix        | `cell`                   | explicit color range, tooltip   |
| Small multiples          | `facetChart`             | explicit shared scale domains   |
| Ranges or intervals      | `rect`                   | rules and text                  |
| Annotation               | `ruleX`, `ruleY`, `text` | any other marks                 |
| Bespoke cartesian visual | `createMark`             | existing scales and scene nodes |

Prefer one layered definition. A chart that starts as `lineY(data)` should be
able to grow into an area, reference rules, selected dots, and annotations
without changing data models or APIs.

## Data rules

1. Give each mark its natural source data. Marks in one chart may use different
   arrays and datum types.
2. Use a field name such as `x: 'date'` when the value already exists.
3. Use an accessor such as `y: row => row.actual - row.target` for a derived
   value.
4. Use `z` for series or layout grouping. On bars, use `color` when an ordinal
   color encoding must not subdivide the category. Numeric color requires an
   explicit D3 continuous scale.
5. Use `key` whenever rows can reorder, enter, or leave.
6. Preserve source datum identity. Put reshaping in `prepare` and retain a
   pointer to the source row if a transform creates derived rows.

Do not introduce a `{ series: [...] }` model unless that is already the user’s
data.

## Type-safe authoring

- Let each mark infer its datum from its source. Do not add a mark generic or
  cast a field name to make a channel compile.
- `defineChart<Input>()` is the one normal type introduction for a dynamic
  chart. Prepared data, marks, callback data, and adapter props should infer
  from it.
- A dynamic `<Chart>` requires `input`; a static chart rejects it. Do not add
  adapter generics.
- Built-in positional channels constrain their D3 scales and axis formatters.
  A rejected scale usually means its domain type does not match the selected
  field.
- Never solve a chart error with `as any`, a double assertion, `@ts-ignore`, or
  a private import. Correct the source type, channel, scale, or definition
  instead.
- When conditional branches use different row types, `point.datum` is their
  inferred union. Narrow it with an existing discriminant or a normal type
  guard.
- `point.xValue` and `point.yValue` are currently `ChartValue`; use
  `point.datum` for semantic application values or narrow coordinate values
  before using them.

`createMark<Datum>()` is the advanced public type boundary for a custom mark,
not a workaround for a built-in mark. Its optional x/y value parameters let a
custom mark participate in positional scale checking.

## Runtime ownership

The library owns grammar semantics, responsive layout, scene generation, keyed
DOM updates, and built-in interaction. D3 owns scale, transform, shape, color,
and spatial algorithms. React and Octane only mount the vanilla host.

Data loading, querying, profiling, cleaning, recommendation, and exploratory
analysis belong outside the runtime. Those tasks are suitable for TanStack
Intent skills and application code.

Import grouping, binning, reduction, and stacking directly from granular D3
packages. Run them in `prepare` when the input is dynamic, adapt native D3
output into ordinary mark channels, and preserve source rows when derived data
must remain interactive. TanStack Charts intentionally adds no competing
transform layer.

For pointer interaction, omit `focus` for one nearest point in two dimensions.
Use `focusNearestX` or `focusNearestY` for one point with an axis priority.
Use `focusX` or `focusY` only when the tooltip should contain a grouped
cross-section with one point per series.

When an application owns a free cursor, brush, or zoom gesture, use
`focusDisabled` from `@tanstack/charts/focus/disabled` so the host does not run
native datum focus in parallel. Keep the configured D3 scale that defines the
axis, copy it onto the resolved `scene.chart` range, and call the D3 scale’s
`invert` method for pixel-to-value conversion. For y, use the reversed chart
range. Apply an explicit semantic precision policy after inversion, such as
`utcDay.round` for a day-based selection; a pixel coordinate does not imply
the application’s desired date or numeric rounding.

## Definition choice

Use a static definition when all marks and data are stable:

```ts
import { extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'

const values = [4, 9, 7]
const [valueMin = 0, valueMax = 1] = extent(values)
const chart = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, values.length - 1]) },
  y: { scale: scaleLinear().domain([valueMin, valueMax]).nice() },
})
```

Use a dynamic definition when application input changes:

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'

interface Input {
  data: readonly Row[]
  accent: string
}

const chart = defineChart<Input>()({
  prepare: (input) => expensiveTransform(input.data),
  prepareEqual: (a, b) => a.data === b.data,
  chart: ({ input, prepared, width }) => ({
    marks: [barX(prepared, { x: 'value', y: 'name', fill: input.accent })],
    x: {
      scale: scaleLinear()
        .domain([0, max(prepared, (row) => row.value) ?? 0])
        .nice(),
      ticks: width < 420 ? 4 : 7,
    },
    y: {
      scale: scaleBand()
        .domain(prepared.map((row) => row.name))
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
  }),
})
```

The default input equality is shallow equality for plain objects. Preparation
has a separate boundary so visual changes can redraw without recomputing data.

## Validation checklist

- Stable module-level definition
- Original data and typed channels
- Explicit named D3 scales with complete domains
- Stable keys for dynamic rows
- No explicit width unless the chart must be fixed-size
- Useful narrow-container behavior
- Light and dark color contrast
- `ariaLabel`, and `ariaDescription` when needed
- Keyboard focus reaches data points
- Missing and negative values tested
- Empty input tested
- Shared facet domains when cross-panel comparison matters
- Bundle measured from the actual consumer entry

For TanStack Stats-shaped charts, read
[`tanstack-stats-migration.md`](./tanstack-stats-migration.md). Keep Stats data
semantics in the application and opt into the required focus strategy and SVG
resources explicitly.

For the conceptual grammar, see Observable Plot’s
[marks](https://observablehq.com/plot/features/marks),
[scales](https://observablehq.com/plot/features/scales), and
[interactions](https://observablehq.com/plot/features/interactions)
documentation. Use those pages to understand visualization concepts, then use
TanStack Charts local recipes for supported implementation details.
