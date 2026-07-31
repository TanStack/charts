---
title: Annotations and Overlays
description: Add direct labels, thresholds, change indicators, and explanatory layers without hiding chart semantics.
---

Annotations explain selected evidence. They should name a threshold, event,
endpoint, difference, or unusual observation that matters to the reader.

Treat an annotation as data whenever possible. A prepared row with semantic
coordinates survives resizing, scale changes, server rendering, and updates
more reliably than a hand-positioned SVG fragment.

## Choose the annotation

| Reader question                                        | Start with                             |
| ------------------------------------------------------ | -------------------------------------- |
| How did each category change between two periods?      | Slopegraph with direct endpoint labels |
| In which direction did a point move in two dimensions? | Change arrow                           |
| Where is a target, zero, or policy boundary?           | Rule plus concise text                 |
| Which time span needs explanation?                     | Explicit interval rectangle or area    |
| Which few observations are notable?                    | Selected dots and text                 |
| Does the reader need arbitrary HTML or controls?       | Application-owned overlay              |

[Marks and Layering](../concepts/marks-and-layering.md) is the source of truth
for render order and stable layer identity.

## Label before-and-after change

A slopegraph gives both periods a shared quantitative scale, connects each
category's endpoints, and labels the values directly.

<iframe
  src="https://tanstack.com/charts/catalog/embed/30-slopegraph/?theme=system&height=480"
  title="Two-period slopegraph with direct endpoint labels built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Preserve category identity for the links and endpoints; supply `key` only when
the mark cannot infer it. Direct labels remove a legend lookup, but they need
collision policy when values converge. Filter to meaningful categories,
increase vertical space, or use an accessible detail view rather than allowing
unreadable overlap.

A slope implies before-to-after order. Label both periods and keep the same
quantitative scale.

## Show two-dimensional movement

A change arrow connects one quantitative state to another. Position carries
the start and end values; the arrowhead carries direction.

<iframe
  src="https://tanstack.com/charts/catalog/embed/32-change-arrows/?theme=system&height=480"
  title="Two-dimensional directed change arrows built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Keep both endpoints in the prepared row. Do not infer direction from color or
row order inside the renderer. Label the compared states and retain original
values for focus and tooltips.

Arrow and link endpoint channels are defined in
[Rules, Links, Arrows, Vectors, and Ticks](../reference/marks/rules-links-arrows-vectors-and-ticks.md).

## Add thresholds and bands

Use a rule for a single semantic value:

- Zero
- Target
- Regulatory threshold
- Average or benchmark
- Current time

Use a ranged area or rectangle when the annotation is an interval:

- Acceptable range
- Forecast uncertainty
- Maintenance window
- Selected time span

Name the threshold or band in surrounding text or a sparse text layer. A
decorative grid line should not compete with a policy boundary that carries
meaning.

## Select annotations in data preparation

Prepare a small annotation dataset:

1. Select observations by a documented rule such as minimum, maximum, first
   threshold crossing, or named event.
2. Retain the original datum and stable ID.
3. Add label text and any intentional x/y offset.
4. Render dots, rules, links, and text as independent marks.

This makes the selection auditable. The chart renderer should not decide which
business events are interesting.

[Data and Channels](../concepts/data-and-channels.md) covers mixed mark sources
and typed accessors.

## Use HTML overlays only when necessary

An application overlay is appropriate for:

- Rich interactive content
- Buttons, links, forms, or menus
- A persistent details panel
- A nested chart
- Product chrome that should not be serialized into SVG

Anchor it from `scene.chart` or a focused `ChartPoint`, then keep its state and
lifecycle in the application. Do not mutate chart SVG to create a second,
unreconciled state model.

See [Tooltips and Focus](../guides/tooltips-and-focus.md) for rich tooltip
ownership and [Interactive Charts](./interactive-charts.md) for complete
application-controlled examples.

## Production checks

- Every annotation answers a specific reader question.
- Selection rules are prepared and testable.
- Labels include units or period meaning where needed.
- Text collision is verified at the smallest container.
- Offsets remain relative to semantic coordinates after resize.
- Color is not the only distinction between data and annotation.
- Decorative geometry emits no fake interaction points.
- Dynamic layers have stable mark IDs and datum keys.
- Rich overlays are keyboard reachable, contained, and destroyed on unmount.

Text channel and positioning options are in
[Text, Frame, and Facet](../reference/marks/text-frame-and-facet.md).
