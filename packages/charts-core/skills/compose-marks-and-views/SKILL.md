---
name: compose-marks-and-views
description: >
  Translate semantic encodings into TanStack Charts marks, layers,
  annotations, facets, and coordinated views. Load when choosing marks,
  combining layers, assigning interaction-point ownership, or deciding
  whether a custom mark is justified.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/concepts/grammar-of-graphics.md'
  - 'TanStack/charts:docs/concepts/marks-and-layering.md'
  - 'TanStack/charts:docs/guides/faceting-and-composition.md'
  - 'TanStack/charts:docs/guides/custom-marks-and-renderers.md'
---

# Compose Marks and Views

Use **trigger → inspect → decide → build → verify**. A chart type is usually a composition of marks with shared scales, not a component to look up by name.

## Setup

Layer broad context first and direct evidence last:

```ts
import { areaY, defineChart, dot, lineY, ruleY, text } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'

const rows = [
  { month: 'Jan', low: 72, value: 80, high: 89, label: '' },
  { month: 'Feb', low: 77, value: 86, high: 96, label: '' },
  { month: 'Mar', low: 84, value: 94, high: 106, label: 'Launch' },
]

export const chart = defineChart({
  marks: [
    areaY(rows, { id: 'range', x: 'month', y1: 'low', y2: 'high' }),
    ruleY([90], { id: 'target' }),
    lineY(rows, { id: 'trend', x: 'month', y: 'value' }),
    dot(
      rows.filter((row) => row.label),
      { id: 'events', x: 'month', y: 'value' },
    ),
    text(
      rows.filter((row) => row.label),
      {
        id: 'event-labels',
        x: 'month',
        y: 'value',
        text: 'label',
        dy: -10,
      },
    ),
  ],
  x: { scale: scalePoint },
  y: { scale: scaleLinear },
})
```

Declaration order is paint order. Each mark may use a different datum type.

## Core Patterns

### Give one layer interaction ownership

```ts
import { defineChart, dot, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

const rows = [
  { id: 'jan', month: 'Jan', value: 80 },
  { id: 'feb', month: 'Feb', value: 86 },
]

export const chart = defineChart({
  marks: [
    decorative(lineY(rows, { x: 'month', y: 'value' })),
    dot(rows, { x: 'month', y: 'value', key: 'id' }),
  ],
})
```

`decorative` keeps geometry and scale materialization but removes duplicate focus, tooltip, and activation points.

### Use explicit geometry groups

```ts
import { lineY } from '@tanstack/charts'

const rows = [
  { date: '2026-08-01', region: 'North', value: 42, status: 'healthy' },
  { date: '2026-08-01', region: 'South', value: 37, status: 'healthy' },
]

export const lines = lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'region',
  color: 'status',
})
```

Keep geometry identity (`z`) separate from paint semantics (`color`) when they differ.

### Choose the smallest complete composition

Escalate in this order:

1. One built-in or first-party composite mark.
2. Several built-in marks sharing scales.
3. Facets or named views.
4. D3-prepared rows passed to built-in marks.
5. `compositeMark` built from ordinary marks.
6. A custom mark that emits renderer-neutral scene nodes.
7. An application-owned overlay or gesture controller.

Read [the mark-selection matrix](references/mark-selection.md) before creating a custom mark.

### Use facets for repeated questions, views for distinct roles

Use `facetChart` when every panel asks the same question over a group. Use `composeViews` for focus-and-context, marginal summaries, or panels with distinct roles. Keep semantic shared state in the application; do not synchronize views through DOM nodes.

## Common Mistakes

### CRITICAL Encoding the chart as one custom path

Wrong: emit one path containing the complete visualization.

Correct: retain mark-local data, channels, scales, and interaction points; extend only the geometry that built-ins cannot express.

A monolithic path discards automatic domains, typed rows, portable rendering, focus ownership, and composability.

Source: `docs/concepts/grammar-of-graphics.md`; `docs/guides/custom-marks-and-renderers.md`

### MEDIUM Expecting an area to draw its line

Wrong:

```ts
marks: [areaY(rows, { x: 'date', y: 'value' })]
```

Correct:

```ts
marks: [
  areaY(rows, { x: 'date', y: 'value' }),
  lineY(rows, { x: 'date', y: 'value' }),
]
```

Area and line are independent layers with independent style, state, and point ownership.

Source: `docs/reference/marks/line-and-area.md`

### HIGH Letting decorative layers own duplicate points

Wrong: layer line, area, dots, and labels over the same rows with every mark interactive.

Correct: choose the semantic owner and wrap always-painted supporting marks with `decorative`.

Duplicate points create repeated keyboard stops, focus candidates, and tooltip rows.

Source: `API-FRICTION.md` F-218; `docs/guides/tooltips-and-focus.md`

### HIGH Rebuilding supported coordinates in userland

Wrong: project polar, spatial, hierarchy, or network geometry into arbitrary pixels before chart layout.

Correct: use first-party coordinate/layout primitives, or a resolved-layout mark when final bounds are truly required.

Userland projection hides responsive final-bounds work and duplicates capability modules. Current first-party primitives fixed many early gaps, but old examples still encourage application-owned engines.

Source: `API-FRICTION.md` F-117, F-199–F-208; `docs/examples/index.md`

## References

- [Mark selection and composition matrix](references/mark-selection.md)

See also: `build-chart-interactions/SKILL.md` and `extend-tanstack-charts/SKILL.md` — layering determines point ownership, and native composition should be exhausted before extension.
