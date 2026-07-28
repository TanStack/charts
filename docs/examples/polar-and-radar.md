---
title: Polar and Radar Charts
description: Decide when cyclic, radial, radar, or parallel-coordinate layouts clarify multivariate data.
---

Polar layouts place angle and radius where cartesian charts use x and y. They
can clarify genuinely cyclic domains and compact multivariate profiles, but
they also make length, angle, and area harder to compare.

Use them deliberately. A radial shape is not automatically more informative
than aligned bars, dots, or small multiples.

## Choose the profile view

| Reader question                                                   | Start with                             |
| ----------------------------------------------------------------- | -------------------------------------- |
| How does one profile vary across a small set of fixed dimensions? | Radar chart                            |
| How do several entities compare across many ordered dimensions?   | Parallel coordinates                   |
| Does a measure repeat around a natural cycle?                     | Polar line, area, or radial bars       |
| Must values be compared precisely across dimensions?              | Aligned bars, dots, or small multiples |
| Does angle itself have no semantic meaning?                       | Stay cartesian                         |

Keep every dimension's domain and direction explicit. A shape can change
dramatically when one axis is reversed or rescaled.

## Compare one compact profile

A radar chart maps each qualitative dimension to an equally spaced angle and
its value to radius. The filled polygon makes the overall profile visible.

<iframe
  src="https://tanstack.com/charts/catalog/embed/75-radar/?theme=system&height=440"
  title="Six-dimension radar profile built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

Use radar for a small, fixed dimension set with compatible scales. Start each
radial axis at a truthful baseline, show reference rings, and label every
dimension directly.

Polygon area is visually prominent but not a simple sum of the values. Do not
rank profiles by apparent filled area. If two or more profiles overlap, keep
fills translucent and provide a direct or textual comparison.

## Compare many multivariate rows

Parallel coordinates keep each dimension as a straight axis and draw one path
per entity. They are not polar, but they are often the clearer alternative
when several multivariate profiles must be compared.

<iframe
  src="https://tanstack.com/charts/catalog/embed/27-parallel-coordinates/?theme=system&height=440"
  title="Normalized multivariate parallel-coordinates comparison built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

Parallel coordinates preserve a separate readable axis for every dimension,
but path crossings depend on axis order. Keep order intentional and stable.
Use selection or filtering before rendering a high-cardinality dataset; an
opaque bundle of lines does not support precise comparison.

## Scale dimensions deliberately

Dimensions with different units need separate normalization policies. Store
the original value and unit alongside any normalized radius or axis position.
The chart should expose original values in tooltips, tables, and accessible
descriptions.

For each dimension decide:

- Domain and baseline
- Whether larger always means better
- Tick or ring values
- Formatter and unit
- Missing-value treatment
- Stable order around the circle or across axes

[Scales and D3](../concepts/scales-and-d3.md) owns scale construction. The
application should prepare any normalized dimension rows before marks render.

## Geometry and labels

Radar and other polar geometry usually need a custom mark or a composed scene:

- Convert each dimension index to an angle.
- Map each value through its radial scale.
- Close the profile polygon intentionally.
- Keep grid rings and spokes decorative rather than focusable data.
- Emit interaction points at semantic dimension values.
- Reserve enough responsive space for labels around every edge.

Use [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md) for
the extension boundary and
[Layout, Axes, and Coordinates](../concepts/layout-axes-and-coordinates.md) for
responsive bounds.

## Production checks

- Use angle only for cyclic order or a small fixed dimension sequence.
- Keep every dimension domain, direction, and unit explicit.
- Preserve original values when rendering normalized positions.
- Avoid misleading polygon-area comparisons.
- Test long labels around the complete circumference.
- Provide exact values through a table or textual summary.
- Limit overlapping profiles and high-cardinality paths.
- Verify light and dark contrast, keyboard access, and reduced-motion behavior
  with [Accessibility](../guides/accessibility.md).
