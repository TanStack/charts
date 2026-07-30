---
title: Example Gallery
description: Choose a TanStack Charts example from the question your reader needs to answer, then follow the linked concepts and reference pages.
---

The gallery is organized by analytical question, not by package export. Start
with what the reader needs to compare, then open the family page for examples
and implementation guidance.

Each embedded chart is a production catalog case rendered with TanStack Charts.
The examples demonstrate complete compositions, while the concept and reference
pages remain the source of truth for individual APIs.

## Choose a family

| Question                                                                         | Example family                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| How does a value change over an ordered domain?                                  | [Lines and Areas](./lines-and-areas.md)                               |
| Which categories are largest, smallest, or most changed?                         | [Bars and Rankings](./bars-and-rankings.md)                           |
| How are quantitative measures related?                                           | [Scatterplots and Relationships](./scatterplots-and-relationships.md) |
| What is the shape, spread, or rank of a quantitative variable?                   | [Distributions](./distributions.md)                                   |
| Where are values concentrated across a matrix or plane?                          | [Heatmaps and Densities](./heatmaps-and-densities.md)                 |
| What span, uncertainty, or open-high-low-close interval does each row represent? | [Intervals and Financial Charts](./intervals-and-financial.md)        |
| How does a total divide into contributions?                                      | [Stacked and Composed Charts](./stacked-and-composition.md)           |
| How should the same encoding repeat across groups?                               | [Facets and Multiple Views](./facets-and-multiple-views.md)           |
| How are entities connected or nested?                                            | [Networks and Hierarchies](./networks-and-hierarchies.md)             |
| How do values relate to geographic or projected space?                           | [Maps and Spatial Charts](./maps-and-spatial.md)                      |
| How should cyclic or radial dimensions be compared?                              | [Polar and Radar Charts](./polar-and-radar.md)                        |
| Which thresholds, events, or derived values need explanation?                    | [Annotations and Overlays](./annotations-and-overlays.md)             |
| How can a reader inspect, select, navigate, or edit the view?                    | [Interactive Charts](./interactive-charts.md)                         |

If two families seem plausible, use
[Choosing a Chart](../guides/choosing-a-chart.md) to compare the reader task,
data shape, and risks of each encoding.

## Use an example without inheriting accidental choices

An example is a starting composition, not a schema for your data. Preserve your
application rows and replace the example's channels, domains, labels, and
formatters deliberately.

Before adapting a case:

1. Identify what one row represents and which fields are quantitative,
   temporal, ordinal, or nominal.
2. Decide whether the view needs raw observations, prepared summaries, or
   explicit intervals.
3. Supply scales with domains that express the intended comparison.
4. Keep only the marks that answer the question.
5. Verify the smallest supported container, light and dark themes, keyboard
   focus, and update behavior.

[Data and Channels](../concepts/data-and-channels.md) defines the row-to-channel
contract. [Scales and D3](../concepts/scales-and-d3.md) explains which
transforms and scale semantics belong to the application. [Transforms and
Reactivity](../guides/transforms-and-reactivity.md) shows how raw observations
become the rows consumed by marks.

## Build from the grammar

Most examples are several small pieces sharing a coordinate system:

- marks encode rows through channels;
- scales map values to visual ranges;
- guides explain those scales;
- layers combine complementary encodings;
- the host handles responsive layout, rendering, focus, and updates.

Read [Grammar of Graphics](../concepts/grammar-of-graphics.md) for that model and
[Marks and Layering](../concepts/marks-and-layering.md) before replacing a
composition with a custom mark.

For implementation details, use the [API Reference](../reference/index.md).
For behavior that crosses chart and application state, use the task-focused
[Guides](../guides/choosing-a-chart.md).
