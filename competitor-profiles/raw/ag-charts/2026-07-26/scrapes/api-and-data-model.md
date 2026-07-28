# AG Charts API and data-model notes

**Retrieved**: 2026-07-26  
**Sources**:

- https://www.ag-grid.com/charts/javascript/data-configuration/
- https://www.ag-grid.com/charts/javascript/api-create-update/
- https://www.ag-grid.com/charts/javascript/axes-configuration/
- https://www.ag-grid.com/charts/javascript/module-registry/

## Public model

- Top-level chart options contain `data`, `series`, axes, legends, themes,
  interaction, and layout configuration.
- Data is an array of objects.
- Series bind fields using type-specific keys such as `xKey`, `yKey`,
  `angleKey`, `colorKey`, and `sizeKey`.
- A series can override top-level data with its own array.
- Hierarchical series use specific parent/child shapes.
- Axis type and domain are commonly inferred from series and data; explicit
  configuration is available.

## Lifecycle

- `AgCharts.create(options)` creates an instance.
- `update(options)` expects complete state.
- `updateDelta(partial)` applies partial chart options, although complete
  `series` and `axes` arrays are required when those sections change.
- `applyTransaction({ add, remove, update })` supports incremental data changes.
- `getOptions()` and chart state APIs expose applied configuration and
  interaction state.
- Data and themes are expected to be immutable for reliable change detection.

## Modularity

- Since v13, series, axes, legends, animation, and other capabilities can be
  imported as modules.
- Modules are registered once in a global `ModuleRegistry` before any chart is
  created.
- `AllCommunityModule` and `AllEnterpriseModule` trade convenience for bundle
  size.
- AG reports up to a 45% bundle reduction from selecting modules.

## Extension boundary

The documented public extension surface is strong for themes, formatters,
stylers, tooltips, labels, markers, fills, and menus. This research found no
documented public custom-series or custom scene-node protocol comparable to
TanStack Charts custom marks. That is a documentation finding, not proof that
no unsupported or internal extension path exists.
