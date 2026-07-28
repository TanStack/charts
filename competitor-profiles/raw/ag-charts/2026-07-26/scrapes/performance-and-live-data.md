# AG Charts performance and live-data notes

**Retrieved**: 2026-07-26  
**Sources**:

- https://www.ag-grid.com/charts/javascript/large-dataset-interactivity/
- https://www.ag-grid.com/charts/javascript/high-frequency-data/
- https://www.ag-grid.com/charts/javascript/transactions/
- https://www.ag-grid.com/charts/react/async-data/
- https://blog.ag-grid.com/whats-new-in-ag-charts-13/

## Large data

- AG claims smooth interaction with more than one million points.
- Canvas is the browser renderer.
- The engine uses M4 aggregation to preserve visual extrema while reducing
  points for the current view.
- Zoom and pan adapt aggregation to the visible range.
- AG warns that results depend on hardware and workload.

## High-frequency updates

- `applyTransaction()` adds, removes, or updates only changed data.
- AG demonstrates requestAnimationFrame-rate updates for trading, telemetry,
  and sensor use cases.
- Zoom remains available during updates.
- Data identity can use object reference or a configured key.

## Async data

- v14 adds a `dataSource.getData()` callback.
- The chart requests a visible window during initial load and navigation.
- It manages a loading overlay while the returned promise is pending.
- The API supports coarse full-range navigator data plus higher-resolution
  visible-window data.
- Async data is Enterprise.

## Competitive meaning

AG has a specific, user-visible story for dense and live data. TanStack Charts
has encouraging local scene/SVG timings, but no equivalent browser benchmark,
downsampling system, transaction API, or million-point claim yet.
