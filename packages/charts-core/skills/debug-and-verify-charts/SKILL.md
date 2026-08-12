---
name: debug-and-verify-charts
description: >
  Diagnose TanStack Charts type, data, scale, geometry, focus, lifecycle,
  bundle, and performance failures with scenario-level evidence. Load for
  blank or clipped charts, misleading output, unsafe casts, migration parity,
  packed-package checks, or regressions.
metadata:
  type: lifecycle
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/testing-and-debugging.md'
  - 'TanStack/charts:docs/guides/typescript.md'
  - 'TanStack/charts:docs/guides/bundle-size-and-performance.md'
  - 'TanStack/charts:API-FRICTION.md'
---

# Debug and Verify Charts

Run **trigger → inspect → decide → build → verify** at the narrowest layer that owns the failure. Do not change rendering before proving prepared rows, channels, scales, and scene geometry are correct.

## Semantic and Scene Checks

### Check: deterministic scene invariants

Expected:

```ts
import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'

const rows = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 76 },
]

const definition = defineChart({
  marks: [lineY(rows, { x: 'month', y: 'value', points: true })],
  x: { scale: scalePoint },
  y: { scale: scaleLinear },
})

export const scene = createChartScene(definition, { width: 640, height: 360 })
export const svg = renderChartSvg(scene, { ariaLabel: 'Monthly value' })

if (scene.points.length !== rows.length) throw new Error('Point count mismatch')
if (scene.chart.width <= 0) throw new Error('Empty plot width')
if (/NaN|Infinity/.test(svg)) throw new Error('Invalid numeric SVG output')
```

Fail condition: expected points/domains are absent, geometry is non-finite, or final bounds are empty.

Fix: diagnose in the layer order below before mounting a host.

### Check: diagnose in ownership order

1. Prepared rows, order, intervals, missing values, and units.
2. Materialized mark channels and grouping.
3. Resolved scale domains, ranges, bandwidths, ticks, and log validity.
4. `scene.chart` bounds and guide margins.
5. Scene node keys, geometry, clipping, and interaction points.
6. Renderer input and serialized/static output.
7. Mounted surface, framework lifecycle, fonts, and application CSS.

If the scene is wrong, changing the renderer cannot repair it. If the scene is correct, stop changing transforms and scales.

## Interaction and Lifecycle Checks

### Check: verify a user sequence

1. Focus a known datum by pointer.
2. Verify primary/grouped semantic points and tooltip content.
3. Pin or select it.
4. Reorder, filter, update, resize, or interrupt motion.
5. Verify state follows a surviving key and clears when the key disappears.
6. Traverse and activate the same information by keyboard.
7. Destroy the host and verify no observer, event, tooltip, or frame survives.

### Check: pair screenshots with semantic assertions

Use screenshots for label collision, font metrics, gradients, clipping, crossings, themes, and dense aliasing. Fix data, fonts, viewport, device scale, animation, locale, time zone, and revision. Pair the image with geometry and state assertions.

## Package and Performance Checks

### Check: test a packed consumer

Install the produced tarball in a minimal consumer. Verify documented root and exact subpath imports, SSR evaluation, ESM tree shaking, optional peer boundaries, retained modules, declaration output, and runtime behavior.

### Check: performance samples have correctness gates

Every accepted sample must prove the requested revision painted, representative geometry is finite/in-bounds, expected points exist, no lifecycle error occurred, and interaction belongs to the latest scene. Report environment, data/scene size, warmup, sample count, percentiles, and capability set.

## Common Mistakes

### CRITICAL Casting a rejected definition

Wrong:

```tsx
<Chart definition={definition as any} ariaLabel="Revenue" />
```

Correct: repair the row type, channel, scale domain, mixed mark union, host-specific tooltip type, or custom-mark contract at its source.

A cast hides the mismatch and leaves runtime semantics dishonest.

Source: `docs/guides/typescript.md`; `docs/reference/types.md`

### CRITICAL Asserting only element existence

Wrong: assert that an SVG, path, or canvas exists.

Correct: assert semantic domains, final bounds, geometry, resolved datum/group, update sequence, accessibility, and teardown at the layer that owns each behavior.

Presence does not prove correctness.

Source: `API-FRICTION.md` F-036, F-073, F-081; `docs/guides/testing-and-debugging.md`

### HIGH Testing workspace source instead of packed exports

Wrong: approve because monorepo tests resolve source aliases.

Correct: install the packed package into a consumer and test public exports, peers, declarations, SSR, and bundles there.

Workspace resolution can hide missing exports, browser globals, retained optional dependencies, and publish-file omissions.

Source: `API-FRICTION.md` F-090, F-139, F-167, F-224

### HIGH Trusting one aggregate performance number

Wrong: report one mount median for one chart.

Correct: separate preparation, scene build, paint, sustained pointer work, updates, dashboard lifecycle, correctness gates, and bundle capability.

An aggregate can hide stale output, invalid attempts, or a cost shifted into another layer.

Source: `API-FRICTION.md` F-078–F-084; `docs/guides/bundle-size-and-performance.md`

### HIGH Tension: motion continuity versus current-state correctness

Final-frame checks miss stale focus, guides, geometry, or latest-wins violations during interruption. Test the state transition while it is happening.

See also: `update-and-animate-charts/SKILL.md` and `design-responsive-charts/SKILL.md`

## Release Summary

- [ ] Types pass without casts or suppressed inference.
- [ ] Empty, missing, duplicate, negative, and invalid data cases pass.
- [ ] Scene semantics and geometry pass at narrow and wide sizes.
- [ ] Pointer, keyboard, selection, update, interruption, and teardown pass.
- [ ] SSR/static output and accessibility pass.
- [ ] Packed consumer exports and bundles pass.
- [ ] Performance samples include correctness gates and target workload shape.

See also: `coordinate-charts-with-tanstack/SKILL.md` — chart-grid reconciliation, URL restoration, sync status, optimistic rollback, and virtualized teardown require product-level sequences.
