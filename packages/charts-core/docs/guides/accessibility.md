---
title: Accessibility
description: Give charts useful names, keyboard-equivalent interaction, reduced motion, redundant encodings, and exact-value alternatives.
---

Accessibility is part of the chart contract, not a final annotation pass.
TanStack Charts provides named SVG and Canvas surfaces plus shared focus
primitives; the application still owns the surrounding explanation, controls,
and exact-value alternative.

## Name the chart

Every DOM host and framework adapter requires `ariaLabel`:

```tsx
<Chart
  definition={definition}
  ariaLabel="Weekly downloads for three packages"
/>
```

Use `ariaDescription` when the reader needs context that is not already
visible nearby:

```tsx
<Chart
  definition={definition}
  ariaLabel="Weekly downloads for three packages"
  ariaDescription="Values are seven-day totals. Missing weeks are rendered as gaps."
/>
```

The SVG renderer emits an image role, a chart roledescription, and a `<desc>`
when a description is supplied. The Canvas renderer places the same image role,
name, roledescription, description, and tab index on its root while keeping its
three paint canvases `aria-hidden`. Do not put instructions, conclusions, and all
underlying data into one enormous accessible name.

## Preserve semantic context outside the surface

A chart should usually be accompanied by:

- a visible heading;
- a short statement of what is being compared;
- units and time range;
- a source note when relevant;
- a summary or table when exact values matter.

Use normal HTML for this content. It is easier to navigate, select, translate,
and print than text embedded in SVG.

## Keyboard focus and selection

Native focus supports pointer and keyboard navigation over chart points.
Leave `keyboard` enabled when a chart is interactive. Focus callbacks expose
the same typed `ChartPoint` data regardless of input method.

If the application replaces native focus with a brush, zoom, editor, or rich
overlay:

- provide semantic buttons, sliders, inputs, or table rows;
- keep visible focus styles;
- expose current state in text;
- support Escape when an interaction can be cancelled;
- use live announcements sparingly for meaningful committed changes;
- make touch targets at least 44 CSS pixels where practical.

The [Interactions and Selections](./interactions-and-selections.md) guide
defines the ownership boundary.

## Never rely on color alone

Pair semantic color with at least one other signal:

- direct labels;
- shape or stroke pattern;
- ordering;
- position;
- text in a legend or linked table;
- selected outlines and `aria-pressed` state.

Check contrast against the actual application background in both light and
dark modes. The theme cannot infer whether an arbitrary data color is
accessible.

## Motion

The default SVG tween and optional `motion()` renderer respect
`prefers-reduced-motion` by default. Keep `respectReducedMotion: true` unless
an application has a stronger accessible motion policy. Reduced motion snaps
entrance, update, and focus-state changes to final geometry without scheduling
animation frames.

Motion should explain continuity between states. It should not:

- delay access to current values;
- loop without a pause control;
- move the focus target away from keyboard users;
- encode the only evidence of a change.

See [Dynamic Data and Animation](./dynamic-data-and-animation.md) for the
lightweight tween and optional spring renderer boundaries.

## Tooltips are supplemental

The native tooltip exposes its structured rows through a polite status region.
It is not a replacement for a label, axis, legend, or data table. Essential
information must remain available without hovering.

For complex framework content, use the adapter's tooltip-body composition
surface. Its transient body is inert, so a display-only nested chart can remain
visible but does not enter the focus or accessibility order. Render controls
only while `pinned` is true. The pinned surface has non-modal dialog semantics,
Escape and `dismiss()` close it, and focus returns to the chart when dismissal
starts inside the body. Controls still need an intentional tab order and
accessible names.

## Linked table pattern

For analytical and operational charts, a linked table gives readers exact
values and a familiar navigation surface. Selection state should be shared
semantically, rather than inferred from DOM nodes.

<iframe
  src="https://tanstack.com/charts/catalog/embed/82-chart-table-selection/?theme=system&height=480"
  title="Accessible linked chart and data table selection"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Testing checklist

Test the finished application, not only the SVG or Canvas element:

1. Navigate the page and chart with a keyboard.
2. Confirm visible focus and a logical navigation order.
3. Operate selection, pinning, zoom, and editing without a pointer.
4. Verify focus and selection persist correctly after data updates.
5. Enable reduced motion.
6. Test light, dark, forced-colors, and increased text size.
7. Inspect the accessible name and description.
8. Confirm exact values are available outside hover-only UI.
9. Confirm status and errors are not encoded only by color.
10. Use a screen reader on the complete task flow.

Automated checks can catch missing names and invalid roles, but they cannot
decide whether the representation communicates the right thing.
