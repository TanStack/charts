---
name: extend-tanstack-charts
description: >
  Implement TanStack Charts custom marks, scale-value contracts,
  final-bounds layouts, renderer-neutral scene nodes, renderers, hosts,
  controls, or composed views after built-in primitives are exhausted.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
requires:
  - compose-marks-and-views
sources:
  - 'TanStack/charts:docs/guides/custom-marks-and-renderers.md'
  - 'TanStack/charts:docs/reference/custom-extensions.md'
  - 'TanStack/charts:packages/charts-core/src/mark.ts'
  - 'TanStack/charts:packages/charts-core/src/mark-with-scale-values.ts'
---

# Extend TanStack Charts

Use **trigger → inspect → decide → build → verify**. Extend the narrowest ownership boundary after proving built-in marks, first-party layouts, transforms, facets, views, and controlled behaviors cannot express the required semantics.

## Setup

Create a renderer-neutral mark with declared scale values and deterministic scene keys:

```ts
import { createMark, defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'

interface ThresholdDatum {
  id: string
  value: number
}

const threshold = createMark<ThresholdDatum, never, number>(({ markIndex }) => {
  const datum: ThresholdDatum = { id: 'target', value: 75 }

  return {
    id: `threshold-${markIndex}`,
    channels: { y: { scale: 'y', values: [datum.value] } },
    render({ chart, scales, theme }) {
      const y = scales.y.map(datum.value)
      return {
        nodes: [
          {
            kind: 'rule',
            key: datum.id,
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: y,
            y2: y,
            style: { stroke: theme.foreground, strokeOpacity: 0.55 },
          },
        ],
      }
    },
  }
})

export const chart = defineChart({
  marks: [threshold],
  y: { scale: scaleLinear },
})
```

This mark is decorative, so it emits no fake interaction point.

## Core Patterns

### Escalate through extension boundaries

1. Built-in or first-party composite mark.
2. Several built-in marks.
3. Facet or named view composition.
4. D3/application-prepared semantic rows.
5. `compositeMark` for a reusable group of ordinary marks.
6. `createMark` for new renderer-neutral geometry.
7. `resolveLayout` only for final-bounds topology or collision.
8. Custom control for reusable semantic behavior.
9. Custom renderer/host for a different platform surface.

Read [the extension protocol matrix](references/extension-protocols.md) before choosing a boundary.

### Materialize values before rendering

Initialization declares every semantic value that must establish x, y, or color domains. Rendering maps those values through resolved scales. Never infer a private positional domain inside `render`.

### Emit honest interaction points

Only emit points for semantic targets. Each point keeps the original datum, stable key, semantic values, resolved coordinates, and group/color identity. Attach the same point object to the scene primitive it paints. Use focus anchors for reveal-only geometry and focus guides for data-less cursor presentation.

### Use final-layout callbacks only for final-layout work

Use `resolveLayout` for binning, collision, packing, or topology that depends on resolved scales and inner bounds. Keep semantic row transforms eager and outside render. Keep layout callbacks synchronous, pure, and deterministic because margin solving can call them more than once.

## Common Mistakes

### CRITICAL Reading or mutating the DOM during scene generation

Wrong: query text, append SVG, or inspect browser layout in `initialize`, `resolveLayout`, or `render`.

Correct: consume the supplied bounds, scales, theme, text layout, and scene contracts; put platform lifecycle in a renderer or host extension.

Scene compilation must remain deterministic for SSR, Canvas, native, export, and tests.

Source: `docs/guides/custom-marks-and-renderers.md`; `packages/charts-core/src/mark.ts`

### CRITICAL Inferring a private positional domain in render

Wrong: derive a local domain and scale after chart scales have resolved.

Correct: materialize positional channel values during initialization, then map with `context.scales`.

Private domains prevent coordinated guides, layers, focus, and views.

Source: `docs/reference/custom-extensions.md`; archived custom-mark notes

### HIGH Conflating interaction and scale values

Wrong:

```ts
createMark<Datum, PointX, PointY>(initialize)
```

Correct:

```ts
createMarkWithScaleValues<Datum, PointX, PointY, ScaleX, ScaleY>(initialize)
```

Use the exceptional factory when an interval or layout focuses one semantic value but materializes different endpoint types on its scales.

Source: `API-FRICTION.md` F-094; `docs/reference/types.md`

### HIGH Running side effects in resolved layout

Wrong: update application state, mutate cached rows, allocate a persistent controller, or read external changing state from `resolveLayout`.

Correct: derive the returned layout solely from inputs and capture local derived rows in its render closure.

Margin and responsive solving may evaluate the callback repeatedly.

Source: hexbin and Sankey references

### HIGH Tension: rich interaction versus portable rendering

Custom DOM behavior is easy to prototype but breaks renderer parity. Prefer renderer-neutral points, focus guides, controls, and semantic application state; isolate platform code in the host seam.

See also: `build-chart-interactions/SKILL.md` and `ship-accessible-charts/SKILL.md`

## References

- [Extension protocol matrix](references/extension-protocols.md)

See also: `compose-marks-and-views/SKILL.md` and `debug-and-verify-charts/SKILL.md` — justify extensions against native composition and verify them across renderer boundaries.
