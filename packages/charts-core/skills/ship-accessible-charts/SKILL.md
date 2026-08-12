---
name: ship-accessible-charts
description: >
  Ship TanStack Charts with meaningful accessibility, deterministic SSR and
  hydration, correct adapter lifecycle, renderer and export choices, exact
  package subpaths, and explicit React Native validation.
metadata:
  type: lifecycle
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/accessibility.md'
  - 'TanStack/charts:docs/guides/ssr-and-hydration.md'
  - 'TanStack/charts:docs/guides/exporting.md'
  - 'TanStack/charts:docs/framework/*/adapter.md'
  - 'TanStack/charts:packages/react-native-charts/README.md'
---

# Ship Accessible Charts

Run **trigger → inspect → decide → build → verify** before release. A chart is shipped only when its semantic alternative, adapter lifecycle, SSR policy, renderer, exports, package boundaries, and teardown are proven in a consumer-shaped scenario.

## Accessibility Checks

### Check: the name identifies the comparison

Expected:

```ts
const hostOptions = {
  definition,
  height: 320,
  initialWidth: 640,
  ariaLabel: 'Weekly downloads for Core and React packages',
  ariaDescription: 'Values are seven-day totals. Missing weeks appear as gaps.',
}
```

Fail condition: the label says only “chart”, repeats a visible heading without the metric, or omits the comparison and period.

Fix: name the metric, compared entities, and time scope; put conclusions and detailed values in normal application content.

### Check: critical values have an equivalent representation

Expected: a visible heading and units, plus an adjacent summary or semantic table when precise values or application decisions depend on the chart.

Fail condition: the only way to retrieve an essential value is pointer hover, color, motion, or visual estimation.

Fix: bind the same semantic rows or selected key to application text/table controls.

### Check: every interaction has a non-pointer path

Expected: native point keyboard navigation, semantic buttons/inputs for free cursors and range controls, visible focus, cancel/reset paths, and meaningful committed-state text.

Fail condition: a transparent pointer overlay is the sole control surface.

Fix: use first-party controls where their keyboard contract fits and application-owned semantic controls otherwise.

## Lifecycle Checks

### Check: SSR uses a supported adapter and deterministic inputs

Expected:

```ts
import {
  createChartRuntime,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from 'd3-scale'

interface TrafficRow {
  date: Date
  visits: number
}

const rows: readonly TrafficRow[] = [
  { date: new Date('2026-08-10T00:00:00Z'), visits: 820 },
  { date: new Date('2026-08-11T00:00:00Z'), visits: 910 },
]

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'visits' })],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
})

const runtime = createChartRuntime<TrafficRow, Date, number>()
const scene = runtime.render(definition, { width: 720, height: 400 })

export const svg = renderChartSvg(scene, {
  ariaLabel: 'Daily traffic',
  idPrefix: 'daily-traffic',
})

runtime.destroy()
```

Fail condition: definition construction reads browser layout, random values, local time, or unresolved async data; or the selected adapter does not promise SSR.

Fix: resolve data before render, use deterministic formatting and dimensions, and follow the selected adapter reference.

### Check: mount, update, and cleanup stay adapter-owned

Expected: one runtime per mounted adapter instance, complete immutable option updates, stable definitions until captured values change, and cleanup on unmount/disconnect.

Fail condition: application code calls DOM measurement or mounts a browser host during server render, or retains observers/listeners after removal.

Fix: use the adapter lifecycle or `mountChart` only in a browser-owned mount phase and call `destroy()` at teardown.

## Renderer and Export Checks

### Check: renderer choice matches the task

- SVG: visible server geometry, vector export, DOM styling, ordinary interactive charts.
- Canvas: high scene counts or raster-first output; server emits an accessible shell, not pixels.
- Static SVG: deterministic server/export artifact without browser interaction.
- React Native SVG: explicit native target with device-level validation.

### Check: export is reproducible

Expected: explicit dimensions, theme/background, scoped IDs, portable fonts/assets, intentional focus inclusion, and a meaningful exported name/description.

Fail condition: export depends on current responsive pixels or unreachable application CSS/resources.

Fix: render an explicit scene or serialize/rasterize with explicit artifact policy.

## Common Mistakes

### CRITICAL Using a generic accessible label

Wrong: `ariaLabel: 'Chart'`.

Correct: identify the metric, entities, period, and unit needed to understand the figure.

A generic label exposes a focusable graphic without useful identity.

Source: `docs/guides/accessibility.md`

### HIGH Making the chart the only representation

Wrong: require hover or visual estimation for exact operational values.

Correct: render a summary, table, or application controls from the same semantic data/state.

The chart surface is supplemental when exact values are critical.

Source: `docs/guides/accessibility.md`; archived responsive/accessibility notes

### CRITICAL Mounting a browser host during server rendering

Wrong: call `mountChart` or adapter DOM mount from a server lifecycle.

Correct: prerender a deterministic scene through a supported SSR adapter or `renderChartSvg`, then mount the browser host only after a real element exists.

Measurement and mutation require browser elements. Older Angular workarounds were especially prone to this boundary error.

Source: GitHub issue 56; `docs/guides/ssr-and-hydration.md`

### HIGH Putting behavior on adapter props

Wrong:

```tsx
<Chart definition={chart} tooltip keyboard />
```

Correct:

```tsx
const interactive = defineChart(chart, { tooltip, keyboard: true })
<Chart definition={interactive} ariaLabel="Revenue by month" />
```

Focus, tooltip, keyboard, controls, cursors, and SVG animation belong to the reusable definition; adapters own surface lifecycle and framework body composition. The current definition API replaces legacy adapter behavior props.

Source: chart-behavior migration in `CHANGELOG.md`; React chart reference

### HIGH Importing the universal barrel on native

Wrong: use `@tanstack/charts/universal` for every native chart.

Correct: use exact core mark/scale/scene and `@tanstack/charts/react-native` subpaths unless cross-platform authoring justifies the universal bundle.

Exact imports protect Metro and native declaration environments from unrelated browser and optional capability code.

Source: `API-FRICTION.md` F-154, F-171, F-173, F-256; React Native package README

### HIGH Tension: rich interaction versus portable rendering

DOM convenience can break static SVG, Canvas, native, SSR, or keyboard equivalence. Keep semantics in definitions and application state; use platform-specific body/host extensions only at the presentation seam.

See also: `build-chart-interactions/SKILL.md` and `extend-tanstack-charts/SKILL.md`

## Pre-Deploy Summary

- [ ] Meaningful name and concise description.
- [ ] Visible units, time range, and source context.
- [ ] Exact-value summary/table where required.
- [ ] Pointer, keyboard, touch, and cancel/reset scenarios.
- [ ] Reduced-motion and non-color evidence.
- [ ] Supported SSR policy with deterministic initial geometry.
- [ ] Stable definition, mark, datum, and resource IDs.
- [ ] Mount, update, resize, font relayout, and destroy verified.
- [ ] Renderer and export behavior verified from a packed consumer.
- [ ] Native claims verified on target devices when applicable.

## References

- [React](references/react.md)
- [Preact](references/preact.md)
- [Vue](references/vue.md)
- [Solid](references/solid.md)
- [Svelte](references/svelte.md)
- [Angular](references/angular.md)
- [Lit](references/lit.md)
- [Alpine](references/alpine.md)
- [Octane](references/octane.md)
- [React Native](references/react-native.md)
- [Renderers and export](references/renderers-and-export.md)

See also: `debug-and-verify-charts/SKILL.md` — SSR, accessibility, renderer, and package claims need consumer-level evidence.
