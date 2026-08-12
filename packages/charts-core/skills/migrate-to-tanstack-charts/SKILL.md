---
name: migrate-to-tanstack-charts
description: >
  Migrate Observable Plot, Recharts, Chart.js, ECharts, direct D3, or another
  renderer to TanStack Charts by translating semantic ownership and proving
  visual, interaction, accessibility, export, bundle, and performance parity.
metadata:
  type: composition
  library: '@tanstack/charts'
  library_version: '0.9.0'
requires:
  - design-a-chart
  - debug-and-verify-charts
sources:
  - 'TanStack/charts:docs/guides/migrating.md'
  - 'TanStack/charts:packages/charts-core-d3/docs/observable-plot-migration.md'
  - 'TanStack/charts:packages/charts-core-d3/docs/tanstack-stats-migration.md'
---

This skill requires `design-a-chart` and `debug-and-verify-charts`. Read them first to preserve the analytical task and define parity evidence.

# Migrate Charts to TanStack Charts

Use **trigger → inspect → decide → build → verify**. Translate semantic ownership, not component names or generated DOM. Keep the old chart available until parity evidence passes.

## Integration Setup

Inventory the current chart before changing code:

```ts
export interface MigrationInventory {
  question: string
  rowGrain: string
  metrics: readonly string[]
  transforms: readonly string[]
  layers: readonly string[]
  domains: readonly string[]
  interactions: readonly string[]
  accessibility: readonly string[]
  exports: readonly string[]
  performanceBudget: string
}

export const inventory: MigrationInventory = {
  question: 'How did weekly revenue change by product?',
  rowGrain: 'one row per product and week',
  metrics: ['revenue USD', 'orders'],
  transforms: ['weekly aggregation'],
  layers: ['line per product', 'target rule'],
  domains: ['shared weekly x', 'zero-based revenue y', 'stable product color'],
  interactions: ['grouped x tooltip', 'keyboard inspection'],
  accessibility: ['figure label', 'adjacent summary'],
  exports: ['static SVG'],
  performanceBudget: '12 charts, 2,000 visible points, responsive updates',
}
```

Record which layer currently owns every item. Do not assume the source renderer owns transforms, domains, or product state just because its API config mentions them.

## Core Integration Patterns

### Translate through the grammar

For each source layer, map:

1. source rows and row grain;
2. eager analytical transforms;
3. mark-local layout;
4. positional, grouping, color, and interval channels;
5. semantic scale domains;
6. marks and layer order;
7. focus and controlled application state;
8. renderer, adapter, and export lifecycle.

Use the source-specific references only after this inventory.

### Migrate one ownership boundary at a time

A safe sequence is:

1. Freeze source data preparation and capture fixtures.
2. Build a static TanStack scene from the same prepared rows.
3. Match scales, marks, labels, and empty/missing behavior.
4. Add focus and tooltip semantics.
5. Add controlled selection, brush, zoom, or application overlays.
6. Wire the target framework adapter and SSR lifecycle.
7. Compare bundle and sustained interaction/update performance.
8. Remove the source renderer only after rollback is no longer needed.

### Prove parity by scenarios

| Surface       | Evidence                                                         |
| ------------- | ---------------------------------------------------------------- |
| Data          | fixture rows and transform outputs match                         |
| Visual        | geometry, domains, guides, labels, color, missing/negative cases |
| Interaction   | pointer and keyboard focus, grouping, pinning, controlled state  |
| Lifecycle     | mount, update, resize, SSR/hydration, destroy                    |
| Accessibility | meaningful name, equivalent values/actions, summary/table        |
| Export        | SVG/Canvas/static output and fonts/resources                     |
| Packaging     | packed consumer imports and retained optional modules            |
| Performance   | target dashboard shape under sustained pointer/update work       |

### Keep a comparison switch

During production migration, use the same prepared rows and accepted application state for old and new renderers. A temporary feature flag or development harness should switch rendering ownership without changing analytics.

## Common Mistakes

### CRITICAL Translating component names one for one

Wrong: find the TanStack component with the closest source-library name.

Correct: map data, transform, scale, geometry, interaction, and lifecycle ownership independently.

Source components combine responsibilities differently, so name matching preserves syntax instead of behavior.

Source: `docs/guides/migrating.md`

### CRITICAL Replacing transforms and renderer together

Wrong: rewrite grouping, stacking, forecasting, and rendering in one change.

Correct: freeze and test analytical rows first; migrate renderer ownership against those fixtures; move transforms later only with separate evidence.

Changing both makes visual drift impossible to classify.

Source: `docs/guides/migrating.md`; archived TanStack Stats migration notes

### CRITICAL Calling screenshot similarity complete parity

Wrong: approve after one viewport screenshot resembles the source.

Correct: test the scenario matrix for focus, keyboard, updates, pinning, export, packages, and performance.

A final image does not prove behavior or lifecycle ownership.

Source: `API-FRICTION.md` F-036, F-073, F-081; `docs/guides/migrating.md`

### HIGH Reimplementing source internals blindly

Wrong: port D3 selections, plugin lifecycle, source scale math, and every private helper into custom marks.

Correct: keep proven application/D3/SQL preparation at first, express supported semantics through TanStack primitives, and extend only a verified gap.

Blind ports preserve accidental architecture and bypass renderer-neutral ownership.

Source: `docs/guides/migrating.md`; `API-FRICTION.md` F-127

## References

- [Observable Plot](references/observable-plot.md)
- [Recharts](references/recharts.md)
- [Chart.js](references/chart-js.md)
- [ECharts](references/echarts.md)
- [Direct D3](references/d3.md)

See also: `design-a-chart/SKILL.md` and `debug-and-verify-charts/SKILL.md` — restate the analytical task and prove parity beyond screenshots.
