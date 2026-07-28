# AI implementation guide

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

Use this file to route a charting task. It describes decisions and invariants;
the recipe files contain the code.

## Choose the smallest fitting composition

| Goal                     | Start with               | Usually add                      |
| ------------------------ | ------------------------ | -------------------------------- |
| Trend over ordered x     | `lineY`                  | `areaY`, `ruleY`, `dot`          |
| Compare categories       | `barY`                   | `ruleY([0])`, `text`             |
| Rank categories          | `barX`                   | sorting in `prepare`, animation  |
| Relationship             | `dot`                    | log/symlog scale, radius channel |
| Numeric distribution     | `bin` + `rect`           | rules, tooltip                   |
| Heatmap or matrix        | `cell`                   | explicit color range, tooltip    |
| Small multiples          | `facetChart`             | explicit shared scale domains    |
| Ranges or intervals      | `rect`                   | rules and text                   |
| Annotation               | `ruleX`, `ruleY`, `text` | any other marks                  |
| Bespoke cartesian visual | `createMark`             | existing scales and scene nodes  |

Prefer one layered definition. A chart that starts as `lineY(data)` should be
able to grow into an area, reference rules, selected dots, and annotations
without changing data models or APIs.

## Data rules

1. Give each mark its natural source data. Marks in one chart may use different
   arrays and datum types.
2. Use a field name such as `x: 'date'` when the value already exists.
3. Use an accessor such as `y: row => row.actual - row.target` for a derived
   value.
4. Use `z` for grouping and color. Numeric color requires an explicit
   continuous color strategy.
5. Use `key` whenever rows can reorder, enter, or leave.
6. Preserve source datum identity. Put reshaping in `prepare` and retain a
   pointer to the source row if a transform creates derived rows.

Do not introduce a `{ series: [...] }` model unless that is already the user’s
data.

## Runtime ownership

The library owns chart semantics, layout, scene generation, keyed DOM updates,
and built-in interaction. React and Octane only mount the vanilla host.

Data loading, querying, profiling, cleaning, recommendation, and exploratory
analysis belong outside the runtime. Those tasks are suitable for TanStack
Intent skills and application code.

`group`, `bin`, and `stackY` are visualization transforms, not exploration
machinery. Import them from `@tanstack/charts/transforms`, normally call them in
`prepare`, and render their output through ordinary marks.

## Definition choice

Use a static definition when all marks and data are stable:

```ts
const chart = defineChart({ marks: [lineY(data)] })
```

Use a dynamic definition when application input changes:

```ts
interface Input {
  data: readonly Row[]
  accent: string
}

const chart = defineChart<Input>()({
  prepare: (input) => expensiveTransform(input.data),
  prepareEqual: (a, b) => a.data === b.data,
  chart: ({ input, prepared, width }) => ({
    marks: [barX(prepared, { x: 'value', y: 'name', fill: input.accent })],
    x: { ticks: width < 420 ? 4 : 7 },
  }),
})
```

The default input equality is shallow equality for plain objects. Preparation
has a separate boundary so visual changes can redraw without recomputing data.

## Validation checklist

- Stable module-level definition
- Original data and typed channels
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
semantics in the application and opt into grouped focus and SVG resources
explicitly.

For the conceptual grammar, see Observable Plot’s
[marks](https://observablehq.com/plot/features/marks),
[scales](https://observablehq.com/plot/features/scales), and
[interactions](https://observablehq.com/plot/features/interactions)
documentation. Use those pages to understand visualization concepts, then use
TanStack Charts local recipes for supported implementation details.
