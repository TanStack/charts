---
title: Migrating
description: Move an existing visualization to TanStack Charts by preserving analytical semantics, interaction behavior, and measurable output before changing design.
---

Migration is a semantic exercise, not a component-name translation. First
describe what the existing chart means and how users operate it. Then express
that behavior with data preparation, scales, marks, and host options.

## Move pre-Alpha root scales into the registry

Alpha definitions require Cartesian scale and axis options under `scales`:

```ts
const definition = defineChart({
  marks,
  scales: {
    x: { scale: xScale },
    y: { scale: yScale, grid: true },
  },
})
```

When updating from a pre-Alpha release, move root `x` to `scales.x` and root
`y` to `scales.y`. Every definition must provide both reserved entries. Use
`null` when the chart does not use one of the Cartesian dimensions.

Polar definitions follow the same migration. Move pre-Alpha root `angle` and
`radius` options into `polar({ scales: { angle, radius } })`. Every polar
definition must provide both reserved entries. If neither positional scale is
used, write `scales: { angle: null, radius: null }`.

Custom mark type code should replace `ChartMarkX` and `ChartMarkY` with
`ChartMarkPointX` and `ChartMarkPointY` from
`@tanstack/charts/mark/scale-values`. A polar length callback should replace
`layout.angle` with `layout.scales.angle` and `layout.radiusScale` with
`layout.scales.radius`.

## Inventory the current contract

Record:

- input rows and derived fields;
- sorting, grouping, bins, stacks, and normalization;
- x, y, color, size, and grouping semantics;
- domain, baseline, padding, curve, and missing-value policy;
- axes, labels, legends, annotations, and margins;
- tooltip grouping and formatting;
- pointer, keyboard, selection, zoom, and playback behavior;
- responsive breakpoints and first-render size;
- animation identity and interruption behavior;
- accessible name, summary, and table;
- current bundle and performance measurements.

Screenshots alone do not capture these decisions.

## Preserve transforms

Keep proven application, server, SQL, or D3 transforms for the first migration.
Pass their output to marks directly. Rewriting analytical logic at the same
time makes it difficult to tell whether a visual difference is a renderer
regression or a changed calculation.

Move or simplify transforms only after parity is measured. The dependency
boundary is explained in [Scales](../concepts/scales-and-d3.md).

## Translate to the grammar

Map each visible layer independently:

- line or area series;
- bars, rectangles, or cells;
- dots or hexagons;
- rules, links, ticks, arrows, or vectors;
- text and frame annotations;
- facet panels.

Then assign explicit scales and guides. Complex charts are usually several
ordinary marks sharing a coordinate system, not one specialized chart type.

## Consolidate package imports

Install `@tanstack/charts` once and keep the framework peers and D3 modules
that application source imports directly. Move TanStack scale and adapter
imports to package subpaths:

| Previous import                         | Current import                          |
| --------------------------------------- | --------------------------------------- |
| `@tanstack/charts-scales/<family>`      | `@tanstack/charts/scales/<family>`      |
| `@tanstack/react-charts`                | `@tanstack/charts/react`                |
| `@tanstack/react-charts/<capability>`   | `@tanstack/charts/react/<capability>`   |
| `@tanstack/react-native-charts`         | `@tanstack/charts/react-native`         |
| `@tanstack/react-native-charts/tooltip` | `@tanstack/charts/react-native/tooltip` |
| `@tanstack/octane-charts`               | `@tanstack/charts/octane`               |
| `@tanstack/octane-charts/<capability>`  | `@tanstack/charts/octane/<capability>`  |
| `@tanstack/<framework>-charts`          | `@tanstack/charts/<framework>`          |

The same mapping applies to React and Octane `/core` entries and React
`/tooltip`. Exact ESM entry graphs and `sideEffects: false` preserve capability
and framework tree shaking inside the single published package.

For the current breaking API:

- move axis presentation under `axis`;
- use `axis: false` to hide one axis while retaining its scale;
- move candidate count and formatting under `axis.ticks`;
- move rotation and thinning under `axis.tickLabels`;
- use a single bar/area value as stack length, explicit endpoints to opt out,
  and `layout: group()` for side-by-side bars;
- replace renderer-specific focus decoration with `whenFocused`.
- replace duration-only spring approximations with
  `motion({ transition: { type: 'spring', ... } })` and put chart-, mark-,
  datum-, or guide-specific policy on the definition;
- add `type: 'tween'` to focus-state transitions that previously supplied only
  `duration` and `easing`.
- replace channel `(datum, index, data)` accessors with
  `(datum, { index, data })`;
- replace facet `chart(data, key)` builders with `chart(data, { key })`;
- replace focus `resolve(points, x, y, maxDistance)` and
  `group(points, point)` implementations with `resolve(points, context)` and
  `group(points, { point })`;
- replace spatial-index `(points, scene)` factories with
  `(points, { scene })`;
- replace legend `height(itemCount, width, colors)` implementations with
  `height(itemCount, context)`. The previous `width` value is now
  `context.chart.width`;
- replace controlled-signal `(value, reason)` callbacks with
  `(value, { reason })`;
- replace keyed-selection `key(datum, point)` callbacks with
  `key(datum, { point })`;
- replace focus-guide `format(value, point)` callbacks with
  `format(value, { point })`;
- replace interactive-legend `itemAriaLabel(value, visible)` callbacks with
  `itemAriaLabel(value, { visible })`; and
- use the second `ChartTooltipContentContext` argument in `format` and
  `formatGroup` when formatter output depends on pinned state or axis
  formatting.

See [Marks and Layering](../concepts/marks-and-layering.md) and the
[Example Gallery](../examples/index.md).

## Establish parity gates

Use the same frozen data and dimensions on both implementations. Compare:

- prepared values and scale domains;
- representative geometry and baselines;
- bar bandwidth and alignment;
- line gaps and curve crossings;
- axis ticks, rotation, titles, and automatic margins;
- tooltip rows, colors, and formatted values;
- focus, selection, and keyboard paths;
- light and dark output;
- update, resize, and reorder state preservation;
- production bundle and render/update measurements.

Prefer numeric and behavioral assertions. Use screenshot diffs for the
remaining painted details.

## Migrate incrementally

A reliable order is:

1. Render a static, fixed-size chart.
2. Match scales, marks, and guides.
3. Add responsive sizing and automatic margins.
4. Match tooltip and keyboard focus.
5. Match selection and controlled viewport state.
6. Capture live values in framework-memoized definitions.
7. Add animation.
8. Measure production bundles and update performance.
9. Remove the old renderer after the parity suite passes.

Keep a temporary renderer switch only as a migration verification tool with a
defined removal gate. It should not become permanent application architecture.

## Know what not to migrate

Do not preserve accidental internals:

- generated DOM structure;
- private renderer hooks;
- broad package imports;
- pixel constants compensating for clipped labels;
- unstable array-index keys;
- manual tooltips that duplicate the default focus model.

Preserve user-visible meaning and behavior. Replace implementation accidents
with the documented TanStack Charts boundary.

## Close the migration

Before deleting the old path:

- all chart modes and empty states have parity coverage;
- accessibility and reduced motion pass;
- representative production data has been exercised;
- the new path meets explicit bundle and performance budgets;
- rollback is a version or commit, not two live renderers;
- newly discovered API friction is resolved or documented at the correct
  layer.

See [Testing and Debugging](./testing-and-debugging.md) and
[Bundle Size and Performance](./bundle-size-and-performance.md).
