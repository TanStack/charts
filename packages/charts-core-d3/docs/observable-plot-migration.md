# Observable Plot migration

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

TanStack Charts adopts Observable Plot’s most useful idea: compose marks over
arbitrary data with channels, scales, transforms, and guides. It is a
ground-up, dependency-free engine, not a fork and not a complete compatibility
layer.

Use Observable’s documentation as the conceptual reference:

- [Marks](https://observablehq.com/plot/features/marks)
- [Scales](https://observablehq.com/plot/features/scales)
- [Transforms](https://observablehq.com/plot/features/transforms)
- [Interactions](https://observablehq.com/plot/features/interactions)

Then use this package’s recipes for exact native syntax.

## Directly familiar concepts

| Observable Plot concept                           | TanStack Charts                                       |
| ------------------------------------------------- | ----------------------------------------------------- |
| `Plot.plot({ marks })`                            | `defineChart({ marks })`, then a host                 |
| field or accessor channel                         | same                                                  |
| `z` grouping                                      | same                                                  |
| mark-local data                                   | same                                                  |
| layered declaration order                         | same                                                  |
| `lineY`, `areaY`, `barX`, `barY`, `dot`           | native constructors                                   |
| `rect`, `ruleX`, `ruleY`, `text`                  | native constructors                                   |
| linear, log, symlog, sqrt, time, UTC, band, point | native scales; advanced families are explicit imports |
| ordinal and continuous color                      | `color` options with an explicit continuous strategy  |
| `bin`, `group`, `stackY`                          | data-first transforms from `@tanstack/charts`         |
| facets                                            | `facetChart` or the composable `facet` mark           |
| pointer tip and activation                        | host tooltip, focus, and selection callbacks          |

## Intentional differences

- TanStack Charts requires stable `key` channels for high-quality dynamic
  reconciliation.
- Dynamic application state uses `defineChart<Input>()(...)` with separate
  preparation caching.
- Container size and theme are definition inputs owned by the host.
- React and Octane render the complete shared SVG on the server.
- Animation reconciles renderer-neutral scene keys rather than Observable
  Plot’s generated DOM structure.
- Data profiling and chart recommendation are documentation/skill concerns,
  not runtime features.

## Not in the native profile yet

- Geographic projections and geo marks
- Opacity and symbol scales
- Window, select, normalize, and tree transforms
- Polar, geographic, and network layouts
- Advanced curves and shapes beyond the documented line and area curves
- General axes or guides beyond the positional axes and color legends
- Canvas rendering

Keep an Observable Plot chart on the preserved compatibility proof when it
depends heavily on those capabilities. Migrate charts composed from the native
subset one layer at a time, preserving original data and stable keys.
