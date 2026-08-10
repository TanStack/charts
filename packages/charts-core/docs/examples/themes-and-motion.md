---
title: Themes and Motion
description: Apply inherited palettes and optional motion while keeping chart definitions separate from card layout and controls.
---

These cases use one ownership model. Definitions describe chart behavior. CSS
variables supply inherited paint. Application shells compose cards and controls.

## Cases

| Case                                                                                                    | Demonstrates                                                                                     |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Themed interactive area card](https://tanstack.com/charts/catalog/charts/120-themed-interactive-area/) | A CSS-backed gradient, sparse guides, range controls, grouped focus, a tooltip, and keyed motion |
| [Active bar dashboard](https://tanstack.com/charts/catalog/charts/121-active-bar-dashboard/)            | Metric selectors around gradient bars, a focused band ring, a tooltip, and spring transitions    |
| [Premium KPI sparklines](https://tanstack.com/charts/catalog/charts/122-premium-kpi-sparklines/)        | Three guide-free line and area hosts inside one responsive KPI grid                              |
| [Active donut metric](https://tanstack.com/charts/catalog/charts/123-active-donut-metric/)              | Native pie allocation, a selected wedge and ring, center text, legend state, and a CSS palette   |
| [Theme palette matrix](https://tanstack.com/charts/catalog/charts/124-theme-palette-matrix/)            | One chart structure rendered through neutral, vibrant, and monochrome token sets                 |

## Ownership

| Layer         | Owns                                                                                   | Does not own                                                       |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Definition    | Rows, keys, marks, scales, guides, gradients, focus, tooltip policy, and motion timing | Card layout, HTML controls, theme switching, or renderer selection |
| CSS variables | Paint tokens, `currentColor`, tooltip chrome, and application surface colors           | Data meaning, scales, geometry, or selection                       |
| App shell     | Card layout, text, controls, selected state, theme class, and the `motion()` renderer  | Mark geometry or duplicated SVG presentation                       |

Memoize or recreate the definition when rows or semantic options change. A CSS
token change does not require a new definition.

Keep each mark key stable across updates. The motion renderer uses stable keys
for DOM identity, presentation points, and spring velocity.

## Motion boundary

A `motion` value in a definition is inert policy. Pass `motion()` as the
renderer to activate tween or spring transitions.

The default SVG renderer uses `svgAnimation`. The motion renderer ignores that
option because each host has one animation owner. Static SVG and Canvas paint
the final state.

`motion()` respects reduced motion by default. React and Octane `/core` hosts
accept an explicit renderer. Renderer-neutral DOM hosts accept one too. Other
framework adapters currently expose their default SVG surface.

Read [Dynamic Data and Animation](../guides/dynamic-data-and-animation.md) and
the [Motion reference](../reference/motion.md) for update and timing contracts.

## Paint boundary

Use CSS variables when paint follows the application theme. Use a definition
`theme` for explicit scene defaults. Declare gradients in the definition so
SVG and Canvas use the same resource.

Use a stable `idPrefix` when several charts share a document. Keep card borders,
shadows, layout, and non-chart text in the application shell.

Read [Themes and Styling](../guides/themes-and-styling.md) for palette,
gradient, Canvas, and tooltip behavior.

## Current limits

- Chart specs declare linear gradients, but they do not declare pattern
  resources.
- `grid` and the static axis line are visibility controls. They do not accept
  stroke width, dash, or opacity.
- Use `theme.grid` for shared guide paint. Use rule marks for styled static
  annotations and `crosshair` for styled focus guides.
- `barX` and `barY` accept one radius value for all rectangle corners. They do
  not expose endpoint-only or per-corner radii.
- The optional motion renderer targets browser SVG. Static SVG, Canvas, and
  native surfaces consume the definitions but paint the final state.
