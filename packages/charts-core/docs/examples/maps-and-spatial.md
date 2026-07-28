---
title: Maps and Spatial Charts
description: Choose choropleths, point layers, and vector fields for geographic or projected spatial questions.
---

Spatial charts encode values in a coordinate system whose geometry already has
meaning. A geographic map uses a projection and feature boundaries. A vector
field uses position, direction, and magnitude. Neither should be treated as an
ordinary categorical chart with decorative shapes.

## Choose the spatial encoding

| Reader question                                           | Start with                              |
| --------------------------------------------------------- | --------------------------------------- |
| How does an aggregate differ across named regions?        | Choropleth                              |
| Where did individual events occur?                        | Projected point layer                   |
| How do direction and magnitude vary over a sampled plane? | Vector field                            |
| How does a path move through space?                       | Projected line with directional context |
| Must small regions be compared precisely by value?        | Sorted bars or a table beside the map   |

Projection, geographic path generation, containment, and spatial sampling are
application-owned algorithms. Their output enters TanStack Charts through
typed custom marks or ordinary projected rows. See
[Scales and D3](../concepts/scales-and-d3.md).

## Compare regional aggregates

A choropleth joins one value to each named geographic feature and maps that
value through a color scale.

<iframe
  src="https://tanstack.com/charts/catalog/embed/40-geojson-map/?theme=system&height=460"
  title="Regional GeoJSON choropleth with a quantitative color scale built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="460"
  style="width:100%;height:460px;border:0;"
></iframe>

The join is part of data preparation. Match features through stable IDs, report
unmatched records, and distinguish missing values from zero. Keep the color
domain and legend explicit so one filtered region cannot silently rescale the
meaning of every other fill.

Area draws attention. A large region can appear important even when its value
is ordinary. Pair the map with a sorted table or bars when precise ranking is
part of the task.

[Legends and Color](../guides/legends-and-color.md) covers sequential,
diverging, and threshold choices.

## Show direction and magnitude

A vector field places an arrow at each sampled position. Direction uses angle;
magnitude can use length, color, or both.

<iframe
  src="https://tanstack.com/charts/catalog/embed/42-vector-field/?theme=system&height=440"
  title="Two-dimensional sampled vector field built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

Choose a sampling density that remains legible at the smallest container. More
arrows can obscure the flow instead of adding evidence. When pixel length
encodes magnitude, define a bounded scale and disclose whether vectors were
normalized.

Vector channel and anchor options are listed in
[Rules, Links, Arrows, Vectors, and Ticks](../reference/marks/rules-links-arrows-vectors-and-ticks.md).

## Projection and responsive layout

A projection turns geographic coordinates into planar geometry. Fit it to the
resolved plot bounds, not the viewport, and recompute when the chart container
changes. Preserve source longitude and latitude alongside projected
coordinates for tooltips and selection.

When one custom spatial shape must render inside the shared scene:

- Keep path generation deterministic and DOM-free.
- Emit stable scene keys for each feature.
- Clip only when geometry should not extend beyond the plot.
- Emit interaction points or application overlays only where they carry honest
  semantic anchors.
- Keep projection and geo dependencies behind the spatial chart import.

See [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md) and
[Responsive Charts](../guides/responsive-charts.md).

## Color, boundaries, and missing data

- Use a sequential scale for ordered magnitude with one direction.
- Use a diverging scale only around a meaningful center.
- Use threshold colors when bins have defined policy meaning.
- Keep boundary strokes visible in light and dark themes without overpowering
  fill.
- Give missing, suppressed, and out-of-domain features distinct treatment.
- Avoid a categorical palette for high-cardinality numeric values.

A legend is required whenever fill or vector color carries quantitative
meaning.

## Accessibility and interaction

A map should not be the only route to critical regional values. Provide a table
or list with the same feature names, values, units, and current selection.

For interactive maps:

- Focus and selection should resolve stable feature IDs.
- Zoom and pan state belongs to the application.
- Reset, keyboard, and touch paths should reach equivalent extents.
- Wheel capture should not trap page scrolling unexpectedly.
- Tooltips should name the region or sample, value, and unit.

[Interactions and Selections](../guides/interactions-and-selections.md) defines
the controlled gesture loop.

## Production checks

- Validate feature joins and report unmatched IDs.
- State projection, aggregation unit, date range, and denominator.
- Keep color domains comparable across views and revisions.
- Test antimeridian, empty, missing, and extremely small features where
  applicable.
- Bound projected point and vector counts.
- Verify labels and legends at narrow widths.
- Provide a non-spatial exact-value path through
  [Accessibility](../guides/accessibility.md).
