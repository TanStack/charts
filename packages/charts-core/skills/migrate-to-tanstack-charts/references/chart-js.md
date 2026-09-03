# Migrate From Chart.js

Chart.js combines dataset configuration, controllers, plugins, a Canvas renderer, and imperative instance updates. Separate those responsibilities before translating them.

## Ownership Map

| Chart.js concern           | Inspect                                    | TanStack destination                                       |
| -------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `data.labels` and datasets | row identity, implicit x, dataset grouping | explicit rows and channels per mark                        |
| dataset `type`             | geometry and mixed-chart layering          | mark family and declaration order                          |
| `parsing`                  | field mapping and coercion                 | typed row preparation and channel accessors                |
| scale config               | domain, stack, reverse, tick callback      | factory/instance, mark layout, axis guide                  |
| plugin                     | lifecycle, drawing, events, external UI    | mark, control, renderer/host extension, or application UI  |
| imperative `update`        | changed data/options and animation mode    | new definition identity passed to host/adapter             |
| Canvas output              | raster performance and export              | choose TanStack Canvas or SVG/static renderer deliberately |

## Sequence

1. Convert labels plus parallel dataset arrays into typed semantic rows.
2. Preserve dataset IDs as series and datum IDs as keys.
3. Classify each plugin: geometry, interaction, application UI, export, or lifecycle.
4. Recreate scale domains and mark layouts independently of Canvas pixels.
5. Rebuild the definition when accepted data/options change; do not mutate a retained chart spec.
6. Choose SVG or Canvas from actual mark count and interaction/export requirements.

## High-Risk Differences

- Parallel arrays hide row identity. Create rows before comparing updates or tooltips.
- Chart.js plugins can draw arbitrary Canvas pixels. A TanStack replacement must declare semantic scale values and renderer-neutral scene ownership unless it is deliberately renderer-specific.
- Dataset order may control stacking, legend, tooltip, and paint at once. Split those policies explicitly.
- Canvas screenshot parity does not prove keyboard accessibility or semantic focus points.

## Parity Cases

- Mixed chart layers paint in the same semantic order.
- Dataset filtering retains color and domain policy.
- Plugin annotations become stable marks rather than after-draw mutations.
- Imperative updates preserve keys and latest-wins behavior.
- Raster export, pixel ratio, and sustained pointer work meet the target budget.

Source: `docs/guides/migrating.md`; `docs/guides/custom-marks-and-renderers.md`
