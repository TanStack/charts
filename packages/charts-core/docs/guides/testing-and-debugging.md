---
title: Testing and Debugging
description: Test chart semantics, geometry, interaction, updates, accessibility, and performance without relying on brittle screenshots alone.
---

A useful chart test answers more than “did a surface appear?” Test at the
narrowest layer that owns the behavior.

## Test the scene first

`createChartScene` gives static definitions a deterministic, DOM-free result:

```ts
import { createChartScene } from '@tanstack/charts'

const scene = createChartScene(definition, {
  width: 640,
  height: 360,
})

expect(scene.points).toHaveLength(rows.length)
expect(scene.scales.x.domain).toEqual(expectedDates)
expect(scene.chart.width).toBeGreaterThan(0)
```

For responsive definitions, create a runtime and call `render` with an exact
surface size.
Scene tests are suited to:

- materialized domains and ticks;
- mark and guide geometry;
- clipping and margins;
- focus-point metadata;
- stable node keys;
- deterministic themes and gradients.

Avoid asserting the complete scene object when only one semantic invariant
matters.

## Test serialized SVG

Use `renderChartSvg` to verify:

- accessible name and description;
- resource ID scoping;
- expected SVG element kinds;
- absence of invalid numeric output;
- deterministic server markup.

Prefer structural assertions over a full string snapshot. A formatting change
should not obscure a geometry regression.

## Test the DOM host

Mount into a real or sufficiently complete DOM when behavior depends on:

- responsive measurement;
- pointer or keyboard focus;
- sticky tooltips;
- selection callbacks;
- keyed reconciliation;
- interrupted animation;
- font-driven relayout;
- export of computed styles.

Always call `destroy()` and verify observers, frames, tooltip nodes, and event
listeners do not survive.

Run the same focus, keyboard, tooltip, selection, responsive-update, and
destroy sequences against SVG and Canvas when renderer parity matters. Those
behaviors belong to the shared host; renderer tests should concentrate on
surface adoption, coordinate conversion, paint, and cleanup.

For Canvas, test deterministic server-shell markup without installing Canvas
APIs. Use a Canvas 2D mock for draw-call and device-pixel-ratio assertions, then
use browser screenshots for representative paths, clipping, gradients, text,
themes, and focus-overlay composition. Do not use a raw pixel or data-URL
snapshot as the only semantic assertion.

## Test interaction as a sequence

Describe the user path and its semantic assertion:

1. Move to a known chart coordinate.
2. Verify the resolved datum and grouped points.
3. Select or pin it.
4. Update, resize, reorder, or filter the chart.
5. Verify focus is preserved when the key survives and cleared when it does
   not.
6. Verify keyboard access reaches the same information.

This catches state-preservation failures that a static screenshot cannot.

## Visual regression tests

Use screenshots for painted properties that are hard to express as numbers:

- label overlap;
- automatic margins;
- curve and area crossings;
- gradients and clipping;
- high-density aliasing;
- light and dark themes.

Fix fonts, viewport, device scale, animation state, locale, time zone, and data
revision. Pair the screenshot with geometry assertions so a visually small but
semantically important error cannot hide in the diff threshold.

## Accessibility tests

At minimum verify:

- the SVG or Canvas root has a meaningful accessible name;
- descriptions summarize the current chart, not every point;
- keyboard focus can enter and traverse the chart when enabled;
- focus and selection callbacks expose the same data as pointer interaction;
- reduced-motion disables nonessential animation;
- an adjacent table or summary exists when exact values are required.

See [Accessibility](./accessibility.md).

## Diagnose by layer

When output is wrong, inspect in this order:

1. Prepared rows and intervals.
2. Materialized mark channels.
3. Resolved scale domains, ranges, bandwidths, and ticks.
4. `scene.chart` bounds and margins.
5. Scene nodes and interaction points.
6. Renderer input and static output.
7. Mounted surface and application styling.

If the scene is correct but the surface is wrong, the defect belongs to
rendering, reconciliation or paint, or styling. If the channel values are
wrong, changing the renderer will not fix the cause.

## Performance tests need correctness gates

A timed run is valid only if it also verifies:

- the requested revision painted;
- expected nodes and points exist;
- representative geometry is finite and in bounds;
- no page or lifecycle errors occurred;
- the interaction result belongs to the latest scene.

Exclude invalid attempts from rankings. Report warmup, sample count, percentile,
environment, data size, and renderer capability. See
[Bundle Size and Performance](./bundle-size-and-performance.md).
