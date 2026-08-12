---
name: build-chart-interactions
description: >
  Compose TanStack Charts focus, tooltips, controlled selections, cursors,
  brushes, zoom, keyboard behavior, and coordinated views. Load for hover,
  focus, pinning, crosshairs, clipping, gesture state, or chart-table
  coordination.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/tooltips-and-focus.md'
  - 'TanStack/charts:docs/guides/interactions-and-selections.md'
  - 'TanStack/charts:docs/reference/focus-and-interaction.md'
  - 'TanStack/charts:docs/reference/marks/focus-guide.md'
---

# Build Chart Interactions

Use **trigger → inspect → decide → build → verify**. Charts owns renderer-neutral interaction mechanics; the application owns accepted semantic state, persistence, product policy, and equivalent non-pointer controls.

## Setup

Start with native focus and tooltip behavior before adding controlled state:

```ts
import { defineChart, lineY } from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'

const rows = [
  { week: 'May 4', value: 820 },
  { week: 'May 11', value: 960 },
  { week: 'May 18', value: 1_140 },
]

export const chart = defineChart({
  marks: [
    lineY(rows, { x: 'week', y: 'value', points: true }),
    crosshair({ x: { label: true }, y: false }),
  ],
  x: { scale: scalePoint },
  y: { scale: scaleLinear },
  focus: 'nearest-x',
  maxFocusDistance: Number.POSITIVE_INFINITY,
  tooltip,
})
```

Keep the finite default focus distance when empty space should clear inspection.

## Core Patterns

### Choose interaction ownership

| Need                                                                         | Owner                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------ |
| Nearest datum, grouped tooltip, snapped crosshair, keyboard point navigation | chart focus                                |
| Semantic selection, free cursor, handle, brush, zoom, interactive legend     | first-party control plus controlled signal |
| Shared accepted range, persistence, playback, editing, rich pinned details   | application state/UI                       |

Read [the interaction state matrix](references/interaction-state.md) before combining controls.

### Coordinate chart and application selection by key

```ts
import { defineChart, dot } from '@tanstack/charts'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'

const observations = [
  { id: 'a', speed: 12, efficiency: 32 },
  { id: 'b', speed: 18, efficiency: 27 },
]

let selectedId: string | null = null

const selection = keyedSelection<
  (typeof observations)[number],
  string,
  number,
  number
>({
  selected: controlledSignal(selectedId, (next) => {
    selectedId = next
  }),
  key: (datum) => datum.id,
})

export const chart = defineChart({
  marks: [
    dot(observations, {
      id: 'observations',
      x: 'speed',
      y: 'efficiency',
      key: 'id',
    }),
    whenSelected(
      dot(observations, {
        id: 'selected-observation',
        x: 'speed',
        y: 'efficiency',
        key: 'id',
        r: 7,
      }),
      selection,
    ),
  ],
  x: { scale: scaleLinear },
  y: { scale: scaleLinear },
  selection,
})
```

Rebuild the definition with the accepted controlled value. A signal is a snapshot and callback, not a hidden store.

### Synchronize semantic values, not pixels

Use one `createChartCursor` controller across definitions when charts should resolve the same x/y value through their own scales. Keep crosshair presentation in each definition. Never copy DOM coordinates or mutate another chart's SVG.

### Add portaling only for containment boundaries

Use native tooltip content first. Add `portal` when overflow, transforms, or stacking contexts clip the surface. Use framework adapter tooltip bodies only when the product requires rich interactive content.

## Common Mistakes

### CRITICAL Mutating SVG for focus presentation

Wrong:

```ts
onRender={({ svg }) => svg.insertBefore(activeBand, svg.firstChild)}
```

Correct:

```ts
marks: [
  whenFocused(bandX(rows, { x: 'date' }), { match: 'x' }),
  lineY(rows, channels),
]
```

DOM mutation bypasses scene identity, SSR, Canvas, React Native, motion, and cleanup. Current focus marks replace an older workaround that still appears in issue examples.

Source: GitHub issue 9; `API-FRICTION.md` F-178

### HIGH Focusing a point-less rule

Wrong:

```ts
whenFocused(ruleX(dates), { match: 'x' })
```

Correct:

```ts
focusGuideX(rows, { x: 'date', y: 'value', xRule: {} })
```

Rules emit no interaction points, so a focus filter has no candidate identity. Current focus-guide primitives replace this legacy pattern.

Source: GitHub issue 32; `API-FRICTION.md` F-237

### CRITICAL Treating callbacks as complete behavior

Wrong: attach only an `onRangeChange` or key callback to an overlay.

Correct: use the matching controlled control (`keyedSelection`, `continuousCursor`, `handleX`, `brushX`, or `zoomX`) and store its accepted semantic value in application state.

A callback alone does not define capture, clamping, cancellation, keyboard operations, or ownership.

Source: `API-FRICTION.md` F-075; `docs/guides/interactions-and-selections.md`

### HIGH Keeping tooltips inside clipped ancestors

Wrong:

```ts
tooltip: {
  use: tooltip
}
```

Correct:

```ts
tooltip: {
  use: (tooltip, portal)
}
```

Overflow, transforms, and stacking contexts can trap a correctly positioned tooltip.

Source: `API-FRICTION.md` F-133; `docs/guides/tooltips-and-focus.md`

### HIGH Letting decorative layers own duplicate points

Wrong: make every area, line, dot, label, and highlight layer over one observation independently focusable.

Correct: choose one semantic interaction owner and use `decorative`, `whenFocused`, or `whenSelected` for supporting presentation.

Duplicate points create repeated keyboard stops, focus candidates, activations, and tooltip rows.

Source: `API-FRICTION.md` F-218; `docs/guides/tooltips-and-focus.md`

### HIGH Tension: rich interaction versus portable rendering

Prefer marks, controls, semantic state, and host extensions over DOM-only overlays. Verify pointer and keyboard paths, static fallback, teardown, and any native equivalent.

See also: `ship-accessible-charts/SKILL.md` and `extend-tanstack-charts/SKILL.md`

## References

- [Interaction ownership and state machines](references/interaction-state.md)

See also: `coordinate-charts-with-tanstack/SKILL.md`, `ship-accessible-charts/SKILL.md`, and `update-and-animate-charts/SKILL.md` — interaction requires explicit cross-surface ownership, keyboard parity, and stable identity across updates.
