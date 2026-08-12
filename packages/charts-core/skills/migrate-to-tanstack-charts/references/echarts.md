# Migrate From ECharts

ECharts centralizes datasets, series, coordinates, components, actions, and renderer state in an option object. Translate each semantic owner separately; do not wrap the option object in a custom renderer.

## Ownership Map

| ECharts concern           | Inspect                                         | TanStack destination                         |
| ------------------------- | ----------------------------------------------- | -------------------------------------------- |
| `dataset` and `transform` | row grain, dimensions, lineage                  | application/TanStack eager transforms        |
| `series`                  | geometry, encode map, stack, data overrides     | mark-local data and channels                 |
| axis/grid                 | domains, coordinate system, labels, containment | scales, guides, measured margins             |
| `visualMap`               | ordered/categorical color policy                | chart color scale and legend                 |
| `axisPointer` and tooltip | snap/group/content/linking                      | focus, crosshair, tooltip, cursor controller |
| `dataZoom`                | accepted semantic window and gesture policy     | controlled zoom/brush plus axis viewport     |
| `dispatchAction`          | application command/state mutation              | controlled application state/controller      |
| graphic/custom series     | annotation, UI, or custom geometry              | marks, application overlay, or custom mark   |

## Sequence

1. Materialize the dataset rows and every transform output as fixtures.
2. Expand `encode` and inherited dimensions into explicit mark channels.
3. Separate series stack/group identity from color.
4. Translate `visualMap` domains and thresholds as application-owned color policy.
5. Replace linked axis pointers with semantic cursor controllers, not pixel broadcasts.
6. Replace `dataZoom` with controlled domains and first-party controls or application UI.
7. Verify renderer, export, and action-driven workflows independently.

## High-Risk Differences

- `containLabel`-style containment is not label collision policy. Configure candidate density and thinning.
- ECharts actions can mutate internal renderer state. TanStack definitions and controlled signals require the application to own accepted semantic state.
- `custom` series render callbacks often operate in coordinate-system pixels. Reframe them as declared scale channels plus renderer-neutral scene nodes.
- Connected charts must share values/domains, not copy axis-pointer pixels.

## Parity Cases

- Dataset transform outputs and dimension names.
- Stack order, hidden-series domains, and stable color mappings.
- Axis-pointer snap/group behavior by pointer and keyboard.
- Zoom clamping, cancellation, reset, and programmatic changes.
- Graphic annotations after resize, SSR, and export.

Source: `docs/guides/migrating.md`; interaction and scale guides
