---
title: Facets and Multiple Views
description: Choose shared-scale facets, marginal views, and focus-plus-context layouts for coordinated comparisons.
---

Facets repeat one encoding across groups. Multiple-view compositions place
different but related encodings together. Both reduce the amount of data one
plot must carry, but they answer different questions.

Use facets when every panel has the same role. Use distinct linked views when
one panel provides context, a marginal distribution, controls, or detail for
another.

## Choose the layout

| Reader question                                                  | Start with                                 |
| ---------------------------------------------------------------- | ------------------------------------------ |
| How does the same distribution differ across cohorts?            | Shared-scale facets                        |
| How does a bivariate relationship relate to each marginal shape? | Scatterplot with marginal histograms       |
| Which portion of a long time domain should the detail view show? | Focus-plus-context views                   |
| Must every group use a different scale or mark composition?      | Independent named chart views              |
| Should selecting one view filter or highlight another?           | Linked views with shared application state |

[Faceting and Composition](../guides/faceting-and-composition.md) owns the
implementation boundary. This page helps choose a layout and verify its
comparison semantics.

## Repeat one encoding by group

Faceted distributions give each cohort its own panel while preserving a common
binning and positional scale. The reader can compare both local shape and
absolute position without decoding overlapping fills.

<iframe
  src="https://tanstack.com/charts/catalog/embed/51-faceted-distributions/?theme=system&height=480"
  title="Shared-scale faceted cohort distributions built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use shared domains when position should be directly comparable. Independent
domains can make local variation easier to see, but they can also exaggerate
small differences. If independent scales are intentional, give panels their
own guides and state the policy.

Prepare reductions independently within each facet. A proportional histogram,
for example, divides by the cohort's count rather than a global count unless
the global population is the intended denominator.

## Add marginal context

A scatterplot with marginal histograms combines three roles:

- The central plot shows the joint relationship.
- The top histogram shows the x distribution.
- The side histogram shows the y distribution.

<iframe
  src="https://tanstack.com/charts/catalog/embed/57-scatter-marginal-histograms/?theme=system&height=480"
  title="Scatterplot with coordinated x and y marginal histograms built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

All regions can derive from the same raw observations, but they do not share
the same marks or plot rectangle. Keep their domains coordinated and their
accessibility labels distinct.

Several chart hosts are usually simpler and more accessible. Use one custom
scene with embedded regions only when exact responsive alignment materially
improves the product. [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md)
covers that advanced boundary.

## Pair detail with context

A focus-plus-context layout uses a compact overview to control the explicit
domain of a larger detail chart. The selection is semantic application state,
not a rectangle stored inside one renderer.

<iframe
  src="https://tanstack.com/charts/catalog/embed/83-focus-context-window/?theme=system&height=480"
  title="Linked overview and detail time windows with a persistent semantic selection"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The overview should retain the complete domain. The detail should receive the
selected start and end as its configured scale domain. Pointer, touch, and
keyboard controls should update the same semantic values, and those values
should survive data revisions and resizes.

See [Interactions and Selections](../guides/interactions-and-selections.md) for
controlled brushes, zoom, and linked state.

## Coordinate views by values, not pixels

Shared selection, cursor, category, or domain state belongs in the application:

1. A view emits a semantic value through focus, selection, or a controlled
   gesture.
2. Application state validates and stores that value.
3. Each view derives its own definition and configured scales.
4. Each chart compiles a new scene through its normal update path.

Do not query one SVG for a pixel and apply that pixel directly to another view.
Different margins, widths, orientations, and scales can represent the same
semantic value at different coordinates.

## Production checks

- Use one repeated encoding for true facets; use named views when roles differ.
- Make shared versus independent domains explicit.
- Keep bin boundaries, group order, color meaning, and units comparable.
- Give each independently interactive view its own accessible label.
- Preserve selection and viewport state across data and size updates.
- Avoid duplicating a full axis on every panel when shared outer guides are
  accurate.
- Verify panel order at narrow widths in
  [Responsive Charts](../guides/responsive-charts.md).
- Provide a table or textual summary when exact cross-panel comparison matters.

For the underlying row and channel model, see
[Data and Channels](../concepts/data-and-channels.md).
